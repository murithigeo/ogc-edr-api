import http from 'node:http';
import { middleware } from 'exegesis-express';
import { handleErrorFunction as autoHandleHttpErrors } from '../../src/exception.ts';
import root_controller from './controllers/root_controller.ts';
import conformance_controller from './controllers/conformance_controller.ts';
import collections_controller from './controllers/collections_controller.ts';
import query_controller from './controllers/query_controller.ts';
import service_controller from './controllers/service_controller.ts';
import path from 'node:path';
import express from 'express';
import plugin from './plugin.ts';
const app = express();

export const edr = middleware(path.resolve(import.meta.dirname, 'edr.yaml'), {
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
    stringButNumber: (val) => !Number.isNaN(Number(val)),
    /**
     * validates parameters declared as strings but parsed as integers
     * resolution-[x,y,z]
     */
    stringButInteger: (val) => !Number.isInteger(Number(val)),
  },
});

app.get('/conformance/', (req, res, next) => {
  let [url, querystring] = req.url.split('?');
  console.log({ url });
  if (url === '/conformance/') {
    url = '/conformance';
    if (querystring) url += `?${querystring}`;
    console.log({ url2: url });
    res.redirect(url);
  }
  next();
});
app.use(await edr);

const server = http.createServer(app);

server.listen(3000, '0.0.0.0', () => console.log(`EDR listening on 3000`));
