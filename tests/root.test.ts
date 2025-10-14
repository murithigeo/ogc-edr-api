import { TEST_URL_BASE } from "./index.ts";
import { describe, it, beforeAll,expect } from "vitest";

let data;
let res: Response;
beforeAll(async () => {
  res = await fetch(`${TEST_URL_BASE}/`);
  data = await res.json();
});

describe("/ Response checks", () => {
  it("should be accessible", () => {
    expect(res.status).toBe(200);
  });
  it("should return a json body", () => {
    expect(res.headers.get("content-type")).toBe("application/json");
  });
});

describe("/ links Array", () => {
  it("should have a links array", () => {
    expect(Array.isArray(data.links)).toBeTruthy();
  });
  it("links should contain rels pointing to core paths", () => {
    expect(data.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rel: "data" }),
        expect.objectContaining({ rel: "service-desc" }),
        expect.objectContaining({ rel: "service-doc" }),
        expect.objectContaining({ rel: "conformance" }),
      ])
    );
  });

  it("links are valid pointers", async () => {
    for (let i = 0; i < data.links.length; i++) {
      const link = data.links[i];
      res = await fetch(link.href);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(link.type);
      await res.body?.cancel();
    }
  });
});

describe("Provider Member Checks", { skip: !data?.provider }, () => {
  it("should have a name", () => {
    expect(data.provider.name).toBeDefined();
  });
  it("should have a valid url", async () => {
    expect(data.provider.url).toBeDefined();
    expect((await fetch(data.provider.url)).status).toBe(200);
  });
});
