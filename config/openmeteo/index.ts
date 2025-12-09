import type { Feature } from "../../utils/types.d.ts";
import type { Dataset } from "../index.ts";
import stations from "./stations.ts";
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
import {
  CollectionMessagesArg,
  db,
  GenericMessageArg,
  InstanceMessagesArg,
  ItemMessagesArg,
} from "../../asyncapi/firebase.ts";
import { setHours, setMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { EdrFeature, MeasurementTypeObject } from "../../types.d.ts";
import type { Polygon } from "geojson";
import type { Coverage, PointSeries } from "coveragejson";
import { asParameters, asReferencing } from "../utils.ts";
import buffer from "@turf/buffer";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

class Obs {
  //stationId-datetime-Props
  database = new Map<
    string,
    { [stationId: string]: Omit<ValueType, "index"> & { stationId: string } }
  >();
  constructor() {}

  async newObservation(
    obs: ValueType & { datetime: string; feature: (typeof features)[0] }
  ) {
    const { feature, ...props } = obs;
    const { stationId } = feature.properties;

    if (!this.database.has(props.datetime)) {
      this.database.set(obs.datetime, {});
    }
    this.database.set(props.datetime, {
      ...this.database.get(obs.datetime),
      [stationId]: { ...props, stationId },
    });
  }
  async getObservations(dates: string[], stationId: string) {
    //Get keys included in args
    const dates2 = this.database
      .keys()
      .filter(datetimeFilter({ values: dates }))
      .toArray();

    // Get values for those keys
    const values = dates2.map((e) => this.database.get(e));

    const valuesByStationId = values.map((e) => e[stationId]);
    return valuesByStationId;
  }
  public get dates() {
    return this.database.keys().toArray();
  }
}

const observations = new Obs();
const features = stations.features;

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
    "Hourly Temperature sourced from open-meteo.com. This collection is intended to demonstrate Part 2: Publish/Subscribe Workflow using WebSockets",
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
        return observations.dates.map((id) => ({
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
        const date = observations.dates.find(datetimeFilter(opts.datetime));

        const matched = await Promise.all(
          features
            .filter(geometryIntersects(opts.bbox))
            .map(async (p) => ({
              ...p,
              properties: {
                ...p.properties,
                datetime: date,
                ...observations.database.get(date)[p.properties.stationId],
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
        const date = observations.dates.find(instanceIdFilter(opts.instanceId));
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
                ...observations.database.get(date)[opts.itemId],
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
        const dates = observations.dates
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
        const dates = observations.dates
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
        const dates = observations.dates
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
        const dates = observations.dates
          .filter(instanceIdFilter(opts.instanceId))
          .filter(datetimeFilter(opts.datetime));
        const bufferD = buffer(opts.coords, opts.within, { units: "meters" })!;
        const matched = features.filter(geometryIntersects(bufferD));
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
      temporal: observations.database.keys().toArray(),
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
  // index: number;
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
    // let [itemMessages,instanceMessages,collMessages]=[,[],[]]
    const itemMessages: ItemMessagesArg = [];
    const instanceMessages: InstanceMessagesArg = [];
    const collectionMessages: CollectionMessagesArg = [];

    const res = await fetch(url);
    const data: Res[] = await res.json();
    const dates = Array.from(new Set(data.flatMap((p) => p.hourly.time)));

    for (let datetimeIndex = 0; datetimeIndex < dates.length; datetimeIndex++) {
      // Avoid clogging up resources. Only signal creation of instance and final update
      if (datetimeIndex === 0) {
        collectionMessages.push({
          collectionId,
          operation: "update",
        });
      }
      instanceMessages.push({
        collectionId,
        operation: "create",
        instanceId: dates[datetimeIndex],
      });
      if (datetimeIndex === dates.length - 1) {
        collectionMessages.push({
          collectionId,
          operation: "update",
        });
      }
      for (let index = 0; index < data.length; index++) {
        const datetime = dates[datetimeIndex];
        const feature = features[index];
        itemMessages.push({
          itemId: feature.properties.stationId,
          geometry: feature.geometry,
          collectionId,
          instanceId: datetime,
          operation: "create",
        });
        await observations.newObservation({
          datetime,
          feature,
          dewpoint_2m: data[index].hourly.dewpoint_2m[datetimeIndex],
          temperature_2m: data[index].hourly.temperature_2m[datetimeIndex],
          winddirection_10m:
            data[index].hourly.winddirection_10m[datetimeIndex],
          windspeed_10m: data[index].hourly.windspeed_10m[datetimeIndex],
        });
      }
    }

    await db
      .newCollectionMessages(collectionMessages)
      .newInstanceMessages(instanceMessages)
      .newItemMessages(itemMessages)
      .commitMessages();
  } catch (error) {
    console.log(`error querying open-meteo`);
    console.error(error);
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
  ): Promise<Coverage<PointSeries>> => {
    const observation = await observations.getObservations(
      dates,
      feature.properties.stationId
    );
    console.log(observation);
    const coverage: Coverage<PointSeries> = {
      type: "Coverage",
      id: feature.properties.stationId,
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

// TODO: Make the timezone in the resulting map key explicit
function iso2dt(date: Date | number) {
  let date_ = new Date(date);
  date_ = setMinutes(date_, 0);
  return formatInTimeZone(date_, "Africa/Nairobi", "yyyy-MM-dd'T'HH:mm");
}

// Delete values on 24 hours lapse
setInterval(async () => {
  let itemMessages: ItemMessagesArg = [];
  let instanceMessages: InstanceMessagesArg = [];
  for (const datetime of observations.database.keys()) {
    if (new Date().getTime() < new Date(datetime).getTime() + DAY_IN_MS) return;
    itemMessages.concat(
      Object.values(observations.database.get(datetime)).map((val) => {
        const feature = features.find(
          (e) => e.properties.stationId === val.stationId
        );
        return {
          operation: "delete",
          collectionId,
          instanceId: datetime,
          geometry: feature.geometry,
          itemId: val.stationId,
        };
      })
    );
    instanceMessages.push({
      operation: "delete",
      collectionId,
      instanceId: datetime,
    });

    observations.database.delete(datetime);
  }
  await db
    .newCollectionMessages([{ operation: "update", collectionId }])
    .newInstanceMessages(instanceMessages)
    .newItemMessages(itemMessages)
    .commitMessages();
}, DAY_IN_MS);
