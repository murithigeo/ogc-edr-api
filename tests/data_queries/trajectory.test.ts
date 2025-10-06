import { describe, beforeEach, expect, it, afterEach } from "vitest";
import { TEST_URL_BASE, MAX_COLLECTIONS_INSTANCES } from "../index.test.ts";

const collections: {
  [x: string]: any;
  data_queries: { trajectory?: { [x: string]: any } };
}[] = [];
let res: Response;
res = await fetch(`${TEST_URL_BASE}/collections`);
const data = await res.json();

collections.push(...data.collections);
for (const collection of data.collections) {
  if (collection.data_queries?.instances) {
    res = await fetch(collection.data_queries.instances.link.href);
    collections.push(
      ...(await res.json()).instances.slice(0, MAX_COLLECTIONS_INSTANCES)
    );
  }
}

describe.each(collections)("$c.id /trajectory tests", (c) => {
  const [traj, skip] = [c.data_queries.trajectory!, !c.data_queries.trajectory];
  let uri: URL;
  beforeEach(() => {
    uri = new URL(traj.link.href);
    uri.searchParams.set("coords", "LINESTRING(36 1,37 1)");
    uri.searchParams.set("crs", c.crs[0]);
  });
  afterEach(() => {});
  it("should accept valid linestrings", { skip }, async () => {
    res = await fetch(uri);
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });
  it.each(["POINT(36 1)", "MULTIPOINT(36 1, 37 1)", "LINESTRING(10 1,29)"])(
    "throws 400 on non-[MULTI]Linestring/Invalid WKTs",
    { skip },
    async (coords) => {
      uri.searchParams.set("coords", coords);
      res = await fetch(uri);
      expect(res.status).toBe(400);
      await res.body?.cancel();
    }
  );
  it(
    "throws 400 if datetime and [MULTI]LineString[Z]M are sent",
    { skip },
    async () => {
      uri.searchParams.set("coords", "LINESTRINGM(36 1 2000,37 -2 200000)");
      uri.searchParams.set("datetime", "2024-01-01/2025-01-01");
      res = await fetch(uri);
      expect(res.status).toBe(400);
      await res.body?.cancel();
    }
  );
  it(
    "throws 400 if z and [MULTI]LineStringZ[M] are sent",
    { skip },
    async () => {
      uri.searchParams.set("coords", "LINESTRINGZ(36 1 2000,37 -2 200000)");
      uri.searchParams.set("z", "20/40");
      res = await fetch(uri);
      expect(res.status).toBe(400);
      await res.body?.cancel();
    }
  );
});
