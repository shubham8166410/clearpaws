// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hashContent,
  stripBoilerplate,
  fetchPageContent,
  DAFF_MONITORED_PAGES,
} from '@/lib/daff-monitor';

describe('hashContent', () => {
  it('returns a 64-char hex string for a given input', async () => {
    const hash = await hashContent('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input yields same hash', async () => {
    const hash1 = await hashContent('hello');
    const hash2 = await hashContent('hello');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', async () => {
    const hash1 = await hashContent('hello');
    const hash2 = await hashContent('world');
    expect(hash1).not.toBe(hash2);
  });
});

describe('stripBoilerplate', () => {
  it('removes <nav> tags and their content', () => {
    const result = stripBoilerplate('<nav>skip this nav content</nav><main>keep this</main>');
    expect(result).not.toContain('skip');
    expect(result).toContain('keep');
  });

  it('removes <script> tags and their content', () => {
    const result = stripBoilerplate('<script>alert(1)</script><p>content here</p>');
    expect(result).not.toContain('alert');
    expect(result).toContain('content here');
  });

  it('returns a non-empty string for a normal page with content', () => {
    const html = `
      <html>
        <head><title>Test</title></head>
        <body>
          <header>Site header</header>
          <nav>Navigation links</nav>
          <main>
            <h1>Import requirements for cats and dogs</h1>
            <p>All cats and dogs must meet DAFF requirements before entry to Australia.</p>
          </main>
          <footer>Footer content</footer>
        </body>
      </html>
    `;
    const result = stripBoilerplate(html);
    expect(result.trim()).not.toBe('');
  });

  it('removes <header> tags and their content', () => {
    const result = stripBoilerplate('<header>header nav stuff</header><p>body text</p>');
    expect(result).not.toContain('header nav stuff');
  });

  it('removes <footer> tags and their content', () => {
    const result = stripBoilerplate('<footer>footer links</footer><article>article content</article>');
    expect(result).not.toContain('footer links');
  });

  it('removes <style> tags and their content', () => {
    const result = stripBoilerplate('<style>.foo { color: red; }</style><p>visible text</p>');
    expect(result).not.toContain('.foo');
    expect(result).not.toContain('color: red');
  });
});

describe('DAFF_MONITORED_PAGES', () => {
  it('has exactly 7 entries (4 inbound + 3 outbound)', () => {
    expect(DAFF_MONITORED_PAGES).toHaveLength(7);
  });

  it('all entries start with https://www.agriculture.gov.au', () => {
    for (const url of DAFF_MONITORED_PAGES) {
      expect(url).toMatch(/^https:\/\/www\.agriculture\.gov\.au/);
    }
  });
});

describe('fetchPageContent', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when fetch throws an error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
    const result = await fetchPageContent('https://example.com');
    expect(result).toBeNull();
  });

  it('returns a string when fetch succeeds', async () => {
    const mockHtml = '<html><body><main>DAFF import requirements for cats</main></body></html>';
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    } as unknown as Response);

    const result = await fetchPageContent('https://www.agriculture.gov.au/biosecurity-trade/cats-dogs');
    expect(typeof result).toBe('string');
    expect(result).not.toBeNull();
  });

  it('returns null when fetch response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found'),
    } as unknown as Response);

    const result = await fetchPageContent('https://www.agriculture.gov.au/nonexistent');
    expect(result).toBeNull();
  });
});
