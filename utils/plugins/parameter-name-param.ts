import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";
import type { Dataset } from "../../config/index.ts";

export default function parameterName(): ExegesisPlugin {
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
