import { expect, describe, it,beforeEach } from "vitest";
import { MAX_COLLECTIONS_INSTANCES, TEST_URL_BASE } from "../index.ts";

const collections: { data_queries: { cube: { [x: string]: any } } }[] = [];
let res = await fetch(`${TEST_URL_BASE}/collections`);
const data = await res.json();
collections.push(...data.collections.slice(0,MAX_COLLECTIONS_INSTANCES));

for (const collection of data.collections) {
  if (collection.data_queries?.instances) {
    res = await fetch(collection.data_queries.instances.link.href);
    collections.push(
      ...(await res.json()).instances.slice(0, MAX_COLLECTIONS_INSTANCES)
    );
  }
}

describe.each(collections)("throws 400 on missing bbox parameter", (c) => {
  const [cube, skip] = [c.data_queries.cube, !c.data_queries.cube];
  let uri: URL;
  beforeEach(() => {
    uri = new URL(cube.link.href);
    uri.searchParams.set("bbox", "32,-2,34,2");
  });
  it("throw 400 on missing bbox parameter", { skip }, async () => {
    uri.searchParams.delete("bbox");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  it("throw 400 on bbox lengths not 4 or 6", { skip }, async () => {
    uri.searchParams.set("bbox", "1");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();

    uri.searchParams.set("bbox", "20,21,22,23,25");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
});