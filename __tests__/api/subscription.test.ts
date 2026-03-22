// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: { create: vi.fn() },
    },
    billingPortal: {
      sessions: { create: vi.fn() },
    },
    customers: {
      create: vi.fn(),
      list: vi.fn(),
    },
  },
  SUBSCRIPTION_PRICE_ID: "price_sub_test",
}));
vi.mock("@/lib/subscription", () => ({
  getUserRole: vi.fn(),
  requireRole: vi.fn(),
  roleAtLeast: vi.fn(),
}));

import { POST as checkoutPOST } from "@/app/api/subscription/checkout/route";
import { GET as statusGET } from "@/app/api/subscription/status/route";
import { POST as portalPOST } from "@/app/api/subscription/portal/route";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// ── Helpers ──────────────────────────────────────────────────────────────────

function authedClient(userId = "user-abc") {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId, email: "test@example.com" } } }) },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

function unauthClient() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  };
}

function makeReq(url: string, body?: unknown, method = "POST"): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => vi.clearAllMocks());

// ── Subscription Checkout ─────────────────────────────────────────────────────

describe("POST /api/subscription/checkout", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as never);
    const res = await checkoutPOST(makeReq("http://localhost/api/subscription/checkout", {}));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    const req = new NextRequest("http://localhost/api/subscription/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json{",
    });
    const res = await checkoutPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when plan is missing from body", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    const res = await checkoutPOST(makeReq("http://localhost/api/subscription/checkout", {}));
    expect(res.status).toBe(400);
  });

  it("returns {url} for valid subscriber plan request", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    // No existing subscription
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as never);
    vi.mocked(stripe.customers.list).mockResolvedValue({ data: [] } as never);
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: "cus_test" } as never);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({ url: "https://checkout.stripe.com/session" } as never);

    const res = await checkoutPOST(makeReq("http://localhost/api/subscription/checkout", { plan: "subscriber" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain("stripe.com");
  });

  it("calls stripe.checkout.sessions.create with mode: subscription", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as never);
    vi.mocked(stripe.customers.list).mockResolvedValue({ data: [] } as never);
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: "cus_test" } as never);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({ url: "https://checkout.stripe.com/x" } as never);

    await checkoutPOST(makeReq("http://localhost/api/subscription/checkout", { plan: "subscriber" }));
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "subscription" })
    );
  });
});

// ── Subscription Status ───────────────────────────────────────────────────────

describe("GET /api/subscription/status", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as never);
    const req = new NextRequest("http://localhost/api/subscription/status", { method: "GET" });
    const res = await statusGET(req);
    expect(res.status).toBe(401);
  });

  it("returns free plan when no subscription row exists", async () => {
    const client = authedClient();
    client.single.mockResolvedValue({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const req = new NextRequest("http://localhost/api/subscription/status", { method: "GET" });
    const res = await statusGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("free");
    expect(body.subscriptionStatus).toBeNull();
  });

  it("returns subscriber role and active status when subscription exists", async () => {
    const client = authedClient();
    client.single.mockResolvedValue({
      data: { role: "subscriber" },
      error: null,
    });
    const serviceClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: { status: "active", current_period_end: "2026-04-20T00:00:00Z" },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(createServiceClient).mockReturnValue(serviceClient as never);

    const req = new NextRequest("http://localhost/api/subscription/status", { method: "GET" });
    const res = await statusGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("subscriber");
    expect(body.subscriptionStatus).toBe("active");
  });
});

// ── Billing Portal ────────────────────────────────────────────────────────────

describe("POST /api/subscription/portal", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as never);
    const res = await portalPOST(makeReq("http://localhost/api/subscription/portal"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when user has no stripe_customer_id", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
      }),
    } as never);

    const res = await portalPOST(makeReq("http://localhost/api/subscription/portal"));
    expect(res.status).toBe(404);
  });

  it("returns {url} when customer exists", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({ data: { stripe_customer_id: "cus_abc" }, error: null }),
          }),
        }),
      }),
    } as never);
    vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
      url: "https://billing.stripe.com/session",
    } as never);

    const res = await portalPOST(makeReq("http://localhost/api/subscription/portal"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain("stripe.com");
  });
});
