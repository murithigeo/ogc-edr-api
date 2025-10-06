import type { Elevation, Feature, GeoJsonProperties } from "../types.d.ts";

export default function elevation(z: Elevation, field?: string) {
  return <G extends GeoJSON.Geometry, P extends GeoJsonProperties>(
    feature: Feature<G, P>
  ) => {
    if (!z) return true;
    if (
      Array<GeoJSON.GeoJsonGeometryTypes>(
        "MultiPolygon",
        "Polygon",
        "GeometryCollection"
      )
    ) {
      return true;
    }

    let values: number[] = [];
    if (field && feature.properties) {
      const v = feature.properties[field];
      values = Array.isArray(v) ? v.map((p) => parseFloat(p)) : [parseFloat(v)];
    } else {
      switch (feature.geometry.type) {
        case "Point":
          values = [feature.geometry.coordinates[3]]; //.filter(value => value !== undefined);
          break;
        case "MultiPoint":
        case "LineString":
          values = feature.geometry.coordinates.flatMap((outer) => outer[3]);
          break;
        case "MultiLineString":
          values = feature.geometry.coordinates.flatMap((outer) =>
            outer.map((inner) => inner[3])
          );
          break;
        default:
          return true;
      }
    }
    values = values.sort((a, b) => a - b).filter((v) => v !== undefined);
    let levelcheck = true;
    let mincheck = true;
    let maxcheck = true;
    if (z.max) maxcheck = values.some((v) => v <= z.max!);
    if (z.min) mincheck = values.some((v) => z.min! <= v);
    if (z.values) levelcheck = values.some((v) => z.values?.includes(v));
    return levelcheck && mincheck && maxcheck;
  };
}
