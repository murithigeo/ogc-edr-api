import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";

/**
 * @description validates crs query param uris before controller
 */
export default function crs(): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-crs-param" },
    makeExegesisPlugin: () => {
      return {
        postSecurity: async (ctx: ExegesisPluginContext) => {
          const params = await ctx.getParams();
          if (!("crs" in params.query)) return;
          const dataset: { id: string; crs: string[] } = ctx["ectx"].dataset;
          params.query.crs = params.query.crs || "http://www.opengis.net/def/crs/OGC/1.3/CRS84";
          const value = dataset.crs.find((c) => c === params.query.crs);
          if (!value) {
            throw ctx.makeValidationError(
              `invalid crs uri/id. Review doc at /collections for valid values`,
              { in: "query", name: "crs", docPath: ctx.api.pathItemPtr }
            );
          }
          ctx["ectx"]["crs"] = value;
          ctx.res.set("content-crs", `<${crs[value]["uri"]}>`);
        },
      };
    },
  };
}