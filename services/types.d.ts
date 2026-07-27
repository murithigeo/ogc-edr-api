import type {
  BBox,
  Feature,
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
} from '../src/types/edr.d.ts';
import type { Coverage, CoverageCollection, Domain, NdArray } from 'coveragejson';
import type { Length } from 'convert';
import type { CoverageJSON } from 'coveragejson';
import type { ContentTypeNegotiator } from '../src/content-types.ts';

export interface Dataset {
  id: string;
  title?: string;
  description: string;
  storageCrs: string;
  keywords: string[];
  crs: string[];
  distanceunits: Length[];
  output_formats: [ContentTypeNegotiator, ...ContentTypeNegotiator[]];
  parameters: Record<
    string,
    Pick<
      Parameter,
      'id' | 'unit' | 'data-type' | 'observedProperty' | 'description' | 'label' | 'measurementType'
    >
  >;
  get extent(): Promise<Extent> | Extent;
  data_queries: DataQueryConfig;
}

export interface Extent {
  id: string;
  spatial: {
    bbox: BBox[];
    values?: Record<'x' | 'y', string[]>;
    crs: string;
  };
  vertical?: { values: number[]; vrs: string };
  temporal: string[] | null;
}

interface BaseConfig<T extends ContentTypeNegotiator = ContentTypeNegotiator> {
  default_output_format?: T;
  output_formats?: T[];
  crs?: string[];
  description?: string;
  title?: string;
}
export interface QueryEvent<T extends ContentTypeNegotiator = ContentTypeNegotiator> {
  path: string; // Incase you want to limit queries on collections/{collectionId}/{queryType} or .../istances
  datetime?: string | Partial<Record<'min' | 'max', string>>;
  bbox?: BBox;
  crs: string;
  instanceId: string | undefined;
  'parameter-name': string[];
  z?: Record<'min' | 'max', number> | number[];
  format: T;
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
  instances: InstancesConfig;
}
type TopLevelCollections = CoverageCollection | EdrFeatureCollection | FeatureCollection;

type Return = TopLevelCollections | Exclude<CoverageJSON, NdArray> | EdrFeature;

export interface LocationsConfig<
  T extends ContentTypeNegotiator = ContentTypeNegotiator,
> extends BaseConfig<T> {
  multi?: boolean;
  queryAll(
    e: Omit<QueryEvent<T>, 'parameter-name'>,
  ): Promise<EdrFeatureCollection> | EdrFeatureCollection;
  queryOne(
    e: Omit<QueryEvent<T>, 'bbox' | 'z'> & {
      locId: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<Return> | Return;
}

export interface ItemsConfig<
  T extends ContentTypeNegotiator = ContentTypeNegotiator,
> extends BaseConfig<T> {
  handler(
    e: QueryEvent<T> & {
      limit?: number;
      offset?: number;
    },
  ): Promise<TopLevelCollections>;
  handler(
    e: Pick<QueryEvent<T>, 'instanceId' | 'crs'> & {
      itemId: string;
    },
  ): Promise<Feature | EdrFeature | Coverage | Domain>;
}

export interface RadiusConfig<
  T extends ContentTypeNegotiator = ContentTypeNegotiator,
> extends BaseConfig<T> {
  within_units?: Length[];
  handler: (
    e: QueryEvent<T> & {
      within: number;
      'within-units'?: Extract<Length, 'meters'>; // Or convert to meters
      coords: Point | MultiPoint;
    },
  ) => Promise<Return>;
}

export interface CorridorConfig<
  T extends ContentTypeNegotiator = ContentTypeNegotiator,
> extends BaseConfig<T> {
  width_units?: Length[];
  height_units?: Length[];
  handler(
    e: QueryEvent<T> &
      Record<'corridor-width' | 'corridor-height', number> &
      Partial<Record<`resolution-${'x' | 'y' | 'z'}`, number>> & {
        coords: LineString | MultiLineString;
      },
  ): Promise<Return> | Return;
}

export interface CubeConfig<
  T extends ContentTypeNegotiator = ContentTypeNegotiator,
> extends BaseConfig<T> {
  handler: (e: WithRequiredProperty<QueryEvent<T>, 'bbox'>) => Promise<Return>;
}
export interface AreaConfig<
  T extends ContentTypeNegotiator = ContentTypeNegotiator,
> extends BaseConfig<T> {
  handler: (
    e: QueryEvent<T> & { coords: Polygon | MultiPolygon } & Partial<
        Record<`resolution-${'x' | 'y'}`, number>
      >,
  ) => Promise<Return>;
}
export interface PositionConfig<
  T extends ContentTypeNegotiator = ContentTypeNegotiator,
> extends BaseConfig<T> {
  handler: (
    e: QueryEvent<T> & {
      coords: GeoJSON.Point | MultiPoint;
    },
  ) => Promise<Return>;
}

export interface TrajectoryConfig<
  T extends ContentTypeNegotiator = ContentTypeNegotiator,
> extends BaseConfig<T> {
  handler(
    e: QueryEvent<T> & {
      coords: LineString | MultiLineString;
    },
  ): Promise<Return> | Return;
}
export interface InstancesConfig<
  T extends ContentTypeNegotiator = ContentTypeNegotiator,
> extends BaseConfig<T> {
  /**
   * The value to use when the instanceId is "","latest","default"
   */
  defaultInstanceId: 'Africa';
  handler(instanceId: undefined | string): Promise<Extent[]> | Extent[];

  hasInstanceId(instanceId: string): Promise<boolean> | boolean;
}
/**
 * https://bobbyhadz.com/blog/typescript-make-property-required
 */
type WithRequiredProperty<Type, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property];
};
