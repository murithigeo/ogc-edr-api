import proj4 from "proj4";
import type { Crs, Feature, GeoJsonProperties } from "./types.d.ts";
import type { Position } from "geojson";

proj4.defs("OGC:CRS84", proj4.defs("EPSG:4326"));
export const crs = {
  "OGC:CRS84": {
    type: "GeographicCRS",
    hasZ: false,
    srid: 4326,
    flipCoords: false,
    uri: "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
  },

  "EPSG:4326": {
    type: "GeographicCRS",
    hasZ: false,
    srid: 4326,
    flipCoords: true,
    uri: "http://www.opengis.net/def/crs/EPSG/0/4326",
  },
  get "http://www.opengis.net/def/crs/OGC/1.3/CRS84"() {
    return this["OGC:CRS84"];
  },
  get "http://www.opengis.net/def/crs/EPSG/0/4326"() {
    return this["EPSG:4326"];
  },
} satisfies { [x: string]: Crs };
export const CRS84 = Object.keys(crs)[0];
// const cache = new Map<string, string | ProjectionDefinition | unknown>([
//   ,
// ]);

const uriPrefix = "http://www.opengis.net/def/crs/";
function toAuthCode(uri: string): keyof typeof crs {
  let authority: string;
  let code: string;
  if (!uri.startsWith(uriPrefix)) {
    //Assume its in form of <authority:code>
    [authority, code] = uri.split(":");
  }
  //   //http://www.opengis.net/def/crs/OGC/1.3/CRS84
  else [, , authority, , code] = new URL(uri).pathname.substring(1).split("/");
  return `${authority.toUpperCase()}:${code}`;
}

// async function load(authcode: string) {
//   const match = proj4.defs(authcode) || cache.get(authcode);
//   if (match) return match;
//   try {
//     const [authority, code] = authcode.split(":");
//     const res = await fetch(
//       `https://spatialreference.org/ref/${authority.toLowerCase()}/${code}/prettywkt2.txt`
//     );
//     const projjson = await res.text();
//     cache.set(authcode, projjson);
//     return projjson;
//   } catch (error) {
//     console.log(error);
//     // return proj4.defs("OGC:CRS84");
//   }
// }
// for (const uri of Object.keys(crs)) {
//   await load(toAuthCode(uri));
// }
export function reproject(from: keyof typeof crs, to: keyof typeof crs) {
  return <
    T extends GeoJSON.Geometry,
    P extends GeoJsonProperties = GeoJsonProperties
  >(
    feature: Feature<T, P>
  ) => {
    const geometry = feature.geometry;
    if (geometry.type === "GeometryCollection") return feature;
    const reprojector = positionReproject(from, to);
    switch (geometry.type) {
      case "Point":
        geometry.coordinates = reprojector(geometry.coordinates);
        break;
      case "MultiPoint":
      case "LineString":
        geometry.coordinates = geometry.coordinates.map(reprojector);
        break;
      case "MultiLineString":
      case "Polygon":
        geometry.coordinates = geometry.coordinates.map((inner) =>
          inner.map(reprojector)
        );
        break;
      case "MultiPolygon":
        geometry.coordinates = geometry.coordinates.map((outer) =>
          outer.map((inner) => inner.map(reprojector))
        );

        break;
    }
    feature.geometry = geometry;
    return feature;
  };
}

function positionReproject(
  from: keyof typeof crs,
  to: keyof typeof crs | string
) {
  return (position: Position) => {
    // const fromcrs=
    const fromcrs = crs[toAuthCode(from)];
    const targetcrs = crs[toAuthCode(to)];

    const projector = proj4(toAuthCode(from), toAuthCode(to));
    if (fromcrs.flipCoords)
      position = [position[1], position[0], ...position.slice(2)];
    position = projector.forward(position);
    if (targetcrs.flipCoords)
      position = [position[1], position[0], ...position.slice(2)];
    return position;
  };
}
