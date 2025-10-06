import type { NextFunction } from "express";
import fs from "node:fs";
import path from "node:path";
import morgan from "morgan";
import type { HttpIncomingMessage } from "exegesis-express";
import type { ServerResponse } from "node:http";
import process from "node:process";

let isWritable = process.env.NODE_ENV !== "production";
const file = path.join(process.cwd(), "/logs.http");
fs.access(file, fs.constants.W_OK, (err) => {
  if (err) isWritable = false;
});
if (!fs.existsSync(file) && isWritable) {
  fs.openSync(file, "w");
}
export default function logger(
  req: HttpIncomingMessage,
  _: ServerResponse,
  next: NextFunction
) {
  if (!isWritable) return;
  morgan.token("host", (req) => req.get("host"));
  morgan.token("protocol", (req) => req.protocol);
  //morgan.token("content-type",(res)=>res.headers["content-type"])
  // Remember to add options to log the POST requests
  morgan(
    "### :date[iso] status :status :response-time ms - :res[content-type] :res[content-length] \n :method :protocol://:host:url",
    {
      stream: fs.createWriteStream(file, {
        flags: "a",
      }),
    }
  )(req, _, next);
}
