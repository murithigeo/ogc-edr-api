import type { ExegesisContext } from "exegesis-express";
import {
  contenttypes,
  generateOpenApiDoc,
  parseformat,
} from "../utils/index.ts";
import { stringify } from "yaml";
function getServiceDoc(ctx: ExegesisContext): void {
  ctx.res
    .status(200)
    .set("content-type", "text/html")
    .setBody(
      generateOpenApiDoc({ url: `/api?f=json` }),
    );
}

function getServiceDesc(ctx: ExegesisContext): void {
  const { format } = parseformat(ctx, "JSON", ["JSON", "YAML", "HTML"]);

  let { openApiDoc } = ctx.api;
  openApiDoc = {
    ...openApiDoc,
    servers: [ctx.api.serverObject!, ...(openApiDoc.servers || [])],
  };
  ctx.res.status(200);
  switch (format) {
    case "YAML":
      ctx.res
        .set("content-type", contenttypes.OPENAPI_YAML)
        .setBody(stringify(openApiDoc));
      break;
    case "HTML":
      ctx.res.redirect(302, "/api.html");
      break;
    default:
      ctx.res
        .set("content-type", contenttypes.OPENAPI_JSON)
        .setBody(openApiDoc);
  }
}

export default { getServiceDesc, getServiceDoc };
