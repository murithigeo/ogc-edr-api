import {
  bboxPolygon,
  CRS84,
  elevationFilter,
  type Feature,
  geometryIntersects,
  numberReturned,
  reproject,
} from "../utils/index.ts";
import type { Dataset } from "./index.ts";
import { bbox } from "@turf/bbox";
import { HttpError } from "exegesis";
import { corridorFilter, radiusFilter } from "./filters.ts";
import mountains from "./mountains.json" with { type: "json" };

const features: Array<Feature<GeoJSON.Point, {
  feet: number;
  meters: number;
  name: string;
  regions: string[] | null;
  states: string[] | null;
  countries: string[];
  continent: string;
}>> = mountains.features
  .map((p) => ({
    ...p,
    properties: { ...p.properties, countries: p.properties.countries || [] },
    id: p.properties.name
  }))
  .sort((a, b) =>
    a.properties.name.localeCompare(b.properties.name)
  )

  // TODO, data from fapar is leaking into props
export default {
  id: "mountains",
  crs: ["OGC:CRS84", "EPSG:4326"],
  output_formats: ["JSON", "GEOJSON", "HTML"],
  storageCrs: "OGC:CRS84",
  description: "features",
  keywords: ["features"],
  parameters: [],
  getExtent() {
    return Promise.resolve({
      id: this.id,
      spatial: {
        bbox: [bbox({ type: "FeatureCollection", features })],
        crs: "OGC:CRS84",
      },
      vertical: {
        vrs: CRS84,
        values: features.map((f) => f.properties.meters),
      },
      temporal: null,
    });
  },

  data_queries: {
    locations: {
      multi: true,
      output_formats: ["GEOJSON", "JSON"],
      default_output_format: "JSON",
      allowAt: ["collection", "instance"],
      handleAll(opts) {
        const matched = Object.groupBy(
          features
            .filter(instanceIdChecker(opts.instanceId))
            .filter(elevationFilter(opts?.z, "meters"))
            .filter(geometryIntersects(opts.bbox))
            .flatMap((primary) =>
              primary.properties.countries.map((p) => ({
                ...primary,
                properties: { ...primary.properties, country: p },
              }))
            ),
          ({ properties }) => properties.country,
        );
        const length = Object.keys(matched).length;
        return Promise.resolve({
          type: "FeatureCollection",
          timeStamp: new Date().toISOString(),
          numberMatched: length,
          numberReturned: numberReturned(length, length, 0),
          features: Object.entries(matched).map(([id, features]) => ({
            ...bboxPolygon(
              bbox({ type: "FeatureCollection", features: features! })
            ), id
          }))
        });
      },
      handlerOne(opts) {
        const featuresByInstance = features.filter(instanceIdChecker(opts.instanceId));

        const allIds = Array.from(
          new Set(featuresByInstance.flatMap((p) => p.properties.countries)),
        );
        const activeIds = opts.locationId.split(",");
        const invalidIds = activeIds.filter((id) => !allIds.includes(id));
        if (invalidIds.length > 0) throw new HttpError(404, "Invalid locId");
        const matched = features
          // .filter(instanceIdChecker(opts.instanceId))
          .filter((feature) =>
            activeIds.some((id) => feature.properties.countries.includes(id))
          );

        let str = "/collections/features";
        if (opts.instanceId) str += `/instances/${opts.instanceId}`;
        str += `/locations`;
        return Promise.resolve({
          type: "FeatureCollection",
          numberMatched: matched.length,
          numberReturned: numberReturned(matched.length, matched.length, 0),
          timeStamp: new Date().toISOString(),
          features: matched.map(reproject("OGC:CRS84", opts.crs)).map((p) => ({
            ...p,
            properties: {
              ...p.properties,
              edrqueryendpoint: new URL(
                `${opts.server}${str}/${p.properties.countries[0]}`,
              ).toJSON(),
              datetime: "",
              parameters: [],
              label: {
                en: p.properties.name,
              },
            },
          })),
        });
      },
    },
    instances: {
      default_instanceid: "Africa",
      default_output_format: "JSON",
      output_formats: ["JSON", "YAML"],
      allowAt: ["collection", "instance"],

      handler(opts) {
        return Promise.resolve(Object.entries(
          Object.groupBy(
            features
              .filter((c) => c.properties.continent !== null)
              .filter(instanceIdChecker(opts.instanceId)),
            ({ properties: { continent } }) => continent!,
          ),
        ).map(([continent, catValues]) => ({
          id: continent,
          temporal: null,
          spatial: {
            bbox: [bbox({ type: "FeatureCollection", features: catValues! })],
            crs: "OGC:CRS84",
          },
          vertical: {
            vrs: CRS84,
            values: catValues!.map((f) => f.properties.meters),
          },
        })));
      },
    },
    items: {
      allowAt: ["collection", "instance"],
      default_output_format: "GEOJSON",
      handleOne(opts) {
        const item = features
          .filter(instanceIdChecker(opts.instanceId))
          .find((c) => c.properties.name === opts.itemId);
        if (!item) throw new HttpError(404, "no such item");
        return Promise.resolve(reproject("OGC:CRS84", opts.crs)(item));
      },
      handleAll(opts) {
        // TODO fix scenario where limit does nothing especially at slice
        const matched = features
          .filter(instanceIdChecker(opts.instanceId))
          .filter(geometryIntersects(opts.bbox));
        const limit = opts.limit || matched.length;
        const offset = opts.offset || 0;
        console.log(limit,offset)
        return Promise.resolve({
          timeStamp: new Date().toJSON(),
          numberMatched: matched.length,
          numberReturned: numberReturned(matched.length, limit, offset),
          features: matched.slice(offset, offset + limit),
          type: "FeatureCollection",
        });
      },
      output_formats: ["JSON", "HTML"],
    },
    corridor: {
      width_units: ["meters"],
      height_units: ["meters"],
      allowAt: ["collection", "instance"],
      default_output_format: "GEOJSON",
      output_formats: ["GEOJSON", "JSON"],
      handler(opts) {
        // return this.output_formats
        const matched = features
          .filter((feat) => feat.properties.meters <= opts["corridor-height"])
          .filter(instanceIdChecker(opts.instanceId))
          .filter(corridorFilter(opts.coords, opts["corridor-width"]));

        return Promise.resolve({
          type: "FeatureCollection",
          numberMatched: matched.length,
          numberReturned: numberReturned(matched.length, matched.length, 0),
          timeStamp: new Date().toJSON(),
          features: matched.map(reproject("OGC:CRS84", opts.crs)),
        });
      },
    },
    trajectory: {
      default_output_format: "GEOJSON",
      allowAt: ["collection", "instance"],
      handler(opts) {
        const matched = features
          .filter(instanceIdChecker(opts.instanceId))
          // .filter(datetimeFilter(opts.datetime)())
          .filter(elevationFilter(opts.z, "meters"))
          .filter(geometryIntersects(opts.coords));

        return Promise.resolve({
          timeStamp: new Date().toISOString(),
          type: "FeatureCollection",
          numberMatched: matched.length,
          numberReturned: numberReturned(matched.length, matched.length, 0),
          features: matched.map(reproject("OGC:CRS84", opts.crs)),
        });
      },
    },
    radius: {
      allowAt: ["collection", "instance"],
      default_output_format: "GEOJSON",
      output_formats: ["GEOJSON", "JSON"],
      within_units: ["meters"],
      handler(opts) {
        const matched = features
          .filter(instanceIdChecker(opts.instanceId))
          // .filter(datetimeFilter(opts.datetime))
          .filter(elevationFilter(opts.z, "meters"))
          .filter(radiusFilter(opts.coords, opts.within));
        return Promise.resolve({
          type: "FeatureCollection",
          timeStamp: new Date().toISOString(),
          numberMatched: matched.length,
          numberReturned: numberReturned(matched.length, matched.length, 0),
          features: matched.map(reproject("OGC:CRS84", opts.crs)),
        });
      },
    },
  },
} satisfies Dataset;

function instanceIdChecker(instanceId: string | undefined) {
  return (feature: (typeof features)[0]) => {
    if (!instanceId) return true;
    return feature.properties.continent === instanceId;
  };
}
