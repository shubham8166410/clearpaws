/**
 * Tests for Issue 1 — empty state cat animation appears immediately
 * after the last timeline is deleted (no page refresh required).
 *
 * Root cause was: `undoVisible = true` for 5s after delete, and the
 * empty-state condition was `timelines.length === 0 && !undoVisible`,
 * so the cat animation was hidden for the entire 5-second undo window.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("lottie-react", () => ({
  default: () => <div data-testid="lottie-animation" />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/assets/animations/cat-love.json", () => ({ default: {} }));

import { DashboardTimelines } from "@/components/dashboard/DashboardTimelines";
import type { TimelineRow } from "@/types/database";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTimeline(id: string): TimelineRow {
  return {
    id,
    user_id: "user-1",
    pet_id: null,
    direction: "inbound",
    origin_country: "United States",
    destination_country: null,
    travel_date: "2027-01-01",
    pet_type: "dog",
    pet_breed: "Labrador",
    daff_group: 3,
    generated_steps: {
      steps: [],
      warnings: [],
      totalEstimatedCostAUD: 0,
      quarantineDays: 10,
      earliestTravelDate: "2027-01-01",
      summary: "",
    } as unknown as TimelineRow["generated_steps"],
    created_at: new Date().toISOString(),
  };
}

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DashboardTimelines — empty state", () => {
  it("shows cat animation when initial timelines array is empty", () => {
    stubFetch();
    render(<DashboardTimelines initialTimelines={[]} />);
    expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
  });

  it("shows timeline card when timelines exist", () => {
    stubFetch();
    render(<DashboardTimelines initialTimelines={[makeTimeline("t1")]} />);
    expect(screen.queryByTestId("lottie-animation")).not.toBeInTheDocument();
    expect(screen.getByText("dog — Labrador")).toBeInTheDocument();
  });

  it("cat animation appears immediately after last timeline is deleted — no refresh needed", async () => {
    stubFetch();
    render(<DashboardTimelines initialTimelines={[makeTimeline("t1")]} />);

    expect(screen.queryByTestId("lottie-animation")).not.toBeInTheDocument();

    // Open delete confirm dialog
    fireEvent.click(screen.getByRole("button", { name: /delete timeline/i }));
    // Confirm deletion
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    });

    // Cat animation must appear immediately — without a page refresh
    expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
  });

  it("undo toast is visible at the same time as the cat animation", async () => {
    stubFetch();
    render(<DashboardTimelines initialTimelines={[makeTimeline("t1")]} />);

    fireEvent.click(screen.getByRole("button", { name: /delete timeline/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    });

    expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
    expect(screen.getByText("Timeline deleted")).toBeInTheDocument();
  });

  it("cat animation remains after undo toast times out (5 seconds)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubFetch();
    render(<DashboardTimelines initialTimelines={[makeTimeline("t1")]} />);

    fireEvent.click(screen.getByRole("button", { name: /delete timeline/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    });

    // Verify cat + toast both visible
    expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();

    // Advance past the 5-second undo window
    await act(async () => { vi.advanceTimersByTime(6000); });

    // Cat animation still there even after toast dismissed
    expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
  }, 15_000);
});
