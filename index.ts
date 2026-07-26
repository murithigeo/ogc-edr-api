import e from "express";
import http from "node:http";
import edr from "./standards/edr/index.ts";

export default http.createServer(await edr);
