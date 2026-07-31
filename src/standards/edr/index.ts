import { middleware } from 'exegesis-express';
import cors from 'cors';
import { autoHandleHttpErrors, logger } from '../../utils/index.ts';
import root_controller from './controllers/root_controller.ts';
import conformance_controller from './controllers/conformance_controller.ts';
import collections_controller from './controllers/collections_controller.ts';
import query_controller from './controllers/query_controller.ts';
import service_controller from './controllers/service_controller.ts';
import path from 'node:path';
import express from 'express';
import plugin from './plugin.ts';

const app = express();
app.use(cors());
app.use(logger);
const edr = middleware(path.resolve(import.meta.dirname, 'edr.yaml'), {
  autoHandleHttpErrors,
  plugins: [plugin()],
  controllers: {
    root_controller,
    service_controller,
    conformance_controller,
    collections_controller,
    query_controller,
  },
  customFormats: {
    /**
     * validates parameters defined as strings but should be and are parsed as numbers
     * Applies to corridor-height, corridor-width,
     */
    stringButNumber: (val) => Number.isNaN(Number(val)),
    /**
     * validates parameters declared as strings but parsed as integers
     * resolution-[x,y,z]
     */
    stringButInteger: (val) => Number.isInteger(Number(val)),
  },
  lazyCompileValidationSchemas: true,
  onResponseValidationError: ({ errors, context, isDefault }) => {
    console.log({ errors, isDefault });
    return context;
  },
});
app.use((req, _, next) => {
  const origin = 'http://' + req.headers.host;
  const url = new URL(origin + req.url!);
  // https://github.com/opengeospatial/ets-ogcapi-edr10/issues/161
  if (url.pathname === '/conformance/') url.pathname = url.pathname.slice(0, -1);
  const datetime = url.searchParams.get('datetime')?.trimEnd();
  // exegesis decodes the string and parses + as whitespace, so just encode again
  if (datetime) url.searchParams.set('datetime', encodeURIComponent(datetime.replaceAll(' ', '+')));
  // https://github.com/opengeospatial/ets-ogcapi-features10/issues/231
  req.url = decodeURIComponent(url.pathname + url.search);
  next();
});
edr.then((router) => app.use(router));

const port = 80;
app.listen(port, '0.0.0.0', () => console.log(`EDR listening on ${port}`));

export default app;
