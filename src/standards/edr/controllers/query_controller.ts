import type { PromiseController } from 'exegesis';
import type { ExegesisContext } from 'exegesis-express';
import type { EdrFeature, EdrGeoJSON, Feature, FeatureCollection } from '../edr.d.ts';
import services, { type Return } from '../../../services/index.ts';
import type { CoverageJSON, NdArray } from 'coveragejson';
import buffer from '@turf/buffer';
import { calculateNumberReturned, Links, type Format, contentTypes } from '../../../utils/index.ts';
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
  'get:items:collection:list': (ctx) => itemsQueryAll(ctx),
  'post:items:collection:list': (ctx) => itemsQueryAll(ctx),
  'get:items:collection:item': (ctx) => itemsQueryOne(ctx),
  'post:items:collection:item': (ctx) => itemsQueryOne(ctx),
  'get:items:instance:list': (ctx) => itemsQueryAll(ctx),
  'post:items:instance:list': (ctx) => itemsQueryAll(ctx),
  'get:items:instance:item': (ctx) => itemsQueryOne(ctx),
  'post:items:instance:item': (ctx) => itemsQueryOne(ctx),
  // locations
  'get:locations:collection:list': (ctx) => locationsQueryAll(ctx),
  'post:locations:collection:list': (ctx) => locationsQueryAll(ctx),
  'get:locations:collection:item': (ctx) => locationsQueryOne(ctx),
  'post:locations:collection:item': (ctx) => locationsQueryOne(ctx),
  'get:locations:instance:list': (ctx) => locationsQueryAll(ctx),
  'post:locations:instance:list': (ctx) => locationsQueryAll(ctx),
  'get:locations:instance:item': (ctx) => locationsQueryOne(ctx),
  'post:locations:instance:item': (ctx) => locationsQueryOne(ctx),
} satisfies Record<string, PromiseController>;

async function radius(ctx: ExegesisContext) {
  const {
    path: { instanceId, collectionId },
    query,
  } = ctx.params;
  let {
    output_formats,
    data_queries: { radius },
  } = services[collectionId];
  if (typeof radius === 'function') radius = { fn: radius };
  if (radius?.output_formats) ({ output_formats } = radius);
  const data = await radius!.fn({
    ...query,
    coords: buffer(query.coords, query.within, { units: query['within-units'] })!.geometry,
    instanceId,
    f: query.f,
    path: ctx.route.path,
    'parameter-name': query['parameter-name'],
    crs: query.crs,
    within: query.within,
  });
  return responseHandler(ctx, data, output_formats);
}
async function cube(ctx: ExegesisContext) {
  const {
    path: { instanceId, collectionId },
    query,
  } = ctx.params;
  let {
    output_formats,
    data_queries: { cube },
  } = services[collectionId];
  if (typeof cube === 'function') cube = { fn: cube };
  if (cube?.output_formats) ({ output_formats } = cube);
  const data = await cube!.fn({
    ...query,
    bbox: query.bbox,
    instanceId,
    f: query.f,
    path: ctx.route.path,
    'parameter-name': query['parameter-name'],
    crs: query.crs,
  });
  return responseHandler(ctx, data, output_formats);
}
async function area(ctx: ExegesisContext) {
  const {
    path: { instanceId, collectionId },
    query,
  } = ctx.params;
  let {
    output_formats,
    data_queries: { area },
  } = services[collectionId];
  if (typeof area === 'function') area = { fn: area };
  if (area?.output_formats) ({ output_formats } = area);
  const data = await area!.fn({
    ...query,
    coords: query.coords,
    instanceId,
    f: query.f,
    path: ctx.route.path,
    'parameter-name': query['parameter-name'],
    crs: query.crs,
  });
  return responseHandler(ctx, data, output_formats);
}
async function trajectory(ctx: ExegesisContext) {
  const {
    path: { instanceId, collectionId },
    query,
  } = ctx.params;
  let {
    output_formats,
    data_queries: { trajectory },
  } = services[collectionId];
  if (typeof trajectory === 'function') trajectory = { fn: trajectory };
  if (trajectory?.output_formats) ({ output_formats } = trajectory);
  const data = await trajectory!.fn({
    coords: query.coords,
    instanceId,
    f: query.f,
    path: ctx.route.path,
    'parameter-name': query['parameter-name'],
    crs: query.crs,
    ...query,
  });
  return responseHandler(ctx, data, output_formats);
}
async function corridor(ctx: ExegesisContext) {
  const {
    path: { instanceId, collectionId },
    query,
  } = ctx.params;
  let {
    output_formats,
    data_queries: { corridor },
  } = services[collectionId];
  if (typeof corridor === 'function') corridor = { fn: corridor };
  if (corridor?.output_formats) ({ output_formats } = corridor);
  const data = await corridor!.fn({
    coords: buffer(query.coords, query['corridor-width'] / 2, { units: query['width-units'] })!
      .geometry,
    'corridor-height': query['corridor-height'],
    'corridor-width': query['corridor-width'],
    instanceId,
    f: query.f,
    path: ctx.route.path,
    'parameter-name': query['parameter-name'],
    crs: query.crs,
    ...query,
  });
  return responseHandler(ctx, data, output_formats);
}
async function position(ctx: ExegesisContext) {
  const {
    path: { instanceId, collectionId },
    query,
  } = ctx.params;
  let {
    output_formats,
    data_queries: { position },
  } = services[collectionId];
  if (typeof position === 'function') position = { fn: position };
  if (position?.output_formats) ({ output_formats } = position);
  const data = await position!.fn({
    coords: query.coords,
    instanceId,
    f: query.f,
    path: ctx.route.path,
    'parameter-name': query['parameter-name'],
    crs: query.crs,
    ...query,
  });
  return responseHandler(ctx, data, output_formats);
}

async function locationsQueryAll(ctx: ExegesisContext) {
  const {
    path: { collectionId, instanceId },
    query,
  } = ctx.params;
  const {
    data_queries: { locations },
  } = services[collectionId];

  const data = await locations!.queryAll({
    crs: query.crs,
    path: ctx.route.path,
    f: query.f,
    instanceId,
    ...query,
  });
  return responseHandler(ctx, data, ['JSON', 'GEOJSON']);
}
async function locationsQueryOne(ctx: ExegesisContext) {
  const {
    path: { collectionId, instanceId, locId },
    query,
  } = ctx.params;
  const {
    data_queries: { locations },
    output_formats,
  } = services[collectionId];
  const data = await locations!.queryOne({
    crs: query.crs,
    path: ctx.route.path,
    f: query.f,
    'parameter-name': query['parameter-name'],
    instanceId,
    locId,
    ...query,
  });
  return responseHandler(ctx, data, locations?.output_formats || output_formats);
}
async function itemsQueryAll(ctx: ExegesisContext) {
  const {
    path: { collectionId, instanceId },
    query,
  } = ctx.params;
  const {
    data_queries: { items },
  } = services[collectionId];

  const data = await items!.queryAll({
    crs: query.crs,
    path: ctx.route.path,
    f: query.f,
    instanceId,
    ...query,
  });
  return responseHandler(ctx, data, ['JSON', 'GEOJSON']);
}
async function itemsQueryOne(ctx: ExegesisContext) {
  const {
    path: { collectionId, instanceId, itemId },
    query,
  } = ctx.params;
  const {
    data_queries: { items },
    output_formats,
  } = services[collectionId];
  const data = await items!.queryOne({
    crs: query.crs,
    path: ctx.route.path,
    f: query.f,
    instanceId,
    itemId,
    ...query,
  });
  return responseHandler(ctx, data, items?.output_formats || output_formats);
}

function isEdrGeoJSON(data: Return): data is EdrGeoJSON {
  if (isCovJson(data)) return false;
  if (data.type === 'FeatureCollection') {
    return 'parameters' in data;
  }
  return 'edrqueryendpoint' in (data.properties || {});
}

function updateEdrQueryPoint(ctx: ExegesisContext) {
  return (feature: EdrFeature): EdrFeature => {
    const { locationId = feature.properties.edrqueryendpoint } = ctx.params.path;
    feature.properties.edrqueryendpoint = new Links(ctx).edrqueryendpoint(locationId);
    return feature;
  };
}

function processEdrGeoJSON<T extends EdrGeoJSON>(ctx: ExegesisContext, data: T): T {
  if (data.type === 'Feature') return updateEdrQueryPoint(ctx)(data) as T;
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

function responseHandler(ctx: ExegesisContext, data: Return, alternates: Format[]) {
  if (isCovJson(data)) return ctx.res.status(200).setBody(data);
  const links = new Links(ctx).self().alternates(...alternates);

  if (data.type === 'Feature') {
    if (isEdrGeoJSON(data)) data = processEdrGeoJSON(ctx, data);
  } else {
    for (let i = 0; i < data.features.length; i++) {
      const feature = data.features[i];
      links.toItem(feature.id);
      if (!isEdrGeoJSON(feature)) continue;
      data.features[i] = processEdrGeoJSON(ctx, feature);
    }
    const { length: len } = data.features;
    links.pagination(len);
    const { limit = len, offset = 0 } = ctx.params.query;
    data.numberReturned = calculateNumberReturned(len, limit, offset);
    data.timeStamp = new Date().toJSON();
  }
  if (isGeoJSON(data)) ctx.res.set('content-type', contentTypes.GEOJSON);
  data.links = data.links || [];
  data.links.push(...links.links);
  ctx.res.status(200).setBody(data);
}

function isGeoJSON(data: Return): data is FeatureCollection | Feature | EdrGeoJSON {
  if (data.type === 'Feature') return true;
  if (data.type === 'FeatureCollection') return true;
  return false;
}
