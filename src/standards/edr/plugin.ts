import { toURI } from '@murithigeo/uriproj';
import { type ExegesisPlugin } from 'exegesis';
import type { ExegesisPluginContext } from 'exegesis-express';
import type { BBox } from 'geojson';
import services, { type RadiusConfig, type CorridorConfig } from '../../services/index.ts';
import type { DataQueries } from './edr.d.ts';
import { convert, type Length } from 'convert';
import {
  Referencing,
  parseDatetimeQueryParam,
  parseZQueryParam,
  contentTypes,
  type Format,
} from '../../utils/index.ts';
import {
  Geometry,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from 'wkx';

export default function (): ExegesisPlugin {
  return {
    info: { name: 'x-exegesis-edr-plugin' },
    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        const origin = 'http://' + ctx.req.headers.host;
        ctx.api.serverObject = ctx.api.serverObject || { url: origin };
        const [params, body] = await Promise.all([ctx.getParams(), ctx.getRequestBody()]);
        // eslint-disable-next-line prefer-const
        let { path, query }: { path: PathParams; query: QueryParams } = params;
        if (ctx.req.method?.toUpperCase() === 'POST') {
          query = { ...query, ...body };
          if (body.bbox) query.bbox = body.bbox.split(',').map(parseFloat);
        }

        // eslint-disable-next-line prefer-const
        let { f = 'JSON', crs = toURI('OGC:CRS84'), bbox, z, datetime, coords, ...rest } = query;
        f = f.toUpperCase();
        const { collectionId, instanceId = '' } = path;
        for (const [id, ct] of Object.entries(contentTypes)) {
          if (ct !== f) continue;
          f = id;
          break;
        }
        query.f = f;
        ctx.res.set('content-type', contentTypes[f as Format]);

        if (!('collectionId' in path)) return; // Do no validation for format
        const collection = services[collectionId!];
        if (!collection) throw ctx.makeError(404, 'No such collection');

        const { crs: crsdets, output_formats, distanceunits, instances } = collection;
        if ('instanceId' in path) {
          const exists = await instances.has(instanceId);
          if (typeof exists === 'string') path.instanceId = exists;
          if (exists === false) throw ctx.makeError(404, `instance does not exist`);
        }
        const { operationId } = ctx.api.operationObject!;
        if (!operationId?.includes(':')) return;
        const [, query_type] = operationId!.split(':') as ['get' | 'post', keyof DataQueries];
        // if (query_type === 'instances') return; // What do

        const validNames = Object.keys(collection.parameters);
        if (query['parameter-name']) {
          if (typeof query['parameter-name'] === 'string')
            query['parameter-name'] = Array.from(new Set(query['parameter-name'].split(',')));
          for (const name of query['parameter-name']) {
            if (validNames.includes(name)) continue;
            throw ctx.makeError(400, `invalid parameter-name:${name}`);
          }
        } else query['parameter-name'] = validNames;

        const queryConfig = collection.data_queries[query_type];
        let [crs_details, formats] = [crsdets, output_formats];
        if (typeof queryConfig === 'object') {
          if (queryConfig.crs) crs_details = queryConfig.crs;
          if (queryConfig.output_formats) formats = queryConfig.output_formats;
        }
        if (!queryConfig)
          throw ctx.makeError(404, `collection does not support ${query_type} queries`);

        if (f && !formats.includes(f as Format)) throw ctx.makeError(400, 'invalid output format');

        if (crs === 'native') crs = collection.storageCrs;
        if (crs) {
          try {
            crs = toURI(crs);
          } catch (error) {
            let message = 'Unable to process crs Parameter';
            if (error instanceof Error) ({ message } = error);
            throw ctx.makeError(400, message);
          }
          if (!crs_details.includes(crs)) throw ctx.makeError(400, 'Invalid CRS argument');
          ctx.res.set('content-crs', `<${crs}>`);
        }
        //@ts-expect-error replacing the crs property with an initialized referencing class
        query.crs = new Referencing(collection.storageCrs, crs);
        const toNativeReferencing = new Referencing(crs, collection.storageCrs);
        if (bbox) {
          if (![4, 6].includes(bbox.length)) {
            throw ctx.makeError(400, 'bbox must have 4 or 6 elements');
          }
          if (bbox.length === 6) {
            if (z) throw ctx.makeError(400, '6 item bbox incompatible with z parameter');
            const [, , zmin, , , zmax] = bbox;
            if (!z) z = [zmin, zmax].join('/');
            bbox = [bbox[0], bbox[1], bbox[3], bbox[4]];
          }
          // Convert to native crs in case of processing error thus reduce compute cost
          [bbox[0], bbox[1]] = toNativeReferencing.crs([bbox[0], bbox[1]]);
          [bbox[2], bbox[3]] = toNativeReferencing.crs([bbox[2], bbox[3]]);
        }
        const isUndefined = (v: unknown): v is undefined => v === undefined;

        // Parse coords before parsing z and datetime
        if (coords) {
          const geomTypes = {
            position: ['Point', 'MultiPoint'],
            get radius() {
              return this.position;
            },
            area: ['Polygon', 'MultiPolygon'],
            trajectory: ['LineString', 'MultiLineString'],
            get corridor() {
              return this.trajectory;
            },
          } as Record<keyof DataQueries, GeoJSON.GeoJsonGeometryTypes[]>;
          let geometry: Geometry;
          let geojson: GeoJSON.Geometry;
          try {
            geometry = Geometry.parse(coords);
            //@ts-expect-error Geometry.toGeoJSON returns a plain object
            geojson = geometry.toGeoJSON();
          } catch (err) {
            let message = 'Invalid WKT string';
            if (err instanceof Error) ({ message } = err);
            throw ctx.makeError(400, message);
          }
          if (!geomTypes[query_type].includes(geojson.type)) {
            throw ctx.makeError(400, `${query_type} does not support ${geojson.type} geometries`);
          }
          const measures: number[] = [];
          const elevations: number[] = [];
          const validatePoint = (v: Point) => {
            if (isUndefined(v.x) || isUndefined(v.y)) {
              throw ctx.makeError(400, `WKT must not be EMPTY`);
            }
            if (isNaN(v.x) || isNaN(v.y)) {
              throw ctx.makeError(400, `WKT MUST only contain Numeric values`);
            }
            if (!isUndefined(v.z)) {
              if (isNaN(v.z)) throw ctx.makeError(400, `WKT MUST only contain Numeric values`);
              if (z) throw ctx.makeError(400, `Z-dim Geometry and z parameter are incompatible`);
              elevations.push(v.z);
            }
            if (!isUndefined(v.m)) {
              if (isNaN(v.m)) throw ctx.makeError(400, `WKT MUST only contain Numeric values`);
              if (datetime) {
                throw ctx.makeError(400, `M-dim Geometry and datetime parameter are incompatible`);
              }
              measures.push(v.m);
            }
          };
          if (geometry instanceof Point) validatePoint(geometry);
          if (geometry instanceof MultiPoint) geometry.points.forEach((p) => validatePoint(p));
          if (geometry instanceof LineString) geometry.points.forEach((p) => validatePoint(p));
          if (geometry instanceof MultiLineString) {
            geometry.lineStrings.forEach((ls) => ls.points.forEach((p) => validatePoint(p)));
          }
          if (geometry instanceof Polygon) {
            geometry.exteriorRing.forEach((ring) => validatePoint(ring));
            geometry.interiorRings.forEach((ring) => ring.forEach((p) => validatePoint(p)));
          }
          if (geometry instanceof MultiPolygon) {
            geometry.polygons.forEach((polygon) => {
              polygon.exteriorRing.forEach((p) => validatePoint(p));
              polygon.interiorRings.forEach((ring) => ring.forEach((p) => validatePoint(p)));
            });
          }

          if (!z) z = elevations.join(',');
          if (!datetime) datetime = measures.join(',');
          //@ts-expect-error expects string but is a geojson
          query.coords = toNativeReferencing.geometry(geojson);
        }
        if (z) query.z = parseZQueryParam(z);
        if (datetime) query.datetime = parseDatetimeQueryParam(datetime);

        if (query_type === 'corridor') {
          let height_units: Length[] = distanceunits;
          let width_units: Length[] = distanceunits;
          if (typeof queryConfig === 'object') {
            ({ height_units = distanceunits, width_units = distanceunits } = queryConfig as Exclude<
              CorridorConfig,
              Function
            >);
          }
          if (!width_units.includes(rest['width-units']!)) {
            throw ctx.makeError(400, 'invalid width-units');
          }
          if (!height_units.includes(rest['height-units']!)) {
            throw ctx.makeError(400, 'invalid width-units');
          }
          query['corridor-width'] = Math.abs(Number(query['corridor-width']));
          query['corridor-height'] = Math.abs(Number(query['corridor-height']));
          if (isNaN(query['corridor-width'])) {
            throw ctx.makeError(400, 'corridor-width must be a number');
          }
          if (isNaN(query['corridor-height'])) {
            throw ctx.makeError(400, 'corridor-width must be a number');
          }
          query['corridor-height'] = convert(query['corridor-height'], query['height-units']!).to(
            'meters',
          );
          query['corridor-width'] = convert(query['corridor-height'], query['width-units']!).to(
            'meters',
          );
          query['width-units'] = 'meters';
          query['height-units'] = 'meters';
        }
        if (query_type === 'radius') {
          let within_units = distanceunits;
          if (typeof queryConfig === 'object') {
            ({ within_units = distanceunits } = queryConfig as Exclude<RadiusConfig, Function>);
          }
          if (!within_units.includes(rest['within-units']!)) {
            throw ctx.makeError(400, 'invalid within-units');
          }
          query.within = Math.abs(convert(rest.within!, rest['within-units']!).to('meters'));
          query['within-units'] = 'meters';
        }
        if (!isUndefined(rest['resolution-x'])) {
          query['resolution-x'] = Number(rest['resolution-x']);
        }
        if (!isUndefined(rest['resolution-y'])) {
          query['resolution-y'] = Number(rest['resolution-y']);
        }
        if (!isUndefined(rest['resolution-z'])) {
          query['resolution-z'] = Number(rest['resolution-z']);
        }
        params.query = query;
        params.path = path;
      },
    }),
  };
}

interface QueryParams extends Partial<Record<`resolution-${'x' | 'y' | 'z'}`, string | number>> {
  coords?: string;
  crs?: string;
  bbox?: BBox;
  f?: string;
  'parameter-name'?: string | string[];
  z?: string;
  'corridor-width'?: number;
  'corridor-height'?: number;
  within?: number;
  'within-units'?: Length;
  'height-units'?: Length;
  'width-units'?: Length;
  datetime?: string;
  offset?: string | number; //todo (stringButInteger)
  limit?: string | number; //todo (stringButInteger)
}

interface PathParams {
  collectionId?: string;
  instanceId?: string;
  locId?: string;
  itemId?: string;
}
