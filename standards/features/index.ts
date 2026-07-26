import { middleware } from "exegesis-express";
import paginationPlugin from "../../src/plugins/pagination.ts";
import crsPlugin from "../../src/plugins/crs.ts";
import bboxPlugin from "../../src/plugins/bbox.ts";
import datetimePlugin from "../../src/plugins/datetime.ts";

export default middleware("", {
  plugins: [
    paginationPlugin(),
    crsPlugin({}, "bbox-crs"),
    crsPlugin({}, "crs"),
    bboxPlugin("bbox-crs"),
    datetimePlugin(),
  ],
});
