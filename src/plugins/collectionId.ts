import type { ExegesisPlugin } from "exegesis";
import type { ExegesisPluginContext } from "exegesis-express";
import datasets from "../../services/index.ts";

/**
 * Determines if a collection exists on the API
 * Run before other plugins
 */
export default function (): ExegesisPlugin {
  return {
    info: { name: "x-exegesis-plugin-collectionId" },
    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        const { path } = await ctx.getParams();
        if (!("collectionId" in path)) return;
        if (!datasets[path.collectionId]) throw ctx.makeError(404, "No such dataset");
      },
    }),
  };
}
