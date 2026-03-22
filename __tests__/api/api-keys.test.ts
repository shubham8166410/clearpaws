// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks declared before any imports that trigger them ──────────────────────

const supabaseAuthMock = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => supabaseAuthMock),
  createServiceClient: vi.fn(() => supabaseAuthMock),
}));

vi.mock("@/lib/api-keys", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-keys")>();
  return {
    ...actual,
    generateApiKey: vi.fn(),
  };
});

import { POST, GET } from "@/app/api/api-keys/route";
import * as apiKeysLib from "@/lib/api-keys";

// ── Shared fixtures ────────────────────────────────────────────────────────

const mockUser = { id: "user-123", email: "test@example.com" };

const mockGeneratedKey = {
  raw: "cpk_aaaa1111bbbb2222cccc3333dddd4444",
  prefix: "aaaa1111",
  hash: "$2a$10$hashedvalue",
};

const mockApiKeyRow = {
  id: "key-uuid-1",
  user_id: "user-123",
  agency_id: null,
  key_prefix: "aaaa1111",
  key_hash: "$2a$10$hashedvalue",
  name: "My API Key",
  last_used_at: null,
  request_count: 0,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

/**
 * Build a mock for the count query:
 * .from("api_keys").select("id", { count, head }).eq("user_id", ...).eq("is_active", true)
 * Returns { count, error }.
 */
function makeCountChain(count: number | null, error: unknown = null) {
  const countResult = { count, error };
  const eqIsActive = vi.fn().mockResolvedValue(countResult);
  const eqUserId = vi.fn().mockReturnValue({ eq: eqIsActive });
  const selectFn = vi.fn().mockReturnValue({ eq: eqUserId });
  return { selectFn, eqUserId, eqIsActive };
}

/**
 * Build a mock for the insert query:
 * .from("api_keys").insert({...}).select("*").single()
 */
function makeInsertChain(data: unknown, error: unknown = null) {
  const singleFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ single: singleFn });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  return { insertFn, selectFn, singleFn };
}

/**
 * Build a mock for the list query:
 * .from("api_keys").select("...").eq("user_id", ...).order("created_at", ...)
 */
function makeListChain(data: unknown, error: unknown = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  return { selectFn, eqFn, orderFn };
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/api-keys", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/api-keys", {
    method: "GET",
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/api-keys", () => {
  beforeEach(() => {
    vi.mocked(supabaseAuthMock.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    vi.mocked(apiKeysLib.generateApiKey).mockResolvedValue(mockGeneratedKey);
    vi.clearAllMocks();
    // Re-apply the getUser mock after clearAllMocks
    vi.mocked(supabaseAuthMock.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    vi.mocked(apiKeysLib.generateApiKey).mockResolvedValue(mockGeneratedKey);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("returns 201 with ApiKeyDisplay on success", async () => {
    const countChain = makeCountChain(0);
    const insertChain = makeInsertChain(mockApiKeyRow);

    supabaseAuthMock.from
      .mockReturnValueOnce({ select: countChain.selectFn })
      .mockReturnValueOnce({ insert: insertChain.insertFn });

    const req = makePost({ name: "My API Key" });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("id");
    expect(body.data).toHaveProperty("key");
    expect(body.data).toHaveProperty("name");
    expect(body.data).toHaveProperty("created_at");
    // Raw key is included only at creation time
    expect(body.data.key).toMatch(/^cpk_/);
  });

  it("calls generateApiKey to create a new key", async () => {
    const countChain = makeCountChain(0);
    const insertChain = makeInsertChain(mockApiKeyRow);

    supabaseAuthMock.from
      .mockReturnValueOnce({ select: countChain.selectFn })
      .mockReturnValueOnce({ insert: insertChain.insertFn });

    const req = makePost({ name: "My API Key" });
    await POST(req);

    expect(apiKeysLib.generateApiKey).toHaveBeenCalledTimes(1);
  });

  // ── Auth failure ──────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(supabaseAuthMock.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = makePost({ name: "My Key" });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── Validation failure ────────────────────────────────────────────────────

  it("returns 422 when name is missing", async () => {
    const req = makePost({});
    const res = await POST(req);

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 422 when name exceeds 100 characters", async () => {
    const req = makePost({ name: "a".repeat(101) });
    const res = await POST(req);

    expect(res.status).toBe(422);
  });

  it("returns 422 when name is empty string", async () => {
    const req = makePost({ name: "" });
    const res = await POST(req);

    expect(res.status).toBe(422);
  });

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── Max keys limit ────────────────────────────────────────────────────────

  it("returns 409 when user already has 5 active keys", async () => {
    const countChain = makeCountChain(5);
    supabaseAuthMock.from.mockReturnValueOnce({ select: countChain.selectFn });

    const req = makePost({ name: "Key 6" });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/5/); // mention the limit
  });

  // ── DB error ──────────────────────────────────────────────────────────────

  it("returns 500 when DB insert fails", async () => {
    const countChain = makeCountChain(0);
    const insertChain = makeInsertChain(null, { message: "DB error" });

    supabaseAuthMock.from
      .mockReturnValueOnce({ select: countChain.selectFn })
      .mockReturnValueOnce({ insert: insertChain.insertFn });

    const req = makePost({ name: "My Key" });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

describe("GET /api/api-keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseAuthMock.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("returns 200 with array of ApiKeyListItem objects", async () => {
    const mockKeys = [
      {
        id: "key-1",
        user_id: "user-123",
        agency_id: null,
        key_prefix: "aaaa1111",
        name: "Key One",
        last_used_at: null,
        request_count: 5,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];

    const listChain = makeListChain(mockKeys);
    supabaseAuthMock.from.mockReturnValueOnce({ select: listChain.selectFn });

    const req = makeGet();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    // Should NOT expose key_hash
    expect(body.data[0]).not.toHaveProperty("key_hash");
  });

  it("returns 200 with empty array when user has no keys", async () => {
    const listChain = makeListChain([]);
    supabaseAuthMock.from.mockReturnValueOnce({ select: listChain.selectFn });

    const req = makeGet();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  // ── Auth failure ──────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(supabaseAuthMock.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = makeGet();
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── DB error ──────────────────────────────────────────────────────────────

  it("returns 500 when DB query fails", async () => {
    const listChain = makeListChain(null, { message: "DB error" });
    supabaseAuthMock.from.mockReturnValueOnce({ select: listChain.selectFn });

    const req = makeGet();
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
