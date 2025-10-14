import { beforeEach } from "node:test";
import { MAX_COLLECTIONS_INSTANCES, TEST_URL_BASE } from "./index.ts";
import { describe, it, expect, beforeEach } from "vitest";

let collections: {
  data_queries: { [x: string]: any };
  parameter_names: { [x: string]: any };
}[] = [];
let res: Response;
let data: any;
res = await fetch(`${TEST_URL_BASE}/collections`);
data = await res.json();
collections = [...data.collections];
for (const collection of data.collections) {
  if (collection.data_queries?.instances) {
    res = await fetch(collection.data_queries.instances.link.href);
    data = await res.json();
    collections.push(...data.instances.slice(0, MAX_COLLECTIONS_INSTANCES));
  }
}
describe.each(collections)(
  "$id /area parameter-name checks",
  { timeout: 3000 },
  (c) => {
    const [area, skip] = [c.data_queries?.area, !c.data_queries?.area];
    let uri: URL;
    let parameterNames: string[];
    beforeEach(() => {
      uri = new URL(area.link.href);
      uri.searchParams.set(
        "coords",
        "POLYGON((-180 -90, 0 0, -180 -90))"
      );
      parameterNames = Object.keys(c.parameter_names);
    });
    it("should throw 400 on singular incorrect value", { skip }, async () => {
      uri.searchParams.set("parameter-name", "gibberish");
      res = await fetch(uri);
      expect(res.status).toBe(400);
      await res.body?.cancel();
    });
    it("should return 200 on correct values", { skip }, async () => {
      uri.searchParams.set("parameter-name", parameterNames.join(","));
      res = await fetch(uri);
      expect(res.status).toBe(200);
      await res.body?.cancel();
    });
    it(
      "should return 400 if incorrect values included alongside correct ones",
      { skip },
      async () => {
        uri.searchParams.set(
          "parameter-name",
          parameterNames.join(",").concat(", ")
        );
        res = await fetch(uri);
        expect(res.status).toBe(400);
        await res.body?.cancel();
      }
    );
  }
);
describe.each(collections)("$id /radius parameter-name checks", (c) => {
  const [radius, skip] = [c.data_queries?.radius, !c.data_queries?.radius];
  let uri: URL;
  let parameterNames: string[];
  beforeEach(() => {
    uri = new URL(radius.link.href);
    uri.searchParams.set("coords", "POINT(36 1)");
    uri.searchParams.set("within", "1");
    uri.searchParams.set(
      "within-units",
      c.data_queries.radius.link.variables.within_units[0]
    );
    parameterNames = Object.keys(c.parameter_names);
  });
  it("should throw 400 on singular incorrect value", { skip }, async () => {
    uri.searchParams.set("parameter-name", "gibberish");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  it("should return 200 on correct values", { skip }, async () => {
    // uri.searchParams.set("parameter-name", parameterNames.join(","));
    if(parameterNames.length>0)uri.searchParams.set("parameter-name",parameterNames.join(","))
    res = await fetch(uri);
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });
  it(
    "should return 400 if incorrect values included alongside correct ones",
    { skip },
    async () => {
      uri.searchParams.set(
        "parameter-name",
        parameterNames.join(",").concat(", ")
      );
      res = await fetch(uri);
      expect(res.status).toBe(400);
      await res.body?.cancel();
    }
  );
});
describe.each(collections)("/cube parameter-name checks", (c) => {
  const [cube, skip] = [c.data_queries?.cube, !c.data_queries?.cube];
  let uri: URL;
  let parameterNames: string[];
  beforeEach(() => {
    uri = new URL(cube.link.href);
    uri.searchParams.set("bbox", "33,-2,34,2");
    parameterNames = Object.keys(c.parameter_names);
  });
  it("should throw 400 on singular incorrect value", { skip }, async () => {
    uri.searchParams.set("parameter-name", "gibberish");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  it("should return 200 on correct values", { skip }, async () => {
    if (parameterNames.length > 0)
      uri.searchParams.set("parameter-name", parameterNames.join(","));
    res = await fetch(uri);
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });
  it(
    "should return 400 if incorrect values included alongside correct ones",
    { skip },
    async () => {
      uri.searchParams.set(
        "parameter-name",
        parameterNames.join(",").concat(", ")
      );
      res = await fetch(uri);
      expect(res.status).toBe(400);
      await res.body?.cancel();
    }
  );
});
describe.each(collections)("$id /corridor parameter-name checks", (c) => {
  const [corr, skip] = [c.data_queries?.corridor, !c.data_queries?.corridor];
  let uri: URL;
  let parameterNames: string[];
  beforeEach(() => {
    uri = new URL(corr.link.href);
    uri.searchParams.set("coords", `LINESTRING(40 1, 39 1, 36 1)`);
    uri.searchParams.set("corridor-width", "1000");
    uri.searchParams.set("corridor-height", "1000");
    uri.searchParams.set("width-units", corr.link.variables["width_units"][0]);
    uri.searchParams.set(
      "height-units",
      corr.link.variables["height_units"][0]
    );
    parameterNames = Object.keys(c.parameter_names);
  });
  it("should throw 400 on singular incorrect value", { skip }, async () => {
    uri.searchParams.set("parameter-name", "gibberish");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  it("should return 200 on correct values", { skip }, async () => {
    if (parameterNames.length > 0)
      uri.searchParams.set("parameter-name", parameterNames.join(","));
    res = await fetch(uri);
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });
  it(
    "should return 400 if incorrect values included alongside correct ones",
    { skip },
    async () => {
      uri.searchParams.set(
        "parameter-name",
        parameterNames.join(",").concat(", ")
      );
      res = await fetch(uri);
      expect(res.status).toBe(400);
      await res.body?.cancel();
    }
  );
});
describe.each(collections)("/position parameter-name checks", (c) => {
  const [pos, skip] = [c.data_queries?.position, !c.data_queries?.position];
  let uri: URL;
  let parameterNames: string[];
  beforeEach(() => {
    uri = new URL(pos.link.href);
    uri.searchParams.set("coords", "POINT(36 1)");
    parameterNames = Object.keys(c.parameter_names);
  });
  it("should throw 400 on singular incorrect value", { skip }, async () => {
    uri.searchParams.set("parameter-name", "gibberish");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  it("should return 200 on correct values", { skip }, async () => {
    if (parameterNames.length > 0)
      uri.searchParams.set("parameter-name", parameterNames.join(","));
    res = await fetch(uri);
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });
  it(
    "should return 400 if incorrect values included alongside correct ones",
    { skip },
    async () => {
      uri.searchParams.set(
        "parameter-name",
        parameterNames.join(",").concat(", ")
      );
      res = await fetch(uri);
      expect(res.status).toBe(400);
      await res.body?.cancel();
    }
  );
});
describe.each(collections)("/trajectory parameter-name checks", (c) => {
  const [traj, skip] = [
    c.data_queries?.trajectory,
    !c.data_queries?.trajectory,
  ];
  let uri: URL;
  let parameterNames: string[];
  beforeEach(() => {
    uri = new URL(traj.link.href);
    uri.searchParams.set("coords", `LINESTRING(40 1, 39 1, 36 1)`);
    parameterNames = Object.keys(c.parameter_names);
  });
  it("should throw 400 on singular incorrect value", { skip }, async () => {
    uri.searchParams.set("parameter-name", "gibberish");
    res = await fetch(uri);
    expect(res.status).toBe(400);
    await res.body?.cancel();
  });
  it("should return 200 on correct values", { skip }, async () => {
    if (parameterNames.length > 0)
      uri.searchParams.set("parameter-name", parameterNames.join(","));
    res = await fetch(uri);
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });
  it(
    "should return 400 if incorrect values included alongside correct ones",
    { skip },
    async () => {
      uri.searchParams.set(
        "parameter-name",
        parameterNames.join(",").concat(", ")
      );
      res = await fetch(uri);
      expect(res.status).toBe(400);
      await res.body?.cancel();
    }
  );
});
