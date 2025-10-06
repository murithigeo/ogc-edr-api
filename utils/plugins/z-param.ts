import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";
import type { Bbox } from "../types.d.ts";

/**
 * @requires running before the bboxPlugin which mutates the bbox value
 */
export default function elevationPlugin(): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-elevation(z)-parser" },
    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        const params = await ctx.getParams();
        // z parameter takes precedence over height values in bbox
        let z: string | undefined = params.query.z;
        const bbox: Bbox | undefined = params.query.bbox;
        if (!z && bbox && bbox.length === 6) z = [bbox[2], bbox[5]].join("/");
        if (!z) return;

        /**
         * single value z=850
         * range z=10/100
         * list z=value1,value2,valueN
         * sequence z=Rn/minHeight/heightInterval
         * R20/100/50
         */
        let max: number | undefined;
        let min: number | undefined;
        let values: number[] | undefined;

        if (z.startsWith("R")) {
          values = [];
          //An=A1+(n-1)d
          const [intervals, a0, d] = z.substring(1).split("/");
          for (let n = 1; n <= parseFloat(intervals); n++) {
            const aN = parseFloat(a0) + (n - 1) * parseFloat(d);
            values.push(aN);
          }
        } else {
          if (z.includes("/"))
            [min, max] = z.split("/").map((p) => parseFloat(p));
          else values = z.split(",").map((p) => parseFloat(p));
        }
        ctx["ectx"]["z"] = {
          min,
          max,
          values,
        };
      },
    }),
  };
}
