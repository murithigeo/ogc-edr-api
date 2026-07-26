import { toURI } from "@murithigeo/uriproj";
import type { ExegesisPlugin, ExegesisPluginContext } from "exegesis";
import datasets from "../../services/index.ts";
/**
 * Parses and reprojects the bbox query parameter to CRS84 in place
 * Requires that the OGC:CRS84 and the user CRS be loaded
 */
export default function crsPlugin(field: "crs" | "bbox-crs" = "crs"): ExegesisPlugin {
  return {
    info: { name: "x-exegesis-plugin-crs" },
    makeExegesisPlugin() {
      return {
        async postSecurity(ctx: ExegesisPluginContext) {
          const { query, path } = await ctx.getParams();
          if (!("crs" in query)) return;
          let crs: string | undefined = query[field];
          if (!crs) crs = toURI("OGC:CRS84");
          const isValid = datasets[path.collectionId].crs.includes(crs);
          if (!isValid)
            throw ctx.makeValidationError(`Invalid CRS value specified:${crs}`, {
              in: "query",
              name: "crs",
              docPath: "",
            });
          query[field] = crs;
          if (field === "crs") ctx.res.set("content-crs", `<${crs}>`);
        },
      };
    },
  };
}
