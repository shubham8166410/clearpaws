// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { GET } from "@/app/api/labs/route";
import * as supabaseServer from "@/lib/supabase/server";

const mockLabUS = {
  id: "lab-1",
  name: "Kansas State Veterinary Diagnostic Laboratory",
  country: "US",
  accepts_from_countries: ["US", "CA", "MX"],
  website: "https://www.vet.ksu.edu/labs",
  turnaround_days: 10,
  notes: "DAFF-approved RNATT lab for North America",
  created_at: "2024-01-01T00:00:00Z",
};

const mockLabGB = {
  id: "lab-2",
  name: "APHA Weybridge",
  country: "GB",
  accepts_from_countries: ["GB", "IE", "FR", "DE"],
  website: "https://www.gov.uk/apha",
  turnaround_days: 7,
  notes: "UK government-approved RNATT facility",
  created_at: "2024-01-01T00:00:00Z",
};

/**
 * Builds a mock Supabase client that supports:
 *   from("approved_labs").select("*")                              → all labs
 *   from("approved_labs").select("*").contains("col", ["value"])   → filtered labs
 *
 * The select() returns a thenable builder that also exposes .contains().
 */
function buildLabsMock(data: unknown, error: unknown = null) {
  const makeBuilder = () => {
    const builder = {
      then(resolve: (v: unknown) => unknown) {
        return Promise.resolve({ data, error }).then(resolve);
      },
      contains: vi.fn().mockImplementation(() => builder),
    };
    return builder;
  };

  const queryBuilder = makeBuilder();

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(queryBuilder),
    }),
  };
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/labs");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

describe("GET /api/labs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with all labs when no country filter", async () => {
    const mockClient = buildLabsMock([mockLabUS, mockLabGB]);
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

  it("returns 200 with filtered labs when country=US is provided", async () => {
    const mockClient = buildLabsMock([mockLabUS]);
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makeGet({ country: "US" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body.data).toHaveLength(1);
    expect(body.data[0].country).toBe("US");
  });

  it("returns 400 for empty country string (country=)", async () => {
    const req = makeGet({ country: "" });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code");
  });

  it("returns 400 for whitespace-only country string", async () => {
    const req = makeGet({ country: "   " });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 500 when DB query errors", async () => {
    const mockClient = buildLabsMock(null, { message: "DB error" });
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

  it("returns lab objects with expected fields", async () => {
    const mockClient = buildLabsMock([mockLabUS]);
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makeGet();
    const res = await GET(req);
    const body = await res.json();

    const lab = body.data[0];
    expect(lab).toHaveProperty("id");
    expect(lab).toHaveProperty("name");
    expect(lab).toHaveProperty("country");
    expect(lab).toHaveProperty("accepts_from_countries");
    expect(lab).toHaveProperty("website");
    expect(lab).toHaveProperty("turnaround_days");
  });

  it("returns empty array when no labs match country filter", async () => {
    const mockClient = buildLabsMock([]);
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makeGet({ country: "ZZ" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });
});
