import type { ExegesisPlugin, ExegesisPluginContext } from 'exegesis';
import type { BBox } from 'geojson';
import { proj4, get, toURI } from '@murithigeo/uriproj';
import services from '../../services/index.ts';

/**
 * Parses and reprojects the bbox query parameter to CRS84 in place
 * Requires that the OGC:CRS84 and the user CRS be loaded
 */
export default function bboxPlugin(field: 'crs' | 'bbox-crs' = 'crs'): ExegesisPlugin {
  return {
    info: { name: 'x-exegesis-plugin-bbox' },
    makeExegesisPlugin() {
      return {
        async postSecurity(ctx: ExegesisPluginContext) {
          const { query, path } = await ctx.getParams();
          const bbox: BBox | undefined = query.bbox;
          if (!('bbox' in query) || !bbox) return;
          const converter = proj4(
            get(query[field])!,
            get(toURI(services[path.collectionId].storageCrs))!,
          );

          [bbox[0], bbox[1]] = converter.forward([bbox[0], bbox[1]], true);
          if (bbox.length === 6) {
            [bbox[2], bbox[3]] = converter.forward([bbox[3], bbox[4]], true);
          }
          query.bbox = bbox;
        },
      };
    },
  };
}
