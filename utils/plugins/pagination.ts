import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";

/**
 *@param limit the default limit value if param.query.limit is not an integer
 */
export default function pagination(limit: number): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-pagination" },
    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        const params = await ctx.getParams();
        // Limit
        ctx["ectx"]["limit"] = Number.isInteger(params.query.limit)
          ? params.query.limit
          : limit;
        ctx["ectx"]["offset"] = Number.isInteger(params.query.offset)
          ? params.query.offset
          : 0;
      },
    }),
  };
}
