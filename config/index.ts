import type {
  Coverage,
  CoverageCollection,
  I18N,
  ObservedProperty,
  Unit,
} from "coveragejson";
import type { Length } from "convert";
import type {
  Bbox,
  contenttypes,
  crs,
  Datetime,
  Feature,
  Link,
} from "../utils/index.ts";
import type {
  EdrFeature,
  EdrFeatureCollection,
  FeatureCollection,
  MeasurementTypeObject,
} from "../types.d.ts";
import faparanomaly from "./fapar/index.ts";
import mountains from "./mountains.ts";
import openmeteo from "./openmeteo/index.ts";

// //@external https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation
export default {
  datasets: [mountains, faparanomaly,openmeteo].map((d) => ({
    ...d,
    crs: Array.from<keyof typeof crs>(
      new Set(["http://www.opengis.net/def/crs/OGC/1.3/CRS84", ...d.crs])
    ),
    // crs: Array.from(
    //   new Set([...d.crs, ...d.crs.map((p) => crs[p].uri as keyof typeof crs)])
    // ).sort((a, b) => a.localeCompare(b)),
  })),
} as Config;

export type Dataset = {
  attribution?: Link[];
  id: string;
  description: string;
  output_formats: Array<keyof typeof contenttypes>;
  title?: string;
  crs: Array<keyof typeof crs>;
  storageCrs: keyof typeof crs;
  keywords: string[];
  parameters: Array<{
    id: string;
    unit?: Unit;
    dataType: "string" | "float" | "integer";
    observedProperty: ObservedProperty;
    description?: I18N;
    label?: I18N;
    measurementType?: MeasurementTypeObject;
  }>;
  data_queries: DataQueryConfig;
  getExtent: () => ExtentProps;
};
export type Config = {
  datasets: Array<Dataset>;
};

export type ExtentProps = {
  id: string;
  spatial: {
    bbox: Bbox[];
    values?: { x: string[]; y: string[] };
    crs: keyof typeof crs;
  };
  vertical?: {
    values: number[];
    vrs: string;
  };
  temporal: string[] | null;
};

export type DataQueryProps = {
  output_formats?: Array<keyof typeof contenttypes>;
  default_output_format: keyof typeof contenttypes;
  allowAt: Array<"collection" | "instance">;
};

export type DataQueryConfig = {
  locations?: DataQueryProps & {
    multi?: boolean;
    handleAll: (
      opts: Pick<BaseQueryOptions, "datetime" | "instanceId" | "z"|"crs"> & {
        bbox?: GeoJSON.Polygon;
      }
    ) => Promise<EdrFeatureCollection | FeatureCollection>;
    handlerOne: (
      opts: Pick<
        LocationsQueryOptions,
        | "format"
        | "datetime"
        | "crs"
        | "parameters"
        | "server"
        | "instanceId"
        | "locationId"
      >
    ) => Promise<CoverageCollection | FeatureCollection | EdrFeatureCollection>;
  };
  instances?: DataQueryProps & {
    default_instanceid: string;
    handler: (opts: InstanceQueryOptions) => Array<ExtentProps>;
  };
  radius?: DataQueryProps & {
    within_units: Array<Length>;
    handler: (
      opts: RadiusQueryOptions
    ) => Promise<FeatureCollection | EdrFeatureCollection | CoverageCollection>;
  };
  corridor?: DataQueryProps & {
    handler: (
      opts: CorridorQueryOptions
    ) => Promise<CoverageCollection | FeatureCollection>;
    width_units: Array<Length>;
    height_units: Array<Length>;
  };
  cube?: DataQueryProps & {
    handler: (
      opts: CubeQueryOptions
    ) => Promise<CoverageCollection | EdrFeatureCollection | FeatureCollection>;
  };
  area?: DataQueryProps & {
    handler: (
      opts: AreaQueryOptions
    ) => Promise<FeatureCollection | EdrFeatureCollection | CoverageCollection>;
  };
  trajectory?: DataQueryProps & {
    handler: (
      opts: TrajectoryQueryOptions
    ) => Promise<CoverageCollection | EdrFeatureCollection | FeatureCollection>;
  };
  position?: DataQueryProps & {
    handler: (
      opts: PositionQueryOptions
    ) => Promise<FeatureCollection | EdrFeatureCollection | CoverageCollection>;
  };
  items?: DataQueryProps & {
    handleAll: (
      opts: ItemsQueryOptions
    ) => Promise<
      | CoverageCollection
      | EdrFeatureCollection
      | FeatureCollection
      | Feature
      | EdrFeature
      | Coverage
    >;
    handleOne: (opts: {
      itemId: string;
      instanceId?: string;
      crs: keyof typeof crs;
      format: keyof typeof contenttypes;
      server:string
    }) => Promise<Feature | EdrFeature | Coverage>;
  };
};

type BaseQueryOptions = {
  format?: keyof typeof contenttypes;
  datetime?: Datetime;
  z?: { min?: number; max?: number; values?: number[] };
  crs: keyof typeof crs;
  server: string;
  instanceId?: string;
  parameters?: string[];
};
type ItemsQueryOptions = BaseQueryOptions & {
  bbox?: GeoJSON.Polygon;
  limit?: number;
  offset?: number;
};
type InstanceQueryOptions = BaseQueryOptions & {
  bbox?: GeoJSON.Polygon;
};

type TrajectoryQueryOptions = BaseQueryOptions & {
  coords: GeoJSON.LineString | GeoJSON.MultiLineString;
};
type AreaQueryOptions = BaseQueryOptions & {
  coords: GeoJSON.Polygon;
  "resolution-x"?: number;
  "resolution-y"?: number;
  // "resolution-z"?: number;
};
type CubeQueryOptions = BaseQueryOptions & {
  bbox: GeoJSON.Polygon;
};
type CorridorQueryOptions = BaseQueryOptions & {
  "corridor-width": number;
  "corridor-height": number;
  "resolution-x"?: number;
  "resolution-y"?: number;
  "resolution-z"?: number;
  coords: GeoJSON.MultiLineString | GeoJSON.LineString;
};

type RadiusQueryOptions = BaseQueryOptions & {
  within: number;
  coords: GeoJSON.Point | GeoJSON.MultiPoint;
};
type PositionQueryOptions = BaseQueryOptions & {
  coords: GeoJSON.Point | GeoJSON.MultiPoint;
};
type LocationsQueryOptions = BaseQueryOptions & {
  bbox?: GeoJSON.Polygon;
  locationId: string;
  limit?: number;
  offset?: number;
};
// type Coords = GeoJSON.LineString;
type Resolutions = {
  x: number;
  y: number;
  z: number;
};
