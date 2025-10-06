import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis-express";
import bboxPolygon from "@turf/bbox-polygon";
import type { Bbox } from "../types.d.ts";
import { reproject } from "../projection.ts";
/**
 *
 * @description if on features, use a plugin to validate bbox-crs
 * @param crsField The field from which to get the CRS info
 * Run before parsing z param because it overwrites the z object
 */
export default function bbox(crsField: string = "crs"): ExegesisPlugin {
  return {
    info: { name: "exegesis-plugin-bbox-param" },
    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        const params = await ctx.getParams();
        if (!params.query.bbox) return;

        const crs = ctx["ectx"][crsField];
        const storageCrs = ctx["ectx"]["dataset"]["storageCrs"];
        const bbox: Bbox = params.query.bbox;

        let xyComponent: [number, number, number, number];
        if (bbox.length === 4) xyComponent = bbox;
        else {
          xyComponent = [bbox[0], bbox[1], bbox[3], bbox[4]];
          ctx["ectx"]["z"] = { min: bbox[2], max: bbox[5] };
        }
        const transformed = reproject(
          crs,
          storageCrs
        )({
          type: "Feature",
          geometry: bboxPolygon(xyComponent),
          properties: {},
        }).geometry;
        ctx["ectx"]["bbox"] = transformed;
      },
    }),
  };
}
