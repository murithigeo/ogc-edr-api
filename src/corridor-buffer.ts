import buffer from "@turf/buffer";
import bbox from "@turf/bbox";
import { HttpError } from "exegesis";
import rectangleGrid from "@turf/rectangle-grid";
import centroid from "@turf/centroid";
import type {
  Geometry,
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
} from "geojson";

/**
 * Generates a buffer around the geometry
 * For our corridor use case, we need to slice off the ends
 */
export default function (geom: Exclude<Geometry, GeometryCollection>, width: number) {
  const buff = buffer(geom, width, { units: "meters" });
  if (!buff) throw new HttpError(500, "Failed to generate a buffer for the corridor");
  return buff;
}

/**
 * Creates a rectangular grid from the provided geometry
 * Then calculates the centres of those grid cells in order to get the sample points
 */
export function getSamplePoints(
  geom: Polygon | MultiPolygon,
  resolution: Record<"x" | "y", number>,
) {
  return rectangleGrid(bbox(geom), resolution.x, resolution.y, {
    units: "meters",
    mask: geom,
  }).features.map((f) => centroid(f).geometry);
}
