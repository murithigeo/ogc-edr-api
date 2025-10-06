import type { ExegesisContext } from "exegesis-express";
import type { Dataset } from "../config/index.ts";
import { parseformat } from "../utils/index.ts";
import { Links } from "../links.ts";

async function getItemsAtCollection(ctx: ExegesisContext) {
  const dataset: Dataset = ctx["ectx"].dataset;
  const options = dataset.data_queries.items!;
  const { output_formats } = parseformat(
    ctx,
    options.default_output_format,
    options.output_formats || dataset.output_formats
  );
  const doc = await options.handleAll({ ...ctx["ectx"] });
  const { links } = new Links(ctx).self().alternates(output_formats);
  ctx.res.status(200).setBody({ ...doc, links });
}

async function getItemAtCollection(ctx: ExegesisContext) {
  const dataset: Dataset = ctx["ectx"].dataset;
  const options = dataset.data_queries.items!;
  const { output_formats } = parseformat(
    ctx,
    options.default_output_format,
    options.output_formats || dataset.output_formats
  );
  const doc = await options.handleOne({
    ...ctx["ectx"],
    itemId: ctx.params.path.itemId,
  });
  const { links } = new Links(ctx).self().alternates(output_formats);
  ctx.res.status(200).setBody({ ...doc, links });
}
async function getItemsAtInstance(ctx: ExegesisContext) {
  const dataset: Dataset = ctx["ectx"].dataset;
  const options = dataset.data_queries.items!;
  const { output_formats } = parseformat(
    ctx,
    options.default_output_format,
    options.output_formats || dataset.output_formats
  );
  const doc = await options.handleAll({
    ...ctx["ectx"],
  });
  const { links } = new Links(ctx).self().alternates(output_formats);
  ctx.res.status(200).setBody({ ...doc, links });
}

async function getItemAtInstance(ctx: ExegesisContext) {
  const dataset: Dataset = ctx["ectx"].dataset;
  const options = dataset.data_queries.items!;
  const { output_formats } = parseformat(
    ctx,
    options.default_output_format,
    options.output_formats || dataset.output_formats
  );
  const doc = await options.handleOne({
    ...ctx["ectx"],
    itemId: ctx.params.path.itemId,
  });
  const { links } = new Links(ctx).self().alternates(output_formats);
  ctx.res.status(200).setBody({ ...doc, links });
}

export default {
  //[scope,query_type,instance|collection]
  "all@items@collection": getItemsAtCollection,
  "all@items@instance": getItemsAtInstance,
  "one@items@collection": getItemAtCollection,
  "one@items@instance": getItemAtInstance,
};
