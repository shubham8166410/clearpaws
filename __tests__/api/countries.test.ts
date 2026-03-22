// @vitest-environment node
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/countries/route";
import { NextRequest } from "next/server";

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe("GET /api/countries", () => {
  it("returns 200 with array of countries", async () => {
    const req = makeRequest("http://localhost/api/countries");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("each country has name, code, group fields", async () => {
    const req = makeRequest("http://localhost/api/countries");
    const res = await GET(req);
    const body = await res.json();
    for (const c of body) {
      expect(c).toHaveProperty("name");
      expect(c).toHaveProperty("code");
      expect(c).toHaveProperty("group");
      expect([1, 2, 3]).toContain(c.group);
    }
  });

  it("includes countries from all three groups", async () => {
    const req = makeRequest("http://localhost/api/countries");
    const res = await GET(req);
    const body = await res.json();
    const groups = new Set(body.map((c: { group: number }) => c.group));
    expect(groups.has(1)).toBe(true);
    expect(groups.has(2)).toBe(true);
    expect(groups.has(3)).toBe(true);
  });

  it("filters by group query param", async () => {
    const req = makeRequest("http://localhost/api/countries?group=2");
    const res = await GET(req);
    const body = await res.json();
    expect(body.every((c: { group: number }) => c.group === 2)).toBe(true);
  });

  it("filters by search query param", async () => {
    const req = makeRequest("http://localhost/api/countries?search=united");
    const res = await GET(req);
    const body = await res.json();
    expect(body.length).toBeGreaterThan(0);
    body.forEach((c: { name: string }) =>
      expect(c.name.toLowerCase()).toContain("united")
    );
  });

  it("returns empty array for no matches", async () => {
    const req = makeRequest("http://localhost/api/countries?search=zzznomatch");
    const res = await GET(req);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns all countries for invalid group number", async () => {
    const req = makeRequest("http://localhost/api/countries?group=9");
    const res = await GET(req);
    const body = await res.json();
    // Invalid group falls through to getAllCountries()
    expect(body.length).toBeGreaterThan(10);
  });
});
