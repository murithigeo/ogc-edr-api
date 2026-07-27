import { toURI } from '@murithigeo/uriproj';
import { type ExegesisPlugin } from 'exegesis';
import type { ExegesisPluginContext } from 'exegesis-express';
import type { BBox } from 'geojson';
import services from '../../services/index.ts';
import type { DataQueries } from '../../src/types/edr.js';
import { convert, type Length } from 'convert';
import type { CorridorConfig, RadiusConfig } from '../../services/types.js';
import { Referencing } from '../../utils/reprojection.ts';
import zParse from '../../src/z-parse.ts';
import datetimeParse from '../../src/datetime-parse.ts';
import {
  Geometry,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from 'wkx';
import { contentTypes, type ContentTypeNegotiator } from '../../src/content-types.ts';

export default function (): ExegesisPlugin {
  return {
    info: { name: 'x-exegesis-edr-plugin' },

    makeExegesisPlugin: () => ({
      postSecurity: async (ctx: ExegesisPluginContext) => {
        // todo check if it would be better elsewhere
        const origin = 'http://' + ctx.req.headers.host;
        ctx.api.serverObject = ctx.api.serverObject || { url: origin };
        let { path, query }: { path: PathParams; query: QueryParams } = await ctx.getParams();
        let { f = 'JSON', crs = toURI('OGC:CRS84'), bbox, z, datetime, coords, ...rest } = query;
        let { collectionId, instanceId = '' } = path;
        for (const [id, ct] of Object.entries(contentTypes)) {
          if (ct !== f) continue;
          f = id;
          break;
        }
        query.f = f;
        ctx.res.set('content-type', contentTypes[f as ContentTypeNegotiator]);

        if (!('collectionId' in path)) return; // Do no validation for format
        const collection = services[collectionId!];
        if (!collection) throw ctx.makeError(404, 'No such collection');

        if ('instanceId' in path) {
          const { instances } = collection.data_queries;
          if (['', 'default', 'latest'].includes(instanceId)) {
            instanceId = instances.defaultInstanceId;
          }
          const existing = instances.hasInstanceId(instanceId);
          if (!existing) throw ctx.makeError(404, 'Requested instance does not exist');
        }

        const { operationId } = ctx.api.operationObject!;
        if (!operationId?.includes(':')) return;
        const [method, query_type] = operationId?.split(':')! as [
          'get' | 'post',
          keyof DataQueries,
          'collection' | 'instance',
        ];
        // if (query_type === 'instances') return; // What do

        if (method === 'post') {
          const body = await ctx.getRequestBody();
          query = { ...query, ...body };
          if (body.bbox) query.bbox = body.bbox.split(',').map(parseFloat);
        }
        if ('parameter-name' in query) {
          const validNames = Object.keys(collection.parameters);
          if (query['parameter-name']) {
            if (typeof query['parameter-name'] === 'string')
              query['parameter-name'] = Array.from(new Set(query['parameter-name'].split(',')));
            for (let name of query['parameter-name']) {
              if (validNames.includes(name)) continue;
              throw ctx.makeError(400, `invalid parameter-name:${name}`);
            }
          } else query['parameter-name'] = validNames;
        }

        const queryConfig = collection.data_queries[query_type];
        if (!queryConfig)
          throw ctx.makeError(404, `collection does not support ${query_type} queries`);
        if (f) {
          const { output_formats = collection.output_formats } = queryConfig;
          if (!output_formats.includes(f.toUpperCase() as ContentTypeNegotiator)) {
            throw ctx.makeError(400, 'invalid output format');
          }
        }
        if ('crs' in query) {
          const { crs: crsList = collection.crs } = queryConfig;
          if (!crsList.includes(crs)) throw ctx.makeError(400, 'Invalid CRS argument');
          ctx.res.set('content-crs', `<${crs}>`);
        }
        const referencing = new Referencing(crs, collection.storageCrs);
        if (bbox) {
          if (![4, 6].includes(bbox.length)) {
            throw ctx.makeError(400, 'bbox must have 4 or 6 elements');
          }
          if (bbox.length === 6) {
            if (z) throw ctx.makeError(400, '6 item bbox incompatible with z parameter');

            let [, , zmin, , , zmax] = bbox;
            if (!z) z = [zmin, zmax].join('/');
            bbox = [bbox[0], bbox[1], bbox[3], bbox[4]];
          }
          // Convert to native crs in case of processing error thus reduce compute cost
          [bbox[0], bbox[1]] = referencing.crs([bbox[0], bbox[1]]);
          [bbox[2], bbox[3]] = referencing.crs([bbox[2], bbox[3]]);
        }
        const isUndefined = <T>(v: any): v is undefined => v === undefined;

        // Parse coords before parsing z and datetime
        if (coords) {
          const geomTypes = {
            position: [Point, MultiPoint],
            get radius() {
              return this.position;
            },
            area: [Point, MultiPolygon],
            trajectory: [LineString, MultiLineString],
            get corridor() {
              return this.trajectory;
            },
            instances: [],
            items: [],
            locations: [],
            cube: [],
          } satisfies Record<keyof DataQueries, (typeof Geometry)[]>;
          let geometry: Geometry;
          try {
            geometry = Geometry.parse(coords);
            for (const i of geomTypes[query_type]) {
              if (geometry instanceof i) continue;
              throw Error(`${query_type} does not support this geometry type`);
            }
          } catch (err: any) {
            throw ctx.makeError(400, err.message);
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
          query.coords = referencing.geomReproject(geometry.toGeoJSON());
        }
        //@ts-expect-error Expects query.z to be string
        if (z) query.z = zParse(z);
        //@ts-expect-error Expects query.datetime to be string
        if (datetime) query.datetime = datetimeParse(datetime);
        if (query_type === 'corridor') {
          const {
            width_units = collection.distanceunits,
            height_units = collection.distanceunits,
          } = queryConfig as CorridorConfig;
          if (!width_units.includes(rest['width-units']!)) {
            throw ctx.makeError(400, 'invalid width-units');
          }
          if (!height_units.includes(rest['height-units']!)) {
            throw ctx.makeError(400, 'invalid width-units');
          }
          query['corridor-width'] = Number(query['corridor-width']);
          query['corridor-height'] = Number(query['corridor-height']);
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
          const { within_units = collection.distanceunits } = queryConfig as RadiusConfig;
          if (!within_units.includes(rest['within-units']!)) {
            throw ctx.makeError(400, 'invalid within-units');
          }
          query.within = convert(rest.within!, rest['within-units']!).to('meters');
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
