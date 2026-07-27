import type { ExegesisOptions, PromiseController } from 'exegesis';
import type { ExegesisContext } from 'exegesis-express';
import services from '../../../services/index.ts';
import type { EdrFeature, EdrGeoJSON, Feature, FeatureCollection } from '../../../src/types/edr.js';
import { Links } from '../../../src/links.ts';
import type { Return } from '../../../services/types.js';
import type { CoverageJSON, NdArray } from 'coveragejson';
import type { ContentTypeNegotiator } from '../../../src/content-types.ts';
export default {
  // radius
  'get:radius:collection': (ctx) => radius(ctx),
  'post:radius:collection': (ctx) => radius(ctx),
  'get:radius:instance': (ctx) => radius(ctx),
  'post:radius:instance': (ctx) => radius(ctx),
  // cube
  'get:cube:collection': (ctx) => cube(ctx),
  'post:cube:collection': (ctx) => cube(ctx),
  'get:cube:instance': (ctx) => cube(ctx),
  'post:cube:instance': (ctx) => cube(ctx),
  // area
  'get:area:collection': (ctx) => area(ctx),
  'post:area:collection': (ctx) => area(ctx),
  'get:area:instance': (ctx) => area(ctx),
  'post:area:instance': (ctx) => area(ctx),
  // trajectory
  'get:trajectory:collection': (ctx) => trajectory(ctx),
  'post:trajectory:collection': (ctx) => trajectory(ctx),
  'get:trajectory:instance': (ctx) => trajectory(ctx),
  'post:trajectory:instance': (ctx) => trajectory(ctx),
  // corridor
  'get:corridor:collection': (ctx) => corridor(ctx),
  'post:corridor:collection': (ctx) => corridor(ctx),
  'get:corridor:instance': (ctx) => corridor(ctx),
  'post:corridor:instance': (ctx) => corridor(ctx),
  // position
  'get:position:collection': (ctx) => position(ctx),
  'post:position:collection': (ctx) => position(ctx),
  'get:position:instance': (ctx) => position(ctx),
  'post:position:instance': (ctx) => position(ctx),
  // items
  'get:items:collection:list': (ctx) => items(ctx),
  'post:items:collection:list': (ctx) => items(ctx),
  'get:items:collection:item': (ctx) => items(ctx),
  'post:items:collection:item': (ctx) => items(ctx),
  'get:items:instance:list': (ctx) => items(ctx),
  'post:items:instance:list': (ctx) => items(ctx),
  'get:items:instance:item': (ctx) => items(ctx),
  'post:items:instance:item': (ctx) => items(ctx),
  // locations
  'get:locations:collection:list': (ctx) => locations(ctx),
  'post:locations:collection:list': (ctx) => locations(ctx),
  'get:locations:collection:item': (ctx) => locations(ctx),
  'post:locations:collection:item': (ctx) => locations(ctx),
  'get:locations:instance:list': (ctx) => locations(ctx),
  'post:locations:instance:list': (ctx) => locations(ctx),
  'get:locations:instance:item': (ctx) => locations(ctx),
  'post:locations:instance:item': (ctx) => locations(ctx),
} satisfies Record<string, PromiseController>;
async function radius(ctx: ExegesisContext) {
  const { instanceId, collectionId } = ctx.params.path;
  const { output_formats: fallbackFormats, data_queries } = services[collectionId];
  const { handler, output_formats = fallbackFormats } = data_queries.radius!;
  const { within, coords, f: format, 'parameter-name': pNames, crs } = ctx.params.query;
  const { path } = ctx.route;
  const data = await handler({
    within,
    coords,
    instanceId,
    format,
    path,
    'parameter-name': pNames,
    crs,
  });
  return responseHandler(ctx, data, output_formats);
}
async function cube(ctx: ExegesisContext) {
  const { instanceId, collectionId } = ctx.params.path;
  const { output_formats: fallbackFormats, data_queries } = services[collectionId];
  const { handler, output_formats = fallbackFormats } = data_queries.cube!;
  const { f: format, ...params } = ctx.params.query;
  const { path } = ctx.route;
  const data = await handler({ ...params, path, instanceId, format });
  return responseHandler(ctx, data, output_formats);
}
async function area(ctx: ExegesisContext) {
  const { instanceId, collectionId } = ctx.params.path;
  const { output_formats: fallbackFormats, data_queries } = services[collectionId];
  const { handler, output_formats = fallbackFormats } = data_queries.area!;
  const { f: format, ...params } = ctx.params.query;
  const { path } = ctx.route;
  const data = await handler({
    ...params,
    instanceId,
    path,
  });
  return responseHandler(ctx, data, output_formats);
}
async function trajectory(ctx: ExegesisContext) {
  const { instanceId, collectionId } = ctx.params.path;
  const { output_formats: fallbackFormats, data_queries } = services[collectionId];
  const { handler, output_formats = fallbackFormats } = data_queries.trajectory!;
  const { f: format, ...params } = ctx.params.query;
  const { path } = ctx.route;
  const data = await handler({
    ...params,
    path,
    format,
  });
  return responseHandler(ctx, data, output_formats);
}
async function corridor(ctx: ExegesisContext) {
  const { instanceId, collectionId } = ctx.params.path;
  const { output_formats: fallbackFormats, data_queries } = services[collectionId];
  const { handler, output_formats = fallbackFormats } = data_queries.corridor!;
  const { f: format, ...params } = ctx.params.query;
  const { path } = ctx.route;
  const data = await handler({
    ...params,
    format,
    instanceId,
    path,
  });
  return responseHandler(ctx, data, output_formats);
}
async function position(ctx: ExegesisContext) {
  const { instanceId, collectionId } = ctx.params.path;
  const { output_formats: fallbackFormats, data_queries } = services[collectionId];
  const { handler, output_formats = fallbackFormats } = data_queries.position!;
  const { f: format, ...params } = ctx.params.query;
  const { path } = ctx.route;
  const data = await handler({
    ...params,
    format,
    instanceId,
    path,
  });
  return responseHandler(ctx, data, output_formats);
}
async function locations(ctx: ExegesisContext) {
  const { collectionId, ...pathParams } = ctx.params.path;
  const { output_formats: fallbackFormats, data_queries } = services[collectionId];
  const { queryAll, queryOne, output_formats = fallbackFormats } = data_queries.locations!;
  const { f: format, ...queryParams } = ctx.params.query;
  const { path } = ctx.route;
  let action: typeof queryAll | typeof queryOne;
  if ('locId' in pathParams) {
    if (!pathParams.locId) throw ctx.makeError(404, 'Invalid locId');
    action = queryOne;
  } else action = queryAll;
  const data = await action({
    ...queryParams,
    ...pathParams,
    format,
    path,
  });
  return responseHandler(ctx, data, output_formats);
}
async function items(ctx: ExegesisContext) {
  const { collectionId, ...pathParams } = ctx.params.path;
  const { output_formats: fallbackFormats, data_queries } = services[collectionId];
  const { handler, output_formats = fallbackFormats } = data_queries.locations!;
  const { f: format, ...queryParams } = ctx.params.query;
  const { path } = ctx.route;
  if ('itemId' in pathParams && !pathParams.itemId) throw ctx.makeError(404, 'invalid itemId');
  const data = await handler({
    ...queryParams,
    ...pathParams,
    format,
    path,
  });
  return responseHandler(ctx, data, output_formats);
}

function issEdrGeoJSON(data: Return): data is EdrGeoJSON {
  if (isCovJson(data)) return false;
  if (data.type === 'FeatureCollection') {
    return 'parameters' in data;
  }
  return 'edrquerypoint' in (data.properties || {});
}

function updateEdrQueryPoint(ctx: ExegesisContext) {
  return (feature: EdrFeature): EdrFeature => {
    const { locationId = feature.properties.edrqueryendpoint } = ctx.params.path;
    feature.properties.edrqueryendpoint = new Links(ctx).edrqueryendpoint(locationId);
    return feature;
  };
}

function processEdrGeoJSON(ctx: ExegesisContext, data: EdrGeoJSON): EdrGeoJSON {
  if (data.type === 'Feature') return updateEdrQueryPoint(ctx)(data);
  data.features.forEach((feat, i, arr) => {
    arr[i] = updateEdrQueryPoint(ctx)(feat);
  });
  return data;
}

function isCovJson(data: Return): data is Exclude<CoverageJSON, NdArray> {
  if (data.type === 'Coverage') return true;
  if (data.type === 'CoverageCollection') return true;
  if (data.type === 'Domain') return true;
  return false;
}

function responseHandler(ctx: ExegesisContext, data: Return, alternates: ContentTypeNegotiator[]) {
  if (isCovJson(data)) return ctx.res.status(200).setBody(data);
  if (issEdrGeoJSON(data)) data = processEdrGeoJSON(ctx, data);
  data.links = data.links || [];

  data.links.push(...new Links(ctx).self().alternates(alternates).links);
  if (data.type === 'FeatureCollection') {
    data.links.push(...new Links(ctx).pagination(data.features.length).links);
  }

  ctx.res.status(200).setBody(data);
}
