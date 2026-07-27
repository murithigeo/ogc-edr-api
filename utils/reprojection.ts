import proj4 from 'proj4';
import type { Position } from 'geojson';
import { type Converter, get, toURI, uriproj, load } from '@murithigeo/uriproj';

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

  geomReproject<T extends GeoJSON.Geometry>(geom: T): T {
    switch (geom.type) {
      case 'Point':
        return this.Point(geom);
      case 'MultiPoint':
        return this.MultiPoint(geom);
      case 'LineString':
        return this.LineString(geom);
      case 'MultiLineString':
        return this.MultiLineString(geom);
      case 'Polygon':
        return this.Polygon(geom);
      case 'MultiPolygon':
        return this.MultiPolygon(geom);
      case 'GeometryCollection':
        return this.GeometryCollection(geom);
    }
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
    v = { ...this.MultiLineString({ ...v, type: 'MultiLineString' }), type: 'Polygon' };
    return v;
  }
  MultiPolygon(v: GeoJSON.MultiPolygon): GeoJSON.MultiPolygon {
    v.coordinates.forEach(
      (coordinates, i, arr) =>
        (arr[i] = this.Polygon({ type: 'Polygon', coordinates }).coordinates),
    );
    return v;
  }
  GeometryCollection(v: GeoJSON.GeometryCollection): GeoJSON.GeometryCollection {
    v.geometries.forEach((v, i, arr) => {
      arr[i] = this[v.type](v);
    });
    return v;
  }
}
