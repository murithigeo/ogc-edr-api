import { describe, it, expect, beforeEach } from "vitest";
import { MAX_COLLECTIONS_INSTANCES, TEST_URL_BASE } from "../index.ts";

let res: Response;
let data: any;
let collections: {
  id: string;
  [x: string]: any;
}[] = [];
res = await fetch(`${TEST_URL_BASE}/collections`);
data = await res.json();
collections = data.collections;
for (const coll of data.collections) {
  if (coll.data_queries?.instances) {
    res = await fetch(coll.data_queries.instances.link.href);
    collections = [
      ...collections,
      ...(await res.json()).instances.slice(0, MAX_COLLECTIONS_INSTANCES),
    ];
  }
}

describe.each(collections)("$id /area coords test", (v) => {
  const [area, skip] = [v.data_queries.area, !v.data_queries.area];

  let uri: URL;
  beforeEach(() => {
    uri = new URL(area.link.href);
    uri.searchParams.set("coords", "POLYGON((-180 -90,0 0,-180 -90))");
    // uri.searchParams.delete("coords");
  });
  it("should throw 400 if coords missing", { skip }, async () => {
    uri.searchParams.delete("coords");
    res = await fetch(uri);

    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  it("should throw 400 if invalid coords are sent", { skip }, async () => {
    uri.searchParams.set("coords", "gibberish");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });

  it("should not accept non-polygon wkts", { skip }, async () => {
    uri.searchParams.set("coords", "POINT(36 1)");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  it("accepts valid polygon wkts", { skip }, async () => {
    res = await fetch(uri);
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });
});

describe.each(collections)("$id POST /area coords test", (v) => {
  const [area, skip] = [v.data_queries.area, !v.data_queries.area];
  const method = "POST";
  const headers = { "content-type": "application/json" };
  let uri: URL;
  beforeEach(() => {
    uri = new URL(area.link.href);
  });
  it("should throw 400 if coords missing", { skip }, async () => {
    res = await fetch(uri, {
      method,
      headers,
      body: JSON.stringify({
        // coords: "POLYGON((-180 -90,0 0,-180 -90))",
      }),
    });

    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  it("should throw 400 if invalid coords are sent", { skip }, async () => {
    // uri.searchParams.set("coords", "gibberish");
    res = await fetch(uri, {
      method,
      headers,
      body: JSON.stringify({ coords: "gibberish" }),
    });
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });

  it("should not accept non-polygon wkts", { skip }, async () => {
    // uri.searchParams.set("coords", "POINT(36 1)");
    res = await fetch(uri, {
      method,
      headers,
      body: JSON.stringify({ coords: "POINT(36 1)" }),
    });
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  it("accepts valid polygon wkts", { skip }, async () => {
    res = await fetch(uri, {
      method,
      headers,
      body: JSON.stringify({
        coords: "POLYGON((-180 -90,0 0,-180 -90))",
      }),
    });
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });
});
