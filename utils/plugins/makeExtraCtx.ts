import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";
/**
 * @description creates an object at context root called ectx
 */
export default function makeExtraCtx(): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-make-extra-context" },
    makeExegesisPlugin: () => ({
      postRouting: (ctx: ExegesisPluginContext) => {
        ctx["ectx"] = Object.assign({});
      },
    }),
  };
}
