import type { ExegesisPlugin, ExegesisPluginContext, HttpIncomingMessage } from "exegesis-express";
/**
 * @description creates an object at context root called ectx
 */
export default function makeExtraCtx(): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-make-extra-context" },
    makeExegesisPlugin: () => ({
      preRouting:({req}:{req:HttpIncomingMessage})=>{
        console.log(req.method,req.url)
        console.log(decodeURIComponent(req.url))
      },
      postRouting: (ctx: ExegesisPluginContext) => {
        ctx["ectx"] = Object.assign({});
      },
    }),
  };
}
