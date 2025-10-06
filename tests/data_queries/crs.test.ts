import { expect, describe, it, beforeEach } from "vitest";
import { MAX_COLLECTIONS_INSTANCES, TEST_URL_BASE } from "../index.test.ts";
import { crs } from "../../utils/projection.ts";

const collections: {
  id: string;
  crs: string[];
  data_queries: {
    [x in "corridor" | "trajectory"]: {
      link: {
        href: string;
        variables: { crs_details?: CrsDetails; [x: string]: any };
      };
    };
  };
}[] = [];
let res = await fetch(`${TEST_URL_BASE}/collections`);
const data = await res.json();
collections.push(...data.collections.slice(0, MAX_COLLECTIONS_INSTANCES));

for (const collection of data.collections) {
  if (collection.data_queries?.instances) {
    res = await fetch(collection.data_queries.instances.link.href);
    collections.push(
      ...(await res.json()).instances.slice(0, MAX_COLLECTIONS_INSTANCES)
    );
  }
}

let uri: URL;
type CrsDetails = { crs: string; wkt: string }[];
describe.each(collections)("$id /corridor crs tests", (c) => {
  const [corr, skip] = [c.data_queries.corridor, !c.data_queries.corridor];
  const crslist = corr.link.variables.crs_details?.map((p) => p.crs) || c.crs;
  beforeEach(() => {
    uri = new URL(corr.link.href);
    uri.searchParams.set("coords", "LINESTRING(36 1,38 1)");
    uri.searchParams.set("corridor-width", "1");
    uri.searchParams.set("corridor-height", "1");
    uri.searchParams.set("width-units", corr.link.variables.width_units[0]);
    uri.searchParams.set("height-units", corr.link.variables.width_units[0]);
  });

  it.each(crslist)("%s res:200, content-crs header", { skip }, async (crsuri) => {
    uri.searchParams.set("crs", crsuri);
    res = await fetch(uri);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-crs")).toBeOneOf([
      `<${crsuri}>`,
      `<${crs[crsuri]["uri"]}>`,
    ]);
  });
  it("rejects non-declared crs uris", { skip }, async () => {
    uri.searchParams.set("crs", "EPSG:9118");
    res = await fetch(uri);
    expect(res.status).toBe(400)
  })
});
