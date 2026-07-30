import type { PromiseController } from 'exegesis';
import type { Dataset, Extent } from '../../../services/types.d.ts';
import type {
  Collection,
  Collections,
  DataQueries,
  DataQueryVariables,
} from '../../../src/types/edr.d.ts';
import services from '../../../services/index.ts';
import { get, toURI } from '@murithigeo/uriproj';
import { contentTypes, type ContentTypeNegotiator } from '../../../src/content-types.ts';
import { Links } from '../../../src/links.ts';
import type { ExegesisContext } from 'exegesis-express';
import { stringify } from 'yaml';
import { Referencing } from '../../../utils/reprojection.ts';

export default {
  listCollections: async (ctx) => {
    const datasets = Object.values(services).map(async (data) => ({
      ...data,
      extent: await data.extent,
    }));

    const collections: Collections<'collections'> = {
      collections: (await Promise.all(datasets)).map((set) =>
        toCollection(set, { collectionId: set.id, hostname: ctx.api.serverObject!.url }),
      ),
      get links() {
        return this.collections.flatMap(({ id }) => new Links(ctx).collection(id).links);
      },
    };
    return responseHandler(ctx, collections);
  },
  getCollection: async (ctx) => {
    const set = services[ctx.params.path.collectionId];
    const collection: Collection = toCollection(
      { ...set, extent: await set.extent },
      { collectionId: set.id, hostname: ctx.api.serverObject!.url },
    );
    return responseHandler(ctx, collection);
  },
  listInstances: async (ctx) => {
    const set = services[ctx.params.path.collectionId];
    const extents = await set.instances.handler(undefined);
    const instances: Collections<'instances'> = {
      instances: extents
        .map((extent) => ({ ...set, extent }))
        .map((dataset) => {
          const { id: instanceId } = dataset.extent;
          return toCollection(
            { ...dataset, id: instanceId },
            { collectionId: set.id, hostname: ctx.api.serverObject!.url, instanceId },
          );
        }),
      get links() {
        return this.instances.flatMap(({ id }) => new Links(ctx).collection(set.id, id).links);
      },
    };

    return responseHandler(ctx, instances);
  },
  getInstance: async (ctx) => {
    const { collectionId, instanceId } = ctx.params.path;
    const dataset = services[collectionId];
    const [extent] = await dataset.instances.handler(instanceId);
    const instance = toCollection(
      { ...dataset, extent, id: instanceId },
      {
        collectionId: dataset.id,
        hostname: ctx.api.serverObject!.url,
        instanceId: extent.id,
      },
    );
    return responseHandler(ctx, instance);
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
  const referencing = new Referencing(rest.storageCrs, 'OGC:CRS84');
  for (let i = 0; i < extent.spatial.bbox.length; i++) {
    const bbox = extent.spatial.bbox[i];
    [bbox[0], bbox[1]] = referencing.crs([bbox[0], bbox[1]]);
    if (bbox.length === 6) {
      [bbox[3], bbox[4]] = referencing.crs([bbox[3], bbox[4]]);
    } else [bbox[2], bbox[3]] = referencing.crs([bbox[2], bbox[3]]);
    extent.spatial.bbox[i] = bbox;
  }
  extent.vertical?.values.sort((a, b) => a - b);
  extent.temporal?.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const { data_queries, ...others } = getDataQueries(queries, {
    ...options,
    default_output_format: output_formats[0],
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const links = Object.values(data_queries).map(({ link: { variables: _, ...link } }) => link);
  const collection: Collection = {
    ...rest,
    output_formats: Array.from(new Set([...dataset.output_formats, ...others.output_formats])),
    extent: {
      spatial: {
        bbox: extent.spatial.bbox,
        crs: get(toURI('OGC:CRS84'))!,
        values: extent.spatial.values,
        name: toURI('OGC:CRS84'),
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
            vrs: get(toURI(extent.vertical.vrs))!,
            name: extent.vertical.vrs,
          }
        : undefined,
      temporal: {
        name: 'Gregorian',
        trs: 'http://www.opengis.net/def/uom/ISO-8601/0/Gregorian',
        interval: extent.temporal
          ? [[extent.temporal[0] || null, extent.temporal.at(-1) || null]]
          : [[null, null]],
        values: extent.temporal ? extent.temporal : undefined,
      },
    },
    parameter_names: Object.keys(parameters).reduce(
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
  for (const query_type of Object.keys(queries) as Array<keyof Dataset['data_queries']>) {
    const config = queries[query_type];
    //@ts-expect-error query_type clash
    const variables: DataQueryVariables = { query_type };
    let href = `${options.hostname}/collections/${options.collectionId}`;
    if (options.instanceId) {
      href += `/instances/${options.instanceId}`;
    }
    let default_output_format: ContentTypeNegotiator | undefined;
    if (query_type === 'locations') default_output_format = 'GEOJSON';

    href += `/${query_type}`;
    if (typeof config === 'object') {
      ({
        title: variables.title,
        description: variables.description,
        output_formats: variables.output_formats,
      } = config!);
      if (config.default_output_format) {
        variables.default_output_format = default_output_format = config.default_output_format;
      }
      variables.crs_details = config.crs?.map((crs) => ({ crs, wkt: get(crs)! }));
      if ('height_units' in config) {
        if (config.height_units) distanceunits.push(...config.height_units);
        //@ts-expect-error variables currently resolves to never
        variables['height_units'] = config.height_units;
      }
      if ('width_units' in config) {
        if (config.width_units) distanceunits.push(...config.width_units);
        //@ts-expect-error variables currently resolves to never
        variables['width_units'] = config.width_units;
      }
      if ('within_units' in config) {
        if (config.within_units) distanceunits.push(...config.within_units);
        //@ts-expect-error variables currently resolves to never
        variables['within_units'] = config.within_units;
      }
    }
    data_queries[query_type] = {
      link: {
        href: new URL(href).toJSON(),
        //@ts-expect-error variables currently resolves to never
        variables,
        rel: query_type === 'items' ? 'items' : 'data',
        type: default_output_format ? contentTypes[default_output_format] : undefined,
      },
    };
  }

  return { data_queries, output_formats, distanceunits };
}

function responseHandler(
  ctx: ExegesisContext,
  collection: Collection | Collections | Collections<'instances'>,
) {
  const { links } = collection;
  links.push(...new Links(ctx).self().alternates('JSON', 'YAML').links);
  collection = {
    ...collection,
    links,
  };
  switch (ctx.params.query.f) {
    case 'JSON':
      return ctx.res.json(collection);
    case 'YAML':
      return ctx.res.setBody(stringify(collection));
    default:
      throw ctx.makeError(400, 'invalid f value');
  }
}
