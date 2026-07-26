import type { ExegesisContext } from "exegesis-express";
import { contentTypes } from "../../../src/links/content-types.ts";

export default {
  getServiceDesc: ({ api, ...ctx }: ExegesisContext) => {
    let { openApiDoc } = api;

    ctx.res.status(200).set("content-type", contentTypes.OPENAPI_JSON).setBody(openApiDoc);
  },
  getServiceDoc: (ctx: ExegesisContext) => {},
};
