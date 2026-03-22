// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks declared before any imports that trigger them ──────────────────────

vi.mock("@/lib/api-middleware");
vi.mock("@/lib/anthropic");
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(() => mockServiceClient),
}));

import * as apiMiddleware from "@/lib/api-middleware";
import * as anthropicModule from "@/lib/anthropic";
import { POST } from "@/app/api/v1/timeline/route";
import type { AuthenticatedApiKey } from "@/lib/api-middleware";
import type { ApiKeyRow } from "@/types/database";

// ── Shared fixtures ────────────────────────────────────────────────────────

const mockApiKeyRow: ApiKeyRow = {
  id: "key-123",
  user_id: "user-abc",
  agency_id: null,
  key_prefix: "abcd1234",
  key_hash: "$2a$10$somehash",
  name: "Test Key",
  last_used_at: null,
  request_count: 0,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

const mockAuthSuccess: AuthenticatedApiKey = {
  apiKey: mockApiKeyRow,
  rateLimitHeaders: {
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": "99",
    "X-RateLimit-Reset": "9999999999",
  },
};

const mockTimeline = {
  steps: [
    {
      stepNumber: 1,
      title: "Microchip implantation",
      description: "Get ISO-compliant microchip implanted before vaccination.",
      dueDate: "2026-10-01",
      daysFromNow: 195,
      category: "logistics" as const,
      isCompleted: false,
      estimatedCost: { description: "Vet fee", amountAUD: 80 },
    },
  ],
  warnings: [
    { severity: "info" as const, message: "This timeline is a guide only." },
  ],
  totalEstimatedCostAUD: 6500,
  originGroup: 3 as const,
  quarantineDays: 10,
  earliestTravelDate: "2027-09-15",
  summary: "Complex Group 3 journey.",
};

const mockServiceClient = {
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ error: null }),
  }),
};

const validBody = {
  petType: "dog",
  petBreed: "Labrador",
  originCountry: "US",
  travelDate: "2027-09-15",
};

function makePost(body: unknown, token = "Bearer cpk_aaaa1111bbbb2222cccc3333dddd4444"): NextRequest {
  return new NextRequest("http://localhost/api/v1/timeline", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/v1/timeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiMiddleware.authenticateApiKey).mockResolvedValue(mockAuthSuccess);
    vi.mocked(anthropicModule.generateTimeline).mockResolvedValue(mockTimeline);
    // Reset the mock service client between tests
    mockServiceClient.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("returns 200 with ApiSuccessResponse shape for valid input", async () => {
    const req = makePost(validBody);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("steps");
    expect(body.data).toHaveProperty("warnings");
    expect(body.data).toHaveProperty("totalEstimatedCostAUD");
    expect(body.data).toHaveProperty("originGroup");
  });

  it("forwards X-RateLimit-* headers from auth on success", async () => {
    const req = makePost(validBody);
    const res = await POST(req);

    expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("99");
    expect(res.headers.get("X-RateLimit-Reset")).toBe("9999999999");
  });

  // ── Auth failure ──────────────────────────────────────────────────────────

  it("returns the NextResponse from authenticateApiKey when auth fails (401)", async () => {
    const authError = NextResponse.json(
      { success: false, error: "Authentication required", status: 401 },
      { status: 401 }
    );
    vi.mocked(apiMiddleware.authenticateApiKey).mockResolvedValue(authError);

    const req = makePost(validBody, "Bearer invalid");
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Authentication required");
  });

  it("returns 429 NextResponse from authenticateApiKey when rate limited", async () => {
    const rateLimitError = NextResponse.json(
      { success: false, error: "Rate limit exceeded. Try again later.", status: 429 },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
    vi.mocked(apiMiddleware.authenticateApiKey).mockResolvedValue(rateLimitError);

    const req = makePost(validBody);
    const res = await POST(req);

    expect(res.status).toBe(429);
  });

  // ── Validation failure ────────────────────────────────────────────────────

  it("returns 422 with Zod errors for missing required field", async () => {
    const req = makePost({ petType: "dog", petBreed: "Lab" }); // missing originCountry + travelDate
    const res = await POST(req);

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  it("returns 422 for invalid petType value", async () => {
    const req = makePost({ ...validBody, petType: "fish" });
    const res = await POST(req);

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 422 for invalid country code", async () => {
    const req = makePost({ ...validBody, originCountry: "INVALID" });
    const res = await POST(req);

    expect(res.status).toBe(422);
  });

  it("returns 422 for past travel date", async () => {
    const req = makePost({ ...validBody, travelDate: "2020-01-01" });
    const res = await POST(req);

    expect(res.status).toBe(422);
  });

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/v1/timeline", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer cpk_aaaa1111bbbb2222cccc3333dddd4444",
      },
      body: "not-json{{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── DB error / generation error ───────────────────────────────────────────

  it("returns 500 when generateTimeline throws", async () => {
    vi.mocked(anthropicModule.generateTimeline).mockRejectedValue(
      new Error("Claude API unavailable")
    );

    const req = makePost(validBody);
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── Agency lead tracking ──────────────────────────────────────────────────

  it("inserts agency_leads row when auth.apiKey.agency_id is set", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockServiceClient.from.mockReturnValue({ insert: insertMock });

    const authWithAgency: AuthenticatedApiKey = {
      ...mockAuthSuccess,
      apiKey: { ...mockApiKeyRow, agency_id: "agency-xyz" },
    };
    vi.mocked(apiMiddleware.authenticateApiKey).mockResolvedValue(authWithAgency);

    const req = makePost(validBody);
    const res = await POST(req);

    expect(res.status).toBe(200);
    // Give fire-and-forget a chance to resolve
    await new Promise((r) => setTimeout(r, 10));
    expect(mockServiceClient.from).toHaveBeenCalledWith("agency_leads");
    expect(insertMock).toHaveBeenCalled();
  });

  it("does NOT insert agency_leads row when agency_id is null", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockServiceClient.from.mockReturnValue({ insert: insertMock });

    vi.mocked(apiMiddleware.authenticateApiKey).mockResolvedValue(mockAuthSuccess); // agency_id: null

    const req = makePost(validBody);
    await POST(req);
    await new Promise((r) => setTimeout(r, 10));

    const calledWithAgencyLeads = mockServiceClient.from.mock.calls.some(
      (c) => c[0] === "agency_leads"
    );
    expect(calledWithAgencyLeads).toBe(false);
  });
});
