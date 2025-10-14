import { describe, it, beforeAll,expect } from "vitest";
import { TEST_URL_BASE } from "./index.ts";

describe("/conformance", () => {
  let res: Response, data: any;
  beforeAll(async () => {
    res = await fetch(`${TEST_URL_BASE}/conformance`);
    data = await res.json();
  });
  it("should return a 200 status code", () => {
    expect(res.status).toBe(200);
  });
  it("response should have a conformsTo member", () => {
    expect(data.conformsTo).toBeDefined();
    expect(Array.isArray(data.conformsTo)).toBeTruthy();
  });
  it("can have links which return 200 status code", async () => {
    for (const link of data?.links || []) {
      res = await fetch(link.href);
      expect(res.status).toBe(200);
      await res.body?.cancel();
    }
  });
});
