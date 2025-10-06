import type { Datetime, Feature, GeoJsonProperties } from "../types.d.ts";

export default function datetimeFilter(datetime?: Datetime, field?: string) {
  return <G extends GeoJSON.Geometry, P extends GeoJsonProperties>(
    feature: Feature<G, P>
  ) => {
    if (!datetime || !field) return true;
    const values_ = feature.properties[field];

    const values = Array.isArray(values_) ? values_ : [values_];
    values.map((p) => new Date(p).getTime()).sort((a, b) => a - b);
    if (datetime.min) return datetime.min <= values[0];
    if (datetime.max) return datetime.max >= values[values.length - 1];
    if (datetime.values) return datetime.values.some((v) => values.includes(v));
  };
}
