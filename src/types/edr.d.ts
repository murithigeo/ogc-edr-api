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
import type { I18N, Parameter as PR } from 'coveragejson';
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
   * @throws error in covjson-validator if not I18N
   */
  label: I18N;
  /**
   * @description Unique IDs of available parameters, this is the value used for querying the data and corresponds to an ID in the parameter metadata of the collection.
   * @example ["velocity","temperature"]
   */
  'parameter-name': Array<string>;
  [key: string]: unknown;
};
export interface EdrFeature<
  G extends Geometry = Geometry,
  P extends EdrGeoJsonProperties = EdrGeoJsonProperties,
> extends Feature<G, P> {}

export interface EdrFeatureCollection<
  G extends Geometry = Geometry,
  P extends EdrGeoJsonProperties = EdrGeoJsonProperties,
> extends FeatureCollection<G, P> {}

export type Extent = {
  spatial: Ext['spatial'] & {
    crs?: string;
    values?: {
      x: string[];
      y: string[];
    };
  };
  temporal: Ext['temporal'] & { values: null | string[] };
  vertical?: {
    interval: Interval[];
    values: string[] | number[] | null;
    vrs: string;
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

export interface BaseVariables {
  title?: string;
  description?: string;
  output_formats?: string[];
  default_output_format: string;
  crs_details?: {
    wkt: string;
    crs: string;
  }[];
}
export interface LinkObject<
  T =
    | AreaDataQuery
    | PositionDataQuery
    | CorridorDataQuery
    | CubeDataQuery
    | InstancesDataQuery
    | ItemsDataQuery
    | LocationsDataQuery
    | RadiusDataQuery
    | TrajectoryDataQuery,
> {
  link: Link & { variables: T };
}
export interface DataQueries {
  position?: LinkObject<PositionDataQuery>;
  area?: LinkObject<AreaDataQuery>;
  corridor?: LinkObject<CorridorDataQuery>;
  cube?: LinkObject<CubeDataQuery>;
  instances?: LinkObject<InstancesDataQuery>;
  items?: LinkObject<ItemsDataQuery>;
  locations?: LinkObject<LocationsDataQuery>;
  radius?: LinkObject<RadiusDataQuery>;
  trajectory?: LinkObject<TrajectoryDataQuery>;
}

export interface AreaDataQuery extends BaseVariables {
  query_type: 'area';
}
export interface CorridorDataQuery extends BaseVariables {
  query_type: 'corridor';
  /**list of width distance units distance values can be specified in */
  width_units: Length[];
  /**list of height distance units distance values can be specified in */
  height_units: Length[];
}
export interface CubeDataQuery extends BaseVariables {
  query_type: 'cube';
  /** list of z distance units vertical values can be specified in*/
  height_units: Length[];
}

export interface InstancesDataQuery extends BaseVariables {
  query_type: 'instances';
}
export interface ItemsDataQuery extends BaseVariables {
  query_type: 'items';
}
export interface LocationsDataQuery extends BaseVariables {
  query_type: 'locations';
  multi?: boolean;
}
export interface PositionDataQuery extends BaseVariables {
  query_type: 'position';
}

export interface RadiusDataQuery extends BaseVariables {
  query_type: 'radius';
  /**list of distance units radius values can be specified in @example ["km","miles"]*/
  within_units: Length[];
}
export interface TrajectoryDataQuery extends BaseVariables {
  query_type: 'trajectory';
}

export interface BaseDataQuery {
  title: string;
  description: string;
  output_formats?: Array<string>;
  crs_details?: { crs: string; wkt: string }[];
  default_output_format: string;
}

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
