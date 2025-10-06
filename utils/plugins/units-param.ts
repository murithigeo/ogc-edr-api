import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";
import type { DataQueryConfig, Dataset } from "../../config/index.ts";
import { convert } from "convert";

/**
 * @description converts the corridor-height/corridor-width/within(radius) param to meters
 */
export default function units(): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-unit-converter" },
    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        const operation: string = ctx.api.operationObject
          ?.["x-exegesis-operationId"];
        if (!operation.includes("@")) return;

        const params = await ctx.getParams();
        const dataset: Dataset = ctx["ectx"]["dataset"];
        const [, query_type]: [string, keyof DataQueryConfig] = operation.split(
          "@",
        );
        if (
          !Array<typeof query_type>("corridor", "radius").includes(query_type)
        ) {
          return;
        }
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
