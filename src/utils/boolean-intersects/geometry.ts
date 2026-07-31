import bboxPolygon from "@turf/bbox-polygon";
import booleanIntersects from "@turf/boolean-intersects";
import type { Feature, Geometry, BBox } from "geojson";

export default function (geom1?: Feature | Geometry | BBox) {
  return (geom2: Feature | Geometry | BBox) => {
    if (!geom1) return true;
    if (Array.isArray(geom1)) geom1 = bboxPolygon(geom1);
    if (Array.isArray(geom2)) geom2 = bboxPolygon(geom2);
    return booleanIntersects(geom1, geom2);
  };
}
