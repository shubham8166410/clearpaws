// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock must be declared before importing the route
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { GET } from "@/app/api/agencies/route";
import * as supabaseServer from "@/lib/supabase/server";
import type { AgencyRow } from "@/types/database";

// Typed mock fixtures matching AgencyRow shape
const mockAgencyVIC: AgencyRow = {
  id: "agency-1",
  name: "Petraveller",
  url: "https://www.petraveller.com.au",
  tagline: "Full door-to-door pet relocation service",
  description: "Australia's premium pet relocation specialists.",
  services: ["door-to-door", "documentation", "quarantine-management"],
  price_range: "$3,000 – $8,000 AUD",
  states_served: ["VIC", "NSW", "QLD"],
  rating: 4.8,
  contact_email: "info@petraveller.com.au",
  created_at: "2024-01-01T00:00:00Z",
  slug: null,
  logo_url: null,
  primary_colour: null,
  secondary_colour: null,
  owner_user_id: null,
  stripe_subscription_id: null,
};

const mockAgencyNSW: AgencyRow = {
  id: "agency-2",
  name: "Dogtainers",
  url: "https://www.dogtainers.com.au",
  tagline: "Australia's largest pet transport company",
  description: "Domestic and international pet transport.",
  services: ["domestic", "international"],
  price_range: "$2,500 – $7,000 AUD",
  states_served: ["NSW", "QLD", "WA"],
  rating: 4.5,
  contact_email: "info@dogtainers.com.au",
  created_at: "2024-01-01T00:00:00Z",
  slug: null,
  logo_url: null,
  primary_colour: null,
  secondary_colour: null,
  owner_user_id: null,
  stripe_subscription_id: null,
};

// ── Mock builder helpers ──────────────────────────────────────────────────────

/**
 * Builds a Supabase mock where:
 *   from("agencies").select("*").order(...) resolves directly
 *   from("agencies").select("*").contains(...).order(...) also resolves
 */
function buildSupabaseMock(data: unknown, error: unknown = null) {
  // order is the terminal call regardless of whether contains was chained
  const orderMock = vi.fn().mockResolvedValue({ data, error });
  const containsMock = vi.fn().mockReturnValue({ order: orderMock });
  const selectMock = vi.fn().mockReturnValue({
    order: orderMock,
    contains: containsMock,
  });
  const fromMock = vi.fn().mockReturnValue({ select: selectMock });

  return { from: fromMock };
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/agencies");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/agencies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with all agencies when no state filter is provided", async () => {
    const mockClient = buildSupabaseMock([mockAgencyVIC, mockAgencyNSW]);
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makeGet();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it("returns 200 with filtered agencies when state=VIC is provided", async () => {
    const mockClient = buildSupabaseMock([mockAgencyVIC]);
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makeGet({ state: "VIC" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Petraveller");
  });

  it("returns 200 for case-insensitive state (state=vic)", async () => {
    const mockClient = buildSupabaseMock([mockAgencyVIC]);
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makeGet({ state: "vic" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
  });

  it("returns 400 for invalid state code (state=XX)", async () => {
    const req = makeGet({ state: "XX" });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code");
  });

  it("returns 400 for numeric state value (state=123)", async () => {
    const req = makeGet({ state: "123" });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 500 when DB query errors", async () => {
    const mockClient = buildSupabaseMock(null, { message: "DB connection failed" });
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makeGet();
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code");
  });

  it("returns 500 when createServiceClient throws", async () => {
    vi.mocked(supabaseServer.createServiceClient).mockImplementation(() => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    });

    const req = makeGet();
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns agency objects with expected fields", async () => {
    const mockClient = buildSupabaseMock([mockAgencyVIC]);
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makeGet();
    const res = await GET(req);
    const body = await res.json();
    const agency = body.data[0];

    expect(agency).toHaveProperty("id");
    expect(agency).toHaveProperty("name");
    expect(agency).toHaveProperty("url");
    expect(agency).toHaveProperty("description");
    expect(agency).toHaveProperty("states_served");
    expect(agency).toHaveProperty("rating");
  });

  it("returns empty array when no agencies match state filter", async () => {
    const mockClient = buildSupabaseMock([]);
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makeGet({ state: "TAS" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });
});
