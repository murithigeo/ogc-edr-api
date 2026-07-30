import type { ExegesisRoute, OAS3ApiInfo } from 'exegesis-express';
import type {
  Link,
  LandingPage as LP,
  Collection as CN,
  Interval,
  Extent as Ext,
  Feature,
  FeatureCollection,
} from './features.d.ts';
import type { Parameter as PR } from 'coveragejson';
import type { Length } from 'convert';
import type { Geometry } from 'geojson';

export interface LandingPage extends LP {
  provider?: { name: string; url: string };
  contact?: {
    phone?: string;
    email?: `${string}@${string}`;
    fax?: string;
    instructions?: string;
    hours?: string;
    address?: string;
    city?: string;
    stateorprovince?: string;
    country?: string;
  };
}
export type EdrGeoJsonProperties = {
  /**
   * @description A URI identifying the query end point. May identify a specific location.
   * @example https://example.org/api/collections/collection/locations/location_123d
   */
  edrqueryendpoint: string;
  /**
   * @description Either a date-time or a period string that adheres to RFC 3339. Indicates the time instant or period for which data are available from the EDR feature.
   * @example 2018-02-12T00:00:00Z/2018-03-18T12:31:12Z
   */
  datetime: string;
  /**
   *@description A label such as a site name or other text to use on a link.
   * @example Site A
   */
  label: string;
  /**
   * @description Unique IDs of available parameters, this is the value used for querying the data and corresponds to an ID in the parameter metadata of the collection.
   * @example ["velocity","temperature"]
   */
  'parameter-name': Array<string>;
  [key: string]: unknown;
};
export type EdrFeature<
  G extends Geometry = Geometry,
  P extends EdrGeoJsonProperties = EdrGeoJsonProperties,
> = Feature<G, P>;

export interface EdrFeatureCollection<
  G extends Geometry = Geometry,
  P extends EdrGeoJsonProperties = EdrGeoJsonProperties,
> extends FeatureCollection<G, P> {
  parameters: PR[];
}

export type EdrGeoJSON = EdrFeatureCollection | EdrFeature;
export type Extent = {
  spatial: Ext['spatial'] & {
    crs: string;
    values?: {
      x: string[];
      y: string[];
    };
    name?: string;
  };
  temporal: Ext['temporal'] & { values?: string[]; name?: string };
  vertical?: {
    interval: Interval[];
    values?: string[];
    vrs: string;
    name?: string;
  };
};
export interface Collection extends CN {
  keywords?: Array<string>;
  extent: Extent;
  output_formats: Array<string>;
  parameter_names: Record<string, Parameter>;
  data_queries: DataQueries;
  distanceunits: string[];
}
export type Collections<T extends 'instances' | 'collections' = 'collections'> = {
  [key in T]: Collection[];
} & {
  links: Link[];
};

export interface BaseVariables<QT extends keyof DataQueries> {
  title?: string;
  description?: string;
  output_formats?: string[];
  default_output_format?: string;
  crs_details?: {
    wkt: string;
    crs: string;
  }[];
  query_type: QT;
}
export interface LinkObject<T extends DataQueryVariables> extends Link {
  variables: T;
}
export interface DataQueries {
  position?: { link: LinkObject<PositionVariables> };
  area?: { link: LinkObject<AreaVariables> };
  corridor?: { link: LinkObject<CorridorVariables> };
  cube?: { link: LinkObject<CubeVariables> };
  // instances?: LinkObject<InstancesDataQuery>;
  items?: { link: LinkObject<ItemsVariables> };
  locations?: { link: LinkObject<LocationsVariables> };
  radius?: { link: LinkObject<RadiusVariables> };
  trajectory?: { link: LinkObject<TrajectoryVariables> };
}

export type DataQueryVariables =
  | AreaVariables
  | PositionVariables
  | CorridorVariables
  | CubeVariables
  | ItemsVariables
  | LocationsVariables
  | RadiusVariables
  | TrajectoryVariables;

export type AreaVariables = BaseVariables<'area'>;
export type CorridorVariables = BaseVariables<'corridor'> & {
  width_units?: Length[];
  height_units?: Length[];
};
export type CubeVariables = BaseVariables<'cube'> & {
  height_units?: Length[];
};

export type ItemsVariables = BaseVariables<'items'>;
export type LocationsVariables = BaseVariables<'locations'> & {
  multi?: boolean;
};
export type PositionVariables = BaseVariables<'position'>;

export type RadiusVariables = BaseVariables<'radius'> & {
  query_type: 'radius';
  within_units: Length[];
};
export type TrajectoryVariables = BaseVariables<'trajectory'>;

export interface Parameter extends PR {
  extent?: Collection['extent'];
  measurementType?: MeasurementTypeObject;
  'data-type': 'float' | 'string' | 'integer';
}

export interface MeasurementTypeObject {
  /**Required
   * @example Mean,Max,Sum
   */
  method: string;
  /**
   * Duration of calculation. For time durations, this follows the ISO 8601 Duration standard.
   * A negative sign before a duration value (i.e. -PT10M) infers that the time start
   * starts at the specified duration before the time value assigned to the parameter value.
   * So if the measurement had a time value of 2020-04-05T14:30Z and a measurementType duration of -PT10M
   * the value is representative of the period 2020-04-05T14:20Z/2020-04-05T14:30Z;
   * if the measurement had a time value of 2020-04-05T14:30Z and a measurementType duration of PT10M
   * the value is representative of the period 2020-04-05T14:30Z/2020-04-05T14:40Z
   * @warning this member is required per the docs but is not present in the examples. Period appears instead
   */
  period?: string;
}

declare module 'exegesis-express' {
  interface ExegesisContextBase {
    //@ts-expect-error type-mismatch
    api: OAS3ApiInfo;
  }
  interface ExegesisContext {
    api: OAS3ApiInfo;
  }
  interface ExegesisPluginContext {
    route: ExegesisRoute;
    api: OAS3ApiInfo;
  }
}
export type * from './features.d.ts';
