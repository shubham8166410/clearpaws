export interface DaffPageSnapshot {
  pageUrl: string;
  contentHash: string;
  rawContent: string;
  scrapedAt: string;
  changesDetected: boolean;
}

export interface MonitorResult {
  pagesChecked: number;
  changesDetected: number;
  snapshots: DaffPageSnapshot[];
  errors: string[];
}

/** All DAFF pages monitored for rule changes — inbound and outbound. */
export const DAFF_MONITORED_PAGES = [
  // ── Inbound (importing pets to Australia) ──────────────────────────────────
  'https://www.agriculture.gov.au/biosecurity-trade/cats-dogs',
  'https://www.agriculture.gov.au/biosecurity-trade/cats-dogs/how-to-import',
  'https://www.agriculture.gov.au/biosecurity-trade/cats-dogs/how-to-import/permit',
  'https://www.agriculture.gov.au/biosecurity-trade/cats-dogs/post-entry-quarantine',
  // ── Outbound (exporting pets from Australia) ───────────────────────────────
  'https://www.agriculture.gov.au/biosecurity-trade/export/controlled-goods/live-animals/companion-and-other-live-animals',
  'https://www.agriculture.gov.au/biosecurity-trade/export/controlled-goods/live-animals/companion-and-other-live-animals/lodging-notice-of-intention',
  'https://www.agriculture.gov.au/biosecurity-trade/export/controlled-goods/live-animals/companion-and-other-live-animals/export-permit',
] as const;

/**
 * Hash a string with SHA-256 using the Web Crypto API (Node.js compatible).
 * Returns a 64-character lowercase hex string.
 */
export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Strip HTML boilerplate from a page and return cleaned main content text.
 * Removes: <nav>, <header>, <footer>, <script>, <style> tags and their content.
 */
export function stripBoilerplate(html: string): string {
  // Remove block-level boilerplate tags and all their content
  const boilerplateTags = ['nav', 'header', 'footer', 'script', 'style'];
  let cleaned = html;

  for (const tag of boilerplateTags) {
    // Use a regex that handles multiline content and nested attributes
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    cleaned = cleaned.replace(regex, ' ');
  }

  // Strip all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Collapse excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Fetch a DAFF page and return cleaned text content.
 * Returns null if the fetch fails or the response is not OK.
 * Errors are swallowed — callers handle null gracefully.
 */
export async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'PetBorder-DAFF-Monitor/1.0' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    return stripBoilerplate(html);
  } catch {
    return null;
  }
}
