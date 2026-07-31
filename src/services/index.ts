import { load, toURI } from '@murithigeo/uriproj';
import { mountains } from './mountains/index.ts';
import type { Dataset } from './types.js';

const crs = Array<string>();
const datasets = [mountains];
datasets.forEach((ds, i, arr) => {
  arr[i].crs = ds.crs.map(toURI);
  for (const v in ds.data_queries) {
    const config = ds.data_queries[v as keyof Dataset['data_queries']]!;
    if (typeof config === 'function') continue;
    if (!config.crs) continue;
    crs.push(...config.crs);
  }
  crs.push(...arr[i].crs);
});

await Promise.all(crs.map(load));

export default datasets.reduce((l: Record<string, Dataset>, r) => ({ ...l, [r.id]: r }), {});

export type * from './types.d.ts';
