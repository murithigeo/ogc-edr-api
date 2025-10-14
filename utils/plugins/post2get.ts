import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";

/**
 * @description reuse code to service both GET and POST requests
 * Appends the request body to Exegesis's query param interface
 */
export default function post2getPlugin(): ExegesisPlugin {
  return {
    info: { name: "post2getplugin" },
    makeExegesisPlugin() {
      return {
        async postSecurity(ctx: ExegesisPluginContext) {
          if (ctx.req.method.toUpperCase() !== "POST") return;

          // const url = new URL(ctx.api.serverObject?.url + "/" + ctx.req.url);
          // // const queryParams = Array.from(url.searchParams.keys());

          // // if (queryParams.length > 0) {
          // //   throw ctx.makeValidationError(
          // //     `query param not expected on POST endpoint`,
          // //     {
          // //       name: queryParams.join(","),
          // //       docPath: ctx.api.pathItemPtr,
          // //       in: "query",
          // //     },
          // //   );
          // // }
          const params = await ctx.getParams();
          const { "parameter-name": parameterName, ...others } =
            await ctx.getRequestBody();
          if (parameterName) others["parameter-name"] = parameterName.join(",");
          others["crs"] =
            others.crs || "http://www.opengis.net/def/crs/OGC/1.3/CRS84";
          params.query = others;
        },
      };
    },
  };
}
