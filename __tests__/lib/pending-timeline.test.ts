/**
 * Tests for Issue 2 — pending timeline sessionStorage helpers.
 *
 * savePendingTimeline / getPendingTimeline / clearPendingTimeline must:
 * - Store data in sessionStorage only (never localStorage)
 * - Return null when storage is empty
 * - Return null when the stored entry has expired (>30 min old)
 * - Clear storage after clearPendingTimeline is called
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── sessionStorage stub (happy-dom has it, but we want explicit control) ──────

const store: Record<string, string> = {};
const sessionStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.stubGlobal("sessionStorage", sessionStorageMock);
  // Ensure localStorage is NOT called
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => { throw new Error("localStorage must not be used"); }),
    setItem: vi.fn(() => { throw new Error("localStorage must not be used"); }),
    removeItem: vi.fn(() => { throw new Error("localStorage must not be used"); }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

import {
  savePendingTimeline,
  getPendingTimeline,
  clearPendingTimeline,
} from "@/lib/pending-timeline";
import type { PendingTimelinePayload } from "@/lib/pending-timeline";

function makePayload(): PendingTimelinePayload {
  return {
    input: {
      petType: "dog",
      petBreed: "Labrador",
      originCountry: "US",
      travelDate: "2027-06-01",
    },
    output: {
      steps: [],
      warnings: [],
      totalEstimatedCostAUD: 5000,
      originGroup: 3,
      quarantineDays: 10,
      earliestTravelDate: "2027-06-01",
      summary: "Test summary",
    },
  };
}

describe("savePendingTimeline", () => {
  it("stores data in sessionStorage", () => {
    savePendingTimeline(makePayload());
    expect(sessionStorageMock.getItem("petborder_pending_timeline")).not.toBeNull();
  });

  it("stored data includes savedAt and expiresAt fields", () => {
    savePendingTimeline(makePayload());
    const raw = sessionStorageMock.getItem("petborder_pending_timeline")!;
    const parsed = JSON.parse(raw);
    expect(parsed.savedAt).toBeDefined();
    expect(parsed.expiresAt).toBeDefined();
  });

  it("expiresAt is 30 minutes after savedAt", () => {
    savePendingTimeline(makePayload());
    const raw = sessionStorageMock.getItem("petborder_pending_timeline")!;
    const { savedAt, expiresAt } = JSON.parse(raw);
    const diff = new Date(expiresAt).getTime() - new Date(savedAt).getTime();
    expect(diff).toBe(30 * 60 * 1000);
  });

  it("does NOT write to localStorage", () => {
    // If localStorage is called, the stub throws — so no assertion needed,
    // the test will fail automatically if localStorage is touched.
    expect(() => savePendingTimeline(makePayload())).not.toThrow();
  });
});

describe("getPendingTimeline", () => {
  it("returns null when sessionStorage is empty", () => {
    expect(getPendingTimeline()).toBeNull();
  });

  it("returns the payload after saving", () => {
    const payload = makePayload();
    savePendingTimeline(payload);
    const result = getPendingTimeline();
    expect(result).not.toBeNull();
    expect(result!.input.petType).toBe("dog");
    expect(result!.input.originCountry).toBe("US");
    expect(result!.output.originGroup).toBe(3);
  });

  it("returns null when the stored entry has expired (>30 min old)", () => {
    savePendingTimeline(makePayload());

    // Wind back expiresAt to the past
    const raw = sessionStorageMock.getItem("petborder_pending_timeline")!;
    const data = JSON.parse(raw);
    data.expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second in the past
    sessionStorageMock.setItem("petborder_pending_timeline", JSON.stringify(data));

    expect(getPendingTimeline()).toBeNull();
  });

  it("clears expired entries from sessionStorage automatically", () => {
    savePendingTimeline(makePayload());

    const raw = sessionStorageMock.getItem("petborder_pending_timeline")!;
    const data = JSON.parse(raw);
    data.expiresAt = new Date(Date.now() - 1000).toISOString();
    sessionStorageMock.setItem("petborder_pending_timeline", JSON.stringify(data));

    getPendingTimeline(); // triggers auto-clear
    expect(sessionStorageMock.getItem("petborder_pending_timeline")).toBeNull();
  });

  it("returns null on malformed JSON without throwing", () => {
    sessionStorageMock.setItem("petborder_pending_timeline", "not-valid-json{{{");
    expect(() => getPendingTimeline()).not.toThrow();
    expect(getPendingTimeline()).toBeNull();
  });
});

describe("clearPendingTimeline", () => {
  it("removes the entry from sessionStorage", () => {
    savePendingTimeline(makePayload());
    clearPendingTimeline();
    expect(sessionStorageMock.getItem("petborder_pending_timeline")).toBeNull();
  });

  it("does not throw when storage is already empty", () => {
    expect(() => clearPendingTimeline()).not.toThrow();
  });
});
