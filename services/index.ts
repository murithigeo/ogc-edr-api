import { load, toURI } from '@murithigeo/uriproj';
import { mountains } from './mountains/index.ts';
import type { Dataset } from './types.d.ts';

const crs = Array<string>();
const datasets = [mountains];
datasets.forEach((ds, i, arr) => {
  arr[i].crs = ds.crs.map(toURI);
  for (const v in ds.data_queries) {
    let { crs: alts } = ds.data_queries[v as keyof Dataset['data_queries']]!;
    if (!alts) continue;
    alts = alts.map(toURI);
    arr[i].data_queries[v as keyof Dataset['data_queries']]!.crs = alts;
    crs.push(...alts);
  }
  crs.push(...arr[i].crs);
});

await Promise.all(crs.map(load));
export default datasets.reduce((l: Record<string, Dataset>, r) => ({ ...l, [r.id]: r }), {});
