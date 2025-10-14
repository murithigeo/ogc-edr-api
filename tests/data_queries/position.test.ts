import { expect, describe, it } from "vitest";
import { MAX_COLLECTIONS_INSTANCES, TEST_URL_BASE } from "../index.ts";

const collections: {
  [x: string]: any;
  data_queries: { position: { [x: string]: any } };
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

describe.each(collections)("$id /position tests", {}, (c) => {
  const [pos, skip] = [c.data_queries.position, !c.data_queries.position];

  it("throws 400 on missing coords", { skip }, async () => {
    res = await fetch(pos.link.href);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  it("returns 200 on MultiPoint or Point", { skip }, async () => {
    const uri = new URL(pos.link.href);
    uri.searchParams.set("coords", "POINT(36 1)");
    uri.searchParams.set("crs", c.crs[0]);

    res = await fetch(uri);
    expect(res.status).toBe(200);
    await res.body?.cancel();

    uri.searchParams.set("coords", "MULTIPOINT(36 1,37 -1)");
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });
  it.each(["POINT(36,1)", "LINESTRING(36 1,27 1)"])(
    "%s throws error on invalid coords",
    { skip },
    async (coords) => {
      const uri = new URL(pos.link.href);
      uri.searchParams.set("coords", coords);
      res = await fetch(uri);
      expect(res.status).toBe(400);
      await res.body?.cancel();
    }
  );
});
