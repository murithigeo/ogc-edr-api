import express from "express";
import http from "node:http";
import process from "node:process";
import { middleware } from "exegesis-express";
import path from "node:path";
import {
  bboxPlugin,
  coordsPlugin,
  crsPlugin,
  datetimePlugin,
  instanceidPlugin,
  makeExtraCtx,
  parameterNamePlugin,
  post2getPlugin,
  querytypePlugin,
  resolutionsPlugin,
  setDatasetConfig,
  setServerHostname,
  unitsPlugin,
  zPlugin,
} from "./utils/plugins/index.ts";
import {logger} from "./utils/index.ts";
import controllers from "./controllers/index.ts";
import config from "./config/index.ts";
const PORT = process.env.PORT || 3000;
const app = express();

app.use(logger)
app.use(
  await middleware(path.join(process.cwd(), "openapi.yaml"), {
    controllers,
    plugins: [
      makeExtraCtx(),
      post2getPlugin(),
      setServerHostname(),
      setDatasetConfig(config.datasets),
      instanceidPlugin(),
      querytypePlugin(),
      crsPlugin(),
      coordsPlugin(),
      datetimePlugin(),
      zPlugin(),
      bboxPlugin("crs"),
      parameterNamePlugin(),
      unitsPlugin(),
      resolutionsPlugin(),
    ],
  })
);

const server = http.createServer(app);
try {
  server.listen(PORT, () => console.log(`Listening on ${PORT}`));
} catch (error) {
  console.log(error);
  process.exit(1);
}

export default server;
