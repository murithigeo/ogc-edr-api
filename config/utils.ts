import { numberReturned, type Bbox, type Feature } from "../utils/index.ts";
import type { FeatureCollection } from "../types.d.ts";
import type { LineString, Point, MultiLineString } from "geojson";
import { buffer } from "@turf/buffer";
import bbox from "@turf/bbox";
import {
  fromFile as fromF,
  fromArrayBuffer as fromAb,
  fromUrl as fromU,
} from "geotiff";

export function generateSamplePoints(
  xn = 0,
  yn = 0,
  zn = 0,
  bbox: Bbox
): FeatureCollection<Point, { z: number[] }> {
  const features = Array<Feature<Point, { z: number[] }>>();
  if (bbox.length === 4) bbox = [bbox[0], bbox[1], 0, bbox[2], bbox[3], 0];
  const [xmin, ymin, zmin, xmax, ymax, zmax] = bbox;
  const [xnd, ynd, znd] = [xn - 1, yn - 1, zn - 1];
  const [dx, dy, dz] = [
    (xmax - xmin) / (xnd < 1 ? 1 : xnd),
    (ymax - ymin) / (ynd < 1 ? 1 : ynd),
    (zmax - zmin) / (znd < 1 ? 1 : znd),
  ];
  const z = Array<number>();
  if (zmin !== zmax) {
    for (let _z = zmin; _z <= zmax; _z += dz) {
      z.push(_z);
    }
  } else z.push(zmin);

  for (let i = 0; i < xn; i++) {
    const x = xmin + i * dx;
    for (let j = 0; j < yn; j++) {
      const y = ymin + j * dy;
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [x, y] },
        properties: { z },
      });
    }
  }

  return {
    type: "FeatureCollection",
    features,
    timeStamp: new Date().toISOString(),
    numberMatched: features.length,
    numberReturned: numberReturned(features.length, features.length, 0),
  };
}

export function regularCorridor(
  coords: LineString | MultiLineString,
  width: number
) {
  const buffered = buffer(coords, width, { units: "meters" });
  if (!buffered)
    throw Error(`Unable to generate buffer around LineString/MultiLineString`);

  return bbox(buffered);
}

export async function fromFile(...args: Parameters<typeof fromF>) {
  const file = await fromF(...args);

  return {
    ...file,
    getImage: async (index?: number) => {
      const image = await file.getImage(index);

      return {
        ...image,
        get bbox() {
          return image.getBoundingBox() as Bbox;
        },
        get pixelPosition() {
          return (position: [number, number]) => {
            const widthPct =
              (position[0] - this.bbox[0]) / (this.bbox[2] - this.bbox[0]);
            const heightPct =
              (position[1] - this.bbox[1]) / (this.bbox[3] - this.bbox[1]);

            return [
              Math.floor(image.getWidth() * widthPct),
              Math.floor(image.getHeight() * (1 - heightPct)),
            ];
          };
        },
        getData(bbox?: Bbox, bandIndex: number = 0) {
          return async (position: number[]) => {
            const [xPx, yPx] = this.pixelPosition([position[0], position[1]]);
            const data = await image.readRasters({
              window: [xPx, yPx, xPx + 1, yPx + 1],
              bbox,
            });
            return data[bandIndex];
          };
        },
      };
    },
  };
}

export async function fromArrayBuffer(...args: Parameters<typeof fromAb>) {
  const file = await fromAb(...args);
  return {
    ...file,
    getImage: async (index?: number) => {
      const image = await file.getImage(index);

      return {
        ...image,
        get bbox() {
          return image.getBoundingBox() as Bbox;
        },
        get pixelPosition() {
          return (position: [number, number]) => {
            const widthPct =
              (position[0] - this.bbox[0]) / (this.bbox[2] - this.bbox[0]);
            const heightPct =
              (position[1] - this.bbox[1]) / (this.bbox[3] - this.bbox[1]);

            return [
              Math.floor(image.getWidth() * widthPct),
              Math.floor(image.getHeight() * (1 - heightPct)),
            ];
          };
        },
        getData(bbox?: Bbox, bandIndex: number = 0) {
          return async (position: number[]) => {
            const [xPx, yPx] = this.pixelPosition([position[0], position[1]]);
            const data = await image.readRasters({
              window: [xPx, yPx, xPx + 1, yPx + 1],
              bbox,
            });
            return data[bandIndex];
          };
        },
      };
    },
  };
}

export async function fromUrl(...args: Parameters<typeof fromU>) {
  const file = await fromU(...args);
  return {
    ...file,
    getImage: async (index?: number) => {
      const image = await file.getImage(index);

      return {
        ...image,
        get bbox() {
          return image.getBoundingBox() as Bbox;
        },
        get pixelPosition() {
          return (position: [number, number]) => {
            const widthPct =
              (position[0] - this.bbox[0]) / (this.bbox[2] - this.bbox[0]);
            const heightPct =
              (position[1] - this.bbox[1]) / (this.bbox[3] - this.bbox[1]);

            return [
              Math.floor(image.getWidth() * widthPct),
              Math.floor(image.getHeight() * (1 - heightPct)),
            ];
          };
        },
        getData(bbox?: Bbox, bandIndex: number = 0) {
          return async (position: number[]) => {
            const [xPx, yPx] = this.pixelPosition([position[0], position[1]]);
            const data = await image.readRasters({
              window: [xPx, yPx, xPx + 1, yPx + 1],
              bbox,
            });
            return data[bandIndex];
          };
        },
      };
    },
  };
}
