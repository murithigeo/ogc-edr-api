import type { PromiseController } from 'exegesis';
import type { Dataset, Extent } from '../../../services/types.d.ts';
import type { Collection, DataQueries } from '../../../src/types/edr.d.ts';
import services from '../../../services/index.ts';
import { get } from '@murithigeo/uriproj';
import { contentTypes, type ContentTypeNegotiator } from '../../../src/content-types.ts';
import { Links } from '../../../src/links.ts';

export default {
  listCollections: async (ctx) => {
    const datasets = Object.values(services).map(async (data) => ({
      ...data,
      extent: await data.extent,
    }));

    const collections = (await Promise.all(datasets)).map((set) =>
      toCollection(set, { collectionId: set.id, hostname: ctx.api.serverObject?.url! }),
    );
    const links = new Links(ctx);
    ctx.res.status(200).json({
      collections,
      links: collections.flatMap(({ id }) => links.collection(id).self().alternates([]).links),
    });
  },
  getCollection: async (ctx) => {
    const set = services[ctx.params.path.collectionId];
    const json = toCollection(
      { ...set, extent: await set.extent },
      { collectionId: set.id, hostname: ctx.api.serverObject?.url! },
    );
    ctx.res.status(200).json(json);
  },
  listInstances: async (ctx) => {
    const set = services[ctx.params.path.collectionId];
    const extents = await set.data_queries.instances.handler(undefined);
    const instances = extents
      .map((extent) => ({ ...set, extent }))
      .map((dataset) => {
        const { id: instanceId } = dataset.extent;
        return toCollection(
          { ...dataset, id: instanceId },
          { collectionId: set.id, hostname: ctx.api.serverObject?.url!, instanceId },
        );
      });
    const links = new Links(ctx);
    ctx.res.status(200).json({
      instances,
      links: extents.flatMap(
        (instance) => links.collection(set.id, instance.id).self().alternates([]).links,
      ),
    });
  },
  getInstance: async (ctx) => {
    const dataset = services[ctx.params.path.collectionId];
    const [extent] = await dataset.data_queries.instances.handler(ctx.params.path.instanceId);
    const json = toCollection(
      { ...dataset, extent },
      {
        collectionId: dataset.id,
        hostname: ctx.api.serverObject?.url!,
        instanceId: extent.id,
      },
    );
    ctx.res.json(json);
  },
} satisfies Record<string, PromiseController>;

function toCollection(
  dataset: Dataset & {
    extent: Awaited<Extent>;
  },
  options: Omit<Options, 'default_output_format'>,
): Collection {
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
  const { data_queries, ...others } = getDataQueries(queries, {
    ...options,
    default_output_format: dataset.output_formats[0],
  });

  const links = Object.values(data_queries).map(({ link: { variables, ...link } }) => link);
  const collection: Collection = {
    ...rest,
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
                extent.vertical.values[0]?.toString(),
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
    links,
    distanceunits: Array.from(new Set([...distanceunits, ...others.distanceunits])),
  };
  return collection;
}
interface Options {
  default_output_format: ContentTypeNegotiator;
  hostname: string;
  instanceId?: string;
  collectionId: string;
}
function getDataQueries(queries: Dataset['data_queries'], options: Options) {
  const data_queries: DataQueries = {};
  const output_formats: string[] = [];
  const distanceunits: string[] = [];
  for (const query_type of Object.keys(queries) as Array<keyof DataQueries>) {
    //@ts-expect-error defaultInstanceId
    const { handler: _, defaultInstanceId: __, crs, ...rest } = queries[query_type]!;
    if ('within_units' in rest && rest.within_units) distanceunits.push(...rest['within_units']);
    if ('height_units' in rest && rest.height_units) distanceunits.push(...rest['height_units']);
    if ('width_units' in rest && rest.width_units) distanceunits.push(...rest['width_units']);

    let href = `${options.hostname}/collections/${options.collectionId}`;
    if (options.instanceId) {
      if (query_type === 'instances') continue;
      href += `/instances/${options.instanceId}`;
    }
    href += `/${query_type}`;
    data_queries[query_type] = {
      link: {
        href: new URL(href).toJSON(),
        variables: {
          ...rest,
          //@ts-expect-error
          query_type,
          //@ts-expect-error
          crs_details: crs?.map((crs) => ({ crs, wkt: get(crs)! })),
        },
        rel: ['locations', 'items'].includes(query_type) ? 'items' : 'data',
        type: contentTypes[rest.default_output_format || options.default_output_format],
      },
    };
  }

  return { data_queries, output_formats, distanceunits };
}
