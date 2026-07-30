import type { BBox, Point } from 'geojson';
import type { Dataset } from '../types.d.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'yaml';
import calcBbox from '@turf/bbox';
import { HttpError } from 'exegesis';
import bboxPolygon from '@turf/bbox-polygon';
import { geometryIntersects, zIntersects } from '../../src/boolean-intersects/index.ts';
import { toURI } from '@murithigeo/uriproj';
import type { Extent } from '../types.d.ts';
import geometry from '../../src/boolean-intersects/geometry.ts';
import type { EdrFeature, Feature } from '../../src/types/edr.d.ts';
import type { Z } from '../../src/z-parse.ts';
type Mountain = Feature<
  Point,
  {
    feet: number;
    meters: number;
    name: string;
    regions: string[] | null;
    states: string[] | null;
    countries: string[] | null;
    continent: string;
  }
>;
interface SliceProps {
  bbox: BBox;
  z: number[];
}
const features = await fs
  .readFile(path.resolve(import.meta.dirname, './mountains.yaml'), { encoding: 'utf-8' })
  .then((val) => {
    return (yaml.parse(val).features as Mountain[])
      .map((p) => {
        p.properties.countries = p.properties.countries ?? [];
        return p;
      })
      .sort((a, b) => a.properties.name.localeCompare(b.properties.name));
  });
const bbox = calcBbox({ type: 'FeatureCollection', features });
const continents = Object.entries(
  Object.groupBy(features, ({ properties }) => properties.continent),
).reduce(
  (l: Record<string, SliceProps>, r) => ({
    ...l,
    [r[0]]: {
      z: Array.from(new Set(r[1]!.map((e) => e.properties.meters))),
      bbox: calcBbox({ type: 'FeatureCollection', features: r[1]! }),
    },
  }),
  {},
);

const countries = Object.entries(
  Object.groupBy(
    features.flatMap((f) =>
      (f.properties.countries || []).map((country) => ({
        ...f,
        properties: { ...f.properties, country },
      })),
    ),
    ({ properties }) => properties.country,
  ),
).reduce(
  (l: Record<string, SliceProps>, r) => ({
    ...l,
    [r[0]]: {
      z: Array.from(new Set(r[1]!.map((f) => f.properties.meters))),
      bbox: calcBbox({ type: 'FeatureCollection', features: r[1]! }),
    },
  }),
  {},
);

const parameters: Dataset['parameters'] = {};

const [crs, vrs] = ['OGC:CRS84', 'EPSG:5773'].map(toURI);

export const mountains = {
  id: 'mountains',
  title: 'World mountains',
  description: 'An EDR queriable dataset of world mountains',
  storageCrs: crs,
  crs: ['OGC:CRS84', 'EPSG:4326'],
  keywords: ['mountains', 'ranges', 'elevations'],
  output_formats: ['GEOJSON', 'JSON'],
  distanceunits: ['meters', 'kilometers'],
  parameters: {},
  instances: {
    default_output_format: 'JSON',
    has(instanceId) {
      if (['', 'default', 'latest'].includes(instanceId)) return 'Africa';
      return !!continents[instanceId];
    },
    handler(instanceId) {
      if (instanceId) {
        const { bbox, z } = continents[instanceId];
        if (!bbox) throw new HttpError(404, 'No such instance');
        return [
          {
            id: instanceId,
            temporal: null,
            vertical: { values: z, vrs },
            spatial: { bbox: [bbox], crs },
          },
        ];
      }

      return Object.entries(continents).map(([id, vals]): Extent => {
        return {
          id,
          spatial: {
            bbox: [vals.bbox],
          },
          temporal: null,
          vertical: { values: vals.z, vrs },
        };
      });
    },
  },
  extent: {
    id: 'mountains',
    spatial: {
      bbox: [bbox, ...Object.values(continents).map((x) => x.bbox)],
    },
    vertical: {
      vrs: 'EPSG:5773',
      values: Array.from(new Set(Object.values(continents).flatMap((v) => v.z))),
    },
    temporal: null,
  },
  data_queries: {
    locations: {
      multi: true,
      has(locId) {
        const locations = locId.split(',');
        return locations.some((loc) => !Object.keys(countries).includes(loc));
      },
      queryOne(e) {
        const locations = e.locId.split(',');
        const matching = features.filter(({ properties: { countries } }) =>
          locations.some((locId) => countries?.includes(locId)),
        );
        return {
          type: 'FeatureCollection',
          timeStamp: new Date().toJSON(),
          features: matching.map((f) => ({
            ...f,
            id: f.properties.name,
            properties: {
              edrqueryendpoint: f.properties.countries?.[0],
              'parameter-name': Object.keys(parameters),
            },
          })),
          parameters: [],
        };
      },
      queryAll(e) {
        const matching = Object.entries(countries)
          .filter((v) => geometryIntersects(e.bbox)(v[1].bbox))
          .map(([id, vals]) => bboxPolygon(vals.bbox, { id: id!, properties: {} }))
          .map(
            ({ id, ...feature }): EdrFeature => ({
              ...feature,
              id: id!,
              properties: {
                edrqueryendpoint: id!.toString(),
                datetime: '',
                'parameter-name': Object.keys(parameters),
                label: id!.toString(),
              },
            }),
          );
        return {
          type: 'FeatureCollection',
          features: matching.map((f) => e.crs.feature(f)),
          timeStamp: new Date().toJSON(),
          parameters: [],
        };
      },
    },
    trajectory(e) {
      const matched = features
        .filter(instanceIdCheck(e.instanceId))
        .filter(geometry(e.coords))
        .filter(zChecker(e.z));
      return {
        type: 'FeatureCollection',
        parameters: Object.values(parameters),
        timeStamp: new Date().toJSON(),
        features: matched.map(featureToEdrFeature).map((f) => e.crs.feature(f)),
      };
    },

    items: {
      has: (val) => !!features.find((e) => e.properties.name === val),
      queryAll(e) {
        const matched = features.filter(instanceIdCheck(e.instanceId)).filter(geometry(e.bbox));
        const { limit = matched.length, offset = 0 } = e;

        return {
          type: 'FeatureCollection',
          timeStamp: new Date().toJSON(),
          features: matched
            .slice(offset, offset + limit)
            .map(featureToEdrFeature)
            .map((f) => e.crs.feature(f)),
        };
      },
      queryOne(e) {
        const item = features
          .filter(instanceIdCheck(e.instanceId))
          .find((f) => f.properties.name === e.itemId);
        return e.crs.feature(featureToEdrFeature(item!));
      },
    },
    cube(e) {
      const matching = features
        .filter(instanceIdCheck(e.instanceId))
        .filter(geometry(e.bbox))
        .filter(zChecker(e.z));
      return {
        type: 'FeatureCollection',
        timeStamp: new Date().toJSON(),
        features: matching.map(featureToEdrFeature).map((f) => e.crs.feature(f)),
      };
    },
    radius(e) {
      const matching = features
        .filter(instanceIdCheck(e.instanceId))
        .filter(zChecker(e.z))
        .filter(geometry(e.coords));
      return {
        type: 'FeatureCollection',
        features: matching.map(featureToEdrFeature).map(e.crs.feature),
      };
    },

    corridor(e) {
      const matched = features
        .filter(instanceIdCheck(e.instanceId))
        .filter((f) => f.properties.meters <= e['corridor-height'])
        .filter(geometry(e.coords));

      return {
        type: 'FeatureCollection',
        features: matched.map(featureToEdrFeature).map((f) => e.crs.feature(f)),
        timeStamp: new Date().toJSON(),
        parameters,
      };
    },
    position(e) {
      const matching = features
        .filter(instanceIdCheck(e.instanceId))
        .filter(zChecker(e.z))
        .filter(geometry(e.coords));
      return {
        type: 'FeatureCollection',
        features: matching.map(featureToEdrFeature).map((f) => e.crs.feature(f)),
      };
    },
    area(e) {
      const matching = features
        .filter(instanceIdCheck(e.instanceId))
        .filter(zChecker(e.z))
        .filter(geometry(e.coords));
      return {
        type: 'FeatureCollection',
        features: matching.map(featureToEdrFeature).map(e.crs.feature),
      };
    },
  },
} as Dataset;

function instanceIdCheck(instanceId?: string) {
  return (f: Mountain): boolean => (!instanceId ? true : f.properties.continent === instanceId);
}

function featureToEdrFeature(feature: Mountain): EdrFeature {
  return {
    ...feature,
    id: feature.properties.name,
    properties: {
      datetime: '',
      edrqueryendpoint: feature.properties.continent,
      label: feature.properties.name,
      'parameter-name': Object.keys(parameters),
    },
  };
}

function zChecker(z?: Z) {
  return (f: Mountain): boolean => zIntersects(z)(f.properties.meters);
}
