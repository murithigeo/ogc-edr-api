import type { ExegesisContext, ExegesisPlugin, ExegesisPluginContext } from 'exegesis';
import type { Link } from '../../utils/types.js';
import process from 'node:process';
/**
 * Modifies "links" property in the response to set the hostname of the server
 */
export default function serverHostnamePlugin(): ExegesisPlugin {
  return {
    info: { name: 'x-exegesis-plugin-serverHostName' },
    makeExegesisPlugin: () => ({
      postController: async (ctx: ExegesisContext) => {},
    }),
  };
}
