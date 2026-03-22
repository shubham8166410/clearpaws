// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mocks must be declared before importing the route
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

import { POST } from "@/app/api/agencies/[id]/click/route";
import * as supabaseServer from "@/lib/supabase/server";

// ── Mock builder helpers ──────────────────────────────────────────────────────

function buildAnonAuthClient() {
  // createClient returns a client where getUser returns no user
  const getUserMock = vi.fn().mockResolvedValue({ data: { user: null }, error: null });
  return {
    auth: { getUser: getUserMock },
  };
}

function buildAuthenticatedClient(userId: string) {
  const getUserMock = vi.fn().mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
  return {
    auth: { getUser: getUserMock },
  };
}

function buildServiceClientWithInsert(error: unknown = null, agencyExists = true) {
  const insertMock = vi.fn().mockResolvedValue({ data: null, error });
  // The route now looks up the agency before inserting to validate the name.
  // Return a chainable select mock for "agencies" table and insert for "referral_clicks".
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: agencyExists ? { name: "matched-agency" } : null,
      error: null,
    }),
  };
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "agencies") return { select: vi.fn().mockReturnValue(selectChain) };
    return { insert: insertMock };
  });
  return { from: fromMock, _insertMock: insertMock };
}

function makePost(
  agencyName: string,
  body?: Record<string, unknown>
): NextRequest {
  const url = new URL(
    `http://localhost/api/agencies/${encodeURIComponent(agencyName)}/click`
  );
  return new NextRequest(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/agencies/[id]/click", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 tracked:true for an anonymous click (no auth)", async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      buildAnonAuthClient() as unknown as Awaited<ReturnType<typeof supabaseServer.createClient>>
    );
    const serviceClient = buildServiceClientWithInsert();
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      serviceClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makePost("Petraveller", { sourcePage: "/generate" });
    const res = await POST(req, { params: Promise.resolve({ id: "Petraveller" }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ tracked: true });
  });

  it("returns 200 tracked:true for an authenticated user click", async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      buildAuthenticatedClient("user-abc-123") as unknown as Awaited<
        ReturnType<typeof supabaseServer.createClient>
      >
    );
    const serviceClient = buildServiceClientWithInsert();
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      serviceClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makePost("Jetpets", { sourcePage: "/dashboard/timelines" });
    const res = await POST(req, { params: Promise.resolve({ id: "Jetpets" }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ tracked: true });
  });

  it("returns 200 tracked:true even when DB insert fails (never block user)", async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      buildAnonAuthClient() as unknown as Awaited<ReturnType<typeof supabaseServer.createClient>>
    );
    const serviceClient = buildServiceClientWithInsert({ message: "Insert failed" });
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      serviceClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makePost("Petraveller");
    const res = await POST(req, { params: Promise.resolve({ id: "Petraveller" }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ tracked: true });
  });

  it("returns 200 tracked:true even when createServiceClient throws", async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      buildAnonAuthClient() as unknown as Awaited<ReturnType<typeof supabaseServer.createClient>>
    );
    vi.mocked(supabaseServer.createServiceClient).mockImplementation(() => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    });

    const req = makePost("Petraveller");
    const res = await POST(req, { params: Promise.resolve({ id: "Petraveller" }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ tracked: true });
  });

  it("correctly URL-decodes agency name (Happy%20Tails → Happy Tails)", async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      buildAnonAuthClient() as unknown as Awaited<ReturnType<typeof supabaseServer.createClient>>
    );
    const serviceClient = buildServiceClientWithInsert();
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      serviceClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    // The route param arrives already decoded by Next.js, but we test explicit decoding too
    const req = makePost("Happy Tails", { sourcePage: "/generate" });
    const res = await POST(req, {
      params: Promise.resolve({ id: "Happy%20Tails" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ tracked: true });

    // Verify the decoded name was used in the insert
    const insertCall = serviceClient._insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertCall.agency_name).toBe("Happy Tails");
  });

  it("inserts click record with correct fields for authenticated user", async () => {
    const userId = "user-xyz-456";
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      buildAuthenticatedClient(userId) as unknown as Awaited<
        ReturnType<typeof supabaseServer.createClient>
      >
    );
    const serviceClient = buildServiceClientWithInsert();
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      serviceClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const timelineId = "timeline-999";
    const req = makePost("Dogtainers", {
      timelineId,
      sourcePage: "/dashboard/timelines",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "Dogtainers" }) });

    expect(res.status).toBe(200);
    const insertCall = serviceClient._insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertCall.agency_name).toBe("Dogtainers");
    expect(insertCall.user_id).toBe(userId);
    expect(insertCall.timeline_id).toBe(timelineId);
    expect(insertCall.source_page).toBe("/dashboard/timelines");
    expect(insertCall).toHaveProperty("clicked_at");
  });

  it("inserts null user_id for anonymous clicks", async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      buildAnonAuthClient() as unknown as Awaited<ReturnType<typeof supabaseServer.createClient>>
    );
    const serviceClient = buildServiceClientWithInsert();
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      serviceClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makePost("Petraveller");
    const res = await POST(req, { params: Promise.resolve({ id: "Petraveller" }) });

    expect(res.status).toBe(200);
    const insertCall = serviceClient._insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertCall.user_id).toBeNull();
  });

  it("returns 200 with empty body (no timelineId or sourcePage)", async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      buildAnonAuthClient() as unknown as Awaited<ReturnType<typeof supabaseServer.createClient>>
    );
    const serviceClient = buildServiceClientWithInsert();
    vi.mocked(supabaseServer.createServiceClient).mockReturnValue(
      serviceClient as unknown as ReturnType<typeof supabaseServer.createServiceClient>
    );

    const req = makePost("Airpets");
    const res = await POST(req, { params: Promise.resolve({ id: "Airpets" }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ tracked: true });
  });
});
