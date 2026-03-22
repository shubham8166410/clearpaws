"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { TimelineStep } from "@/types/timeline";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types/api";

interface TimelineStepWithIndex extends TimelineStep {
  index: number;
}

interface ClientTimeline {
  id: string;
  pet_type: string;
  pet_breed: string;
  origin_country: string;
  travel_date: string;
  steps: TimelineStepWithIndex[];
  completedStepIndices: Set<number>;
}

function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Step Row ──────────────────────────────────────────────────────────────────

function StepRow({
  step,
  timelineId,
  isCompleted,
  onComplete,
}: {
  step: TimelineStepWithIndex;
  timelineId: string;
  isCompleted: boolean;
  onComplete: (timelineId: string, stepIndex: number) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    setLoading(true);
    await onComplete(timelineId, step.index);
    setLoading(false);
  }

  return (
    <li
      className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 ${
        isCompleted
          ? "border-green-200 bg-green-50"
          : "border-[#E5E3DF] bg-white"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold uppercase tracking-wide ${
              isCompleted ? "text-green-600" : "text-gray-400"
            }`}
          >
            Step {step.stepNumber}
          </span>
          <span className="text-xs text-gray-400">{step.category}</span>
        </div>
        <p
          className={`mt-0.5 text-sm font-medium ${
            isCompleted ? "text-green-800 line-through" : "text-gray-800"
          }`}
        >
          {step.title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          Due:{" "}
          {new Date(step.dueDate + "T00:00:00").toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      {!isCompleted && (
        <button
          onClick={() => void handleComplete()}
          disabled={loading}
          className="flex-shrink-0 rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving…" : "Mark complete"}
        </button>
      )}

      {isCompleted && (
        <span className="flex-shrink-0 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
          Done
        </span>
      )}
    </li>
  );
}

// ── Client Card ───────────────────────────────────────────────────────────────

function ClientCard({
  timeline,
  onCompleteStep,
}: {
  timeline: ClientTimeline;
  onCompleteStep: (timelineId: string, stepIndex: number) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const completed = timeline.completedStepIndices.size;
  const total = timeline.steps.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5E3DF] bg-white">
      {/* Card header */}
      <button
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-gray-50"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <div>
          <p className="font-semibold capitalize text-gray-900">
            {timeline.pet_type} — {timeline.pet_breed}
          </p>
          <p className="text-sm text-gray-500">
            From {timeline.origin_country} · Travel{" "}
            {new Date(timeline.travel_date + "T00:00:00").toLocaleDateString("en-AU", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {completed}/{total} steps completed
          </p>
        </div>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Steps list */}
      {expanded && (
        <div className="border-t border-[#E5E3DF] px-6 py-4">
          <ul className="space-y-2">
            {timeline.steps.map((step) => (
              <StepRow
                key={step.index}
                step={step}
                timelineId={timeline.id}
                isCompleted={timeline.completedStepIndices.has(step.index)}
                onComplete={onCompleteStep}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VetClientsPage() {
  const [timelines, setTimelines] = useState<ClientTimeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClients() {
      try {
        const supabase = createSupabaseClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Get vet profile
        const { data: vetProfileData } = await supabase
          .from("vet_profiles")
          .select("id")
          .eq("user_id", user.id)
          .not("verified_at", "is", null)
          .maybeSingle();

        if (!vetProfileData) return;

        const vetProfileId = (vetProfileData as { id: string }).id;

        // Get client links
        const { data: linksData } = await supabase
          .from("vet_client_links")
          .select("timeline_id")
          .eq("vet_profile_id", vetProfileId);

        const timelineIds = (linksData ?? []).map(
          (l: { timeline_id: string }) => l.timeline_id
        );
        if (timelineIds.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch timelines and progress in parallel
        const [timelinesResult, progressResult] = await Promise.all([
          supabase
            .from("timelines")
            .select("id, pet_type, pet_breed, origin_country, travel_date, generated_steps")
            .in("id", timelineIds),
          supabase
            .from("timeline_progress")
            .select("timeline_id, step_index")
            .in("timeline_id", timelineIds),
        ]);

        const progressRows = (progressResult.data ?? []) as Array<{
          timeline_id: string;
          step_index: number;
        }>;

        // Group progress by timeline
        const completedMap = new Map<string, Set<number>>();
        for (const row of progressRows) {
          const existing = completedMap.get(row.timeline_id) ?? new Set<number>();
          existing.add(row.step_index);
          completedMap.set(row.timeline_id, existing);
        }

        const result: ClientTimeline[] = (timelinesResult.data ?? []).map(
          (t: {
            id: string;
            pet_type: string;
            pet_breed: string;
            origin_country: string;
            travel_date: string;
            generated_steps: { steps: TimelineStep[] };
          }) => ({
            id: t.id,
            pet_type: t.pet_type,
            pet_breed: t.pet_breed,
            origin_country: t.origin_country,
            travel_date: t.travel_date,
            steps: (t.generated_steps?.steps ?? []).map((s, i) => ({
              ...s,
              index: i,
            })),
            completedStepIndices: completedMap.get(t.id) ?? new Set<number>(),
          })
        );

        result.sort((a, b) => a.travel_date.localeCompare(b.travel_date));
        setTimelines(result);
      } finally {
        setLoading(false);
      }
    }

    void loadClients();
  }, []);

  // Optimistic step completion with rollback on error
  const handleCompleteStep = useCallback(
    async (timelineId: string, stepIndex: number) => {
      // Optimistic update
      setTimelines((prev) =>
        prev.map((t) => {
          if (t.id !== timelineId) return t;
          const updated = new Set(t.completedStepIndices);
          updated.add(stepIndex);
          return { ...t, completedStepIndices: updated };
        })
      );

      try {
        const res = await fetch(
          `/api/vet/timelines/${timelineId}/complete-step`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step_index: stepIndex }),
          }
        );

        const json = (await res.json()) as
          | ApiSuccessResponse<unknown>
          | ApiErrorResponse;

        if (!res.ok || !json.success) {
          // Revert optimistic update
          setTimelines((prev) =>
            prev.map((t) => {
              if (t.id !== timelineId) return t;
              const reverted = new Set(t.completedStepIndices);
              reverted.delete(stepIndex);
              return { ...t, completedStepIndices: reverted };
            })
          );
        }
      } catch {
        // Revert on network error
        setTimelines((prev) =>
          prev.map((t) => {
            if (t.id !== timelineId) return t;
            const reverted = new Set(t.completedStepIndices);
            reverted.delete(stepIndex);
            return { ...t, completedStepIndices: reverted };
          })
        );
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">Loading clients…</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B4F72]">Clients</h1>
        <p className="mt-1 text-sm text-gray-500">
          {timelines.length} linked client{timelines.length !== 1 ? "s" : ""}
        </p>
      </div>

      {timelines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E3DF] py-16 text-center">
          <p className="text-sm text-gray-400">
            No clients are linked to your vet profile yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {timelines.map((t) => (
            <ClientCard
              key={t.id}
              timeline={t}
              onCompleteStep={handleCompleteStep}
            />
          ))}
        </div>
      )}
    </div>
  );
}
