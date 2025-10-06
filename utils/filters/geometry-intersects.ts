import type { Feature } from "../types.d.ts";
import { booleanIntersects } from "@turf/boolean-intersects";

export default function (geom1: Feature) {
  return (geom2: Feature) => {
    return booleanIntersects(geom1, geom2);
  };
}
