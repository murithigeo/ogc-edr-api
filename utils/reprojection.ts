import proj4 from 'proj4';
import type { GeoJsonProperties, Geometry, Position } from 'geojson';
import { type Converter, get, toURI, load } from '@murithigeo/uriproj';
import type { Feature } from '../src/types/features.d.ts';

export class Referencing {
  converter: Converter;
  from: string;
  to: string;
  constructor(from: string, to: string) {
    this.from = toURI(from);
    this.to = toURI(to);
    this.converter = proj4(get(from)!, get(to)!);
  }

  crs(position: Position): Position {
    // if (proj4.defs(this.from).axis === "enu") position = [position[1], position[0]];
    position = this.converter.forward(position, true);
    return position;
  }
  static async load(from: string, to: string): Promise<Referencing> {
    from = toURI(from);
    to = toURI(to);
    await Promise.all([load(from), load(to)]);
    return new Referencing(from, to);
  }

  geometry<T extends Geometry>(geom: T): T {
    if (this.to === this.from) return geom;
    const fn = this[geom.type];
    return fn.bind(this)(geom) as T;
  }
  feature<G extends Geometry, P extends GeoJsonProperties>(feat: Feature<G, P>): Feature<G, P> {
    return { ...feat, geometry: this.geometry(feat.geometry) };
  }

  Point(v: GeoJSON.Point): GeoJSON.Point {
    v.coordinates = this.crs(v.coordinates);
    return v;
  }
  MultiPoint(v: GeoJSON.MultiPoint): GeoJSON.MultiPoint {
    v.coordinates.forEach((v, i, arr) => (arr[i] = this.crs(v)));
    return v;
  }
  LineString(v: GeoJSON.LineString): GeoJSON.LineString {
    v.coordinates.forEach((v, i, arr) => (arr[i] = this.crs(v)));
    return v;
  }
  MultiLineString(v: GeoJSON.MultiLineString): GeoJSON.MultiLineString {
    // v.coordinates.forEach((r0, rI, arr) => r0.forEach(()));
    for (let i = 0; i < v.coordinates.length; i++) {
      for (let x = 0; x < v.coordinates[i].length; i++) {
        v.coordinates[i][x] = this.crs(v.coordinates[i][x]);
      }
    }
    return v;
  }
  Polygon(v: GeoJSON.Polygon): GeoJSON.Polygon {
    v.coordinates = v.coordinates.map((exterior) => exterior.map((verts) => this.crs(verts)));
    return v;
  }
  MultiPolygon(v: GeoJSON.MultiPolygon): GeoJSON.MultiPolygon {
    v.coordinates = v.coordinates.map((ext) => ext.map((int) => int.map((pos) => this.crs(pos))));
    return v;
  }
  GeometryCollection(v: GeoJSON.GeometryCollection): GeoJSON.GeometryCollection {
    v.geometries = v.geometries.map((geom) => this.geometry(geom));
    return v;
  }
}
