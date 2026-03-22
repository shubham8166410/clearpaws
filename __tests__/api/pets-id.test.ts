// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { GET, PUT, DELETE } from "@/app/api/pets/[id]/route";
import { createClient } from "@/lib/supabase/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

const PET_ROW = {
  id: "pet-uuid-1",
  user_id: "user-abc",
  name: "Rex",
  type: "dog",
  breed: "Labrador",
  microchip_number: null,
  date_of_birth: null,
  created_at: "2026-01-01T00:00:00Z",
};

const ROUTE_PARAMS = { params: Promise.resolve({ id: "pet-uuid-1" }) };

function unauthClient() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  };
}

function authedClient(userId = "user-abc") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId, email: "test@example.com" } },
      }),
    },
    from: vi.fn(),
  };
}

/**
 * Build a fluent Supabase query chain.
 * Supports: .select().eq().eq().single()
 * and       .update().eq().eq().select().single()
 * and       .delete().eq().eq()
 */
function makeChain(
  op: "select" | "update" | "delete",
  returnData: unknown,
  returnError: unknown = null
) {
  const singleMock = vi.fn().mockResolvedValue({ data: returnData, error: returnError });
  const eqMock2 = vi.fn().mockReturnValue({ single: singleMock });
  const eqMock2Del = vi.fn().mockResolvedValue({ error: returnError });

  if (op === "select") {
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: eqMock2,
      }),
    });
    return { select: selectMock };
  }

  if (op === "update") {
    const selectAfterUpdate = vi.fn().mockReturnValue({ single: singleMock });
    const eqAfterUpdate2 = vi.fn().mockReturnValue({ select: selectAfterUpdate });
    const eqAfterUpdate1 = vi.fn().mockReturnValue({ eq: eqAfterUpdate2 });
    const updateMock = vi.fn().mockReturnValue({ eq: eqAfterUpdate1 });
    return { update: updateMock };
  }

  // delete
  const eqDel1 = vi.fn().mockReturnValue({ eq: eqMock2Del });
  const deleteMock = vi.fn().mockReturnValue({ eq: eqDel1 });
  return { delete: deleteMock };
}

function makeReq(url: string, body?: unknown, method = "GET"): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => vi.clearAllMocks());

// ── GET /api/pets/[id] ────────────────────────────────────────────────────────

describe("GET /api/pets/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as never);
    const res = await GET(makeReq("http://localhost/api/pets/pet-uuid-1"), ROUTE_PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 200 with pet when found and owned by user", async () => {
    const client = authedClient("user-abc");
    vi.mocked(client.from).mockReturnValue(makeChain("select", PET_ROW) as never);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const res = await GET(makeReq("http://localhost/api/pets/pet-uuid-1"), ROUTE_PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("pet-uuid-1");
    expect(body.name).toBe("Rex");
  });

  it("returns 404 when pet not found or belongs to different user", async () => {
    const client = authedClient("user-abc");
    vi.mocked(client.from).mockReturnValue(makeChain("select", null) as never);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const res = await GET(makeReq("http://localhost/api/pets/pet-uuid-1"), ROUTE_PARAMS);
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/pets/[id] ────────────────────────────────────────────────────────

describe("PUT /api/pets/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as never);
    const res = await PUT(
      makeReq("http://localhost/api/pets/pet-uuid-1", { name: "Max" }, "PUT"),
      ROUTE_PARAMS
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const client = authedClient();
    vi.mocked(createClient).mockResolvedValue(client as never);
    const req = new NextRequest("http://localhost/api/pets/pet-uuid-1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "not-valid-json{{{",
    });
    const res = await PUT(req, ROUTE_PARAMS);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_JSON");
  });

  it("returns 400 for invalid data (microchip wrong format)", async () => {
    const client = authedClient();
    // First call = select (fetch existing), second = update
    let callCount = 0;
    vi.mocked(client.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain("select", PET_ROW) as never;
      return makeChain("update", PET_ROW) as never;
    });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const res = await PUT(
      makeReq("http://localhost/api/pets/pet-uuid-1", { microchip_number: "123" }, "PUT"),
      ROUTE_PARAMS
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when pet not found or not owned by user", async () => {
    const client = authedClient();
    vi.mocked(client.from).mockReturnValue(makeChain("select", null) as never);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const res = await PUT(
      makeReq("http://localhost/api/pets/pet-uuid-1", { name: "Max" }, "PUT"),
      ROUTE_PARAMS
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when update would create Bengal cat", async () => {
    const catRow = { ...PET_ROW, type: "cat", breed: "Siamese" };
    const client = authedClient();
    vi.mocked(client.from).mockReturnValue(makeChain("select", catRow) as never);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const res = await PUT(
      makeReq("http://localhost/api/pets/pet-uuid-1", { breed: "Bengal" }, "PUT"),
      ROUTE_PARAMS
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 with updated pet on valid update", async () => {
    const updatedRow = { ...PET_ROW, name: "Max" };
    const client = authedClient();
    let callCount = 0;
    vi.mocked(client.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain("select", PET_ROW) as never;
      return makeChain("update", updatedRow) as never;
    });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const res = await PUT(
      makeReq("http://localhost/api/pets/pet-uuid-1", { name: "Max" }, "PUT"),
      ROUTE_PARAMS
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Max");
  });
});

// ── DELETE /api/pets/[id] ─────────────────────────────────────────────────────

describe("DELETE /api/pets/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as never);
    const res = await DELETE(
      makeReq("http://localhost/api/pets/pet-uuid-1", undefined, "DELETE"),
      ROUTE_PARAMS
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when pet not found or not owned by user", async () => {
    const client = authedClient();
    vi.mocked(client.from).mockReturnValue(makeChain("select", null) as never);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const res = await DELETE(
      makeReq("http://localhost/api/pets/pet-uuid-1", undefined, "DELETE"),
      ROUTE_PARAMS
    );
    expect(res.status).toBe(404);
  });

  it("returns 204 on successful delete", async () => {
    const client = authedClient();
    let callCount = 0;
    vi.mocked(client.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain("select", PET_ROW) as never;
      return makeChain("delete", null) as never;
    });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const res = await DELETE(
      makeReq("http://localhost/api/pets/pet-uuid-1", undefined, "DELETE"),
      ROUTE_PARAMS
    );
    expect(res.status).toBe(204);
  });

  it("returns 500 when delete DB operation fails", async () => {
    const client = authedClient();
    let callCount = 0;
    vi.mocked(client.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain("select", PET_ROW) as never;
      return makeChain("delete", null, { message: "DB error" }) as never;
    });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const res = await DELETE(
      makeReq("http://localhost/api/pets/pet-uuid-1", undefined, "DELETE"),
      ROUTE_PARAMS
    );
    expect(res.status).toBe(500);
  });
});
