import type { ExegesisContext } from 'exegesis-express';
import { contentTypes } from '../../../src/content-types.ts';
import yaml from 'yaml';
import { getHtmlDocument } from '@scalar/core/libs/html-rendering';
export default {
  getServiceDesc: ({ api, ...ctx }: ExegesisContext) => {
    const { openApiDoc } = api;
    const thisServerExists = openApiDoc.servers?.find(({ url }) => url === api.serverObject?.url);
    if (!thisServerExists) {
      openApiDoc.servers = openApiDoc.servers || [];
      openApiDoc.servers.push(api.serverObject!);
    }
    switch (ctx.params.query.f) {
      case 'HTML':
        ctx.res.redirect(302, '/api.html');
        break;
      case 'YAML':
        ctx.res
          .status(200)
          .set('content-type', contentTypes.OPENAPI_YAML)
          .setBody(yaml.stringify(openApiDoc));
        break;
      default:
        ctx.res.status(200).set('content-type', contentTypes.OPENAPI_JSON).setBody(openApiDoc);
    }
  },
  getServiceDoc: (ctx: ExegesisContext) =>
    ctx.res
      .status(200)
      .set('content-type', 'text/html')
      .setBody(getHtmlDocument({ url: '/api?f=json' })),
};
