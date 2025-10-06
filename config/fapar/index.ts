import {
  fromFile,
  fromUrl,
  generateSamplePoints,
  regularCorridor,
} from "../utils.ts";
import type { Dataset } from "../index.ts";
import { bbox } from "@turf/bbox";
import type { Coverage, ReferenceSystemConnection } from "coveragejson";
import {
  type Bbox,
  bboxPolygon,
  crs,
  type Datetime,
  type Feature,
  geometryIntersects,
  reproject,
} from "../../utils/index.ts";
import path from "node:path";
// import fs from "node:fs";
import process from "node:process";
import buffer from "@turf/buffer";

const refs = {
  "2025-01-01": "fpanv_m_gdo_20250101_t_300_z01.tif",
  "2025-01-11": "fpanv_m_gdo_20250111_t_300_z01.tif",
  "2025-01-21": "fpanv_m_gdo_20250121_t_300_z01.tif",
  "2025-02-01": "fpanv_m_gdo_20250201_t_300_z01.tif",
  "2025-02-11": "fpanv_m_gdo_20250211_t_300_z01.tif",
  "2025-02-21": "fpanv_m_gdo_20250221_t_300_z01.tif",
  "2025-03-01": "fpanv_m_gdo_20250301_t_300_z02.tif",
  "2025-03-11": "fpanv_m_gdo_20250311_t_300_z01.tif",
  "2025-03-21": "fpanv_m_gdo_20250321_t_300_z01.tif",
  "2025-04-01": "fpanv_m_gdo_20250401_t_300_z02.tif",
  "2025-04-11": "fpanv_m_gdo_20250411_t_300_z01.tif",
  "2025-04-21": "fpanv_m_gdo_20250421_t_300_z01.tif",
  "2025-05-01": "fpanv_m_gdo_20250501_t_300_z01.tif",
  "2025-05-11": "fpanv_m_gdo_20250511_t_300_z01.tif",
  "2025-05-21": "fpanv_m_gdo_20250521_t_300_z01.tif",
  "2025-06-01": "fpanv_m_gdo_20250601_t_300_z02.tif",
  "2025-06-11": "fpanv_m_gdo_20250611_t_300_z02.tif",
  "2025-06-21": "fpanv_m_gdo_20250621_t_300_z03.tif",
  "2025-07-01": "fpanv_m_gdo_20250701_t_300_z01.tif",
  "2025-07-11": "fpanv_m_gdo_20250711_t_300_z02.tif",
  "2025-07-21": "fpanv_m_gdo_20250721_t_300_z01.tif",
  "2025-08-01": "fpanv_m_gdo_20250801_t_300_z01.tif",
  "2025-08-11": "fpanv_m_gdo_20250811_t_300_z01.tif",
  "2025-08-21": "fpanv_m_gdo_20250821_t_300_z02.tif",
  "2025-09-01": "fpanv_m_gdo_20250901_t_300_z01.tif",
};

const cache = new Map<
  string,
  Awaited<ReturnType<Awaited<ReturnType<typeof fromFile>>["getImage"]>>
>();

for (const k of Object.keys(refs)) {
  cache.set(
    k,
    await (await fromFile(path.resolve(process.cwd(), "config/fapar", refs[k])))
      .getImage(),
  );
}
const [resX, resY] = [5, 5];
const viParameter = {
  id: "vegetationindex",
  dataType: "float",
  unit: {
    label: { en: "Vegetation Index" },
    id:
      "https://drought.emergency.copernicus.eu/data/factsheets/factsheet_fapar_viirs.pdf",
    symbol: "",
  },
  observedProperty: {
    description: { en: "Impact of agricultural drought on vegetation" },
    label: { en: "Agricultural Drought Impact Index" },
  },
} as Dataset["parameters"][0];
export default {
  id: "fapar-anomaly",
  crs: ["OGC:CRS84", "EPSG:4326"],
  storageCrs: "OGC:CRS84",
  parameters: [viParameter],
  data_queries: {
    position: {
      default_output_format: "COVERAGEJSON",
      output_formats: ["COVERAGEJSON"],
      allowAt: ["collection", "instance"],
      async handler(opts) {
        const dates = Object.keys(refs)
          .filter(instanceIdFilter(opts.instanceId))
          .filter(datetimeFilter(opts.datetime));

        const features: Feature<GeoJSON.Point>[] = opts.coords.type === "Point"
          ? [{ type: "Feature", geometry: opts.coords, properties: {} }]
          : opts.coords.coordinates.map((p) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: p,
            },
            properties: {},
          }));
        const { dataType: _, ...vi } = viParameter;
        return {
          type: "CoverageCollection",
          coverages: await Promise.all(
            features.map(
              samplePointToCoverage(
                dates,
                bbox(opts.coords),
                opts.parameters?.includes(viParameter.id) || false,
                opts.crs,
              ),
            ),
          ),
          referencing: toReferencing(opts.crs),
          parameters: {
            [viParameter.id]: {
              type: "Parameter",
              ...vi,
            },
          },
        };
      },
    },
    instances: {
      allowAt: ["collection", "instance"],
      default_output_format: "JSON",
      handler(opts) {
        return Object.keys(refs)
          .filter(instanceIdFilter(opts.instanceId))
          .filter(datetimeFilter(opts.datetime))
          .map((id) => {
            const bbox = cache.get(id)!.bbox;
            const [dx, dy] = [
              (bbox[2] - bbox[0]) / resX,
              (bbox[3] - bbox[1]) / resY,
            ];
            return {
              id,
              spatial: {
                bbox: [bbox],
                crs: "OGC:CRS84",
                values: {
                  x: [`R${resX}/${bbox[0]}/${dx}`],
                  y: [`R${resY}/${bbox[1]}/${dy}`],
                },
              },
              temporal: [id],
            };
          });
      },
      default_instanceid: Object.keys(refs).slice(-1)[0],
    },
    corridor: {
      allowAt: ["instance", "collection"],
      default_output_format: "COVERAGEJSON",
      output_formats: ["COVERAGEJSON"],
      height_units: ["meters", "kilometers"],
      width_units: ["meters", "kilometers"],
      async handler(opts) {
        const dates = Object.keys(refs).filter(
          instanceIdFilter(opts.instanceId),
        );
        const includeValues = opts.parameters?.includes(viParameter.id) ||
          false;
        const bbox = regularCorridor(opts.coords, opts["corridor-width"]);
        const samplingPoints = generateSamplePoints(
          opts["resolution-x"] = resX,
          opts["resolution-y"] = resY,
          opts["resolution-z"] = 10,
          [bbox[0], bbox[1], 0, bbox[2], bbox[3], 0],
        );
        const { dataType: _, ...vi } = viParameter;
        return {
          type: "CoverageCollection",
          coverages: await Promise.all(
            samplingPoints.features.map(
              samplePointToCoverage(dates, bbox, includeValues, opts.crs),
            ),
          ),
          parameters: {
            [vi.id]: {
              type: "Parameter",
              ...vi,
            },
          },
          referencing: toReferencing(opts.crs),
        };
      },
    },
    area: {
      allowAt: ["collection", "instance"],
      output_formats: ["COVERAGEJSON"],
      default_output_format: "COVERAGEJSON",
      async handler(opts) {
        const bboxOfPolygon = bbox(opts.coords);
        const dates = Object.keys(refs)
          .filter(instanceIdFilter(opts.instanceId))
          .filter(datetimeFilter(opts.datetime));
        const samplePoints = generateSamplePoints(
          opts["resolution-x"] || resX,
          opts["resolution-y"] || resY,
          0,
          [bbox[0], bbox[1], 0, bbox[2], bbox[3], 0],
        );
        // Ensure that they in polygon
        samplePoints.features = samplePoints.features.filter(
          geometryIntersects(opts.coords),
        );

        const { dataType: _, ...vi } = viParameter;
        return {
          type: "CoverageCollection",
          coverages: await Promise.all(
            samplePoints.features.map(
              samplePointToCoverage(
                dates,
                bboxOfPolygon,
                opts.parameters?.includes(viParameter.id) || false,
                opts.crs,
              ),
            ),
          ),
          parameters: {
            [vi.id]: {
              type: "Parameter",
              ...vi,
            },
          },
          referencing: toReferencing(opts.crs),
        };
      },
    },
    radius: {
      output_formats: ["COVERAGEJSON"],
      default_output_format: "COVERAGEJSON",
      allowAt: ["collection", "instance"],
      within_units: ["meters", "kilometers"],
      async handler(opts) {
        const dates = Object.keys(refs)
          .filter(instanceIdFilter(opts.instanceId))
          .filter(datetimeFilter(opts.datetime));
        const circles = buffer(opts.coords, opts.within, { units: "meters" })!;
        const bboxofcircles = bbox(circles);
        const samplePoints = generateSamplePoints(resX, resY, 0, bboxofcircles);
        samplePoints.features = samplePoints.features.filter(
          geometryIntersects(circles),
        );
        const { dataType: _, ...vi } = viParameter;
        return {
          type: "CoverageCollection",
          coverages: await Promise.all(
            samplePoints.features.map(
              samplePointToCoverage(
                dates,
                bboxofcircles,
                opts.parameters?.includes(viParameter.id) || false,
                opts.crs,
              ),
            ),
          ),
          referencing: toReferencing(opts.crs),
          parameters: {
            [vi.id]: {
              type: "Parameter",
              ...vi,
            },
          },
        };
      },
    },
    trajectory: {
      allowAt: ["collection", "instance"],
      default_output_format: "COVERAGEJSON",
      output_formats: ["COVERAGEJSON"],
      async handler(opts) {
        const dates = Object.keys(refs)
          .filter(instanceIdFilter(opts.instanceId))
          .filter(datetimeFilter(opts.datetime));
        const minimalbuffer = buffer(opts.coords, 5, { units: "meters" });
        const bboxOfLines = bbox(minimalbuffer!);
        const samplePoints = generateSamplePoints(resX, resY, 0, bboxOfLines);

        //
        samplePoints.features = samplePoints.features.filter(
          geometryIntersects(minimalbuffer),
        );
        const { dataType: _, ...vi } = viParameter;
        return {
          type: "CoverageCollection",
          coverages: await Promise.all(
            samplePoints.features.map(
              samplePointToCoverage(
                dates,
                bboxOfLines,
                opts.parameters?.includes(viParameter.id) || false,
                opts.crs,
              ),
            ),
          ),
          referencing: toReferencing(opts.crs),
          parameters: {
            [vi.id]: {
              type: "Parameter",
              ...vi,
            },
          },
        };
      },
    },
  },
  keywords: ["fapar", "vegetation index"],
  output_formats: ["GEOJSON", "COVERAGEJSON"],
  getExtent() {
    const geometries: GeoJSON.GeometryCollection = {
      type: "GeometryCollection",
      geometries: Object.keys(refs).map((p) =>
        bboxPolygon(cache.get(p)!.bbox).geometry
      ),
    };
    const _bbox = bbox(geometries);
    const [dx, dy] = [
      (_bbox[2] - _bbox[0]) / resX,
      (_bbox[3] - _bbox[1]) / resY,
    ];
    return {
      id: this.id,
      spatial: {
        bbox: [_bbox, ...geometries.geometries.map((p) => bbox(p))],
        crs: this.storageCrs,
        values: {
          x: [`R${resX}/${_bbox[0]}/${dx}`],
          y: [`R${resY}/${_bbox[1]}/${dy}`],
        },
      },
      temporal: Object.keys(refs),
    };
  },
  description: "",
} satisfies Dataset;

function instanceIdFilter(instanceId: string | undefined) {
  return (date: string) => {
    if (!instanceId) return true;
    return instanceId === date;
  };
}

function datetimeFilter(datetime: Datetime | undefined) {
  return (date: string) => {
    if (!datetime) return true;
    // if(datetime.min)
    let mincheck = true;
    let maxcheck = true;
    let valuecheck = true;
    if (datetime.max) {
      maxcheck = new Date(datetime.max).getTime() >= new Date(date).getTime();
    }
    if (datetime.min) {
      mincheck = new Date(datetime.min).getTime() <= new Date(date).getTime();
    }
    if (datetime.values) {
      valuecheck = datetime.values
        .map((v) => new Date(v).getTime())
        .includes(new Date().getTime());
    }
    return valuecheck && mincheck && maxcheck;
  };
}

function samplePointToCoverage(
  dates: string[],
  bbox: Bbox,
  includeValues: boolean,
  toCrs: keyof typeof crs,
) {
  const images = dates.map((p) => cache.get(p)!);
  return async (feature: Feature<GeoJSON.Point>): Promise<Coverage> => {
    const cov: Coverage<CoverageJSON.PointSeries> = {
      type: "Coverage",
      domainType: "PointSeries",
      domain: {
        type: "Domain",
        domainType: "PointSeries",
        axes: {
          x: { values: [feature.geometry.coordinates[0]] },
          y: { values: [feature.geometry.coordinates[1]] },
          t: { values: dates },
        },
      },
      ranges: {},
    };

    if (includeValues) {
      const values = await Promise.all(
        images.flatMap(async (p) => {
          const v = await p.getData(bbox)(
            reproject(toCrs, "OGC:CRS84")(feature).geometry.coordinates,
          );
          let value = v[0];
          if (Number.isNaN(value)) value = null;
          return value;
        }),
      );
      cov.ranges[viParameter.id] = {
        type: "NdArray",
        dataType: "float",
        values,
        axisNames: ["t"],
        shape: [values.length],
      };
    }
    return cov;
  };
}

// function samplePointToEdrFeature(
//   dates: string[],
//   bbox: Bbox,
//   includeValues: boolean,
//   tocrs: keyof typeof crs
// ) {
//   const images = dates.map((p) => cache.get(p)!);
//   return async (
//     feature: Feature<GeoJSON.Point>,
//     index: number
//   ): Promise<EdrFeature> => {
//     const doc: EdrFeature = {
//       type: "Feature",
//       geometry: feature.geometry,
//       properties: {
//         datetime: dates.join(","),
//         edrqueryendpoint: "",
//         "parameter-name": [viParameter.id],
//         label: {
//           en: `Sample Query Point ${index}`,
//         },
//       },
//     };
//     if (includeValues) {
//       doc.properties[viParameter.id] = await Promise.all(
//         images.flatMap(async (image) => {
//           let value = (
//             await image.getData(bbox)(
//               reproject(tocrs, "OGC:CRS84")(feature).geometry.coordinates
//             )
//           )[0];
//           if (Number.isNaN(value)) value = null;
//           return value;
//         })
//       );
//     }
//     return doc;
//   };
// }

function toReferencing(tocrs: keyof typeof crs): ReferenceSystemConnection[] {
  const _crs = crs[tocrs];
  return [
    {
      system: {
        id: _crs.uri,
        type: _crs.type,
      },
      coordinates: ["x", "y"],
    },
    {
      system: {
        calendar: "Gregorian",
        type: "TemporalRS",
      },
      coordinates: ["t"],
    },
  ];
}
