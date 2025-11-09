import type { Feature } from "../../utils/types.d.ts";
import type { Dataset } from "../index.ts";
import stats from "./stations.json"  with { type: 'json' };
import {
  bbox,
  bboxPolygon,
  datetimeFilter,
  geometryIntersects,
  HttpError,
  numberReturned,
  reproject,
} from "../../utils/index.ts";
import units from "../units.ts";
import observedproperties from "../observedproperties.ts";
import db from "../../asyncapi/db.ts";
import { setHours, setMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { EdrFeature, MeasurementTypeObject } from "../../types.d.ts";
import type { Polygon } from "geojson";
import type { Coverage, PointSeries } from "coveragejson";
import { asParameters, asReferencing } from "../utils.ts";
import buffer from "@turf/buffer";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const dbx = await Deno.openKv();

class Observations {
  constructor() {}

  async newObservation(
    observation: ValueType & { datetime: string },
    expireIn = DAY_IN_MS
  ) {
    const {
      geometry,
      properties: { stationId: itemId },
    } = features[observation.index];

    await db.newItemMessage(
      {
        itemId,
        geometry,
        collectionId,
        operation: "create",
      },
      expireIn
    );
    await dbx.set(
      ["data", collectionId, observation.datetime, itemId],
      observation,
      {
        expireIn,
      }
    );
  }
}
const observations = new Observations();
const features: Feature<
  GeoJSON.Point,
  {
    stationId: string;
    stationName: string;
    country: "Kenya" | "Tanzania";
    elevation: number;
  }
>[] = stats.features
  //.filter((e) => e.properties.country === 'Kenya')
  .sort((a, b) =>
    a.properties.stationName.localeCompare(b.properties.stationName)
  );

const [collectionId, measurementType]: [string, MeasurementTypeObject] = [
  "openmeteo-hourly",
  { period: "PTH1", method: "instantenous" },
];

// Parameters
const parameters: (Dataset["parameters"][0] & {
  id: Exclude<keyof ValueType, "index">;
})[] = [
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
  features.map((p) => p.properties.elevation).join(",")
);
url.searchParams.set(
  "hourly",
  "temperature_2m,dewpoint_2m,windspeed_10m,winddirection_10m"
);
// Fetch data from midnight
url.searchParams.set("start_date", now.split("T")[0]);

url.searchParams.set("start_hour", midnight);
// upto now;
url.searchParams.set("end_hour", now);
url.searchParams.set("end_date", now.split("T")[0]);

setInterval(() => {});
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
      // Start of Current Hour
      default_instanceid: iso2dt(new Date()),
      handler: async () => {
        return (await getDates()).map((id) => ({
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
      async handleAll(opts) {
        const date = (await getDates()).find(datetimeFilter(opts.datetime));

        const matched = await Promise.all(
          features
            .filter(geometryIntersects(opts.bbox))
            // .filter(featuredatetimefilter("datetime", opts.datetime))
            .map(async (p) => ({
              ...p,
              properties: {
                ...p.properties,
                datetime: date,
                ...(
                  await dbx.get<ValueType>([
                    "data",
                    collectionId,
                    date,
                    p.properties.stationId,
                  ])
                ).value,
              },
            }))

            .slice(opts.offset || 0, opts.limit + opts.offset)
        );

        return Promise.resolve({
          type: "FeatureCollection",
          features: matched
            .map(reproject("OGC:CRS84", opts.crs))
            .map(feature2edrFeature(opts.server, date)),
          numberMatched: matched.length,
          numberReturned: numberReturned(
            matched.length,
            opts.limit,
            opts.offset
          ),
          timeStamp: new Date().toISOString(),
        });
      },
      handleOne: async (opts) => {
        const date = (await getDates()).find(instanceIdFilter(opts.instanceId));
        const feature = features.find(
          (c) => c.properties.stationId === opts.itemId
        );
        if (!feature) throw new HttpError(404, "no such item");
        return Promise.resolve(
          reproject(
            "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
            opts.crs
          )(
            feature2edrFeature(
              opts.server,
              date
            )({
              ...feature,
              properties: {
                ...feature.properties,
                ...(await dbx.get<ValueType>([
                  "data",
                  collectionId,
                  date,
                  feature.properties.stationId,
                ])),
              },
            })
          )
        );
      },
    },
    locations: {
      allowAt: ["instance"],
      multi: true,
      default_output_format: "COVERAGEJSON",
      handleAll(opts) {
        const matched = Object.entries(
          Object.groupBy(features, (e) => e.properties.country)
        ).map(
          ([id, feats]): Feature<Polygon> => ({
            ...bboxPolygon(
              bbox({ type: "FeatureCollection", features: feats })
            ),
            id,
          })
        );
        return Promise.resolve({
          type: "FeatureCollection",
          numberMatched: matched.length,
          numberReturned: numberReturned(matched.length, matched.length, 0),
          timeStamp: new Date().toISOString(),
          features: matched.map(reproject("OGC:CRS84", opts.crs)),
        });
      },
      handlerOne: async (opts) => {
        const dates = (await getDates())
          .filter(instanceIdFilter(opts.instanceId))
          .filter(datetimeFilter(opts.datetime));
        return Promise.resolve({
          type: "CoverageCollection",
          coverages: await Promise.all(
            features.map(feature2coverage(opts.parameters, dates))
          ),
          referencing: asReferencing(opts.crs),
          parameters: asParameters(parameters),
        });
      },
    },
    area: {
      default_output_format: "COVERAGEJSON",
      allowAt: ["instance", "collection"],
      handler: async (opts) => {
        const dates = (await getDates())
          .filter(instanceIdFilter(opts.instanceId))
          .filter(datetimeFilter(opts.datetime));

        const matched = features.filter(geometryIntersects(opts.coords));
        return Promise.resolve({
          type: "CoverageCollection",
          coverages: await Promise.all(
            matched
              .map(reproject("OGC:CRS84", opts.crs))
              .map(feature2coverage(opts.parameters, dates))
          ),
          referencing: asReferencing(opts.crs),
          parameters: asParameters(parameters),
        });
      },
    },
    cube: {
      default_output_format: "COVERAGEJSON",
      allowAt: ["instance", "collection"],
      async handler(opts) {
        const dates = (await getDates())
          .filter(instanceIdFilter(opts.instanceId))
          .filter(datetimeFilter(opts.datetime));

        const matched = features.filter(geometryIntersects(opts.bbox));
        return Promise.resolve({
          type: "CoverageCollection",
          coverages: await Promise.all(
            matched
              .map(reproject("OGC:CRS84", opts.crs))
              .map(feature2coverage(opts.parameters, dates))
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
      async handler(opts) {
        const dates = (await getDates())
          .filter(instanceIdFilter(opts.instanceId))
          .filter(datetimeFilter(opts.datetime));
        const matched = features.filter(
          geometryIntersects(
            buffer(opts.coords, opts.within, { units: "meters" })!
          )
        );
        return Promise.resolve({
          type: "CoverageCollection",
          coverages: await Promise.all(
            matched
              .map(reproject("OGC:CRS84", opts.crs))
              .map(feature2coverage(opts.parameters, dates))
          ),
          referencing: asReferencing(opts.crs),
          parameters: asParameters(parameters),
        });
      },
    },
  },
  async getExtent() {
    return Promise.resolve({
      id: this.id,
      spatial: {
        bbox: [bbox({ type: "FeatureCollection", features })],
        crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
      },
      temporal: await getDates(),
      vertical: {
        values: features.map((p) => p.properties.elevation),
        vrs: "OGC:CRS84",
      },
    });
  },
  output_formats: ["GEOJSON", "COVERAGEJSON"],
  keywords: ["noaa", "ghcnd"],
  parameters,
} satisfies Dataset;

type ValueType = {
  // Index of station
  index: number;
  temperature_2m: number;
  dewpoint_2m: number;
  winddirection_10m: number;
  windspeed_10m: number;
};
type CacheValue = ValueType[];
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
    const dates = Array.from(new Set(data.flatMap((p) => p.hourly.time)));

    for (let datetimeIndex = 0; datetimeIndex < dates.length; datetimeIndex++) {
      for (let index = 0; index < data.length; index++) {
        const datetime = dates[datetimeIndex];
        const values = await dbx.get<CacheValue | null>(["data",
          collectionId,
          datetime,
        ]);
        if (!values.value)
          await db.newInstanceMessage({
            collectionId,
            instanceId: datetime,
            operation: "create",
          });
        await observations.newObservation({
          datetime,
          index,
          dewpoint_2m: data[index].hourly.dewpoint_2m[datetimeIndex],
          temperature_2m: data[index].hourly.temperature_2m[datetimeIndex],
          winddirection_10m:
            data[index].hourly.winddirection_10m[datetimeIndex],
          windspeed_10m: data[index].hourly.windspeed_10m[datetimeIndex],
        });
      }
    }
  } catch (error) {
    console.log(`error querying open-meteo`);
    console.error(error)
  }
}

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
      date
    );
  };
}

function feature2coverage(parameterNames: string[], dates: string[]) {
  return async (
    feature: (typeof features)[0]
    // index?: number
  ): Promise<Coverage<PointSeries>> => {
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
    const observation = await Promise.all(
      dates.map(
        async (p) =>
          (
            await dbx.get<ValueType>([
              collectionId,
              p,
              feature.properties.stationId,
            ])
          ).value
      )
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

async function getDates() {
  const values = await Array.fromAsync(
    dbx.list<ValueType>({ prefix: ["data", collectionId] })
  );
  //@ts-expect-error type mismatch
  return Array.from<string>(new Set(values.map((e) => e.key[2])));
}
