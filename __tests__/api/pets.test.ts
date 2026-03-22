// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { POST, GET } from "@/app/api/pets/route";
import { createClient } from "@/lib/supabase/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_DOG = {
  name: "Rex",
  type: "dog",
  breed: "Labrador",
};

const VALID_CAT = {
  name: "Whiskers",
  type: "cat",
  breed: "Siamese",
};

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

/** Count chain — used by the pet-limit check before insert */
function makeCountChain(count = 0, countError: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count, error: countError }),
    }),
  };
}

function makeInsertChain(returnData: unknown, returnError: unknown = null) {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
      }),
    }),
  };
}

/** Combines count + insert chains for POST /api/pets (from() is called twice) */
function makePostClient(userId = "user-abc", insertData: unknown = null, insertError: unknown = null, count = 0) {
  const fromMock = vi.fn()
    .mockReturnValueOnce(makeCountChain(count))    // first: count query
    .mockReturnValueOnce(makeInsertChain(insertData, insertError)); // second: insert
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId, email: "test@example.com" } },
      }),
    },
    from: fromMock,
  };
}

function makeSelectChain(returnData: unknown, returnError: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
      }),
    }),
  };
}

function authedClient(userId = "user-abc", fromChain?: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId, email: "test@example.com" } },
      }),
    },
    from: vi.fn().mockReturnValue(fromChain ?? {}),
  };
}

function unauthClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  };
}

function makeReq(url: string, body?: unknown, method = "POST"): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => vi.clearAllMocks());

// ── POST /api/pets ────────────────────────────────────────────────────────────

describe("POST /api/pets", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as never);
    const res = await POST(makeReq("http://localhost/api/pets", VALID_DOG));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 for invalid JSON body", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    const req = new NextRequest("http://localhost/api/pets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-valid-json{{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_JSON");
  });

  it("returns 400 for missing required fields", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    const res = await POST(makeReq("http://localhost/api/pets", { name: "Rex" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid microchip number (wrong length)", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    const res = await POST(
      makeReq("http://localhost/api/pets", {
        ...VALID_DOG,
        microchip_number: "12345", // too short
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for Bengal cat (breed ban)", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    const res = await POST(
      makeReq("http://localhost/api/pets", {
        name: "Simba",
        type: "cat",
        breed: "Bengal",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for case-insensitive Bengal variant (bengal mixed case)", async () => {
    vi.mocked(createClient).mockResolvedValue(authedClient() as never);
    const res = await POST(
      makeReq("http://localhost/api/pets", {
        name: "Simba",
        type: "cat",
        breed: "Snow Bengal",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 201 with created pet for valid dog", async () => {
    vi.mocked(createClient).mockResolvedValue(makePostClient("user-abc", PET_ROW) as never);
    const res = await POST(makeReq("http://localhost/api/pets", VALID_DOG));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("pet-uuid-1");
    expect(body.name).toBe("Rex");
    expect(body.type).toBe("dog");
  });

  it("returns 201 with created pet for valid non-Bengal cat", async () => {
    const catRow = { ...PET_ROW, name: "Whiskers", type: "cat", breed: "Siamese" };
    vi.mocked(createClient).mockResolvedValue(makePostClient("user-abc", catRow) as never);
    const res = await POST(makeReq("http://localhost/api/pets", VALID_CAT));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.type).toBe("cat");
    expect(body.breed).toBe("Siamese");
  });

  it("returns 201 with optional microchip_number stored", async () => {
    const rowWithChip = { ...PET_ROW, microchip_number: "123456789012345" };
    vi.mocked(createClient).mockResolvedValue(makePostClient("user-abc", rowWithChip) as never);
    const res = await POST(
      makeReq("http://localhost/api/pets", {
        ...VALID_DOG,
        microchip_number: "123456789012345",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.microchip_number).toBe("123456789012345");
  });

  it("returns 422 when user already has 5 pets", async () => {
    vi.mocked(createClient).mockResolvedValue(makePostClient("user-abc", null, null, 5) as never);
    const res = await POST(makeReq("http://localhost/api/pets", VALID_DOG));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("LIMIT_EXCEEDED");
  });

  it("returns 500 when database insert fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makePostClient("user-abc", null, { message: "DB error" }) as never
    );
    const res = await POST(makeReq("http://localhost/api/pets", VALID_DOG));
    expect(res.status).toBe(500);
  });
});

// ── GET /api/pets ─────────────────────────────────────────────────────────────

describe("GET /api/pets", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as never);
    const req = new NextRequest("http://localhost/api/pets", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 with empty array when user has no pets", async () => {
    vi.mocked(createClient).mockResolvedValue(
      authedClient("user-abc", makeSelectChain([])) as never
    );
    const req = new NextRequest("http://localhost/api/pets", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("returns 200 with pet list for authenticated user", async () => {
    const pets = [PET_ROW, { ...PET_ROW, id: "pet-uuid-2", name: "Buddy" }];
    vi.mocked(createClient).mockResolvedValue(
      authedClient("user-abc", makeSelectChain(pets)) as never
    );
    const req = new NextRequest("http://localhost/api/pets", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("Rex");
    expect(body[1].name).toBe("Buddy");
  });

  it("returns 500 when database query fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      authedClient("user-abc", makeSelectChain(null, { message: "DB error" })) as never
    );
    const req = new NextRequest("http://localhost/api/pets", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
