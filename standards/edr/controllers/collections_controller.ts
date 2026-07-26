import type { PromiseController } from 'exegesis';
import type { Dataset, Extent } from '../../../services/types.d.ts';
import type { Collection, DataQueries } from '../../../src/types/edr.d.ts';
import services from '../../../services/index.ts';
import type { Link } from '../../../utils/types.js';
import { get } from '@murithigeo/uriproj';
import { contentTypes, type ContentTypeNegotiator } from '../../../src/links/content-types.ts';

export default {
  listCollections: async (ctx) => {
    const data = Object.entries(services)
      .map(async ([, dataset]) => ({
        ...dataset,
        extent: await dataset.queryExtent(),
      }))
      .map(async (dataset) => toCollection(await dataset, undefined))
      .map(async (collection) => updateLinks(await collection));
  },
  getCollection: (ctx) => {},
  listInstances: (ctx) => {},
  getInstance: (ctx) => {},
} satisfies Record<string, PromiseController>;

async function toCollection(
  dataset: Dataset & {
    extent: Extent;
  },
  instanceId?: string,
): Promise<Collection> {
  const {
    output_formats,
    data_queries: queries,
    extent,
    parameters,
    distanceunits,
    ...rest
  } = dataset;
  extent.vertical?.values.sort((a, b) => a - b);
  extent.temporal?.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const { data_queries, ...others } = getDataQueries(queries, output_formats[0]);
  if (instanceId) delete data_queries.instances;
  return {
    ...rest,
    id: instanceId || dataset.id,
    output_formats: Array.from(new Set([...dataset.output_formats, ...others.output_formats])),
    extent: {
      spatial: {
        bbox: extent.spatial.bbox,
        crs: extent.spatial.crs,
        values: extent.spatial.values,
      },
      vertical: extent.vertical
        ? {
            interval: [
              [
                extent.vertical.values[0].toString(),
                extent.vertical?.values.at(-1)?.toString() || null,
              ],
            ],
            values: extent.vertical.values.map((v) => (v === null ? v : v.toString())),
            vrs: extent.vertical.vrs,
          }
        : undefined,
      temporal: {
        trs: 'Gregorian',
        interval: !extent.temporal
          ? [[null, null]]
          : [[extent.temporal[0] || null, extent.temporal.at(-1) || null]],
        values: extent.temporal,
      },
    },
    parameter_names: Object.keys(dataset.parameters).reduce(
      (l, r) => ({
        ...l,
        [r]: { ...dataset.parameters[r], type: 'Parameter' },
      }),
      {},
    ),
    data_queries,
    links: [],
    distanceunits: Array.from(new Set([...distanceunits, ...others.distanceunits])),
  };
}

function getDataQueries(queries: Dataset['data_queries'], def_o_format: ContentTypeNegotiator) {
  const data_queries: DataQueries = {};
  const output_formats: string[] = [];
  const distanceunits: string[] = [];
  for (const query_type of Object.keys(queries) as Array<keyof DataQueries>) {
    const { handler: _, crs, ...rest } = queries[query_type]!;
    if ('within_units' in rest && rest.within_units) distanceunits.push(...rest['within_units']);
    if ('height_units' in rest && rest.height_units) distanceunits.push(...rest['height_units']);
    if ('width_units' in rest && rest.width_units) distanceunits.push(...rest['width_units']);

    data_queries[query_type] = {
      link: {
        href: query_type,
        variables: {
          ...rest,
          query_type,
          crs_details: crs?.map((crs) => ({ crs, wkt: get(crs)! })),
        },
        rel: ['locations', 'items'].includes(query_type) ? 'items' : 'data',
        type: contentTypes[rest.default_output_format || def_o_format],
      },
    };
  }

  return { data_queries, output_formats, distanceunits };
}

function updateLinks(collection: Collection): Collection {
  return collection;
}
