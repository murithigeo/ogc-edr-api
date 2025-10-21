import type { Feature } from "../../utils/types.d.ts";
import type { Dataset } from "../index.ts";
import stats from "./stations.json" with { type: "json" };
import {
  bbox,
  bboxPolygon,
  HttpError,
  numberReturned,
  reproject,
} from "../../utils/index.ts";
import units from "../units.ts";
import observedproperties from "../observedproperties.ts";
import { MessageManager } from "../../asyncapi/db.ts";
import { setHours, setMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

const mgr = new MessageManager();

import {
  datetimeFilter,
  geometryIntersects,
} from "../../utils/filters/index.ts";
import type { EdrFeature, MeasurementTypeObject } from "../../types.d.ts";
import { featuredatetimefilter } from "../filters.ts";
import type { Polygon } from "geojson";
import type { Coverage, PointSeries } from "coveragejson";
import { asParameters, asReferencing } from "../utils.ts";
import buffer from "@turf/buffer";

const features: Feature<
  GeoJSON.Point,
  {
    stationId: string;
    stationName: string;
    country: "Kenya" | "Uganda";
    elevation: number;
  }
>[] = stats.features.sort((a, b) =>
  a.properties.stationName.localeCompare(b.properties.stationName)
);

const [collectionId, measurementType]: [string, MeasurementTypeObject] = [
  "openmeteo-hourly",
  { period: "PTH1", method: "instantenous" },
];

// Parameters
const parameters: Dataset["parameters"] = [
  {
    id: "temperature_2m",
    dataType: "float",
    unit: units.temperature,
    observedProperty: observedproperties.temperature,
    description: {
      en: "Temperature at 2m recorded at start of hour",
    },
    measurementType,
  },
  {
    id: "dewpoint_2m",
    dataType: "float",
    unit: units.temperature,
    observedProperty: observedproperties.dewPointTemperature,
    description: {
      en: "Dew Point Temperature recorded at start of hour",
    },
    measurementType,
  },
  {
    id: "winddirection_10m",
    dataType: "float",
    unit: units.windDirection,
    observedProperty: observedproperties.windDirection,
    description: {
      en: "Wind Direction at 2m",
    },
    measurementType,
  },
];

const [now, midnight] = [iso2dt(new Date()), iso2dt(setHours(new Date(), 0))];
const url = new URL("https://api.open-meteo.com/v1/forecast");

const coordinates = features.map((p) => p.geometry.coordinates);
// Set latitudes
url.searchParams.set("latitude", coordinates.map((p) => p[1]).join(","));
// longitudes
url.searchParams.set("longitude", coordinates.map((p) => p[0]).join(","));

url.searchParams.set(
  "elevation",
  features.map((p) => p.properties.elevation).join(","),
);
url.searchParams.set(
  "hourly",
  "temperature_2m,dewpoint_2m,windspeed_10m,winddirection_10m",
);
// Fetch data from midnight
url.searchParams.set("start_date", now.split("T")[0]);
url.searchParams.set("start_hour", midnight);
// upto now;
url.searchParams.set("end_hour", now);
url.searchParams.set("end_date", now.split("T")[0]);

const observations = new Map<
  string,
  {
    // Index of station
    index: number;
    temperature_2m: number;
    dewpoint_2m: number;
    winddirection_10m: number;
    windspeed_10m: number;
  }[]
>();

// On start, load all values for the stations
await retrieveAndSetObservations(url);
// On a 60 minute interval, query the endpoint
const HOUR_IN_MS = 60 * 60 * 1000;

const _bbox = bbox({ type: "FeatureCollection", features });
export default {
  id: collectionId,
  description:
    "Hourly Temperature sourced from open-meteo.com. This collection is intended to demonstrate Part 2: Publish/Subscribe Workflow using WebSocket",
  crs: [
    "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
    "http://www.opengis.net/def/crs/EPSG/0/4326",
    "OGC:CRS84",
  ],
  storageCrs: "OGC:CRS84",
  data_queries: {
    instances: {
      allowAt: ["collection", "instance"],
      default_output_format: "JSON",
      default_instanceid: Array.from(observations.keys())[
        observations.size - 1
      ],
      handler: () => {
        return Array.from(observations.keys()).map((id) => ({
          id,
          temporal: [id],
          spatial: {
            bbox: [_bbox],
            crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
          },
          vertical: {
            values: features.map((feat) => feat.properties.elevation),
            vrs: "OGC:CRS84",
          },
        }));
      },
    },
    items: {
      allowAt: ["instance"],
      default_output_format: "JSON",
      output_formats: ["JSON", "GEOJSON"],
      handleAll(opts) {
        const date = Array.from(observations.keys()).find(
          datetimeFilter(opts.datetime),
        );

        const matched = features
          .map((p, i) => ({
            ...p,
            properties: {
              ...p.properties,
              datetime: date,
              ...observations.get(date).find((_, index) => i === index),
            },
          }))
          .filter(geometryIntersects(opts.bbox))
          .filter(featuredatetimefilter("datetime", opts.datetime))
          .slice(opts.offset || 0, opts.limit + opts.offset);

        return Promise.resolve({
          type: "FeatureCollection",
          features: matched
            .map(reproject("OGC:CRS84", opts.crs))
            .map(feature2edrFeature(opts.server, date)),
          numberMatched: matched.length,
          numberReturned: numberReturned(
            matched.length,
            opts.limit,
            opts.offset,
          ),
          timeStamp: new Date().toISOString(),
        });
      },
      handleOne(opts) {
        const date = Array.from(observations.keys()).find(
          instanceIdFilter(opts.instanceId),
        );
        const feature = features.find(
          (c) => c.properties.stationId === opts.itemId,
        );
        if (!feature) throw new HttpError(404, "no such item");
        return Promise.resolve(
          reproject(
            "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
            opts.crs,
          )(
            feature2edrFeature(
              opts.server,
              date,
            )({
              ...feature,
              properties: {
                ...feature.properties,
                ...observations.get(date)[features.indexOf(feature)],
              },
            }),
          ),
        );
      },
    },
    locations: {
      allowAt: ["instance"],
      multi: true,
      default_output_format: "COVERAGEJSON",
      handleAll(opts) {
        const matched = Object.entries(
          Object.groupBy(features, (e) => e.properties.country),
        ).map(
          ([id, feats]): Feature<Polygon> => ({
            ...bboxPolygon(
              bbox({ type: "FeatureCollection", features: feats }),
            ),
            id,
          }),
        );
        return Promise.resolve({
          type: "FeatureCollection",
          numberMatched: matched.length,
          numberReturned: numberReturned(matched.length, matched.length, 0),
          timeStamp: new Date().toISOString(),
          features: matched.map(reproject("OGC:CRS84", opts.crs)),
        });
      },
      handlerOne(opts) {
        const dates = Array.from(observations.keys())
          .filter(instanceIdFilter(opts.instanceId))
          .filter(datetimeFilter(opts.datetime));
        return Promise.resolve({
          type: "CoverageCollection",
          coverages: features.map(feature2coverage(opts.parameters, dates)),
          referencing: asReferencing(opts.crs),
          parameters: asParameters(parameters),
        });
      },
    },
    area: {
      default_output_format: "COVERAGEJSON",
      allowAt: ["instance", "collection"],
      handler(opts) {
        const dates = [...observations.keys()].filter(
          instanceIdFilter(opts.instanceId),
        ).filter(datetimeFilter(opts.datetime));

        const matched = features.filter(geometryIntersects(opts.coords));
        return Promise.resolve({
          type: "CoverageCollection",
          coverages: matched.map(reproject("OGC:CRS84", opts.crs)).map(
            feature2coverage(opts.parameters, dates),
          ),
          referencing: asReferencing(opts.crs),
          parameters: asParameters(parameters),
        });
      },
    },
    cube: {
      default_output_format: "COVERAGEJSON",
      allowAt: ["instance", "collection"],
      handler(opts) {
        const dates = [...observations.keys()].filter(
          instanceIdFilter(opts.instanceId),
        ).filter(datetimeFilter(opts.datetime));

        const matched = features.filter(geometryIntersects(opts.bbox));
        return Promise.resolve({
          type: "CoverageCollection",
          coverages: matched.map(reproject("OGC:CRS84", opts.crs)).map(
            feature2coverage(opts.parameters, dates),
          ),
          referencing: asReferencing(opts.crs),
          parameters: asParameters(parameters),
        });
      },
    },
    radius: {
      default_output_format: "COVERAGEJSON",
      allowAt: ["instance", "collection"],
      within_units: ["m", "meters", "kilometers"],
      handler(opts) {
        const dates = [...observations.keys()].filter(
          instanceIdFilter(opts.instanceId),
        ).filter(datetimeFilter(opts.datetime));
        const matched = features.filter(
          geometryIntersects(
            buffer(opts.coords, opts.within, { units: "meters" })!,
          ),
        );
        return Promise.resolve({
          type: "CoverageCollection",
          coverages: matched.map(reproject("OGC:CRS84", opts.crs)).map(
            feature2coverage(opts.parameters, dates),
          ),
          referencing: asReferencing(opts.crs),
          parameters: asParameters(parameters),
        });
      },
    },
  },
  getExtent() {
    return {
      id: this.id,
      spatial: {
        bbox: [bbox({ type: "FeatureCollection", features })],
        crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
      },
      temporal: Array.from(observations.keys()),
      vertical: {
        values: features.map((p) => p.properties.elevation),
        vrs: "OGC:CRS84",
      },
    };
  },
  output_formats: ["GEOJSON", "COVERAGEJSON"],
  keywords: ["noaa", "ghcnd"],
  parameters,
} satisfies Dataset;

type Res = {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  elevation: number;
  location_id: number;
  hourly_units: {
    time: "iso8601";
    temperature_2m: string;
    dewpoint_2m: string;
    windspeed_10m: string;
    winddirection_10m: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    dewpoint_2m: number[];
    windspeed_10m: number[];
    winddirection_10m: number[];
  };
};

async function retrieveAndSetObservations(url: URL) {
  try {
    const res = await fetch(url);
    const data: Res[] = await res.json();
    for (let i = 0; i < data.length; i++) {
      await setvalue()(data[i], i);
    }
  } catch (error) {
    console.log(`error querying open-meteo` + error);
  }
}

function setvalue() {
  return async (observation: Res, index: number) => {
    const dates = observation.hourly.time;
    for (let i = 0; i < dates.length; i++) {
      if (!observations.has(dates[i])) {
        observations.set(dates[i], []);
        await mgr.newmessage({
          type: "instance",
          collectionId,
          operation: "create",
          instanceId: dates[i],
        });
      }
      const values = observations.get(dates[i])!;
      if (values.map((p) => p.index).includes(index)) continue;
      const newvalue = {
        windspeed_10m: observation.hourly.windspeed_10m[i],
        winddirection_10m: observation.hourly.winddirection_10m[i],
        dewpoint_2m: observation.hourly.dewpoint_2m[i],
        temperature_2m: observation.hourly.temperature_2m[i],
      };
      observations.set(dates[i], [
        ...values,
        {
          index,
          ...newvalue,
        },
      ]);
      await mgr.newmessage({
        type: "item",
        geometry: features[index].geometry,
        collectionId,
        instanceId: dates[i],
        itemId: `${features[index].properties.stationId}`,
        operation: "create",
      });
    }
  };
}
const DAY_IN_MS = 24 * 60 * 60 * 1000;
setInterval(async () => {
  const keys = Array.from(observations.keys());
  const keysToDelete = keys.filter(
    (v) => new Date().getTime() - DAY_IN_MS >= new Date(v).getTime(),
  );
  for (const key of keysToDelete) {
    for (const obs of observations.get(key)) {
      const { geometry, properties } = features[obs.index];
      //Document the items being deleted
      await mgr.newmessage({
        type: "item",
        itemId: properties.stationId,
        collectionId,
        instanceId: key,
        geometry,
        operation: "delete",
      });
    }
    // After logging deleted items, document deletion of instance
    await mgr.newmessage({
      type: "instance",
      instanceId: key,
      collectionId,
      operation: "delete",
    });
  }
});
setInterval(async () => {
  const current = iso2dt(new Date());
  url.searchParams.set("start_hour", current);
  url.searchParams.set("end_hour", current);
  await retrieveAndSetObservations(url);
}, HOUR_IN_MS);

function feature2edrFeature(server: string, instanceId?: string) {
  return (feature: (typeof features)[0]): EdrFeature => {
    let edrqueryendpoint = `${server}/collections/${collectionId}`;
    if (instanceId) edrqueryendpoint += `/instances/${instanceId}`;
    edrqueryendpoint += `/locations/${feature.properties.country}`;
    return {
      ...feature,
      id: feature.properties.stationId,
      properties: {
        ...feature.properties,
        edrqueryendpoint,
        label: {
          en: feature.properties.stationName,
        },
        datetime: instanceId || "",
        "parameter-name": parameters.map((p) => p.id),
      },
    };
  };
}

function instanceIdFilter(instanceId?: string) {
  return (date: string) => {
    return datetimeFilter({ values: instanceId ? [instanceId] : undefined })(
      date,
    );
  };
}

function feature2coverage(parameterNames: string[], dates: string[]) {
  return (
    feature: (typeof features)[0],
    index: number,
  ): Coverage<PointSeries> => {
    const coverage: Coverage<PointSeries> = {
      type: "Coverage",
      domain: {
        type: "Domain",
        domainType: "PointSeries",
        axes: {
          x: { values: [feature.geometry.coordinates[0]] },
          y: { values: [feature.geometry.coordinates[1]] },
          z: { values: [feature.properties.elevation] },
          t: { values: dates },
        },
      },
      ranges: {},
    };

    // if(parameters.includes())
    const observation = dates.map((p) =>
      observations.get(p).find((v) => v.index === index)
    );

    for (const parameter of parameters) {
      if (!parameterNames.includes(parameter.id)) continue;
      const values: number[] = observation.map((p) => p[parameter.id]);
      coverage.ranges[parameter.id] = {
        type: "NdArray",
        dataType: parameter.dataType,
        values,
      };
    }
    return coverage;
  };
}

function iso2dt(date: Date | number) {
  let date_ = new Date(date);
  date_ = setMinutes(date_, 0);
  return formatInTimeZone(date_, "Africa/Nairobi", "yyyy-MM-dd'T'HH:mm");
  // addHours(date_, 3);
}
