import type { ExegesisContext } from "exegesis-express";
import { contenttypes } from "./constants.ts";

export default function parseformat<T extends keyof typeof contenttypes>(
  ctx: ExegesisContext,
  default_output_format: T,
  output_formats: Array<T> = [default_output_format]
): { format: T; output_formats: T[] } {
  let format: T | undefined;
  const param = (ctx.params.query.f || default_output_format).toUpperCase();
  for (const k of Object.keys(contenttypes) as Array<T>) {
    if (contenttypes[k] === param) format = k;
    else if (k === param) format = k;
    // if(f)
  }

  if (!format) {
    throw ctx.makeValidationError(`Invalid f option`, {
      in: "query",
      name: "f",
      docPath: ctx.api.pathItemPtr,
    });
  }
  // ctx.params.query.f = f;
  ctx["ectx"]["format"] = format;
  ctx.res.set("content-type", contenttypes[format]);
  return {
    format,
    output_formats,
  };
}
