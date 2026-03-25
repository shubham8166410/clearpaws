// @vitest-environment node
/**
 * Tests for Issue 3 — checkout API returns 503 when payments are disabled.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: vi.fn() } } },
  PRICE_ID: "price_test",
  AMOUNT_CENTS: 4900,
}));

import { POST } from "@/app/api/checkout/route";

describe("POST /api/checkout — payments feature flag", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns 503 when PAYMENTS_ENABLED is not set", async () => {
    delete process.env.PAYMENTS_ENABLED;
    const req = new NextRequest("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify({ timelineId: "00000000-0000-0000-0000-000000000001" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("PAYMENTS_DISABLED");
  });

  it("returns 503 when PAYMENTS_ENABLED is 'false'", async () => {
    process.env.PAYMENTS_ENABLED = "false";
    const req = new NextRequest("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify({ timelineId: "00000000-0000-0000-0000-000000000001" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("does NOT return 503 when PAYMENTS_ENABLED is 'true' (proceeds to auth check)", async () => {
    process.env.PAYMENTS_ENABLED = "true";
    // Mock supabase to return no user (will get 401, not 503)
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    } as never);

    const req = new NextRequest("http://localhost/api/checkout", {
      method: "POST",
      body: JSON.stringify({ timelineId: "00000000-0000-0000-0000-000000000001" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    // Should get 401 (auth check), NOT 503 (payments disabled)
    expect(res.status).toBe(401);
    expect(res.status).not.toBe(503);
  });
});
