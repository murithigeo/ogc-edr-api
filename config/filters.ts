import type { LineString, MultiLineString, MultiPoint, Point } from "geojson";
import { buffer } from "@turf/buffer";
import {
  bboxPolygon,
  type Feature,
  geometryIntersects,
} from "../utils/index.ts";
import { regularCorridor } from "./utils.ts";
export function corridorFilter(
  coords: LineString | MultiLineString,
  width: number,
) {
  return (feature: Feature) => {
    //This is not a rectangle-ish meaning that we can't generate reliable randohm points
    const bboxed = bboxPolygon(regularCorridor(coords, width));
    return geometryIntersects(bboxed)(feature);
  };
}

export function radiusFilter(coords: Point | MultiPoint, within: number) {
  return (feature: Feature) => {
    const radius = buffer(coords, within, { units: "meters" });
    if (!radius) return true;
    return geometryIntersects(radius)(feature);
  };
}
