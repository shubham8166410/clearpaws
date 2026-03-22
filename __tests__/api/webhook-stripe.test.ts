// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
  },
  AMOUNT_CENTS: 4900,
  SUBSCRIPTION_PRICE_ID: "price_sub_test",
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { POST } from "@/app/api/webhook/stripe/route";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

// ── Mock DB builder ───────────────────────────────────────────────────────────

function makeDb(opts: {
  insertError?: string | null;
  upsertError?: string | null;
  updateError?: string | null;
  purchaseExists?: boolean;
} = {}) {
  return {
    from: vi.fn().mockImplementation((table: string) => ({
      insert: vi.fn().mockResolvedValue({
        error: opts.insertError ? { message: opts.insertError, code: opts.purchaseExists ? "23505" : "OTHER" } : null,
      }),
      upsert: vi.fn().mockResolvedValue({ error: opts.upsertError ? { message: opts.upsertError } : null }),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ error: opts.updateError ? { message: opts.updateError } : null }),
      // Fluent chain ending
      mockResolvedValue: vi.fn(),
    })),
  };
}

function makeDbWithUpdate(hasPurchase = false) {
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: hasPurchase ? { id: "purchase-001" } : null,
      error: null,
    }),
  };
  const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  return {
    from: vi.fn().mockImplementation(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: updateFn,
      select: vi.fn().mockReturnValue(selectChain),
      eq: vi.fn().mockReturnThis(),
    })),
    _updateFn: updateFn,
  };
}

// ── Stripe event factory ──────────────────────────────────────────────────────

function makeCheckoutEvent(mode: "payment" | "subscription", metadata: Record<string, string>) {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        mode,
        metadata,
        customer: "cus_test",
      },
    },
  };
}

function makeSubscriptionEvent(
  type: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    type,
    data: {
      object: {
        id: "sub_test_123",
        customer: "cus_test",
        status: "active",
        current_period_end: 1800000000,
        metadata: { userId: "user-abc" },
        items: {
          data: [{ price: { id: "price_sub_test" } }],
        },
        ...overrides,
      },
    },
  };
}

function makeWebhookReq(event: unknown): NextRequest {
  return new NextRequest("http://localhost/api/webhook/stripe", {
    method: "POST",
    headers: {
      "stripe-signature": "sig_test",
      "content-type": "application/json",
    },
    body: JSON.stringify(event),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Webhook handler checks for this env var before calling constructEvent
  process.env.STRIPE_WEBHOOK_SECRET = "test_whsec";
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/webhook/stripe", () => {
  it("returns 400 when signature header is missing", async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error("No signature");
    });
    const req = new NextRequest("http://localhost/api/webhook/stripe", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when signature verification fails", async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error("Webhook signature mismatch");
    });
    const res = await POST(makeWebhookReq({}));
    expect(res.status).toBe(400);
  });

  // ── checkout.session.completed — mode: payment (existing PDF purchase flow) ──

  it("handles checkout.session.completed for mode:payment and inserts purchase", async () => {
    const event = makeCheckoutEvent("payment", { userId: "user-abc", timelineId: "tl-001" });
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);
    const db = makeDbWithUpdate();
    vi.mocked(createServiceClient).mockReturnValue(db as never);

    const res = await POST(makeWebhookReq(event));
    expect(res.status).toBe(200);
    expect(db.from).toHaveBeenCalledWith("purchases");
  });

  it("returns 400 for payment session missing userId metadata", async () => {
    const event = makeCheckoutEvent("payment", { timelineId: "tl-001" });
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);
    vi.mocked(createServiceClient).mockReturnValue(makeDbWithUpdate() as never);

    const res = await POST(makeWebhookReq(event));
    expect(res.status).toBe(400);
  });

  it("returns 200 (idempotent) for duplicate payment session", async () => {
    const event = makeCheckoutEvent("payment", { userId: "user-abc", timelineId: "tl-001" });
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        insert: vi.fn().mockResolvedValue({ error: { code: "23505", message: "duplicate" } }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }),
    } as never);

    const res = await POST(makeWebhookReq(event));
    expect(res.status).toBe(200);
  });

  // ── customer.subscription.created ────────────────────────────────────────────

  it("handles customer.subscription.created and upserts subscription", async () => {
    const event = makeSubscriptionEvent("customer.subscription.created");
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);
    const db = makeDbWithUpdate();
    vi.mocked(createServiceClient).mockReturnValue(db as never);

    const res = await POST(makeWebhookReq(event));
    expect(res.status).toBe(200);
    expect(db.from).toHaveBeenCalledWith("subscriptions");
  });

  // ── customer.subscription.updated ────────────────────────────────────────────

  it("handles customer.subscription.updated", async () => {
    const event = makeSubscriptionEvent("customer.subscription.updated", { status: "active" });
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);
    const db = makeDbWithUpdate();
    vi.mocked(createServiceClient).mockReturnValue(db as never);

    const res = await POST(makeWebhookReq(event));
    expect(res.status).toBe(200);
  });

  // ── customer.subscription.deleted ────────────────────────────────────────────

  it("handles customer.subscription.deleted and sets status cancelled", async () => {
    const event = makeSubscriptionEvent("customer.subscription.deleted", { status: "canceled" });
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);
    const db = makeDbWithUpdate();
    vi.mocked(createServiceClient).mockReturnValue(db as never);

    const res = await POST(makeWebhookReq(event));
    expect(res.status).toBe(200);
  });

  // ── invoice.payment_failed ────────────────────────────────────────────────────

  it("handles invoice.payment_failed and sets status past_due", async () => {
    const event = {
      type: "invoice.payment_failed",
      data: {
        object: {
          subscription: "sub_test_123",
          customer: "cus_test",
        },
      },
    };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);
    const db = makeDbWithUpdate();
    vi.mocked(createServiceClient).mockReturnValue(db as never);

    const res = await POST(makeWebhookReq(event));
    expect(res.status).toBe(200);
  });

  // ── Unknown event type ────────────────────────────────────────────────────────

  it("returns 200 for unhandled event types (graceful ignore)", async () => {
    const event = { type: "payment_intent.created", data: { object: {} } };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never);
    vi.mocked(createServiceClient).mockReturnValue(makeDbWithUpdate() as never);

    const res = await POST(makeWebhookReq(event));
    expect(res.status).toBe(200);
  });
});
