// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks declared before any imports that trigger them ──────────────────────

vi.mock("@/lib/api-middleware");
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(() => ({})),
}));

import * as apiMiddleware from "@/lib/api-middleware";
import { GET } from "@/app/api/v1/countries/route";
import type { AuthenticatedApiKey } from "@/lib/api-middleware";
import type { ApiKeyRow } from "@/types/database";

// ── Shared fixtures ────────────────────────────────────────────────────────

const mockApiKeyRow: ApiKeyRow = {
  id: "key-456",
  user_id: "user-def",
  agency_id: null,
  key_prefix: "efgh5678",
  key_hash: "$2a$10$anotherhash",
  name: "Countries Key",
  last_used_at: null,
  request_count: 0,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

const mockAuthSuccess: AuthenticatedApiKey = {
  apiKey: mockApiKeyRow,
  rateLimitHeaders: {
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": "98",
    "X-RateLimit-Reset": "9999999999",
  },
};

function makeGet(token = "Bearer cpk_aaaa1111bbbb2222cccc3333dddd4444"): NextRequest {
  return new NextRequest("http://localhost/api/v1/countries", {
    method: "GET",
    headers: { Authorization: token },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/v1/countries", () => {
  beforeEach(() => {
    vi.mocked(apiMiddleware.authenticateApiKey).mockResolvedValue(mockAuthSuccess);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("returns 200 with ApiSuccessResponse shape containing country array", async () => {
    const req = makeGet();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("returns country objects with code, name, and group fields", async () => {
    const req = makeGet();
    const res = await GET(req);

    const body = await res.json();
    const firstCountry = body.data[0];
    expect(firstCountry).toHaveProperty("code");
    expect(firstCountry).toHaveProperty("name");
    expect(firstCountry).toHaveProperty("group");
  });

  it("forwards X-RateLimit-* headers on success", async () => {
    const req = makeGet();
    const res = await GET(req);

    expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("98");
    expect(res.headers.get("X-RateLimit-Reset")).toBe("9999999999");
  });

  it("includes all three DAFF groups in the response", async () => {
    const req = makeGet();
    const res = await GET(req);

    const body = await res.json();
    const groups: Set<number> = new Set(body.data.map((c: { group: number }) => c.group));
    expect(groups.has(1)).toBe(true);
    expect(groups.has(2)).toBe(true);
    expect(groups.has(3)).toBe(true);
  });

  // ── Auth failure ──────────────────────────────────────────────────────────

  it("returns the NextResponse from authenticateApiKey when auth fails (401)", async () => {
    const authError = NextResponse.json(
      { success: false, error: "Authentication required", status: 401 },
      { status: 401 }
    );
    vi.mocked(apiMiddleware.authenticateApiKey).mockResolvedValue(authError);

    const req = makeGet("Bearer invalid");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Authentication required");
  });

  it("returns 429 when rate limited", async () => {
    const rateLimitError = NextResponse.json(
      { success: false, error: "Rate limit exceeded. Try again later.", status: 429 },
      { status: 429 }
    );
    vi.mocked(apiMiddleware.authenticateApiKey).mockResolvedValue(rateLimitError);

    const req = makeGet();
    const res = await GET(req);

    expect(res.status).toBe(429);
  });
});
