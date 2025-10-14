import { expect, describe, it, beforeEach } from "vitest";
import { MAX_COLLECTIONS_INSTANCES, TEST_URL_BASE } from "../index.ts";

const collections: { data_queries: { locations: { [x: string]: any } } }[] = [];
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
describe.each(collections)("$id locations", {}, (c) => {
  const [locs, skip] = [c.data_queries.locations, !c.data_queries.locations];
  let uri: URL;
  let locIds = Array<string>();

  beforeEach(async () => {
    uri = new URL(locs.link.href);
    res = await fetch(uri);
    locIds = (await res.json()).features.map((p) => p.id);
  });

  describe("Single values", { skip }, () => {
    let url: URL;
    beforeEach(() => {
      url = new URL(uri);
    });
    it("return 200 on correct value", async () => {
      url.pathname += `/${locIds[0]}`;
      res = await fetch(url);
      expect(res.status).toBe(200);
      await res.body?.cancel();
    });
    it("return 404 on incorrect value", async () => {
      url.pathname += "/nonexistent";
      res = await fetch(url);
      expect(res.status).toBe(404);
      await res.body?.cancel();
    });
  });

  describe(
    "mult values",
    {
      skip: ((): boolean => {
        if (skip === true) return true;
        return !locs.link.variables.multi;
      })(),
    },
    () => {
      let url: URL;
      beforeEach(() => {
        url = new URL(uri);
      });
      it("returns 200 on multiple valid values", async () => {
        url.pathname += `/${locIds.slice(0, 3).join(",")}`;
        res = await fetch(url);
        expect(res.status).toBe(200);
        await res.body?.cancel();
      });
      it("returns 404 on partially valid values", async () => {
        url.pathname += `/${locIds.slice(0, 3).join(",") + ",nonexistent"}`;
        res = await fetch(url);
        expect(res.status).toBe(404);
        await res.body?.cancel();
      });
    }
  );
});
