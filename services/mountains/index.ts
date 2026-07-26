import type { BBox, Feature, FeatureCollection, Point } from "geojson";
import type {
  CorridorConfig,
  Dataset,
  LocationsConfig,
  TrajectoryConfig,
  WithRequiredProperty,
} from "../types.d.ts";
import fs from "node:fs/promises";
import path from "node:path";
import yaml from "yaml";
import calcBbox from "@turf/bbox";
import { HttpError } from "exegesis";
import numberReturned from "../../utils/numberReturned.ts";
import bboxPolygon from "@turf/bbox-polygon";
import { geometryIntersects, zIntersects } from "../../src/boolean-intersects/index.ts";
import { toURI } from "@murithigeo/uriproj";
import type { Extent } from "../types.d.ts";
import corridorBuffer from "../../src/corridor-buffer.ts";
import geometry from "../../src/boolean-intersects/geometry.ts";
import type { EdrFeature } from "../../src/types/edr.js";
import type { Z } from "../../src/plugins/z.ts";
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
let bbox: BBox;
interface SliceProps {
  bbox: BBox;
  z: number[];
}

const features = await fs
  .readFile(path.resolve(import.meta.dirname, "./mountains.yaml"), { encoding: "utf-8" })
  .then((val) => {
    return (yaml.parse(val).features as Mountain[])
      .map((p) => {
        p.properties.countries = p.properties.countries ?? [];
        return p;
      })
      .sort((a, b) => a.properties.name.localeCompare(b.properties.name));
  });
bbox = calcBbox({ type: "FeatureCollection", features });
const continents = Object.entries(
  Object.groupBy(features, ({ properties }) => properties.continent),
).reduce(
  (l: Record<string, SliceProps>, r) => ({
    ...l,
    [r[0]]: {
      z: Array.from(new Set(r[1]!.map((e) => e.properties.meters))),
      bbox: calcBbox({ type: "FeatureCollection", features: r[1]! }),
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
      bbox: calcBbox({ type: "FeatureCollection", features: r[1]! }),
    },
  }),
  {},
);

let parameters: Dataset["parameters"] = {};

const [crs, vrs] = ["OGC:CRS84", "EPSG:5773"].map(toURI);

const locations: LocationsConfig<"GEOJSON" | "JSON" | "COVERAGEJSON"> = {
  output_formats: ["JSON", "GEOJSON", "COVERAGEJSON"],
  default_output_format: "GEOJSON",
  multi: true,
  handler(e) {
    if ("locationId" in e) {
      const locations = e.locationId.split(",");
      let matching: Mountain[] = [];
      for (let location of locations) {
        const country = countries[location];
        if (!country) throw new HttpError(400, `${location} does not exist`);
        matching.push(...features.filter((f) => f.properties.countries?.includes(location)));
      }
      return {
        type: "FeatureCollection",
        timeStamp: new Date().toJSON(),
        features: matching.map((f) => ({
          ...f,
          id: f.properties.name,
          properties: {
            edrqueryendpoint: f.properties.countries?.[0],
            "parameter-name": Object.keys(parameters),
          },
        })),
        numberMatched: matching.length,
        numberReturned: numberReturned(matching.length, matching.length, 0),
      };
    }
    const matching = Object.entries(countries)
      .filter((v) => geometryIntersects(e.bbox)(v[1].bbox))
      .map(([id, vals]) => bboxPolygon(vals.bbox, { id, properties: {} }));
    return {
      type: "FeatureCollection",
      features: matching,
      numberMatched: matching.length,
      numberReturned: numberReturned(matching.length, matching.length, 0),
      timeStamp: new Date().toJSON(),
    };
  },
};
const corridor: CorridorConfig<"GEOJSON" | "JSON"> = {
  width_units: ["meters"],
  height_units: ["meters"],
  default_output_format: "JSON",
  handler(e) {
    e.format;
    const matched = features
      .filter(instanceIdCheck(e.instanceId))
      .filter((f) => f.properties.meters <= e["corridor-height"])
      .filter((f) => geometry(corridorBuffer(e.coords, e["corridor-width"])));
    return {
      type: "FeatureCollection",
      numberMatched: matched.length,
      numberReturned: numberReturned(matched.length, matched.length, 0),
      features: matched.map(featureToEdrFeature),
      timeStamp: new Date().toJSON(),
      parameters,
    };
  },
};
const trajectory: TrajectoryConfig<"GEOJSON" | "JSON"> = {
  default_output_format: "GEOJSON",
  handler(e) {
    const matched = features
      .filter(instanceIdCheck(e.instanceId))
      .filter(geometry(e.coords))
      .filter(zChecker(e.z));
    return {
      type: "FeatureCollection",
      numberMatched: matched.length,
      numberReturned: numberReturned(matched.length, matched.length, 0),
      parameters: Object.values(parameters),
      timeStamp: new Date().toJSON(),
      features: matched.map(featureToEdrFeature),
    };
  },
};
export const mountains: Dataset = {
  id: "mountains",
  title: "World mountains",
  description: "An EDR queriable dataset of world mountains",
  storageCrs: crs,
  crs: ["OGC:CRS84", "EPSG:4326"],
  keywords: ["mountains", "ranges", "elevations"],
  output_formats: ["GEOJSON", "COVERAGEJSON", "JSON"],
  parameters: {},
  queryExtent() {
    return {
      id: this.id,
      spatial: {
        bbox: [bbox, ...Object.values(continents).map((x) => x.bbox)],
        crs: this.storageCrs,
      },
      vertical: {
        vrs: "EPSG:5773",
        values: Array.from(new Set(Object.values(continents).flatMap((v) => v.z))),
      },
      temporal: null,
    };
  },
  data_queries: {
    locations,
    instances: {
      handleDefaultInstanceId: () => "",
      default_output_format: "JSON",
      hasInstanceId(instanceId) {
        return !!continents[instanceId];
      },
      queryExtent(instanceId) {
        if (instanceId) {
          const { bbox, z } = continents[instanceId];
          if (!bbox) throw new HttpError(404, "No such instance");
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
              crs,
            },
            temporal: null,
            vertical: { values: vals.z, vrs },
          };
        });
      },
    },
    corridor,
  },
};

function instanceIdCheck(instanceId?: string) {
  return (f: Mountain): boolean => (!instanceId ? true : f.properties.continent === instanceId);
}

function featureToEdrFeature(feature: Mountain): EdrFeature {
  return {
    ...feature,
    properties: {
      datetime: "",
      edrqueryendpoint: `/mountains/instances/${feature.properties.continent}/locations/${feature.properties.continent}`,
      label: { en: feature.properties.name },
      "parameter-name": Object.keys(parameters),
    },
  };
}

function zChecker(z?: Z) {
  return (f: Mountain): boolean => zIntersects(z)(f.properties.meters);
}
