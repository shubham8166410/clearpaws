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

import { GET } from "@/app/api/admin/users/route";
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

const mockUsers = [
  {
    id: "user-1",
    email: "alice@example.com",
    role: "admin",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "user-2",
    email: "bob@example.com",
    role: "subscriber",
    created_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "user-3",
    email: "charlie@example.com",
    role: "free",
    created_at: "2026-01-03T00:00:00Z",
  },
];

/**
 * Builds a service client mock for the users list query.
 * The chain is: from("profiles").select(...).order(...).range(...) → { data, count, error }
 */
function buildServiceClientMock(
  data: typeof mockUsers | null = mockUsers,
  count: number | null = 3,
  error: { message: string } | null = null
) {
  const rangeMock = vi.fn().mockResolvedValue({ data, count, error });
  const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
  const selectMock = vi.fn().mockReturnValue({ order: orderMock });
  const fromMock = vi.fn().mockReturnValue({ select: selectMock });

  return { from: fromMock };
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/admin/users");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/admin/users", () => {
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

  it("returns 200 with user list and pagination metadata", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock() as never
    );

    const res = await GET(makeGet());

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("users");
    expect(Array.isArray(body.users)).toBe(true);
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page");
    expect(body).toHaveProperty("pageSize");
    expect(typeof body.total).toBe("number");
    expect(typeof body.page).toBe("number");
    expect(typeof body.pageSize).toBe("number");
  });

  it("defaults to page 1 when no page param is provided", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock() as never
    );

    const res = await GET(makeGet());
    const body = await res.json();

    expect(body.page).toBe(1);
  });

  it("uses page param when provided", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock() as never
    );

    const res = await GET(makeGet({ page: "2" }));
    const body = await res.json();

    expect(body.page).toBe(2);
  });

  it("returns user objects with expected fields", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock() as never
    );

    const res = await GET(makeGet());
    const body = await res.json();

    expect(body.users.length).toBeGreaterThan(0);
    const user = body.users[0];
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("email");
    expect(user).toHaveProperty("role");
    expect(user).toHaveProperty("created_at");
  });

  it("returns 500 when DB query fails", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock(null, null, { message: "DB error" }) as never
    );

    const res = await GET(makeGet());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code");
  });

  it("returns 400 for invalid page param (non-numeric)", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);

    const res = await GET(makeGet({ page: "abc" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 400 for page=0 (page must be >= 1)", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);

    const res = await GET(makeGet({ page: "0" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns pageSize of 20 by default", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock() as never
    );

    const res = await GET(makeGet());
    const body = await res.json();

    expect(body.pageSize).toBe(20);
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

  it("returns 500 when requireAdmin throws unexpected error", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unexpected error"));

    const res = await GET(makeGet());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
