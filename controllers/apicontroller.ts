import type { ExegesisContext } from "exegesis-express";
import {
  contenttypes,
  generateOpenApiDoc,
  parseformat,
} from "../utils/index.ts";
import { stringify, parse } from "yaml";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const asyncapidoc = fs.readFileSync(
  path.join(process.cwd(), "asyncapi.yaml"),
  "utf-8"
);
function getServiceDoc(ctx: ExegesisContext): void {
  ctx.res
    .status(200)
    .set("content-type", "text/html")
    .setBody(generateOpenApiDoc({ url: `/api?f=json` }));
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

function getAsyncDesc(ctx: ExegesisContext) {
  const { format } = parseformat(ctx, "JSON", ["JSON", "YAML"]);
  let doc;
  switch (format) {
    case "JSON":
      doc = parse(asyncapidoc);
      break;
    case "YAML":
      doc = asyncapidoc;
      break;
  }
  ctx.res.status(200).setBody(doc);
}
function getAsyncDoc(ctx: ExegesisContext) {
  parseformat(ctx, "HTML", ["HTML"]);
  ctx.res
    .status(200)
    .setBody(generateOpenApiDoc({ sources: [{ url: "/asyncapi" }] }));
}
export default { getServiceDesc, getServiceDoc, getAsyncDesc,getAsyncDoc };
