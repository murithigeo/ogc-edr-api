import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";

/**
 * Modifies the limit and offset parameters to enable pagination
 */
export default function paginationPlugin(): ExegesisPlugin {
  return {
    info: { name: "x-exegesis-plugin-pagination" },
    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        const { query } = await ctx.getParams();

        let { offset }: Partial<Record<"offset" | "limit", string | number | undefined>> = query;

        // QGIS has quirk where it sends NaN to specify 0 pagination
        if (offset !== undefined) {
          offset = parseInt(offset.toString());
          if (isNaN(offset)) offset = 0;
        }
        query.offset = offset;
      },
    }),
  };
}
