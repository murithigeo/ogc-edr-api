import { toURI } from '@murithigeo/uriproj';
import { mountains } from './mountains/index.ts';
import type { Dataset } from './types.js';

const datasets = [mountains];
datasets.forEach((ds, i, arr) => {
  arr[i].crs = ds.crs.map(toURI);
});

export default datasets.reduce((l: Record<string, Dataset>, r) => ({ ...l, [r.id]: r }), {});
