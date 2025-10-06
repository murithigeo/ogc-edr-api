import { expect, describe, it, beforeEach } from "vitest";
import { MAX_COLLECTIONS_INSTANCES, TEST_URL_BASE } from "../index.test.ts";

const collections: {
  [x: string]: any;
  data_queries: { radius: { [x: string]: any } };
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

describe.each(collections)("$id /radius checks", {}, (c) => {
  const [rad, skip] = [c.data_queries.radius, !c.data_queries.radius];
  let uri: URL;
  beforeEach(() => {
    uri = new URL(rad.link.href);
    uri.searchParams.set("coords", "POINT(36 1)");
    uri.searchParams.set("within", "1");
    uri.searchParams.set("within-units", rad.link.variables.within_units[0]);
    uri.searchParams.set("crs", c.crs[0]);
  });
  it("returns 200 on correct values", { skip }, async () => {
    res = await fetch(uri);
    expect(res.status).toBe(200);
    await res.body?.cancel();
    uri.searchParams.set("coords", "MULTIPOINT(37 1,38 1)");
    res = await fetch(uri);
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });
  it("missing within", { skip }, async () => {
    uri.searchParams.delete("within");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  it("missing within-units", { skip }, async () => {
    uri.searchParams.delete("within-units");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  it("missing coords", { skip }, async () => {
    uri.searchParams.delete("coords");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  // it.each(rad?.link?.variables?.within_units as string[])(
  //   "accepts declared within_units",
  //   { skip },
  //   async (wu) => {
  //     uri.searchParams.set("within-units", wu);
  //     res = await fetch(uri);
  //     expect(res.status).toBe(200);
  //     await res.body?.cancel();
  //   }
  // );
});
