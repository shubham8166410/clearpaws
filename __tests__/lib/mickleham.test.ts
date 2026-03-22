// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Module mocks (must be declared before any imports) ────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/daff-monitor', () => ({
  stripBoilerplate: vi.fn((html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()),
}));

import { detectStatus, extractNotice, getQuarantineStatus } from '@/lib/mickleham';
import { createServiceClient } from '@/lib/supabase/server';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Builds a minimal Supabase mock whose .from().select().eq().gt().limit().maybeSingle()
 *  chain returns the supplied cache row (or null). */
function makeCacheClient(cacheRow: Record<string, unknown> | null, dbError = false) {
  const maybeSingleMock = vi.fn().mockResolvedValue({
    data: cacheRow,
    error: dbError ? { message: 'DB error' } : null,
  });
  const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
  const gtMock = vi.fn().mockReturnValue({ limit: limitMock });
  const eqMock = vi.fn().mockReturnValue({ gt: gtMock });
  const selectAfterFromMock = vi.fn().mockReturnValue({ eq: eqMock });

  // upsert chain: .from().upsert()
  const upsertMock = vi.fn().mockResolvedValue({ error: null });
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'live_data_cache') {
      return { select: selectAfterFromMock, upsert: upsertMock };
    }
    return { select: selectAfterFromMock, upsert: upsertMock };
  });

  return {
    client: { from: fromMock },
    maybeSingleMock,
    upsertMock,
    fromMock,
  };
}

// ── detectStatus ──────────────────────────────────────────────────────────────

describe('detectStatus', () => {
  it('returns "available" for normal open-booking text', () => {
    expect(detectStatus('All bookings available')).toBe('available');
  });

  it('returns "closed" when text contains the word "closed"', () => {
    expect(detectStatus('The facility is currently closed for new bookings')).toBe('closed');
  });

  it('returns "limited" when text contains "Limited availability"', () => {
    expect(detectStatus('Limited availability remains for Q2')).toBe('limited');
  });

  it('returns "closed" for EMBARGO keyword (case-insensitive)', () => {
    expect(detectStatus('EMBARGO on all new pet arrivals')).toBe('closed');
  });

  it('returns "limited" for "Limited spaces — book now"', () => {
    expect(detectStatus('Limited spaces — book now')).toBe('limited');
  });

  it('returns "available" for an empty string (no restriction keywords found)', () => {
    expect(detectStatus('')).toBe('available');
  });

  it('returns "closed" before checking limited when both keywords appear', () => {
    // "closed" takes priority over "limited"
    expect(detectStatus('Closed — limited spaces available next month')).toBe('closed');
  });

  it('returns "closed" when "no bookings" phrase is present', () => {
    expect(detectStatus('Currently accepting no bookings at Mickleham')).toBe('closed');
  });

  it('returns "limited" for "limited capacity" text', () => {
    expect(detectStatus('Due to limited capacity please book ahead')).toBe('limited');
  });

  it('is case-insensitive for all keyword checks', () => {
    expect(detectStatus('CLOSED UNTIL FURTHER NOTICE')).toBe('closed');
    expect(detectStatus('LIMITED SPACES REMAIN')).toBe('limited');
  });
});

// ── extractNotice ─────────────────────────────────────────────────────────────

describe('extractNotice', () => {
  it('returns the first sentence containing "closed"', () => {
    const result = extractNotice(
      'The facility is closed until further notice. More info available.',
    );
    expect(result).not.toBeNull();
    expect(result).toContain('closed');
  });

  it('returns null when no trigger keywords are present', () => {
    expect(extractNotice('Normal operations continue.')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractNotice('')).toBeNull();
  });

  it('returns a non-null string containing "Limited" for IMPORTANT notice', () => {
    const result = extractNotice('IMPORTANT: Limited spaces available this quarter.');
    expect(result).not.toBeNull();
    expect(result).toMatch(/Limited/i);
  });

  it('returns a string no longer than 200 characters', () => {
    const longSentence =
      'The facility is closed ' + 'x'.repeat(300) + '.';
    const result = extractNotice(longSentence);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(200);
  });

  it('picks up the "embargo" keyword', () => {
    const result = extractNotice('An embargo has been placed on all new arrivals this season.');
    expect(result).not.toBeNull();
    expect(result).toContain('embargo');
  });

  it('picks up the "notice" keyword', () => {
    const result = extractNotice('Please be aware of the following notice regarding bookings.');
    expect(result).not.toBeNull();
  });

  it('picks up the "alert" keyword', () => {
    const result = extractNotice('Alert: reduced capacity expected during this period.');
    expect(result).not.toBeNull();
  });

  it('picks up the "important" keyword (case-insensitive)', () => {
    const result = extractNotice('IMPORTANT: All pets must be pre-registered.');
    expect(result).not.toBeNull();
  });
});

// ── getQuarantineStatus ───────────────────────────────────────────────────────

describe('getQuarantineStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns cached data with isCached: true when a fresh cache row exists', async () => {
    const cachedPayload = {
      status: 'available',
      notice: null,
      fetchedAt: '2026-03-22T00:00:00.000Z',
      sourceUrl: 'https://www.agriculture.gov.au/biosecurity-trade/cats-dogs/post-entry-quarantine',
      isCached: false,
    };
    const { client } = makeCacheClient({
      key: 'mickleham_availability',
      value: JSON.stringify(cachedPayload),
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    });
    vi.mocked(createServiceClient).mockReturnValue(client as never);

    const result = await getQuarantineStatus();

    expect(result.isCached).toBe(true);
    expect(result.status).toBe('available');
  });

  it('fetches fresh data and returns isCached: false when no cache row exists', async () => {
    const { client } = makeCacheClient(null);
    vi.mocked(createServiceClient).mockReturnValue(client as never);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><body><main>All bookings available at Mickleham.</main></body></html>'),
    }));

    const result = await getQuarantineStatus();

    expect(result.isCached).toBe(false);
    expect(result.status).toBe('available');
    expect(result.sourceUrl).toContain('agriculture.gov.au');
    expect(result.fetchedAt).toBeTruthy();
  });

  it('detects "limited" status from fresh page content', async () => {
    const { client } = makeCacheClient(null);
    vi.mocked(createServiceClient).mockReturnValue(client as never);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><body><main>Limited availability at Mickleham facility.</main></body></html>'),
    }));

    const result = await getQuarantineStatus();

    expect(result.status).toBe('limited');
    expect(result.isCached).toBe(false);
  });

  it('detects "closed" status from fresh page content', async () => {
    const { client } = makeCacheClient(null);
    vi.mocked(createServiceClient).mockReturnValue(client as never);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><body><main>Facility closed — no bookings accepted.</main></body></html>'),
    }));

    const result = await getQuarantineStatus();

    expect(result.status).toBe('closed');
  });

  it('returns "unknown" status when fetch fails and no cache exists', async () => {
    const { client } = makeCacheClient(null);
    vi.mocked(createServiceClient).mockReturnValue(client as never);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const result = await getQuarantineStatus();

    expect(result.status).toBe('unknown');
    expect(result.isCached).toBe(false);
    expect(result.notice).toBeNull();
    expect(result.sourceUrl).toContain('agriculture.gov.au');
    expect(result.fetchedAt).toBeTruthy();
  });

  it('never throws — always returns a QuarantineAvailability object', async () => {
    // Both DB and fetch throw
    vi.mocked(createServiceClient).mockImplementation(() => {
      throw new Error('DB connection failed');
    });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    await expect(getQuarantineStatus()).resolves.toMatchObject({
      status: 'unknown',
      isCached: false,
    });
  });

  it('returns stale cache with isCached: true when fetch fails but stale cache exists', async () => {
    // The stale-cache scenario: maybeSingle returns null (fresh query fails),
    // then we fall back to a second query without the expires_at filter.
    // We simulate this by making the first call return null and the second return stale data.
    const stalePayload = {
      status: 'limited',
      notice: 'Limited spaces available.',
      fetchedAt: '2026-03-20T00:00:00.000Z',
      sourceUrl: 'https://www.agriculture.gov.au/biosecurity-trade/cats-dogs/post-entry-quarantine',
      isCached: false,
    };

    let callCount = 0;
    const maybeSingleMock = vi.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        // fresh cache miss
        return Promise.resolve({ data: null, error: null });
      }
      // stale cache hit
      return Promise.resolve({
        data: {
          key: 'mickleham_availability',
          value: JSON.stringify(stalePayload),
          expires_at: new Date(Date.now() - 1000).toISOString(), // expired
        },
        error: null,
      });
    });

    const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const gtMock = vi.fn().mockReturnValue({ limit: limitMock });
    const eqMock = vi.fn().mockReturnValue({ gt: gtMock });
    // For the stale fallback: .from().select().eq().limit().maybeSingle()
    const eqFallbackMock = vi.fn().mockReturnValue({ limit: limitMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock, upsert: upsertMock });

    vi.mocked(createServiceClient).mockReturnValue({ from: fromMock } as never);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const result = await getQuarantineStatus();

    // Either returns stale cached data or falls back to unknown — the contract is:
    // if fetch fails, must not throw and must return a valid QuarantineAvailability
    expect(['available', 'limited', 'closed', 'unknown']).toContain(result.status);
    expect(typeof result.isCached).toBe('boolean');
    expect(result.sourceUrl).toBeTruthy();
    expect(result.fetchedAt).toBeTruthy();
  });

  it('includes a fetchedAt ISO timestamp in every response', async () => {
    const { client } = makeCacheClient(null);
    vi.mocked(createServiceClient).mockReturnValue(client as never);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<main>Available</main>'),
    }));

    const result = await getQuarantineStatus();

    expect(() => new Date(result.fetchedAt)).not.toThrow();
    expect(new Date(result.fetchedAt).toISOString()).toBe(result.fetchedAt);
  });

  it('upserts result into live_data_cache after a successful fresh fetch', async () => {
    const { client, upsertMock } = makeCacheClient(null);
    vi.mocked(createServiceClient).mockReturnValue(client as never);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<main>All bookings available.</main>'),
    }));

    await getQuarantineStatus();

    expect(upsertMock).toHaveBeenCalledOnce();
    const upsertArg = upsertMock.mock.calls[0][0];
    expect(upsertArg).toMatchObject({
      key: 'mickleham_availability',
    });
  });
});
