import type { ExegesisPlugin,ExegesisPluginContext } from "exegesis-express";

/**
 * @description validates the resolution-[x|y|z] query params
 */

export default function resolutionPlugin(): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-resolutions" },
    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        const params = await ctx.getParams();
        const {
          "resolution-x": xn = 0,
          "resolution-y": yn = 0,
          "resolution-z": zn = 0,
        } = params.query;
        if ("resolution-x" in params.query) {
          if (Number.isNaN(Number(xn))) {
            throw ctx.makeValidationError("resolution-x is not an number", {
              in: "query",
              name: "resolution-x",
              docPath: ctx.api.pathItemPtr,
            });
          }
          ctx["ectx"]["resolution-x"] = xn;
        }
        if ("resolution-y" in params.query) {
          if (Number.isNaN(Number(yn))) {
            throw ctx.makeValidationError("resolution-y is not an number", {
              in: "query",
              name: "resolution-y",
              docPath: ctx.api.pathItemPtr,
            });
          }
          ctx["ectx"]["resolution-y"] = yn;
        }
        if ("resolution-z" in params.query) {
          if (Number.isNaN(Number(zn))) {
            throw ctx.makeValidationError("resolution-z is not an number", {
              in: "query",
              name: "resolution-z",
              docPath: ctx.api.pathItemPtr,
            });
          }
          ctx["ectx"]["resolution-z"] = zn;
        }
      },
    }),
  };
}