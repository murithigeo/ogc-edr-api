import type {
  BBox,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from 'geojson';
import type {
  EdrFeature,
  EdrFeatureCollection,
  Parameter,
  FeatureCollection,
  Feature,
} from '../src/types/edr.d.ts';
import type { Coverage, CoverageCollection, Domain, NdArray } from 'coveragejson';
import type { Length } from 'convert';
import type { CoverageJSON } from 'coveragejson';
import type { ContentTypeNegotiator as Format } from '../src/content-types.ts';
import type { Referencing } from '../utils/reprojection.ts';

export interface Dataset {
  id: string;
  title?: string;
  description: string;
  storageCrs: string;
  keywords: string[];
  crs: string[];
  distanceunits: Length[];
  output_formats: Format[];
  instances: InstancesConfig;

  parameters: Record<
    string,
    Pick<
      Parameter,
      'id' | 'unit' | 'data-type' | 'observedProperty' | 'description' | 'label' | 'measurementType'
    >
  >;
  get extent(): Promise<Extent> | Extent;
  hasDatetime?(val: string): boolean | Promise<boolean>;
  hasElevation?(val: number): boolean | Promise<boolean>;
  data_queries: DataQueryConfig;
}

export interface Extent {
  id: string;
  spatial: {
    bbox: BBox[];
    values?: Record<'x' | 'y', string[]>;
  };
  vertical?: { values: number[]; vrs: string };
  temporal: string[] | null;
}

interface BaseConfig<T extends Format = Format> {
  default_output_format?: T;
  output_formats?: T[];
  crs?: string[];
  description?: string;
  title?: string;
}
export interface QueryEvent<F extends Format = Format> {
  path: string; // Incase you want to limit queries on collections/{collectionId}/{queryType} or .../istances
  datetime?: string | Partial<Record<'min' | 'max', string>>;
  bbox?: BBox;
  crs: Referencing;
  instanceId: string | undefined;
  'parameter-name': string[];
  z?: Record<'min' | 'max', number> | number[];
  f: F;
}
export interface DataQueryConfig {
  locations?: LocationsConfig;
  position?: PositionConfig;
  cube?: CubeConfig;
  area?: AreaConfig;
  items?: ItemsConfig;
  trajectory?: TrajectoryConfig;
  corridor?: CorridorConfig;
  radius?: RadiusConfig;
}

/**
 * Allows you to validate a value exists or rewrite the value.
 * Return a boolean to indicate whether the value exists.
 * Return a string to replace the value passed
 */
type HasFunction = (val: string) => Promise<boolean | string> | string | boolean;
type PaginationParams = Partial<Record<'limit' | 'offset', number>>;
type ResolutionParams<D extends 'z' | 'y' | 'x' | never = never> = Partial<
  Record<`resolution-${D extends never ? 'x' | 'y' | 'z' : Exclude<'x' | 'y' | 'z', D>}`, number>
>;

type QueryFn<
  F extends Format | never = Format,
  Plus extends Record<string, unknown> | object = Record<string, unknown>,
  Require extends keyof (QueryEvent & Plus) | never = never,
  Without extends keyof (QueryEvent & Plus) | never = never,
  Output extends Return = Return,
> = (
  e: Omit<
    WithRequiredProperty<QueryEvent<F> & Plus, Exclude<Require, never>>,
    Exclude<Without, never>
  >,
) => Promise<Exclude<Output, never>> | Exclude<Output, never>;

type TopLevelCollections = CoverageCollection | EdrFeatureCollection | FeatureCollection;

type Return = TopLevelCollections | Exclude<CoverageJSON, NdArray> | EdrFeature | Feature;
type ConfigWithFn<Fn, F extends Format = Format, Plus extends object = object> = BaseConfig<F> & {
  fn: Fn;
} & Plus;
export interface LocationsConfig<T extends Format = Format> extends BaseConfig<T> {
  multi?: boolean;
  has?: HasFunction;
  queryAll: QueryFn<T, object, never, 'parameter-name', EdrFeatureCollection>;
  queryOne: QueryFn<T, { locId: string } & PaginationParams>;
}

export interface ItemsConfig<F extends Format = Format> extends BaseConfig<F> {
  queryAll: QueryFn<F, PaginationParams, never, 'parameter-name', EdrFeatureCollection | string>;
  queryOne: QueryFn<
    F,
    { itemId: string },
    never,
    'bbox' | 'parameter-name' | 'z' | 'datetime',
    EdrFeature | Feature | Coverage | Domain
  >;

  has?: HasFunction;
}

export type RadiusFn<F extends Format = Format> = QueryFn<
  F,
  { within: number; coords: MultiPolygon | Polygon }
>;
export type RadiusConfig<F extends Format = Format> =
  | ConfigWithFn<RadiusFn<F>, F, { within_units?: Length[] }>
  | RadiusFn<F>;

type CorridorParams = ResolutionParams &
  Record<`corridor-${'width' | 'height'}`, number> & { coords: MultiPolygon | Polygon };
export type CorridorFn<F extends Format = Format> = QueryFn<F, CorridorParams, never, 'bbox'>;
export type CorridorConfig<F extends Format = Format> =
  | ConfigWithFn<CorridorFn<F>, F, Partial<Record<`${'height' | 'width'}_units`, Length[]>>>
  | CorridorFn<F>;

export type CubeFn<F extends Format = Format> = QueryFn<F, object, 'bbox'>;
export type CubeConfig<F extends Format = Format> = ConfigWithFn<CubeFn<F>, F> | CubeFn<F>;
export type AreaFn<F extends Format = Format> = QueryFn<
  F,
  ResolutionParams<'z'> & { coords: Polygon | MultiPolygon },
  never,
  'bbox'
>;
export type AreaConfig<F extends Format = Format> = ConfigWithFn<AreaFn<F>, F> | AreaFn<F>;

export type PositionFn<F extends Format = Format> = QueryFn<
  F,
  { coords: MultiPoint | Point },
  never,
  'bbox'
>;
export type PositionConfig<F extends Format = Format> =
  | ConfigWithFn<PositionFn<F>, F>
  | PositionFn<F>;
export type TrajectoryFn<F extends Format = Format> = QueryFn<
  F,
  { coords: LineString | MultiLineString },
  never,
  'bbox'
>;
export type TrajectoryConfig<F extends Format = Format> =
  | ConfigWithFn<TrajectoryFn<F>, F>
  | TrajectoryFn<F>;
export interface InstancesConfig<T extends Format = Format> extends BaseConfig<T> {
  /**
   * The value to use when the instanceId is "","latest","default"
   */
  handler(instanceId: undefined | string): Promise<Extent[]> | Extent[];
  has: HasFunction;
  hasElevation?(val: number): Promise<boolean> | boolean;
  hasDatetime?(val: string): Promise<boolean> | boolean;
}
/**
 * https://bobbyhadz.com/blog/typescript-make-property-required
 */
type WithRequiredProperty<Type, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property];
};
