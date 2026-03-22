import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateApiKey, verifyApiKey, lookupApiKey } from "@/lib/api-keys";
import type { ApiKeyRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── generateApiKey ────────────────────────────────────────────────────────────

describe("generateApiKey", () => {
  it("returns an object with raw, prefix, and hash fields", async () => {
    const result = await generateApiKey();
    expect(result).toHaveProperty("raw");
    expect(result).toHaveProperty("prefix");
    expect(result).toHaveProperty("hash");
  });

  it("raw starts with cpk_ and is exactly 36 chars total", async () => {
    const { raw } = await generateApiKey();
    expect(raw.startsWith("cpk_")).toBe(true);
    expect(raw).toHaveLength(36); // "cpk_" (4) + 32 hex chars
  });

  it("raw key hex portion is exactly 32 hex characters", async () => {
    const { raw } = await generateApiKey();
    const hexPart = raw.slice(4); // everything after "cpk_"
    expect(hexPart).toMatch(/^[0-9a-f]{32}$/);
  });

  it("prefix is first 8 hex chars of the part after cpk_", async () => {
    const { raw, prefix } = await generateApiKey();
    const expectedPrefix = raw.slice(4, 12); // chars 4-11 = first 8 hex chars
    expect(prefix).toBe(expectedPrefix);
    expect(prefix).toHaveLength(8);
  });

  it("hash is a valid bcrypt hash starting with $2", async () => {
    const { hash } = await generateApiKey();
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("each call produces a unique raw key", async () => {
    const keys = await Promise.all([generateApiKey(), generateApiKey(), generateApiKey()]);
    const raws = keys.map((k) => k.raw);
    const unique = new Set(raws);
    expect(unique.size).toBe(3);
  });

  it("each call produces a unique hash (different salts)", async () => {
    const keys = await Promise.all([generateApiKey(), generateApiKey(), generateApiKey()]);
    const hashes = keys.map((k) => k.hash);
    const unique = new Set(hashes);
    expect(unique.size).toBe(3);
  });
});

// ── verifyApiKey ──────────────────────────────────────────────────────────────

describe("verifyApiKey", () => {
  it("returns true when raw key matches its hash", async () => {
    const { raw, hash } = await generateApiKey();
    const result = await verifyApiKey(raw, hash);
    expect(result).toBe(true);
  });

  it("returns false for a wrong raw key against a valid hash", async () => {
    const { hash } = await generateApiKey();
    const { raw: wrongRaw } = await generateApiKey();
    const result = await verifyApiKey(wrongRaw, hash);
    expect(result).toBe(false);
  });

  it("returns false for an empty string raw key", async () => {
    const { hash } = await generateApiKey();
    const result = await verifyApiKey("", hash);
    expect(result).toBe(false);
  });
});

// ── lookupApiKey ──────────────────────────────────────────────────────────────

function makeSupabaseMock(rows: ApiKeyRow[] | null, error: unknown = null) {
  const eqMock = vi.fn().mockResolvedValue({ data: rows, error });
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
  const fromMock = vi.fn().mockReturnValue({ select: selectMock });

  return {
    client: { from: fromMock } as unknown as SupabaseClient,
    fromMock,
    selectMock,
    eqMock,
  };
}

function makeApiKeyRow(overrides: Partial<ApiKeyRow> = {}): ApiKeyRow {
  const base: ApiKeyRow = {
    id: "key-id-1",
    user_id: "user-1",
    agency_id: null,
    key_prefix: "abcd1234",
    key_hash: "$2b$10$placeholder",
    name: "Test Key",
    last_used_at: null,
    request_count: 0,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  };
  return { ...base, ...overrides };
}

describe("lookupApiKey", () => {
  it("returns null when no rows are found for the prefix", async () => {
    const { client } = makeSupabaseMock([]);
    const { raw } = await generateApiKey();
    const result = await lookupApiKey(raw, client);
    expect(result).toBeNull();
  });

  it("returns null when Supabase returns null data", async () => {
    const { client } = makeSupabaseMock(null);
    const { raw } = await generateApiKey();
    const result = await lookupApiKey(raw, client);
    expect(result).toBeNull();
  });

  it("returns null when prefix matches but hash does not verify", async () => {
    const { raw, prefix } = await generateApiKey();
    const { hash: differentHash } = await generateApiKey();

    const row = makeApiKeyRow({ key_prefix: prefix, key_hash: differentHash });
    const { client } = makeSupabaseMock([row]);

    const result = await lookupApiKey(raw, client);
    expect(result).toBeNull();
  });

  it("returns null when key is inactive (is_active: false)", async () => {
    const { raw, prefix, hash } = await generateApiKey();
    const row = makeApiKeyRow({ key_prefix: prefix, key_hash: hash, is_active: false });
    const { client } = makeSupabaseMock([row]);

    const result = await lookupApiKey(raw, client);
    expect(result).toBeNull();
  });

  it("returns the ApiKeyRow when prefix matches, hash verifies, and key is active", async () => {
    const { raw, prefix, hash } = await generateApiKey();
    const row = makeApiKeyRow({ key_prefix: prefix, key_hash: hash, is_active: true });
    const { client } = makeSupabaseMock([row]);

    const result = await lookupApiKey(raw, client);
    expect(result).toEqual(row);
  });

  it("iterates multiple rows with same prefix and returns the matching active one", async () => {
    const { raw, prefix, hash } = await generateApiKey();
    const { hash: otherHash } = await generateApiKey();

    const rows: ApiKeyRow[] = [
      makeApiKeyRow({ id: "key-1", key_prefix: prefix, key_hash: otherHash, is_active: true }),
      makeApiKeyRow({ id: "key-2", key_prefix: prefix, key_hash: hash, is_active: true }),
    ];
    const { client } = makeSupabaseMock(rows);

    const result = await lookupApiKey(raw, client);
    expect(result?.id).toBe("key-2");
  });

  it("queries api_keys table by key_prefix", async () => {
    const { raw, prefix } = await generateApiKey();
    const { fromMock, eqMock } = makeSupabaseMock([]);

    await lookupApiKey(raw, { from: fromMock } as unknown as SupabaseClient);

    expect(fromMock).toHaveBeenCalledWith("api_keys");
    expect(eqMock).toHaveBeenCalledWith("key_prefix", prefix);
  });
});
