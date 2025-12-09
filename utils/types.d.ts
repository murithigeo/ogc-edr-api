export type Link = {
  href: string;
  rel: string;
  title: string;
  hreflang?: string;
  length?: string;
  templated?: boolean;
  type?: string;
  channel?: string;
};

export type LandingPage = {
  links: Array<Link>;
  title?: string;
  description?: string;
};

export interface Collection extends LandingPage {
  id: string;
  storageCrsCoordinateEpoch?: number;
  crs: Array<string>;
  storageCrs?: string;
  itemType?: string | "feature";
  extent: Extent;
}

export type Bbox =
  | [number, number, number, number]
  | [number, number, number, number, number, number];

export type Interval = [string | null, null | string];
export interface Extent {
  spatial: {
    bbox: Array<Bbox>;
    crs: string;
  };
  temporal: {
    interval: Array<Interval>;
    trs: string;
  };
}

export type GeoJsonProperties = { [x: string]: any };
export interface Feature<
  G extends GeoJSON.Geometry = GeoJSON.Geometry,
  P extends GeoJsonProperties = GeoJsonProperties
> extends GeoJSON.Feature<G, P> {
  id?: string | number;
  links?: Array<Link>;
}

export interface ConformancePage {
  links?: Array<Link>;
  conformsTo: Array<string>;
}

type Crs = {
  type: "GeographicCRS" | "ProjectedCRS";
  hasZ: boolean;
  srid: number;
  flipCoords: boolean;
  uri: `http://www.opengis.net/def/crs/${string}/${number}/${string | number}`;
};
export interface FeatureCollection<
  G extends GeoJSON.Geometry = GeoJSON.Geometry,
  P extends GeoJsonProperties = GeoJsonProperties
> extends GeoJSON.FeatureCollection<G, P> {
  numberMatched: number;
  numberReturned: number;
  timeStamp: string;
}

export type Datetime = {
  min?: string;
  max?: string;
  values?: string[];
};

export type Elevation = {
  min?: number;
  max?: number;
  values?: number[];
};
