/**
 * Shimmer skeleton card that matches the shape of a timeline step card.
 * Used to indicate loading state while the AI generates the timeline.
 */
export function SkeletonStep() {
  return (
    <div
      className="bg-white border border-card-border rounded-2xl p-5 overflow-hidden relative"
      aria-hidden="true"
    >
      {/* Shimmer overlay — suppressed via animate-shimmer class under prefers-reduced-motion */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />

      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Step number circle + title */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="h-4 bg-gray-200 rounded-full w-40" />
        </div>
        {/* Urgency badge */}
        <div className="h-4 bg-gray-200 rounded-full w-16 flex-shrink-0" />
      </div>

      {/* Description lines */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="h-3 bg-gray-200 rounded-full w-full" />
        <div className="h-3 bg-gray-200 rounded-full w-4/5" />
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4">
        <div className="h-3 bg-gray-200 rounded-full w-24" />
        <div className="h-3 bg-gray-200 rounded-full w-20" />
        <div className="h-3 bg-gray-200 rounded-full w-28 ml-auto" />
      </div>
    </div>
  );
}

interface SkeletonTimelineProps {
  count?: number;
  label?: string;
}

/**
 * A set of skeleton step cards shown while the timeline is generating.
 */
export function SkeletonTimeline({ count = 5, label = "Generating your compliance timeline…" }: SkeletonTimelineProps) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col gap-3">
      {/* sr-only text is the live region content — more reliable than aria-label alone */}
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStep key={i} />
      ))}
    </div>
  );
}
