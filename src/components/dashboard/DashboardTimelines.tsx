"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Lottie from "lottie-react";
import catAnimation from "@/assets/animations/cat-love.json";
import type { TimelineRow, SavedOutboundSteps } from "@/types/database";
import { getPendingTimeline, clearPendingTimeline } from "@/lib/pending-timeline";

function isOutbound(timeline: TimelineRow): boolean {
  return timeline.direction === "outbound";
}

function getOutboundSteps(timeline: TimelineRow): SavedOutboundSteps | null {
  const steps = timeline.generated_steps;
  if ("direction" in steps && steps.direction === "outbound") {
    return steps as SavedOutboundSteps;
  }
  return null;
}

// ── Icons ──────────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-4"/>
    </svg>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────

interface UndoToastProps {
  visible: boolean;
  onUndo: () => void;
}

function UndoToast({ visible, onUndo }: UndoToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]",
        "bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-lg",
        "flex items-center gap-3",
        "transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
      ].join(" ")}
    >
      Timeline deleted
      <button
        type="button"
        onClick={onUndo}
        className="flex items-center gap-1.5 text-accent-500 font-semibold hover:text-accent-400 transition-colors min-h-[28px] px-1"
      >
        <UndoIcon />
        Undo
      </button>
    </div>
  );
}

// ── Confirm overlay ────────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDelete({ onConfirm, onCancel }: ConfirmDeleteProps) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/95 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-label="Confirm delete"
    >
      <div className="flex flex-col items-center gap-3 px-4 text-center">
        <p className="text-sm font-semibold text-gray-900">Delete this timeline?</p>
        <p className="text-xs text-gray-500">You can undo within 5 seconds.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors min-h-[36px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors min-h-[36px]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TimelineCard ───────────────────────────────────────────────────────────

interface TimelineCardProps {
  timeline: TimelineRow;
  onDeleteRequest: (id: string) => void;
  confirmingId: string | null;
  onConfirm: (id: string) => void;
  onCancelConfirm: () => void;
}

function TimelineCard({ timeline, onDeleteRequest, confirmingId, onConfirm, onCancelConfirm }: TimelineCardProps) {
  const groupColors: Record<number, string> = {
    1: "bg-green-100 text-green-800",
    2: "bg-amber-100 text-amber-800",
    3: "bg-red-100 text-red-800",
  };

  const outbound = isOutbound(timeline);
  const outboundSteps = outbound ? getOutboundSteps(timeline) : null;
  const stepCount = outbound
    ? (outboundSteps?.steps.length ?? 0)
    : ((timeline.generated_steps as { steps?: unknown[] }).steps?.length ?? 0);
  const isConfirming = confirmingId === timeline.id;

  return (
    <div className="relative animate-fade-up">
      {isConfirming && (
        <ConfirmDelete
          onConfirm={() => onConfirm(timeline.id)}
          onCancel={onCancelConfirm}
        />
      )}
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/timelines/${timeline.id}`}
          className="flex-1 bg-white border border-card-border rounded-2xl p-5 hover:border-brand-200 hover:shadow-sm transition-all group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 capitalize">
                  {timeline.pet_type} — {timeline.pet_breed}
                </span>
                {outbound ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 bg-accent-100 text-accent-800">
                    Outbound
                  </span>
                ) : timeline.daff_group ? (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${groupColors[timeline.daff_group]}`}>
                    Group {timeline.daff_group}
                  </span>
                ) : null}
              </div>
              {outbound ? (
                <p className="text-sm text-gray-500">
                  To <strong>{outboundSteps?.destinationName ?? timeline.destination_country}</strong> · Depart{" "}
                  {new Date(timeline.travel_date + "T00:00:00").toLocaleDateString("en-AU", {
                    month: "long", year: "numeric",
                  })}
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  From <strong>{timeline.origin_country}</strong> · Travel{" "}
                  {new Date(timeline.travel_date + "T00:00:00").toLocaleDateString("en-AU", {
                    month: "long", year: "numeric",
                  })}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {stepCount} steps · Saved{" "}
                {new Date(timeline.created_at).toLocaleDateString("en-AU")}
              </p>
            </div>
            <svg
              className="w-4 h-4 text-gray-400 group-hover:text-brand-600 flex-shrink-0 mt-1 transition-colors"
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* Delete button */}
        <button
          type="button"
          onClick={() => onDeleteRequest(timeline.id)}
          aria-label={`Delete timeline for ${timeline.pet_type} — ${timeline.pet_breed}`}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAutoplay(false);
    }
  }, []);

  return (
    <div className="text-center py-16 border border-dashed border-card-border rounded-2xl flex flex-col items-center">
      <div aria-hidden="true">
        <Lottie
          animationData={catAnimation}
          loop={true}
          autoplay={autoplay}
          style={{ width: 160, height: 160 }}
        />
      </div>
      <h2 className="font-semibold text-gray-900 mb-1">Nothing here yet — let&apos;s change that</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
        Create your first compliance plan in 60 seconds — just 3 questions.
      </p>
      <Link
        href="/generate"
        className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors"
      >
        Build my first plan →
      </Link>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

type SortKey = "newest" | "oldest" | "travel_soonest" | "travel_latest";
type DirectionFilter = "all" | "inbound" | "outbound";
type StatusFilter = "all" | "not_started" | "in_progress" | "complete";

const SORT_STORAGE_KEY = "petborder_dashboard_sort";

function getTotalSteps(t: TimelineRow): number {
  if (isOutbound(t)) return getOutboundSteps(t)?.steps.length ?? 0;
  return ((t.generated_steps as { steps?: unknown[] }).steps?.length ?? 0);
}

interface DashboardTimelinesProps {
  initialTimelines: TimelineRow[];
  progressCounts?: Record<string, number>;
  restorePending?: boolean;
}

export function DashboardTimelines({ initialTimelines, progressCounts = {}, restorePending }: DashboardTimelinesProps) {
  const router = useRouter();
  const [timelines, setTimelines] = useState<TimelineRow[]>(initialTimelines);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoTimeline, setUndoTimeline] = useState<TimelineRow | null>(null);
  const [restoreBanner, setRestoreBanner] = useState<"saving" | "saved" | "error" | null>(null);

  // ── Sort / filter / search state ────────────────────────────────────────
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [filterDirection, setFilterDirection] = useState<DirectionFilter>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Restore sort preference from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SORT_STORAGE_KEY) as SortKey | null;
      if (saved && ["newest", "oldest", "travel_soonest", "travel_latest"].includes(saved)) {
        setSortBy(saved);
      }
    } catch { /* localStorage unavailable */ }
  }, []);

  // Persist sort preference
  const handleSortChange = useCallback((value: SortKey) => {
    setSortBy(value);
    try { localStorage.setItem(SORT_STORAGE_KEY, value); } catch { /* ignore */ }
  }, []);

  // Debounce search input (300 ms)
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilterDirection("all");
    setFilterStatus("all");
    setSearchQuery("");
    setDebouncedSearch("");
  }, []);

  // Computed display list
  const displayedTimelines = useMemo(() => {
    let result = [...timelines];

    // Direction filter
    if (filterDirection !== "all") {
      result = result.filter((t) => t.direction === filterDirection);
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((t) => {
        const total = getTotalSteps(t);
        const completed = progressCounts[t.id] ?? 0;
        const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
        if (filterStatus === "not_started") return pct === 0;
        if (filterStatus === "in_progress") return pct > 0 && pct < 100;
        if (filterStatus === "complete") return pct === 100;
        return true;
      });
    }

    // Search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.origin_country?.toLowerCase().includes(q) ||
          t.destination_country?.toLowerCase().includes(q) ||
          t.pet_type?.toLowerCase().includes(q) ||
          t.pet_breed?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "travel_soonest":
          return new Date(a.travel_date).getTime() - new Date(b.travel_date).getTime();
        case "travel_latest":
          return new Date(b.travel_date).getTime() - new Date(a.travel_date).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [timelines, sortBy, filterDirection, filterStatus, debouncedSearch, progressCounts]);

  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Issue 2 — restore pending timeline after sign-in redirect
  useEffect(() => {
    if (!restorePending) return;

    const pending = getPendingTimeline();
    if (!pending) {
      // No pending data (expired or already cleared) — clean up URL
      router.replace("/dashboard");
      return;
    }

    setRestoreBanner("saving");

    fetch("/api/timelines", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: pending.input, output: pending.output }),
    })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((saved: { id: string } | null) => {
        clearPendingTimeline();
        if (saved?.id) {
          // Prepend the newly saved timeline to state
          const newRow: Partial<TimelineRow> = {
            id: saved.id,
            direction: "inbound",
            origin_country: pending.input.originCountry,
            travel_date: pending.input.travelDate,
            pet_type: pending.input.petType,
            pet_breed: pending.input.petBreed,
            daff_group: pending.output.originGroup,
            generated_steps: {
              steps: pending.output.steps,
              warnings: pending.output.warnings,
              totalEstimatedCostAUD: pending.output.totalEstimatedCostAUD,
              quarantineDays: pending.output.quarantineDays,
              earliestTravelDate: pending.output.earliestTravelDate,
              summary: pending.output.summary,
            } as TimelineRow["generated_steps"],
            created_at: new Date().toISOString(),
          };
          setTimelines((prev) => [newRow as TimelineRow, ...prev]);
          setRestoreBanner("saved");
        } else {
          setRestoreBanner("error");
        }
        router.replace("/dashboard");
      })
      .catch(() => {
        clearPendingTimeline();
        setRestoreBanner("error");
        router.replace("/dashboard");
      });
  }, []); // run once on mount

  const handleDeleteRequest = useCallback((id: string) => {
    setConfirmingId(id);
  }, []);

  const handleCancelConfirm = useCallback(() => {
    setConfirmingId(null);
  }, []);

  const handleConfirmDelete = useCallback(async (id: string) => {
    const target = timelines.find((t) => t.id === id);
    if (!target) return;

    setConfirmingId(null);

    // Remove from UI immediately
    setTimelines((prev) => prev.filter((t) => t.id !== id));
    setUndoTimeline(target);
    setUndoVisible(true);

    // Delete from server immediately — no waiting
    await fetch(`/api/timelines/${id}`, { method: "DELETE" });

    // Clear any previous undo timer
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    // Hide undo toast after 5 seconds
    undoTimerRef.current = setTimeout(() => {
      setUndoVisible(false);
      setUndoTimeline(null);
    }, 5000);
  }, [timelines]);

  const handleUndo = useCallback(async () => {
    if (!undoTimeline) return;

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoVisible(false);

    // Re-insert on server
    const res = await fetch("/api/timelines/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin_country: undoTimeline.origin_country,
        travel_date: undoTimeline.travel_date,
        pet_type: undoTimeline.pet_type,
        pet_breed: undoTimeline.pet_breed,
        daff_group: undoTimeline.daff_group,
        generated_steps: undoTimeline.generated_steps,
      }),
    });

    if (res.ok) {
      const { id: newId } = await res.json() as { id: string };
      // Restore to list with new server-assigned ID
      const restored: TimelineRow = { ...undoTimeline, id: newId };
      setTimelines((prev) =>
        [...prev, restored].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    }

    setUndoTimeline(null);
  }, [undoTimeline]);

  if (timelines.length === 0) {
    return (
      <>
        <EmptyState />
        <UndoToast visible={undoVisible} onUndo={handleUndo} />
      </>
    );
  }

  return (
    <>
      {/* Restore-pending banner */}
      {restoreBanner === "saving" && (
        <div role="status" className="mb-4 flex items-center gap-2 text-sm text-brand-700 bg-brand-50 border border-brand-100 px-4 py-3 rounded-xl">
          <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Saving your timeline…
        </div>
      )}
      {restoreBanner === "saved" && (
        <div role="status" className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 px-4 py-3 rounded-xl">
          ✓ Your timeline has been saved!
        </div>
      )}
      {restoreBanner === "error" && (
        <div role="alert" className="mb-4 text-sm text-red-800 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
          Could not save your timeline. Please generate it again.
        </div>
      )}
      {/* ── Controls bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {/* Sort */}
        <label className="sr-only" htmlFor="timeline-sort">Sort timelines</label>
        <select
          id="timeline-sort"
          aria-label="Sort timelines"
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value as SortKey)}
          className="text-sm border border-card-border rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-600 min-h-[40px]"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="travel_soonest">Travel date — soonest</option>
          <option value="travel_latest">Travel date — latest</option>
        </select>

        {/* Direction pills */}
        {(["all", "inbound", "outbound"] as DirectionFilter[]).map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => setFilterDirection(dir)}
            aria-pressed={filterDirection === dir}
            className={[
              "text-sm font-medium px-3 py-1.5 rounded-full border transition-colors min-h-[36px]",
              filterDirection === dir
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-gray-600 border-card-border hover:border-brand-200",
            ].join(" ")}
          >
            {dir === "all" ? "All" : dir === "inbound" ? "To Australia" : "From Australia"}
          </button>
        ))}

        {/* Status filter */}
        <select
          aria-label="Filter by status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
          className="text-sm border border-card-border rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-600 min-h-[40px]"
        >
          <option value="all">All statuses</option>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="complete">Complete</option>
        </select>

        {/* Search */}
        <input
          type="search"
          aria-label="Search timelines"
          placeholder="Search by country or pet…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[160px] text-sm border border-card-border rounded-xl px-3 py-2 bg-white text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 min-h-[40px]"
        />
      </div>

      {/* Empty filtered state — NOT the cat animation */}
      {displayedTimelines.length === 0 && timelines.length > 0 ? (
        <div className="text-center py-12 border border-dashed border-card-border rounded-2xl">
          <p className="text-gray-500 text-sm mb-3">No timelines match your filters.</p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayedTimelines.map((t) => (
            <TimelineCard
              key={t.id}
              timeline={t}
              onDeleteRequest={handleDeleteRequest}
              confirmingId={confirmingId}
              onConfirm={handleConfirmDelete}
              onCancelConfirm={handleCancelConfirm}
            />
          ))}
        </div>
      )}
      <UndoToast visible={undoVisible} onUndo={handleUndo} />
    </>
  );
}
