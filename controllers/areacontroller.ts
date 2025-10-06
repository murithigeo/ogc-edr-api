import { parseformat } from "../utils/index.ts";
import type { ExegesisContext } from "exegesis-express";
import type { Dataset } from "../config/index.ts";
import { Links } from "../links.ts";

async function getAreaAtCollection(ctx: ExegesisContext) {
  const dataset: Dataset = ctx["ectx"].dataset;
  const options = dataset.data_queries.area!;
  const { output_formats } = parseformat(
    ctx,
    options.default_output_format,
    options.output_formats || dataset.output_formats,
  );
  const doc = await options.handler({ ...ctx["ectx"] });
  const { links } = new Links(ctx).self().alternates(output_formats);
  ctx.res.status(200).setBody({ ...doc, links });
}
async function getAreaAtInstance(ctx: ExegesisContext) {
  const dataset: Dataset = ctx["ectx"].dataset;
  const options = dataset.data_queries.area!;
  const { output_formats } = parseformat(
    ctx,
    options.default_output_format,
    options.output_formats || dataset.output_formats,
  );
  const doc = await options.handler({ ...ctx["ectx"] });
  const { links } = new Links(ctx).self().alternates(output_formats);
  ctx.res.status(200).setBody({ ...doc, links });
}
export default {
  "all@area@collection": getAreaAtCollection,
  "all@area@instance": getAreaAtInstance,
};
