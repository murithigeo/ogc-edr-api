import EventEmitter from "node:events";
import config from "../config.ts";

const db = new Deno.Kv();
// const stream = db.watch(config.datasets.map(({ id }) => id));
const em = new EventEmitter({});
