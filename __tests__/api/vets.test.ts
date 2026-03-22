// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock must be declared before importing the route
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { GET } from "@/app/api/vets/route";
import * as supabaseServer from "@/lib/supabase/server";

// Typed mock fixtures
const mockVetVIC = {
  id: "vet-1",
  name: "Melbourne Animal Hospital",
  address: "123 Collins St",
  state: "VIC",
  postcode: "3000",
  phone: "+61 3 9000 0001",
  email: "info@mah.com.au",
  daff_approved: true,
  specialises_in_export: true,
  lat: -37.814,
  lng: 144.963,
  created_at: "2024-01-01T00:00:00Z",
};

const mockVetNSW = {
  id: "vet-2",
  name: "Sydney Export Vets",
  address: "456 George St",
  state: "NSW",
  postcode: "2000",
  phone: "+61 2 9000 0002",
  email: "info@sev.com.au",
  daff_approved: true,
  specialises_in_export: false,
  lat: -33.868,
  lng: 151.207,
  created_at: "2024-01-01T00:00:00Z",
};

/**
 * Builds a Supabase client mock that supports:
 *   from("vet_clinics").select("*").eq("daff_approved", true)
 *   from("vet_clinics").select("*").eq("daff_approved", true).eq("state", "VIC")
 *
 * The query builder is chainable, and the last call in the chain must be awaitable.
 * We model this with a QueryBuilder class that has a then() so it acts as a thenable.
 */
function buildVetsMock(data: unknown, error: unknown = null) {
  // A thenable query builder that also supports chaining .eq()
  const makeBuilder = (): ReturnType<typeof vi.fn> & { then: unknown; eq: unknown } => {
    const builder = {
      then(resolve: (v: unknown) => unknown) {
        return Promise.resolve({ data, error }).then(resolve);
      },
      eq: vi.fn().mockImplementation(() => builder), // eq returns same builder (chainable)
    };
    // Make eq also a thenable by spreading
    return builder as ReturnType<typeof vi.fn> & { then: unknown; eq: unknown };
  };

  const queryBuilder = makeBuilder();

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(queryBuilder),
    }),
  };
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/vets");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

describe("GET /api/vets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with all DAFF-approved vets when no state filter", async () => {
    const mockClient = buildVetsMock([mockVetVIC, mockVetNSW]);
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

  it("returns 200 with filtered vets when state=VIC is provided", async () => {
    const mockClient = buildVetsMock([mockVetVIC]);
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makeGet({ state: "VIC" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body.data).toHaveLength(1);
    expect(body.data[0].state).toBe("VIC");
  });

  it("returns 200 for case-insensitive state (state=vic → VIC)", async () => {
    const mockClient = buildVetsMock([mockVetVIC]);
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

  it("returns 400 for numeric state value", async () => {
    const req = makeGet({ state: "123" });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 500 when DB query errors", async () => {
    const mockClient = buildVetsMock(null, { message: "DB connection failed" });
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

  it("returns vet objects with expected fields", async () => {
    const mockClient = buildVetsMock([mockVetVIC]);
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makeGet();
    const res = await GET(req);
    const body = await res.json();

    const vet = body.data[0];
    expect(vet).toHaveProperty("id");
    expect(vet).toHaveProperty("name");
    expect(vet).toHaveProperty("address");
    expect(vet).toHaveProperty("state");
    expect(vet).toHaveProperty("postcode");
    expect(vet).toHaveProperty("phone");
    expect(vet).toHaveProperty("email");
    expect(vet).toHaveProperty("daff_approved");
    expect(vet).toHaveProperty("specialises_in_export");
  });

  it("returns empty array when no vets match state filter", async () => {
    const mockClient = buildVetsMock([]);
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
