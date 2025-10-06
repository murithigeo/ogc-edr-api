import type { Feature } from "../types.d.ts";
import { booleanIntersects } from "@turf/boolean-intersects";

export default function (geom1?: Feature|GeoJSON.Geometry) {
  return (geom2: Feature) => {
    if (!geom1) return true;
    return booleanIntersects(geom1, geom2);
  };
}
