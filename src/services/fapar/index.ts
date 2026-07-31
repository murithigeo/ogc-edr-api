import type { Dataset, Extent } from '../types.d.ts';
import type { Coverage, ReferenceSystemConnection } from 'coveragejson';
import { type DateTime, geometryIntersects, Referencing } from '../../utils/index.ts';
import path from 'node:path';
import process from 'node:process';
import buffer from '@turf/buffer';
import { get, toURI } from '@murithigeo/uriproj';

const refs = {
  '2025-01-01': 'fpanv_m_gdo_20250101_t_300_z01.tif',
  '2025-01-11': 'fpanv_m_gdo_20250111_t_300_z01.tif',
  '2025-01-21': 'fpanv_m_gdo_20250121_t_300_z01.tif',
  '2025-02-01': 'fpanv_m_gdo_20250201_t_300_z01.tif',
  '2025-02-11': 'fpanv_m_gdo_20250211_t_300_z01.tif',
  '2025-02-21': 'fpanv_m_gdo_20250221_t_300_z01.tif',
  '2025-03-01': 'fpanv_m_gdo_20250301_t_300_z02.tif',
  '2025-03-11': 'fpanv_m_gdo_20250311_t_300_z01.tif',
  '2025-03-21': 'fpanv_m_gdo_20250321_t_300_z01.tif',
  '2025-04-01': 'fpanv_m_gdo_20250401_t_300_z02.tif',
  '2025-04-11': 'fpanv_m_gdo_20250411_t_300_z01.tif',
  '2025-04-21': 'fpanv_m_gdo_20250421_t_300_z01.tif',
  '2025-05-01': 'fpanv_m_gdo_20250501_t_300_z01.tif',
  '2025-05-11': 'fpanv_m_gdo_20250511_t_300_z01.tif',
  '2025-05-21': 'fpanv_m_gdo_20250521_t_300_z01.tif',
  '2025-06-01': 'fpanv_m_gdo_20250601_t_300_z02.tif',
  '2025-06-11': 'fpanv_m_gdo_20250611_t_300_z02.tif',
  '2025-06-21': 'fpanv_m_gdo_20250621_t_300_z03.tif',
  '2025-07-01': 'fpanv_m_gdo_20250701_t_300_z01.tif',
  '2025-07-11': 'fpanv_m_gdo_20250711_t_300_z02.tif',
  '2025-07-21': 'fpanv_m_gdo_20250721_t_300_z01.tif',
  '2025-08-01': 'fpanv_m_gdo_20250801_t_300_z01.tif',
  '2025-08-11': 'fpanv_m_gdo_20250811_t_300_z01.tif',
  '2025-08-21': 'fpanv_m_gdo_20250821_t_300_z02.tif',
  '2025-09-01': 'fpanv_m_gdo_20250901_t_300_z01.tif',
};

const imgCache = new Map<
  string,
  Awaited<ReturnType<Awaited<ReturnType<typeof fromFile>>['getImage']>>
>();
for (const filename of Object.keys(refs)) {
  const file = await fromFile(path.join(process.cwd(), 'config/fapar', refs[filename]));
  const image = await file.getImage();
  imgCache.set(filename, image);
}
const [resX, resY] = [5, 5];

const extents = Object.entries(Object.fromEntries(imgCache.entries())).map(
  ([id, v]): Extent => ({
    id,
    temporal: [id],
    spatial: {
      bbox: [v.bbox],
    },
    vertical: undefined,
  }),
);

const parameters = {
  vegetationIndex: {
    id: 'vegetationindex',
    'data-type': 'float',
    unit: {
      label: { en: 'Vegetation Index' },
      id: 'https://drought.emergency.copernicus.eu/data/factsheets/factsheet_fapar_viirs.pdf',
      symbol: '',
    },
    observedProperty: {
      description: { en: 'Impact of agricultural drought on vegetation' },
      label: { en: 'Agricultural Drought Impact Index' },
    },
  },
} satisfies Dataset['parameters'];

export default {
  id: 'fapar-anomaly',
  crs: ['OGC:CRS84', 'EPSG:4326'],
  storageCrs: 'OGC:CRS84',
  parameters,
  output_formats: ['COVERAGEJSON'],
  data_queries: {},
} satisfies Dataset;

function instanceIdFilter(instanceId: string | undefined) {
  return (date: string) => {
    if (!instanceId) return true;
    return instanceId === date;
  };
}

// use @murithigeo/covjson-core
// function samplePointToCoverage(
//   dates: string[],
//   bbox: Bbox,
//   includeValues: boolean,
//   toCrs: keyof typeof crs,
// ) {
//   return async (feature: Feature<GeoJSON.Point>): Promise<Coverage> => {
//     const images = dates.map((d) => imgCache.get(d)!);
//     const cov: Coverage<CoverageJSON.PointSeries> = {
//       type: 'Coverage',
//       domainType: 'PointSeries',
//       domain: {
//         type: 'Domain',
//         domainType: 'PointSeries',
//         axes: {
//           x: { values: [feature.geometry.coordinates[0]] },
//           y: { values: [feature.geometry.coordinates[1]] },
//           t: { values: dates },
//         },
//       },
//       ranges: {},
//     };

//     if (includeValues) {
//       // let value = await image.getData(bbox)(
//       //   reproject(toCrs, "OGC:CRS84")(feature).geometry.coordinates
//       // );
//       let values = await Promise.all(
//         images.map(async (img) => {
//           const rawvalue = await img.getData(bbox)(
//             reproject(toCrs, 'OGC:CRS84')(feature).geometry.coordinates,
//           );
//           return rawvalue[0];
//         }),
//       );
//       values = values.map((v) => (Number.isNaN(v) ? null : v));
//       // value = value[0];
//       // if (Number.isNaN(value)) value = null;

//       cov.ranges[viParameter.id] = {
//         type: 'NdArray',
//         dataType: 'float',
//         values,
//         axisNames: ['t'],
//         shape: [values.length],
//       };
//     }
//     return cov;
//   };
// }

// function toReferencing(tocrs: string): ReferenceSystemConnection[] {
//   return [
//     {
//       system: {
//         id: tocrs,
//         type: proj4.defs(get(toURI(tocrs))!).,
//       },
//       coordinates: ['x', 'y'],
//     },
//     {
//       system: {
//         calendar: 'Gregorian',
//         type: 'TemporalRS',
//       },
//       coordinates: ['t'],
//     },
//   ];
// }
