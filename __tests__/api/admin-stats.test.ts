// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mocks must be declared before importing the route
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/subscription", () => ({
  requireAdmin: vi.fn(),
}));

import { GET } from "@/app/api/admin/stats/route";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/subscription";

// ── Helpers ───────────────────────────────────────────────────────────────────

function authedClient(userId = "admin-user-id") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId, email: "admin@example.com" } },
      }),
    },
  };
}

function unauthClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  };
}

/**
 * Builds a complete service client mock that handles all the chained queries
 * needed for the /api/admin/stats route.
 */
function buildServiceClientMock(overrides: {
  profilesError?: boolean;
  purchasesError?: boolean;
  subscriptionsError?: boolean;
  referralError?: boolean;
  timelinesError?: boolean;
} = {}) {
  // profiles: select("id, role") → { data: [...], error }
  const profilesResult = overrides.profilesError
    ? { data: null, error: { message: "DB error" } }
    : {
        data: [
          { role: "free" },
          { role: "free" },
          { role: "paid_once" },
          { role: "subscriber" },
          { role: "admin" },
        ],
        error: null,
      };

  // purchases: select("amount_cents") → { data: [...], error }
  const purchasesResult = overrides.purchasesError
    ? { data: null, error: { message: "DB error" } }
    : {
        data: [{ amount_cents: 4900 }, { amount_cents: 4900 }],
        error: null,
      };

  // subscriptions: select("id").eq("status", "active") → { data: [...], error }
  const subscriptionsResult = overrides.subscriptionsError
    ? { data: null, error: { message: "DB error" } }
    : { data: [{ id: "sub-1" }, { id: "sub-2" }], error: null };

  // referral_clicks: select("agency_name") → { data: [...], error }
  const referralResult = overrides.referralError
    ? { data: null, error: { message: "DB error" } }
    : {
        data: [
          { agency_name: "Petraveller" },
          { agency_name: "Petraveller" },
          { agency_name: "Dogtainers" },
          { agency_name: "Petraveller" },
          { agency_name: "Jetpets" },
        ],
        error: null,
      };

  // timelines total: select("id") → { data: [...], error }
  // timelines last30: select("id").gte(...) → { data: [...], error }
  const timelinesResult = overrides.timelinesError
    ? { data: null, error: { message: "DB error" } }
    : { data: [{ id: "t1" }, { id: "t2" }, { id: "t3" }], error: null };

  const timelinesLast30Result = overrides.timelinesError
    ? { data: null, error: { message: "DB error" } }
    : { data: [{ id: "t2" }, { id: "t3" }], error: null };

  // Build a from() that returns appropriate chains per table
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn().mockResolvedValue(profilesResult),
      };
    }
    if (table === "purchases") {
      return {
        select: vi.fn().mockResolvedValue(purchasesResult),
      };
    }
    if (table === "subscriptions") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(subscriptionsResult),
        }),
      };
    }
    if (table === "referral_clicks") {
      return {
        select: vi.fn().mockResolvedValue(referralResult),
      };
    }
    if (table === "timelines") {
      // The route calls .from("timelines").select("id") twice:
      //   1. Awaited directly for total count
      //   2. Chained with .gte(...) for last-30-days count
      // We track call order to return the right result each time.
      let callCount = 0;
      return {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          const isFirstCall = callCount === 1;
          // First call: awaited directly → must be a thenable resolving to timelinesResult
          // Second call: chained with .gte() → return object with gte mock
          const result = isFirstCall ? timelinesResult : timelinesLast30Result;
          return {
            // Support direct await (first call)
            then: (
              resolve: (v: typeof timelinesResult) => void,
              reject: (e: unknown) => void
            ) => Promise.resolve(result).then(resolve, reject),
            catch: (fn: (e: unknown) => void) => Promise.resolve(result).catch(fn),
            finally: (fn: () => void) => Promise.resolve(result).finally(fn),
            // Support .gte() chain (second call)
            gte: vi.fn().mockResolvedValue(timelinesLast30Result),
          };
        }),
      };
    }
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });

  return { from: fromMock };
}

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/admin/stats", { method: "GET" });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as never);

    const res = await GET(makeGet());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code");
  });

  it("returns 403 when authenticated but not admin", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockRejectedValue({ status: 403, message: "Not admin" });

    const res = await GET(makeGet());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code");
  });

  it("returns 200 with correct stats shape when admin", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock() as never
    );

    const res = await GET(makeGet());

    expect(res.status).toBe(200);
    const body = await res.json();

    // users shape
    expect(body).toHaveProperty("users");
    expect(body.users).toHaveProperty("total");
    expect(typeof body.users.total).toBe("number");
    expect(body.users).toHaveProperty("byRole");
    expect(body.users.byRole).toHaveProperty("free");
    expect(body.users.byRole).toHaveProperty("paid_once");
    expect(body.users.byRole).toHaveProperty("subscriber");
    expect(body.users.byRole).toHaveProperty("admin");

    // revenue shape
    expect(body).toHaveProperty("revenue");
    expect(body.revenue).toHaveProperty("totalPurchases");
    expect(body.revenue).toHaveProperty("purchaseRevenueAUD");
    expect(body.revenue).toHaveProperty("activeSubscriptions");
    expect(typeof body.revenue.purchaseRevenueAUD).toBe("number");

    // referrals shape
    expect(body).toHaveProperty("referrals");
    expect(body.referrals).toHaveProperty("totalClicks");
    expect(body.referrals).toHaveProperty("topAgencies");
    expect(Array.isArray(body.referrals.topAgencies)).toBe(true);
    // each agency in topAgencies has agency_name and clicks
    if (body.referrals.topAgencies.length > 0) {
      expect(body.referrals.topAgencies[0]).toHaveProperty("agency_name");
      expect(body.referrals.topAgencies[0]).toHaveProperty("clicks");
    }

    // timelines shape
    expect(body).toHaveProperty("timelines");
    expect(body.timelines).toHaveProperty("total");
    expect(body.timelines).toHaveProperty("last30Days");
  });

  it("returns correct user counts aggregated by role", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock() as never
    );

    const res = await GET(makeGet());
    const body = await res.json();

    // From mock: 2 free, 1 paid_once, 1 subscriber, 1 admin = 5 total
    expect(body.users.total).toBe(5);
    expect(body.users.byRole.free).toBe(2);
    expect(body.users.byRole.paid_once).toBe(1);
    expect(body.users.byRole.subscriber).toBe(1);
    expect(body.users.byRole.admin).toBe(1);
  });

  it("returns correct purchase revenue in AUD", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock() as never
    );

    const res = await GET(makeGet());
    const body = await res.json();

    // From mock: 2 purchases × 4900 cents = 9800 cents = 98 AUD
    expect(body.revenue.totalPurchases).toBe(2);
    expect(body.revenue.purchaseRevenueAUD).toBe(98);
    expect(body.revenue.activeSubscriptions).toBe(2);
  });

  it("returns top agencies sorted by click count descending", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock() as never
    );

    const res = await GET(makeGet());
    const body = await res.json();

    // From mock: Petraveller×3, Dogtainers×1, Jetpets×1
    expect(body.referrals.totalClicks).toBe(5);
    expect(body.referrals.topAgencies[0].agency_name).toBe("Petraveller");
    expect(body.referrals.topAgencies[0].clicks).toBe(3);
  });

  it("returns 500 when DB query fails", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock({ profilesError: true }) as never
    );

    const res = await GET(makeGet());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code");
  });

  it("returns 500 when createServiceClient throws", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockImplementation(() => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    });

    const res = await GET(makeGet());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 500 when purchases query fails", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock({ purchasesError: true }) as never
    );

    const res = await GET(makeGet());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code");
  });

  it("returns 500 when subscriptions query fails", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock({ subscriptionsError: true }) as never
    );

    const res = await GET(makeGet());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 500 when referral_clicks query fails", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock({ referralError: true }) as never
    );

    const res = await GET(makeGet());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 500 when timelines query fails", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock({ timelinesError: true }) as never
    );

    const res = await GET(makeGet());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 500 when requireAdmin throws unexpected error", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unexpected DB error"));

    const res = await GET(makeGet());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
