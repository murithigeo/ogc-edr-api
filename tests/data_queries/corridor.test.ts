import { describe, beforeEach, expect, it, afterEach } from "vitest";
import { TEST_URL_BASE, MAX_COLLECTIONS_INSTANCES } from "../index.ts";

const collections: { data_queries: { corridor?: { [x: string]: any } } }[] = [];
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

describe.each(collections)("$id /corridor tests", (c) => {
  const [corr, skip] = [c.data_queries.corridor!, !c.data_queries.corridor];
  let uri: URL;
  beforeEach(() => {
    uri = new URL(corr.link.href);
    uri.searchParams.set("coords", "LINESTRING(36 1,37 1)");
    uri.searchParams.set("width-units", corr.link.variables.width_units[0]);
    uri.searchParams.set("height-units", corr.link.variables.height_units[0]);
    uri.searchParams.set("corridor-height", "1");
    uri.searchParams.set("corridor-width", "1");
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
  it("should throw error if width-units is missing", { skip }, async () => {
    uri.searchParams.delete("width-units");
    res = await fetch(uri);
    expect(res.status).toBe(400);
  });
  it.each(corr.link.variables.width_units as string[])(
    "accepts declared width_units",
    { skip },
    async (wu) => {
      uri.searchParams.set("width-units", wu);
      res = await fetch(uri);
      expect(res.status).toBe(200);
    }
  );
  it.each(corr.link.variables.height_units as string[])(
    "accepts declared height_units",
    { skip },
    async (wu) => {
      uri.searchParams.set("height-units", wu);
      res = await fetch(uri);
      expect(res.status).toBe(200);
    }
  );
});

describe.each(collections)("$id POST /corridor tests", (c) => {
  const [corr, skip] = [c.data_queries.corridor!, !c.data_queries.corridor];
  let uri: URL;
  let body: { [x: string]: any }={}
  const headers = { "content-type": "application/json" };
  const method = "POST";
  beforeEach(() => {
    uri = new URL(corr.link.href);
    body.coords = "LINESTRING(36 1,37 1)";
    body["width-units"] = corr.link.variables.width_units[0];
    body["height-units"] = corr.link.variables.height_units[0];
    body["corridor-height"] = "1";
    body["corridor-width"] = "1";
  });
  it("should accept valid linestrings", { skip }, async () => {
    res = await fetch(uri, { method, headers, body: JSON.stringify(body) });
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });
  it.each(["POINT(36 1)", "MULTIPOINT(36 1, 37 1)", "LINESTRING(10 1,29)"])(
    "throws 400 on non-[MULTI]Linestring/Invalid WKTs",
    { skip },
    async (coords) => {
      body.coords = coords;
      res = await fetch(uri, { method, headers, body: JSON.stringify(body) });
      expect(res.status).toBe(400);
      await res.body?.cancel();
    }
  );
  it(
    "throws 400 if datetime and [MULTI]LineString[Z]M are sent",
    { skip },
    async () => {
      body.coords = "LINESTRINGM(36 1 2000,37 -2 200000)";
      body["datetime"] = "2024-01-01/2025-01-01";
      res = await fetch(uri, { method, headers, body: JSON.stringify(body) });
      expect(res.status).toBe(400);
      await res.body?.cancel();
    }
  );
  it(
    "throws 400 if z and [MULTI]LineStringZ[M] are sent",
    { skip },
    async () => {
      body.coords = "LINESTRINGZ(36 1 2000,37 -2 200000)";
      body["z"] = "20/40";
      res = await fetch(uri, { method, headers, body: JSON.stringify(body) });
      expect(res.status).toBe(400);
      await res.body?.cancel();
    }
  );
  it("should throw error if width-units is missing", { skip }, async () => {
    delete body["width-units"];
    res = await fetch(uri, { method, headers, body: JSON.stringify(body) });
    expect(res.status).toBe(400);
  });
  it.each(corr.link.variables.width_units as string[])(
    "accepts declared width_units",
    { skip },
    async (wu) => {
      body["width-units"] = wu;
      res = await fetch(uri, { method, headers, body: JSON.stringify(body) });
      expect(res.status).toBe(200);
    }
  );
  it.each(corr.link.variables.height_units as string[])(
    "accepts declared height_units",
    { skip },
    async (wu) => {
      body["height-units"] = wu;
      res = await fetch(uri, { method, headers, body: JSON.stringify(body) });
      expect(res.status).toBe(200);
    }
  );
});
