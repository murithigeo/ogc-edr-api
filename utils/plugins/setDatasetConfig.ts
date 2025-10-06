import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";
/**
 *
 * @param collectionIds A list of valid dataset ids
 * If valid config found, sets the object in ctx.ectx
 */
export default function setDatasetConfig(
  datasets: Array<{ id: string }>
): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-collectionId" },
    makeExegesisPlugin: () => {
      return {
        postSecurity: async (ctx: ExegesisPluginContext) => {
          const params = await ctx.getParams();
          if (!("collectionId" in params.path)) return;
          const dataset = datasets.find(
            (d) => d.id === params.path.collectionId
          );
          if (!dataset) throw ctx.makeError(404, "no such dataset/collection");
          ctx["ectx"].dataset = dataset;
        },
      };
    },
  };
}
