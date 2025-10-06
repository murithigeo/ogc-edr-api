import {
ValidationError,
  type ExegesisPlugin,
  type ExegesisPluginContext,
} from "exegesis";
import type { DataQueryConfig } from "../../config/index.ts";
import { Geometry } from "wkx";
import { wktToGeoJSON } from "betterknown";
import { reproject } from "../projection.ts";

/**
 * @description validates the coords query/post parameter is valid Well-Known-Text
 */
export default function coords(): ExegesisPlugin {
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
          const [, query_type]: [string, keyof typeof geometryTypes] = operation
            .split("@");

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
                `This endpoint only supports ${
                  geometryTypes[query_type]!.join(
                    ",",
                  )
                } geometries`,
                { in: "query", name: "coords", docPath: ctx.api.pathItemPtr },
              );
            }
            const { hasM, hasZ } = Geometry.parse(coords);
            if (hasM && params.query.datetime) {
              throw ctx.makeValidationError(
                `Cannot mix Z/ZM geometries with datetime parameter`,
                { in: "query", name: "coords", docPath: ctx.api.pathItemPtr },
              );
            }
            if (hasZ && params.query.z) {
              throw ctx.makeValidationError(
                `Cannot mix Z/ZM geometries with datetime parameter`,
                { in: "query", name: "coords", docPath: ctx.api.pathItemPtr },
              );
            }

            const zIndex = 2;
            const mIndex = hasZ ? 3 : 2;
            switch (value.type) {
              case "Point":
                if (hasM) {
                  ctx["ectx"]["datetime"] = {
                    values: [new Date(value.coordinates[mIndex]).toISOString()],
                  };
                }
                if (hasZ) {
                  ctx["ectx"]["z"] = { values: [value.coordinates[zIndex]] };
                }
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
                      outer.map((p) => new Date(p[mIndex]).toISOString())
                    ),
                  };
                }
                if (hasZ) {
                  ctx["ectx"]["z"] = {
                    values: value.coordinates.flatMap((outer) =>
                      outer.map((p) => p[zIndex])
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
            if (!collection) {
              throw ctx.makeError(404, "no such collection/dataset");
            }
          }
        },
      };
    },
  };
}
