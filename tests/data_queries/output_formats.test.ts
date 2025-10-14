import { TEST_URL_BASE, MAX_COLLECTIONS_INSTANCES } from "../index.ts";
import { contenttypes } from "../../utils/constants.ts";
import { describe, it, beforeAll, expect, beforeEach } from "vitest";

const collections: {
  data_queries: { [x: string]: { [x: string]: any } };
  output_formats: string[];
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

describe.each(collections)("$id /corridor output_formats check", (c) => {
  const [corr, skip] = [c.data_queries?.corridor, !c.data_queries.corridor];
  let uri: URL;
  beforeAll(() => {
    uri = new URL(corr.link.href);
    uri.searchParams.set("coords", `LINESTRING(40 1, 39 1, 36 1)`);
    uri.searchParams.set("corridor-width", "1000");
    uri.searchParams.set("corridor-height", "1000");
    uri.searchParams.set("width-units", corr.link.variables["width_units"][0]);
    uri.searchParams.set(
      "height-units",
      corr.link.variables["height_units"][0]
    );
  });
  it(
    "returns correct default_output_format when f is not specified:",
    { skip },
    async () => {
      res = await fetch(uri);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(
        contenttypes[corr.link.variables.default_output_format]
      );
      await res.body?.cancel();
    }
  );

  it.each(
    (corr.link.variables?.output_formats as string[]) || c.output_formats
  )("does not throw on variable defined output format", { skip }, async (f) => {
    uri.searchParams.set("f", f);
    res = await fetch(uri);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(contenttypes[f]);
    await res.body?.cancel();
  });
  it("rejects output_format not declared", async () => {
    uri.searchParams.set("f", "100");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
});

describe.each(collections)("$id /trajectory output_formats check", (c) => {
  const [traj, skip] = [c.data_queries?.trajectory, !c.data_queries.trajectory];
  let uri: URL;
  beforeEach(() => {
    uri = new URL(traj?.link?.href);
    uri.searchParams.set("coords", `LINESTRING(40 1, 39 1, 36 1)`);
  });

  it(
    "returns correct default_output_format when f is not specified",
    { skip },
    async () => {
      res = await fetch(uri);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(
        contenttypes[traj.link.variables.default_output_format]
      );
      await res.body?.cancel();
    }
  );

  it.each(
    (traj?.link?.variables?.output_formats as string[]) || c.output_formats
  )(
    "does not throw on variable defined output format: %s",
    { skip },
    async (f) => {
      uri.searchParams.set("f", f);
      res = await fetch(uri);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(contenttypes[f]);
      await res.body?.cancel();
    }
  );
  it("rejects output_format not declared", { skip }, async () => {
    uri.searchParams.set("f", "100");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
});

describe.each(collections)("$id /cube output_formats", (c) => {
  const [cube, skip] = [c.data_queries?.cube, !c.data_queries.cube];
  let uri: URL;
  beforeEach(() => {
    uri = new URL(cube.link.href);
    uri.searchParams.set("bbox", "32,0,33,0");
  });

  it(
    "returns correct default_output_format when f is not specified",
    { skip },
    async () => {
      res = await fetch(uri);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(
        contenttypes[cube.link.variables.default_output_format]
      );
      await res.body?.cancel();
    }
  );

  it.each(
    (cube?.link?.variables?.output_formats as string[]) || c.output_formats
  )(
    "dataset: $c.id does not throw on variable defined output format: %s",
    { skip },
    async (f) => {
      uri.searchParams.set("f", f);
      res = await fetch(uri);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(contenttypes[f]);
      await res.body?.cancel();
    }
  );
  it("rejects output_format not declared", { skip }, async () => {
    uri.searchParams.set("f", "100");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
});

describe.each(collections)("$id /position output_formats", (c) => {
  const [pos, skip] = [c.data_queries?.position, !c.data_queries.position];
  let uri: URL;
  beforeEach(() => {
    uri = new URL(pos.link.href);
    uri.searchParams.set("coords", "POINT (36 1)");
  });

  it(
    "returns correct default_output_format when f is not specified",
    { skip },
    async () => {
      res = await fetch(uri);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(
        contenttypes[pos.link.variables.default_output_format]
      );
      await res.body?.cancel();
    }
  );

  it.each(
    (pos?.link?.variables?.output_formats as string[]) || c.output_formats
  )(
    "dataset: $c.id does not throw on variable defined output format: %s",
    { skip },
    async (f) => {
      uri.searchParams.set("f", f);
      res = await fetch(uri);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(contenttypes[f]);
      await res.body?.cancel();
    }
  );
  it("rejects output_format not declared", { skip }, async () => {
    uri.searchParams.set("f", "100");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
});

describe.skip.each(collections)("$id /locations output_formats", (c) => {
  const [locs, skip] = [c.data_queries?.locations, !c.data_queries.locations];
  let uri: URL;
  beforeEach(() => {
    uri = new URL(locs.link.href);
    // uri.searchParams.set("coords", "POINT (36 1)");
  });

  it(
    "returns correct default_output_format when f is not specified",
    { skip },
    async () => {
      res = await fetch(uri);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(
        contenttypes[locs.link.variables.default_output_format]
      );
      await res.body?.cancel();
    }
  );

  it(
    "dataset: $c.id does not throw on variable defined output format: %s",
    { skip },
    async (f) => {
      // uri.searchParams.set("f", f);
      res = await fetch(uri);
      expect(res.status).toBe(200);
      // expect(res.headers.get("content-type")).toBe(contenttypes[f]);
      await res.body?.cancel();
    }
  );
  it("rejects output_format not declared", { skip }, async () => {
    uri.searchParams.set("f", "100");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
});

describe.each(collections)("$id /radius output_formats", (c) => {
  const [radius, skip] = [c.data_queries?.radius, !c.data_queries.radius];
  let uri: URL;
  beforeEach(() => {
    uri = new URL(radius.link.href);
    uri.searchParams.set("coords", "POINT (36 1)");
    uri.searchParams.set("within", "1");
    uri.searchParams.set("within-units", radius.link.variables.within_units[0]);
  });

  it(
    "returns correct default_output_format when f is not specified",
    { skip },
    async () => {
      res = await fetch(uri);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(
        contenttypes[radius.link.variables.default_output_format]
      );
      await res.body?.cancel();
    }
  );

  it.each(
    (radius?.link?.variables?.output_formats as string[]) || c.output_formats
  )(
    "dataset: $c.id does not throw on variable defined output format: %s",
    { skip },
    async (f) => {
      uri.searchParams.set("f", f);
      res = await fetch(uri);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(contenttypes[f]);
      await res.body?.cancel();
    }
  );
  it("rejects output_format not declared", { skip }, async () => {
    uri.searchParams.set("f", "100");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
});

describe.each(collections)("$id /area output_formats", {}, (c) => {
  const [area, skip] = [c.data_queries?.area, !c.data_queries.area];
  let uri: URL;
  beforeEach(() => {
    uri = new URL(area.link.href);
    uri.searchParams.set("coords", "POLYGON((-180 -90,0 0,-180 -90))");
  });

  it(
    "returns correct default_output_format when f is not specified",
    { skip },
    async () => {
      res = await fetch(uri);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(
        contenttypes[area.link.variables.default_output_format]
      );
      await res.body?.cancel();
    }
  );

  it.each(
    (area?.link?.variables?.output_formats as string[]) || c.output_formats
  )(
    "dataset: $c.id does not throw on variable defined output format: %s",
    { skip },
    async (f) => {
      uri.searchParams.set("f", f);
      res = await fetch(uri);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(contenttypes[f]);
      await res.body?.cancel();
    }
  );
  it("rejects output_format not declared", { skip }, async () => {
    uri.searchParams.set("f", "100");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
});

// Deno.test({
//   name: `default_output_format + output_format tests`,
//   async fn(t) {
//     for (const { id, data_queries, output_formats } of collections) {
//       for (const k of Object.keys(data_queries)) {
//         let res: Response;
//         const {
//           link: { href, variables },
//         } = data_queries[k]!;
//         const of = variables.output_formats || output_formats;
//         const url = new URL(href);

//         switch (k) {
//           case "position":
//             url.searchParams.set("coords", "POINT(36 1)");
//             break;
//           case "area":
//             url.searchParams.set(
//               "coords",
//               `POLYGON ((-180 -90,-180 90,180 90,180 -90,-180 -90))`
//             );
//             break;
//           case "corridor":
//             url.searchParams.set("coords", `LINESTRING(40 1, 39 1, 36 1)`);
//             url.searchParams.set("corridor-width", "1000");
//             url.searchParams.set("corridor-height", "1000");
//             url.searchParams.set("width-units", variables["width_units"][0]);
//             url.searchParams.set("height-units", variables["height_units"][0]);
//             break;
//           case "cube":
//             url.searchParams.set("bbox", "-180,-90,180,90");
//             break;

//           case "radius":
//             url.searchParams.set("coords", "POINT(36 1)");
//             url.searchParams.set("within", "1000");
//             url.searchParams.set("within-units", variables["within_units"][0]);
//             break;
//           case "trajectory":
//             url.searchParams.set("coords", `LINESTRING(40 1, 39 1, 36 1)`);
//             break;
//           //Do nothing
//           case "instances":
//           case "items":
//           case "locations":
//             break;
//         }
//         await t.step({
//           name: `${id} ${k} default_output_format checks`,
//           async fn() {
//             res = await fetch(url);
//             expect(res.status, "Successful request expected").toBe(200);
//             expect(res.headers.get("content-type")).toBe(
//               contenttypes[variables.default_output_format]
//             );
//             await res.body?.cancel();
//           },
//         });
//         await t.step({
//           name: `${id} ${k}  output_formats check`,
//           async fn() {
//             for (const f of of) {
//               url.searchParams.set("f", f);
//               res = await fetch(url);
//               expect(res.status, "Successful request expected").toBe(200);
//               expect(res.headers.get("content-type")).toBe(
//                 contenttypes[f.toLowerCase()]
//               );
//               await res.body?.cancel();
//             }
//           },
//         });
//       }
//     }
//   },
// });
