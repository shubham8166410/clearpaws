/**
 * Tests for Issue 4 — sort, filter and search controls on the dashboard.
 *
 * All sorting/filtering is client-side — no new API calls.
 * Controls: sort dropdown, direction pills, status pills, search input.
 * Empty-filtered state shows "No timelines match" — NOT the cat animation.
 * Sort preference persisted to localStorage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("lottie-react", () => ({
  default: () => <div data-testid="lottie-animation" />,
}));

vi.mock("@/assets/animations/cat-love.json", () => ({ default: {} }));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// localStorage stub
const localStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => localStore[k] ?? null,
  setItem: (k: string, v: string) => { localStore[k] = v; },
  removeItem: (k: string) => { delete localStore[k]; },
};

import { DashboardTimelines } from "@/components/dashboard/DashboardTimelines";
import type { TimelineRow } from "@/types/database";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTimeline(overrides: Partial<TimelineRow> & { id: string }): TimelineRow {
  return {
    user_id: "user-1",
    pet_id: null,
    direction: "inbound",
    origin_country: "United States",
    destination_country: null,
    travel_date: "2027-06-01",
    pet_type: "dog",
    pet_breed: "Labrador",
    daff_group: 3,
    generated_steps: {
      steps: [{ stepNumber: 1 }, { stepNumber: 2 }],
      warnings: [],
      totalEstimatedCostAUD: 0,
      quarantineDays: 10,
      earliestTravelDate: "2027-06-01",
      summary: "",
    } as unknown as TimelineRow["generated_steps"],
    created_at: new Date("2025-01-01").toISOString(),
    ...overrides,
  };
}

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
  );
}

beforeEach(() => {
  Object.keys(localStore).forEach((k) => delete localStore[k]);
  vi.stubGlobal("localStorage", localStorageMock);
  stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Timeline fixtures ─────────────────────────────────────────────────────────

const usTimeline = makeTimeline({
  id: "t1",
  origin_country: "United States",
  pet_type: "dog",
  pet_breed: "Labrador",
  travel_date: "2027-06-01",
  created_at: new Date("2025-03-01").toISOString(),
  direction: "inbound",
});

const ukTimeline = makeTimeline({
  id: "t2",
  origin_country: "United Kingdom",
  pet_type: "cat",
  pet_breed: "Persian",
  travel_date: "2027-01-15",
  created_at: new Date("2025-01-01").toISOString(),
  direction: "inbound",
  daff_group: 2,
});

const outboundTimeline = makeTimeline({
  id: "t3",
  origin_country: null,
  destination_country: "Germany",
  pet_type: "dog",
  pet_breed: "Poodle",
  travel_date: "2027-09-01",
  created_at: new Date("2025-02-01").toISOString(),
  direction: "outbound",
  daff_group: null,
  generated_steps: {
    direction: "outbound",
    destinationName: "Germany",
    steps: [{ stepNumber: 1 }],
    warnings: [],
    summary: "",
  } as unknown as TimelineRow["generated_steps"],
});

const allTimelines = [usTimeline, ukTimeline, outboundTimeline];

// ── Sort tests ────────────────────────────────────────────────────────────────

describe("Sort controls", () => {
  it("renders a sort dropdown", () => {
    render(<DashboardTimelines initialTimelines={allTimelines} />);
    expect(screen.getByRole("combobox", { name: /sort/i })).toBeInTheDocument();
  });

  it("defaults to newest first", () => {
    render(<DashboardTimelines initialTimelines={[ukTimeline, usTimeline]} />);
    const cards = screen.getAllByRole("link").filter(l => (l as HTMLAnchorElement).href?.includes("/timelines/"));
    // usTimeline (Mar 2025) should appear before ukTimeline (Jan 2025)
    expect((cards[0] as HTMLAnchorElement).href).toContain("t1");
    expect((cards[1] as HTMLAnchorElement).href).toContain("t2");
  });

  it("sorting oldest first reverses the order", () => {
    render(<DashboardTimelines initialTimelines={[usTimeline, ukTimeline]} />);
    fireEvent.change(screen.getByRole("combobox", { name: /sort/i }), {
      target: { value: "oldest" },
    });
    const cards = screen.getAllByRole("link").filter(l => (l as HTMLAnchorElement).href?.includes("/timelines/"));
    expect((cards[0] as HTMLAnchorElement).href).toContain("t2");
    expect((cards[1] as HTMLAnchorElement).href).toContain("t1");
  });

  it("sort by travel soonest puts earliest travel date first", () => {
    render(<DashboardTimelines initialTimelines={[usTimeline, ukTimeline]} />);
    fireEvent.change(screen.getByRole("combobox", { name: /sort/i }), {
      target: { value: "travel_soonest" },
    });
    const cards = screen.getAllByRole("link").filter(l => (l as HTMLAnchorElement).href?.includes("/timelines/"));
    // ukTimeline travels Jan 2027 (sooner than Jun 2027)
    expect((cards[0] as HTMLAnchorElement).href).toContain("t2");
    expect((cards[1] as HTMLAnchorElement).href).toContain("t1");
  });

  it("persists sort preference to localStorage", () => {
    render(<DashboardTimelines initialTimelines={allTimelines} />);
    fireEvent.change(screen.getByRole("combobox", { name: /sort/i }), {
      target: { value: "oldest" },
    });
    expect(localStorageMock.getItem("petborder_dashboard_sort")).toBe("oldest");
  });

  it("restores sort preference from localStorage on mount", () => {
    localStorageMock.setItem("petborder_dashboard_sort", "oldest");
    render(<DashboardTimelines initialTimelines={[usTimeline, ukTimeline]} />);
    expect(
      (screen.getByRole("combobox", { name: /sort/i }) as HTMLSelectElement).value
    ).toBe("oldest");
  });
});

// ── Direction filter tests ────────────────────────────────────────────────────

describe("Direction filter", () => {
  it("renders direction filter buttons", () => {
    render(<DashboardTimelines initialTimelines={allTimelines} />);
    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /to australia/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /from australia/i })).toBeInTheDocument();
  });

  it("filtering 'To Australia' shows only inbound timelines", () => {
    render(<DashboardTimelines initialTimelines={allTimelines} />);
    fireEvent.click(screen.getByRole("button", { name: /to australia/i }));
    const links = screen.getAllByRole("link").filter(l => (l as HTMLAnchorElement).href?.includes("/timelines/"));
    expect(links).toHaveLength(2);
    expect(screen.queryByText("Poodle")).not.toBeInTheDocument();
  });

  it("filtering 'From Australia' shows only outbound timelines", () => {
    render(<DashboardTimelines initialTimelines={allTimelines} />);
    fireEvent.click(screen.getByRole("button", { name: /from australia/i }));
    const links = screen.getAllByRole("link").filter(l => (l as HTMLAnchorElement).href?.includes("/timelines/"));
    expect(links).toHaveLength(1);
    expect((links[0] as HTMLAnchorElement).href).toContain("t3");
  });

  it("'All' button resets direction filter", () => {
    render(<DashboardTimelines initialTimelines={allTimelines} />);
    fireEvent.click(screen.getByRole("button", { name: /from australia/i }));
    fireEvent.click(screen.getByRole("button", { name: /all/i }));
    const links = screen.getAllByRole("link").filter(l => (l as HTMLAnchorElement).href?.includes("/timelines/"));
    expect(links).toHaveLength(3);
  });
});

// ── Search tests ──────────────────────────────────────────────────────────────

describe("Search", () => {
  it("renders a search input", () => {
    render(<DashboardTimelines initialTimelines={allTimelines} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("search by country name filters results", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<DashboardTimelines initialTimelines={allTimelines} />);

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "united kingdom" },
    });
    // Advance debounce timer
    await act(async () => { vi.advanceTimersByTime(350); });

    const links = screen.getAllByRole("link").filter(l => (l as HTMLAnchorElement).href?.includes("/timelines/"));
    expect(links).toHaveLength(1);
    expect((links[0] as HTMLAnchorElement).href).toContain("t2");
    vi.useRealTimers();
  }, 15_000);

  it("search is case-insensitive", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<DashboardTimelines initialTimelines={allTimelines} />);

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "LABRADOR" },
    });
    await act(async () => { vi.advanceTimersByTime(350); });

    const links = screen.getAllByRole("link").filter(l => (l as HTMLAnchorElement).href?.includes("/timelines/"));
    expect(links).toHaveLength(1);
    expect((links[0] as HTMLAnchorElement).href).toContain("t1");
    vi.useRealTimers();
  }, 15_000);

  it("search by pet type works", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<DashboardTimelines initialTimelines={allTimelines} />);

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "cat" },
    });
    await act(async () => { vi.advanceTimersByTime(350); });

    const links = screen.getAllByRole("link").filter(l => (l as HTMLAnchorElement).href?.includes("/timelines/"));
    expect(links).toHaveLength(1);
    expect((links[0] as HTMLAnchorElement).href).toContain("t2");
    vi.useRealTimers();
  }, 15_000);
});

// ── Empty filtered state ──────────────────────────────────────────────────────

describe("Empty filtered state", () => {
  it("shows 'no match' message when filters yield zero from non-empty list", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<DashboardTimelines initialTimelines={allTimelines} />);

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "zzznomatch999" },
    });
    await act(async () => { vi.advanceTimersByTime(350); });

    expect(screen.getByText(/no timelines match/i)).toBeInTheDocument();
    vi.useRealTimers();
  }, 15_000);

  it("does NOT show cat animation when filters are active with zero results", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<DashboardTimelines initialTimelines={allTimelines} />);

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "zzznomatch999" },
    });
    await act(async () => { vi.advanceTimersByTime(350); });

    expect(screen.queryByTestId("lottie-animation")).not.toBeInTheDocument();
    vi.useRealTimers();
  }, 15_000);

  it("shows a 'clear filters' button when filters yield zero results", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<DashboardTimelines initialTimelines={allTimelines} />);

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "zzznomatch999" },
    });
    await act(async () => { vi.advanceTimersByTime(350); });

    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
    vi.useRealTimers();
  }, 15_000);

  it("clear filters button resets search and shows all timelines", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<DashboardTimelines initialTimelines={allTimelines} />);

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "zzznomatch999" },
    });
    await act(async () => { vi.advanceTimersByTime(350); });

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    await act(async () => { vi.advanceTimersByTime(350); });

    const links = screen.getAllByRole("link").filter(l => (l as HTMLAnchorElement).href?.includes("/timelines/"));
    expect(links).toHaveLength(3);
    vi.useRealTimers();
  }, 15_000);

  it("cat animation IS shown when there are genuinely zero timelines", () => {
    render(<DashboardTimelines initialTimelines={[]} />);
    expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
  });
});
