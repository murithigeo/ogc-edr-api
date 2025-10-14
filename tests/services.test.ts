import { describe, it, expect } from "vitest";
import { TEST_URL_BASE } from "./index.ts";
import { contenttypes } from "../utils/constants.ts";

describe("/api tests", async () => {
  let res = await fetch(`${TEST_URL_BASE}/api`);
  it("status ok", () => {
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(contenttypes.OPENAPI_JSON);
  });
  it("shall support yaml documents", async () => {
    res = await fetch(`${TEST_URL_BASE}/api?f=yaml`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(contenttypes.OPENAPI_YAML);
  });
  it("shall redirect to /api.html when f=html", async () => {
    res = await fetch(`${TEST_URL_BASE}/api?f=html`);
    expect(res.redirected).toBeTruthy();
    expect(res.status).toBe(200);
  });
});

describe("/api.html tests", () => {
  it("shall return 200 and is text/html", async () => {
    const res = await fetch(`${TEST_URL_BASE}/api.html`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html");
  });
});
