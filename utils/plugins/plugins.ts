import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";
import type { DataQueryConfig, Dataset } from "./config.ts";
import { convert } from "convert";
import { Geometry } from "wkx";
import { wktToGeoJSON } from "betterknown";
import { reproject } from "@template/utils";
import { ValidationError } from "exegesis";

export function post2getPlugin(): ExegesisPlugin {
  return {
    info: { name: "post2getplugin" },
    makeExegesisPlugin() {
      return {
        async postSecurity(ctx: ExegesisPluginContext) {
          if (ctx.req.method !== "POST") return;

          const url = new URL(ctx.api.serverObject?.url + "/" + ctx.req.url);
          const queryParams = url.searchParams.keys().toArray();

          if (queryParams.length > 0) {
            throw new ValidationError(
              queryParams.map(
                (name) =>
                  new ValidationError({
                    message: `query param not expected on POST endpoint`,
                    location: {
                      name,
                      docPath: ctx.api.pathItemPtr,
                      in: "query",
                    },
                  }),
              ),
            );
          }
          const params = await ctx.getParams();
          const { "parameter-name": parameterName, ...others } =
            await ctx.getRequestBody();
          if (parameterName && Array.isArray(parameterName)) {
            others["parameter-name"] = parameterName.join(",");
          }
          params.query = others;
        },
      };
    },
  };
}

/**
 * @description validates the coords query/post parameter is valid Well-Known-Text
 */
export function coordsPlugin(): ExegesisPlugin {
  return {
    info: { name: "validate-coords-wkt" },
    makeExegesisPlugin: () => {
      const geometryTypes = {
        radius: ["Point", "MultiPoint"],
        position: ["Point", "MultiPoint"],
        area: ["Polygon"],
        trajectory: ["LineString", "MultiLineString"],
        corridor: ["LineString", "MultiLineString"],
      } as {
        [x in keyof DataQueryConfig]: Array<GeoJSON.GeoJsonGeometryTypes>;
      };

      return {
        async postSecurity(ctx: ExegesisPluginContext) {
          const operation = ctx.api.operationObject!["x-exegesis-operationId"];
          const [, query_type]: [string, keyof typeof geometryTypes] =
            operation.split("@");

          const params = await ctx.getParams();
          if (!("coords" in params.query)) return;

          const coords: string = params.query.coords;

          try {
            const value = wktToGeoJSON(coords, {});
            if (!value) {
              throw ctx.makeValidationError(`coords must not be nullish`, {
                in: "query",
                name: "coords",
                docPath: ctx.api.pathItemPtr,
              });
            }
            if (!geometryTypes[query_type]!.includes(value.type)) {
              throw ctx.makeValidationError(
                `This endpoint only supports ${geometryTypes[query_type]!.join(
                  ",",
                )} geometries`,
                { in: "query", name: "coords", docPath: ctx.api.pathItemPtr },
              );
            }
            const { hasM, hasZ } = Geometry.parse(coords);
            if (hasM && params.query.datetime)
              throw ctx.makeValidationError(
                `Cannot mix Z/ZM geometries with datetime parameter`,
                { in: "query", name: "coords", docPath: ctx.api.pathItemPtr },
              );
            if (hasZ && params.query.z)
              throw ctx.makeValidationError(
                `Cannot mix Z/ZM geometries with datetime parameter`,
                { in: "query", name: "coords", docPath: ctx.api.pathItemPtr },
              );

            const zIndex = 2;
            const mIndex = hasZ ? 3 : 2;
            switch (value.type) {
              case "Point":
                if (hasM)
                  ctx["ectx"]["datetime"] = {
                    values: [new Date(value.coordinates[mIndex]).toISOString()],
                  };
                if (hasZ)
                  ctx["ectx"]["z"] = { values: [value.coordinates[zIndex]] };
                break;
              case "MultiPoint":
              case "LineString":
                if (hasM) {
                  ctx["ectx"]["datetime"] = {
                    values: value.coordinates.map((p) => {
                      return new Date(p[mIndex]).toISOString();
                    }),
                  };
                }
                if (hasZ) {
                  ctx["ectx"]["z"] = {
                    values: value.coordinates.map((p) => p[zIndex]),
                  };
                }
                break;
              case "MultiLineString":
                if (hasM) {
                  ctx["ectx"]["datetime"] = {
                    values: value.coordinates.flatMap((outer) =>
                      outer.map((p) => new Date(p[mIndex]).toISOString()),
                    ),
                  };
                }
                if (hasZ) {
                  ctx["ectx"]["z"] = {
                    values: value.coordinates.flatMap((outer) =>
                      outer.map((p) => p[zIndex]),
                    ),
                  };
                }

                break;
            }

            const crs = ctx["ectx"]["crs"];
            const storageCrs = ctx["ectx"]["dataset"]["storageCrs"];
            ctx["ectx"]["coords"] = reproject(
              crs,
              storageCrs,
            )({
              type: "Feature",
              geometry: value,
              properties: {},
            }).geometry;
          } catch (err) {
            if (err instanceof ValidationError) {
              throw err;
            } else {
              throw ctx.makeValidationError(err.message, {
                name: "coords",
                in: "query",
                docPath: ctx.api.pathItemPtr,
              });
            }
          }
        },
      };
    },
  };
}

export function collectionIdPlugin(
  datasets: Array<{ id: string }>,
): ExegesisPlugin {
  return {
    info: { name: "collectionId-validate-plugin" },
    makeExegesisPlugin() {
      return {
        postSecurity: async (ctx: ExegesisPluginContext) => {
          const params = await ctx.getParams();
          if ("collectionId" in params.path) {
            const collection = datasets.find(
              ({ id }) => params.path.collectionId === id,
            );
            if (!collection)
              throw ctx.makeError(404, "no such collection/dataset");
          }
        },
      };
    },
  };
}

export function querytypePlugin(): ExegesisPlugin {
  return {
    info: {
      name: "exegesis-plugin-query-type",
    },
    makeExegesisPlugin: () => ({
      postSecurity: (ctx: ExegesisPluginContext) => {
        const operation: string =
          ctx.api.operationObject!["x-exegesis-operationId"] ||
          ctx.api.operationObject?.operationId;
        if (!operation || !operation.includes("@")) return;
        //@ts-expect-error type mismatch
        const [, query_type, at]: [
          string,
          keyof DataQueryConfig,
          "collection" | "instance",
        ] = operation.split("@");
        const dataset: Dataset = ctx["ectx"]["dataset"];
        const dataquery =
          dataset.data_queries[query_type as keyof DataQueryConfig]!;
        if (at === "instance" && !dataset.data_queries.instances) {
          throw ctx.makeError(
            404,
            `This dataset does not support instance based querying`,
          );
        }
        if (!dataquery) {
          throw ctx.makeError(
            404,
            `This dataset does not support ${query_type} queries`,
          );
        }

        if (!dataquery.allowAt.includes(at)) {
          let str = `/collections/{collectionId}`;
          if (at === "instance") str += `/instances/{instanceId}`;
          str += `/${query_type}...`;
          throw ctx.makeError(
            404,
            `This dataset only supports queries on ${str} paths `,
          );
        }
      },
    }),
  };
}

export function parameterNamePlugin(): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-parametername" },
    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        const params = await ctx.getParams();
        const param: string | undefined = params.query["parameter-name"];

        if (!param) return;
        const dataset: Dataset = ctx["ectx"]["dataset"];
        const activeParameterIds = param.split(",");
        const invalidNames = activeParameterIds.filter(
          (p) => !dataset.parameters.map((p) => p.id).includes(p),
        );
        if (invalidNames.length > 0) {
          throw ctx.makeValidationError(
            `Invalid parameter-name values detected`,
            {
              in: "query",
              name: "parameter-name",
              docPath: ctx.api.pathItemPtr,
            },
          );
        }
        ctx["ectx"]["parameters"] = activeParameterIds;
      },
    }),
  };
}

/**
 * @description converts the corridor-height/corridor-width/within(radius) param to meters
 */
export function unitConverterPlugin(): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-unit-converter" },
    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        const operation: string =
          ctx.api.operationObject?.["x-exegesis-operationId"];
        if (!operation.includes("@")) return;

        const params = await ctx.getParams();
        const dataset: Dataset = ctx["ectx"]["dataset"];
        const [, query_type]: [string, keyof DataQueryConfig] =
          operation.split("@");
        if (
          !Array<typeof query_type>("corridor", "radius").includes(query_type)
        )
          return;
        if (query_type === "radius") {
          if (
            !dataset.data_queries.radius!.within_units.includes(
              params.query["within-units"],
            )
          ) {
            throw ctx.makeValidationError("invalid within-units option", {
              in: "query",
              name: "within-units",
              docPath: ctx.api.pathItemPtr,
            });
          }
          ctx["ectx"].within = convert(
            params.query.within,
            params.query["within-units"],
          ).to("meters");
          return;
        }
        const { width_units, height_units } = dataset.data_queries.corridor!;
        if (!width_units.includes(params.query["width-units"])) {
          throw ctx.makeValidationError("invalid width-units option", {
            in: "query",
            name: "width-units",
            docPath: ctx.api.pathItemPtr,
          });
        }
        if (!height_units.includes(params.query["height-units"])) {
          throw ctx.makeValidationError("invalid height-units option", {
            in: "query",
            name: "height-units",
            docPath: ctx.api.pathItemPtr,
          });
        }
        ctx["ectx"]["corridor-height"] = convert(
          params.query["corridor-height"],
          params.query["height-units"],
        ).to("meters");
        ctx["ectx"]["corridor-width"] = convert(
          params.query["corridor-width"],
          params.query["width-units"],
        ).to("meters");
      },
    }),
  };
}

export function instanceIdPlugin(): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-instanceid" },
    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        const params = await ctx.getParams();
        if (!("instanceId" in params.path)) return;
        const dataset: Dataset = ctx["ectx"]["dataset"];
        const options = dataset.data_queries.instances!;
        const instanceId = params.path.instanceId || options.default_instanceid;
        const matchedInstance = options.handler({
          format: "JSON",
          instanceId: instanceId,
          crs: ctx["ectx"]["crs"],
          server: ctx.api.serverObject?.url!,
        })[0];
        if (!matchedInstance)
          throw ctx.makeError(404, `dataset does not have such an instance`);
        params.path.instanceId = instanceId;
        ctx["ectx"]["instanceId"] = instanceId;
      },
    }),
  };
}

export function resolutionPlugin(): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-resolutions" },
    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        const params = await ctx.getParams();
        const {
          "resolution-x": xn = 0,
          "resolution-y": yn = 0,
          "resolution-z": zn = 0,
        } = params.query;
        if ("resolution-x" in params.query) {
          if (Number.isNaN(Number(xn))) {
            throw ctx.makeValidationError("resolution-x is not an number", {
              in: "query",
              name: "resolution-x",
              docPath: ctx.api.pathItemPtr,
            });
          }
          ctx["ectx"]["resolution-x"] = xn;
        }
        if ("resolution-y" in params.query) {
          if (Number.isNaN(Number(yn))) {
            throw ctx.makeValidationError("resolution-y is not an number", {
              in: "query",
              name: "resolution-y",
              docPath: ctx.api.pathItemPtr,
            });
          }
          ctx["ectx"]["resolution-y"] = yn;
        }
        if ("resolution-z" in params.query) {
          if (Number.isNaN(Number(zn))) {
            throw ctx.makeValidationError("resolution-z is not an number", {
              in: "query",
              name: "resolution-z",
              docPath: ctx.api.pathItemPtr,
            });
          }
          ctx["ectx"]["resolution-z"] = zn;
        }
      },
    }),
  };
}

export function responseEnder(): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-response-ender" },
    makeExegesisPlugin: () => ({}),
  };
}
