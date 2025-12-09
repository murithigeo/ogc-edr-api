import type { Dataset } from "../../config/index.ts";
import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";

export default function instanceid(): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-instanceid" },
    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        const params = await ctx.getParams();
        if (!("instanceId" in params.path)) return;
        const dataset: Dataset = ctx["ectx"]["dataset"];
        const options = dataset.data_queries.instances!;
        const instanceId = params.path.instanceId || options.default_instanceid;
        const matchedInstance = (await options.handler({
          format: "JSON",
          instanceId,
          crs: ctx["ectx"]["crs"],
          server: ctx.api.serverObject?.url!,
        })).find(e => e.id === instanceId);
        if (!matchedInstance) {
          throw ctx.makeError(404, `dataset does not have such an instance`);
        }
        params.path.instanceId = instanceId;
        ctx["ectx"]["instanceId"] = instanceId;
      },
    }),
  };
}
