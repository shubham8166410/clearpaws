import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiKeyRow } from "@/types/database";

// ── Module mocks — declared before imports that depend on them ────────────────

vi.mock("@/lib/api-keys", () => ({
  lookupApiKey: vi.fn(),
  KEY_EXACT_LENGTH: 36,
}));

vi.mock("@/lib/api-rate-limit", () => ({
  checkApiKeyRateLimit: vi.fn(),
  API_KEY_RATE_LIMIT_MAX: 100,
}));

import { authenticateApiKey } from "@/lib/api-middleware";
import { lookupApiKey } from "@/lib/api-keys";
import { checkApiKeyRateLimit } from "@/lib/api-rate-limit";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(authHeader?: string): NextRequest {
  return new NextRequest("https://api.petborder.com/api/v1/timeline", {
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

function makeServiceClient(): SupabaseClient {
  const insertMock = vi.fn().mockReturnValue({
    then: vi.fn().mockReturnValue({ catch: vi.fn() }),
  });
  const fromMock = vi.fn().mockReturnValue({ insert: insertMock });
  // .rpc() is used for the atomic increment (fire-and-forget)
  const rpcMock = vi.fn().mockReturnValue({
    then: vi.fn().mockReturnValue({ catch: vi.fn() }),
  });
  return { from: fromMock, rpc: rpcMock } as unknown as SupabaseClient;
}

function makeApiKeyRow(overrides: Partial<ApiKeyRow> = {}): ApiKeyRow {
  return {
    id: "key-id-1",
    user_id: "user-1",
    agency_id: null,
    key_prefix: "abcd1234",
    key_hash: "$2b$10$placeholder",
    name: "Test Key",
    last_used_at: null,
    request_count: 42,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("authenticateApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("401 — missing or malformed Authorization header", () => {
    it("returns 401 NextResponse when Authorization header is missing", async () => {
      const req = makeRequest();
      const client = makeServiceClient();

      const result = await authenticateApiKey(req, client);

      expect(result).toBeInstanceOf(NextResponse);
      const res = result as NextResponse;
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body).toMatchObject({ success: false, status: 401 });
      expect(typeof body.error).toBe("string");
    });

    it("returns 401 when Authorization header is present but not Bearer format", async () => {
      const req = makeRequest("Basic sometoken");
      const client = makeServiceClient();

      const result = await authenticateApiKey(req, client);

      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);
    });

    it("returns 401 when Bearer token does not start with cpk_", async () => {
      const req = makeRequest("Bearer invalidtoken_abc123");
      const client = makeServiceClient();

      const result = await authenticateApiKey(req, client);

      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);
    });

    it("returns 401 when Bearer token is just cpk_ with nothing after", async () => {
      const req = makeRequest("Bearer cpk_");
      const client = makeServiceClient();

      const result = await authenticateApiKey(req, client);

      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);
    });
  });

  describe("401 — key not found in database", () => {
    it("returns 401 when lookupApiKey returns null", async () => {
      vi.mocked(lookupApiKey).mockResolvedValue(null);

      const req = makeRequest("Bearer cpk_abcdef1234567890abcdef1234567890");
      const client = makeServiceClient();

      const result = await authenticateApiKey(req, client);

      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);

      const body = await (result as NextResponse).json();
      expect(body).toMatchObject({ success: false, status: 401 });
    });
  });

  describe("429 — rate limit exceeded", () => {
    it("returns 429 with Retry-After header when rate limit exceeded", async () => {
      const apiKey = makeApiKeyRow();
      vi.mocked(lookupApiKey).mockResolvedValue(apiKey);

      const futureTimestamp = Date.now() + 3600 * 1000;
      vi.mocked(checkApiKeyRateLimit).mockReturnValue({
        success: false,
        remaining: 0,
        resetAt: futureTimestamp,
      });

      const req = makeRequest("Bearer cpk_abcdef1234567890abcdef1234567890");
      const client = makeServiceClient();

      const result = await authenticateApiKey(req, client);

      expect(result).toBeInstanceOf(NextResponse);
      const res = result as NextResponse;
      expect(res.status).toBe(429);

      const body = await res.json();
      expect(body).toMatchObject({ success: false, status: 429 });

      // Must include Retry-After header
      expect(res.headers.get("Retry-After")).not.toBeNull();
    });

    it("Retry-After header value is a positive integer (seconds until reset)", async () => {
      const apiKey = makeApiKeyRow();
      vi.mocked(lookupApiKey).mockResolvedValue(apiKey);

      const futureTimestamp = Date.now() + 1800 * 1000; // 30 minutes
      vi.mocked(checkApiKeyRateLimit).mockReturnValue({
        success: false,
        remaining: 0,
        resetAt: futureTimestamp,
      });

      const req = makeRequest("Bearer cpk_abcdef1234567890abcdef1234567890");
      const client = makeServiceClient();

      const result = await authenticateApiKey(req, client);
      const res = result as NextResponse;

      const retryAfter = Number(res.headers.get("Retry-After"));
      expect(Number.isInteger(retryAfter)).toBe(true);
      expect(retryAfter).toBeGreaterThan(0);
    });
  });

  describe("success — valid key under rate limit", () => {
    it("returns { apiKey, rateLimitHeaders } object (not a NextResponse) for a valid key", async () => {
      const apiKey = makeApiKeyRow();
      vi.mocked(lookupApiKey).mockResolvedValue(apiKey);
      vi.mocked(checkApiKeyRateLimit).mockReturnValue({
        success: true,
        remaining: 98,
        resetAt: Date.now() + 3600 * 1000,
      });

      const req = makeRequest("Bearer cpk_abcdef1234567890abcdef1234567890");
      const client = makeServiceClient();

      const result = await authenticateApiKey(req, client);

      expect(result).not.toBeInstanceOf(NextResponse);
      expect(result).toHaveProperty("apiKey");
      expect(result).toHaveProperty("rateLimitHeaders");
      expect((result as { apiKey: ApiKeyRow }).apiKey).toEqual(apiKey);
    });

    it("includes X-RateLimit-* headers in the success result", async () => {
      const apiKey = makeApiKeyRow();
      vi.mocked(lookupApiKey).mockResolvedValue(apiKey);
      vi.mocked(checkApiKeyRateLimit).mockReturnValue({
        success: true,
        remaining: 75,
        resetAt: Date.now() + 3600 * 1000,
      });

      const req = makeRequest("Bearer cpk_abcdef1234567890abcdef1234567890");
      const client = makeServiceClient();

      const result = await authenticateApiKey(req, client);
      const headers = (result as { rateLimitHeaders: Record<string, string> }).rateLimitHeaders;

      expect(headers["X-RateLimit-Limit"]).toBe("100");
      expect(headers["X-RateLimit-Remaining"]).toBe("75");
      expect(headers["X-RateLimit-Reset"]).toBeDefined();
    });
  });

  describe("fire-and-forget side effects", () => {
    it("calls rpc('increment_api_key_usage') for atomic counter on success", async () => {
      const apiKey = makeApiKeyRow();
      vi.mocked(lookupApiKey).mockResolvedValue(apiKey);
      vi.mocked(checkApiKeyRateLimit).mockReturnValue({
        success: true,
        remaining: 98,
        resetAt: Date.now() + 3600 * 1000,
      });

      const req = makeRequest("Bearer cpk_abcdef1234567890abcdef1234567890");
      const client = makeServiceClient();
      const rpcSpy = vi.spyOn(client, "rpc");

      await authenticateApiKey(req, client);

      expect(rpcSpy).toHaveBeenCalledWith("increment_api_key_usage", { key_id: apiKey.id });
    });

    it("calls from('api_usage') for usage insert on success (fire-and-forget)", async () => {
      const apiKey = makeApiKeyRow();
      vi.mocked(lookupApiKey).mockResolvedValue(apiKey);
      vi.mocked(checkApiKeyRateLimit).mockReturnValue({
        success: true,
        remaining: 98,
        resetAt: Date.now() + 3600 * 1000,
      });

      const req = makeRequest("Bearer cpk_abcdef1234567890abcdef1234567890");
      const client = makeServiceClient();
      const fromSpy = vi.spyOn(client, "from");

      await authenticateApiKey(req, client);

      expect(fromSpy).toHaveBeenCalledWith("api_usage");
    });

    it("does not call fire-and-forget updates when authentication fails", async () => {
      vi.mocked(lookupApiKey).mockResolvedValue(null);

      const req = makeRequest("Bearer cpk_abcdef1234567890abcdef1234567890");
      const client = makeServiceClient();
      const fromSpy = vi.spyOn(client, "from");
      const rpcSpy = vi.spyOn(client, "rpc");

      await authenticateApiKey(req, client);

      expect(fromSpy).not.toHaveBeenCalledWith("api_usage");
      expect(rpcSpy).not.toHaveBeenCalled();
    });
  });
});
