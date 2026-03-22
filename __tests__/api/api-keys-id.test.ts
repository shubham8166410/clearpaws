// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

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

import { PATCH, DELETE } from "@/app/api/api-keys/[id]/route";

// ── Shared fixtures ────────────────────────────────────────────────────────

const mockUser = { id: "user-123", email: "test@example.com" };
const KEY_ID = "key-uuid-abc";

const mockApiKeyRow = {
  id: KEY_ID,
  user_id: "user-123",
  agency_id: null,
  key_prefix: "aaaa1111",
  key_hash: "$2a$10$hashedvalue",
  name: "My Key",
  last_used_at: null,
  request_count: 0,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

function makeParams(id: string) {
  return Promise.resolve({ id });
}

function makePatch(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/api-keys/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDelete(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/api-keys/${id}`, {
    method: "DELETE",
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("PATCH /api/api-keys/[id]", () => {
  beforeEach(() => {
    vi.mocked(supabaseAuthMock.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    vi.clearAllMocks();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("returns 200 with updated key when toggling is_active", async () => {
    // First call: fetch the key (ownership check)
    const fetchSingleMock = vi.fn().mockResolvedValue({
      data: mockApiKeyRow,
      error: null,
    });
    const fetchEqUserMock = vi.fn().mockReturnValue({ single: fetchSingleMock });
    const fetchEqIdMock = vi.fn().mockReturnValue({ eq: fetchEqUserMock });
    const fetchSelectMock = vi.fn().mockReturnValue({ eq: fetchEqIdMock });

    // Second call: update the key
    const updatedKey = { ...mockApiKeyRow, is_active: false };
    const updateSingleMock = vi.fn().mockResolvedValue({ data: updatedKey, error: null });
    const updateSelectMock = vi.fn().mockReturnValue({ single: updateSingleMock });
    const updateEqUserMock = vi.fn().mockReturnValue({ select: updateSelectMock });
    const updateEqIdMock = vi.fn().mockReturnValue({ eq: updateEqUserMock });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqIdMock });

    supabaseAuthMock.from
      .mockReturnValueOnce({ select: fetchSelectMock })
      .mockReturnValueOnce({ update: updateMock });

    const req = makePatch(KEY_ID, {});
    const res = await PATCH(req, { params: makeParams(KEY_ID) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("id");
    expect(body.data).toHaveProperty("is_active");
    // Should NOT return key_hash
    expect(body.data).not.toHaveProperty("key_hash");
  });

  // ── Auth failure ──────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(supabaseAuthMock.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = makePatch(KEY_ID, {});
    const res = await PATCH(req, { params: makeParams(KEY_ID) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── Ownership check (404 for wrong user) ──────────────────────────────────

  it("returns 404 when key does not belong to current user", async () => {
    const fetchSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const fetchEqUserMock = vi.fn().mockReturnValue({ single: fetchSingleMock });
    const fetchEqIdMock = vi.fn().mockReturnValue({ eq: fetchEqUserMock });
    const fetchSelectMock = vi.fn().mockReturnValue({ eq: fetchEqIdMock });
    supabaseAuthMock.from.mockReturnValue({ select: fetchSelectMock });

    const req = makePatch(KEY_ID, {});
    const res = await PATCH(req, { params: makeParams(KEY_ID) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 404 when key id does not exist", async () => {
    const fetchSingleMock = vi.fn().mockResolvedValue({ data: null, error: { message: "no rows" } });
    const fetchEqUserMock = vi.fn().mockReturnValue({ single: fetchSingleMock });
    const fetchEqIdMock = vi.fn().mockReturnValue({ eq: fetchEqUserMock });
    const fetchSelectMock = vi.fn().mockReturnValue({ eq: fetchEqIdMock });
    supabaseAuthMock.from.mockReturnValue({ select: fetchSelectMock });

    const req = makePatch("non-existent-id", {});
    const res = await PATCH(req, { params: makeParams("non-existent-id") });

    expect(res.status).toBe(404);
  });

  // ── DB error ──────────────────────────────────────────────────────────────

  it("returns 500 when update DB call fails", async () => {
    // Ownership check succeeds
    const fetchSingleMock = vi.fn().mockResolvedValue({ data: mockApiKeyRow, error: null });
    const fetchEqUserMock = vi.fn().mockReturnValue({ single: fetchSingleMock });
    const fetchEqIdMock = vi.fn().mockReturnValue({ eq: fetchEqUserMock });
    const fetchSelectMock = vi.fn().mockReturnValue({ eq: fetchEqIdMock });

    // Update fails
    const updateSingleMock = vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } });
    const updateSelectMock = vi.fn().mockReturnValue({ single: updateSingleMock });
    const updateEqUserMock = vi.fn().mockReturnValue({ select: updateSelectMock });
    const updateEqIdMock = vi.fn().mockReturnValue({ eq: updateEqUserMock });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqIdMock });

    supabaseAuthMock.from
      .mockReturnValueOnce({ select: fetchSelectMock })
      .mockReturnValueOnce({ update: updateMock });

    const req = makePatch(KEY_ID, {});
    const res = await PATCH(req, { params: makeParams(KEY_ID) });

    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/api-keys/[id]", () => {
  beforeEach(() => {
    vi.mocked(supabaseAuthMock.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    vi.clearAllMocks();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("returns 204 on successful deletion", async () => {
    // Ownership check
    const fetchSingleMock = vi.fn().mockResolvedValue({ data: mockApiKeyRow, error: null });
    const fetchEqUserMock = vi.fn().mockReturnValue({ single: fetchSingleMock });
    const fetchEqIdMock = vi.fn().mockReturnValue({ eq: fetchEqUserMock });
    const fetchSelectMock = vi.fn().mockReturnValue({ eq: fetchEqIdMock });

    // Delete
    const deleteEqUserMock = vi.fn().mockResolvedValue({ error: null });
    const deleteEqIdMock = vi.fn().mockReturnValue({ eq: deleteEqUserMock });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqIdMock });

    supabaseAuthMock.from
      .mockReturnValueOnce({ select: fetchSelectMock })
      .mockReturnValueOnce({ delete: deleteMock });

    const req = makeDelete(KEY_ID);
    const res = await DELETE(req, { params: makeParams(KEY_ID) });

    expect(res.status).toBe(204);
  });

  // ── Auth failure ──────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(supabaseAuthMock.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = makeDelete(KEY_ID);
    const res = await DELETE(req, { params: makeParams(KEY_ID) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── Ownership check ───────────────────────────────────────────────────────

  it("returns 404 when key does not belong to current user", async () => {
    const fetchSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const fetchEqUserMock = vi.fn().mockReturnValue({ single: fetchSingleMock });
    const fetchEqIdMock = vi.fn().mockReturnValue({ eq: fetchEqUserMock });
    const fetchSelectMock = vi.fn().mockReturnValue({ eq: fetchEqIdMock });
    supabaseAuthMock.from.mockReturnValue({ select: fetchSelectMock });

    const req = makeDelete(KEY_ID);
    const res = await DELETE(req, { params: makeParams(KEY_ID) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 404 for non-existent key id", async () => {
    const fetchSingleMock = vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const fetchEqUserMock = vi.fn().mockReturnValue({ single: fetchSingleMock });
    const fetchEqIdMock = vi.fn().mockReturnValue({ eq: fetchEqUserMock });
    const fetchSelectMock = vi.fn().mockReturnValue({ eq: fetchEqIdMock });
    supabaseAuthMock.from.mockReturnValue({ select: fetchSelectMock });

    const req = makeDelete("non-existent");
    const res = await DELETE(req, { params: makeParams("non-existent") });

    expect(res.status).toBe(404);
  });

  // ── DB error ──────────────────────────────────────────────────────────────

  it("returns 500 when DB delete fails", async () => {
    // Ownership check succeeds
    const fetchSingleMock = vi.fn().mockResolvedValue({ data: mockApiKeyRow, error: null });
    const fetchEqUserMock = vi.fn().mockReturnValue({ single: fetchSingleMock });
    const fetchEqIdMock = vi.fn().mockReturnValue({ eq: fetchEqUserMock });
    const fetchSelectMock = vi.fn().mockReturnValue({ eq: fetchEqIdMock });

    // Delete fails
    const deleteEqUserMock = vi.fn().mockResolvedValue({ error: { message: "DB error" } });
    const deleteEqIdMock = vi.fn().mockReturnValue({ eq: deleteEqUserMock });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqIdMock });

    supabaseAuthMock.from
      .mockReturnValueOnce({ select: fetchSelectMock })
      .mockReturnValueOnce({ delete: deleteMock });

    const req = makeDelete(KEY_ID);
    const res = await DELETE(req, { params: makeParams(KEY_ID) });

    expect(res.status).toBe(500);
  });
});
