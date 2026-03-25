/**
 * Pending timeline — sessionStorage helpers.
 *
 * When an unauthenticated user generates a timeline and clicks
 * "Sign in to save", we serialise the full input + output to
 * sessionStorage before the auth redirect so it can be restored
 * and saved to the database after login completes.
 *
 * Security notes:
 * - sessionStorage only: cleared automatically when the browser tab closes.
 * - 30-minute expiry: stale DAFF data should not be auto-saved.
 * - Actual timeline data is never placed in URL parameters.
 * - Only a boolean flag (`restorePending=true`) travels through the URL.
 */

import type { TimelineInput, TimelineOutput } from "@/types/timeline";

export interface PendingTimelinePayload {
  input: TimelineInput;
  output: TimelineOutput;
}

interface StoredEntry {
  payload: PendingTimelinePayload;
  savedAt: string;
  expiresAt: string;
}

const STORAGE_KEY = "petborder_pending_timeline";
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export function savePendingTimeline(payload: PendingTimelinePayload): void {
  try {
    const now = new Date();
    const entry: StoredEntry = {
      payload,
      savedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage may be unavailable (private browsing restrictions, quota exceeded)
    // Non-fatal — user will just need to regenerate after login
  }
}

export function getPendingTimeline(): PendingTimelinePayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const entry: StoredEntry = JSON.parse(raw);

    if (new Date() > new Date(entry.expiresAt)) {
      clearPendingTimeline();
      return null;
    }

    return entry.payload;
  } catch {
    return null;
  }
}

export function clearPendingTimeline(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
