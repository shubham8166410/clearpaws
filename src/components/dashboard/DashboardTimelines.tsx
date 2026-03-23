"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Lottie from "lottie-react";
import catAnimation from "@/assets/animations/cat-love.json";
import type { TimelineRow, SavedOutboundSteps } from "@/types/database";

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

interface DashboardTimelinesProps {
  initialTimelines: TimelineRow[];
}

export function DashboardTimelines({ initialTimelines }: DashboardTimelinesProps) {
  const [timelines, setTimelines] = useState<TimelineRow[]>(initialTimelines);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoTimeline, setUndoTimeline] = useState<TimelineRow | null>(null);

  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  if (timelines.length === 0 && !undoVisible) {
    return (
      <>
        <EmptyState />
        <UndoToast visible={false} onUndo={handleUndo} />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {timelines.map((t) => (
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
      <UndoToast visible={undoVisible} onUndo={handleUndo} />
    </>
  );
}
