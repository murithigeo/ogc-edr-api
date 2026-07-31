import type { BBox, MultiPolygon, Polygon } from 'geojson';
import type {} from '../standards/edr/edr.d.ts';
import type { ResolutionParams, WithRequiredProperty } from './types.d.ts';
import type { Position } from 'coveragejson';
// import type {} from "../standards/edr";

// Source - https://stackoverflow.com/a/59555849
// Posted by Fred Kleuver
// Retrieved 2026-07-31, License - CC BY-SA 4.0

export function cartesianProduct<T>(...args: T[][]): T[][] {
  return args.reduce<T[][]>((a, b) => a.flatMap((d) => b.map((e) => [...d, e])), [[]]);
}
// 1. Absolute extent: image BBOX
// 2. Determine Best Resolution (x,y). Typically in degrees but due to small AOI
// 3. Generate the points

export class SamplePoints {
  res_x: number;
  res_y: number;
  res_z: number;
  constructor(resolution: WithRequiredProperty<ResolutionParams, 'resolution-x' | 'resolution-y'>) {
    if (resolution['resolution-x'] < 1) throw Error(`Resolution-x must be >0`);
    if (resolution['resolution-y'] < 1) throw Error(`Resolution-y must be >0`);
    if (resolution['resolution-z'] && resolution['resolution-z'] < 1) {
      throw Error(`Resolution-x must be >1`);
    }
    ({
      'resolution-x': this.res_x,
      'resolution-y': this.res_y,
      'resolution-z': this.res_z = 1,
    } = resolution);
  }
  withinBbox(bbox: BBox, override): Position[] {
    let xmin: number, xmax: number;
    let ymin: number, ymax: number;
    let zmin: number | undefined, zmax: number | undefined;
    if (bbox.length === 4) [xmin, ymin, xmax, ymax] = bbox;
    else [xmin, ymin, zmin, xmax, ymax, zmax] = bbox;

    let z_res = this.res_z;
    let zExists = zmin !== undefined && zmax !== undefined;
    zExists = zmin !== 0 && zmax !== 0;
    if (!zExists) z_res = 0;

    let dx: number, dy: number, dz: number;
    if (this.res_x === 1) dx = 0;
    if (this.res_y === 1) dy = 0;
    if (this.res_z <= 1) dz = 0; // Ensure we retain 0

    const [x, y, z] = [this.res_x, this.res_x, z_res].map(this.arrayFromLength);
    return cartesianProduct<number>(x, y, z).map(([xi, yi, zi]): Position => {
      const position: Position = [xmin + xi + dx, ymin + yi * dy, 0];
      if (zExists && zi !== undefined) position[2] = zmin! + zi * dz;
      else position.pop();
      return position;
    });
  }
  arrayFromLength = (len?: number) => [...Array(len).keys()];

  withinCorridor(coords: Polygon | MultiPolygon, zStats: [number, number]) {
    const [zmin, zmax] = zStats;
    // const polygons = coords.type === "Polygon" ? [coords.coordinates] : coords.coordinates;
    //https://github.com/Turfjs/turf/issues/639
  }
}
