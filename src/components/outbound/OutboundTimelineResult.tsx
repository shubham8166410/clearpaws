"use client";

import type { OutboundTimelineResponse, OutboundStepResponse } from "@/lib/outbound-schema";
import { Button } from "@/components/ui/Button";

// ── Date formatting ──────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function daysFromToday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Urgency badge from days ──────────────────────────────────────────────────
function UrgencyLabel({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-wide">
        Overdue
      </span>
    );
  }
  if (days <= 14) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 uppercase tracking-wide">
        Urgent — {days}d
      </span>
    );
  }
  if (days <= 60) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 uppercase tracking-wide">
        {days} days
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide">
      {days} days
    </span>
  );
}

// ── Section icon ─────────────────────────────────────────────────────────────
function PlaneIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function UnverifiedIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  );
}

// ── Step card ────────────────────────────────────────────────────────────────
function StepCard({ step, index }: { step: OutboundStepResponse; index: number }) {
  const days = daysFromToday(step.calculatedDate);

  return (
    <div
      className={[
        "bg-white border rounded-2xl p-5 flex flex-col gap-3 shadow-sm",
        step.alreadyComplete ? "border-green-200 bg-green-50/40" : "border-card-border",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 leading-tight">{step.title}</h3>
            {step.alreadyComplete && (
              <span className="text-[10px] text-green-700 font-medium">Verify existing compliance</span>
            )}
          </div>
        </div>
        <UrgencyLabel days={days} />
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">{step.description}</p>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-gray-500">
          📅 {formatDate(step.calculatedDate)}
        </span>

        {step.estimatedCostAUD !== null && step.estimatedCostAUD > 0 && (
          <span className="text-gray-500">
            💰 ~${step.estimatedCostAUD.toLocaleString("en-AU")} AUD
          </span>
        )}

        {step.isVerified ? (
          <span className="flex items-center gap-1 text-green-700">
            <VerifiedIcon />
            Verified source
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600">
            <UnverifiedIcon />
            Verify with authority
          </span>
        )}

        <a
          href={step.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 hover:text-brand-700 underline ml-auto"
        >
          Official source →
        </a>
      </div>
    </div>
  );
}

// ── Cost summary ─────────────────────────────────────────────────────────────
function CostSummary({ steps }: { steps: OutboundStepResponse[] }) {
  const total = steps.reduce((sum, s) => sum + (s.estimatedCostAUD ?? 0), 0);
  if (total === 0) return null;

  return (
    <div className="bg-white border border-card-border rounded-2xl p-5 flex flex-col gap-3">
      <h3 className="font-bold text-gray-900">Estimated cost breakdown</h3>
      <div className="flex flex-col gap-2">
        {steps
          .filter((s) => (s.estimatedCostAUD ?? 0) > 0)
          .map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{s.title}</span>
              <span className="font-medium text-gray-900 tabular-nums">
                ~${s.estimatedCostAUD?.toLocaleString("en-AU")} AUD
              </span>
            </div>
          ))}
      </div>
      <div className="border-t border-card-border pt-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900">Estimated total (AU export)</span>
        <span className="text-xl font-bold text-brand-600 tabular-nums">
          ~${total.toLocaleString("en-AU")} AUD
        </span>
      </div>
      <p className="text-xs text-gray-400">
        AU export costs only. Destination country fees, flights, and carrier costs are additional.
        All estimates — verify current fees with DAFF and your veterinarian.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface OutboundTimelineResultProps {
  result: OutboundTimelineResponse;
  onReset: () => void;
}

export function OutboundTimelineResult({ result, onReset }: OutboundTimelineResultProps) {
  const auSteps = result.steps.filter((s) => s.section === "au-export");
  const destSteps = result.steps.filter((s) => s.section === "destination");

  const totalSteps = result.steps.length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Summary card ─────────────────────────────────────────────────────── */}
      <div className="bg-brand-800 text-white rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-xs text-brand-300 font-semibold uppercase tracking-wider mb-1">
              Outbound timeline
            </p>
            <h2 className="text-xl font-bold leading-tight">
              {result.petType === "dog" ? "🐕" : "🐈"}{" "}
              {result.petType} → {result.destinationName}
            </h2>
            <p className="text-sm text-brand-200 mt-1">
              Departing {formatDate(result.departureDate)}
            </p>
          </div>
          <div className="flex flex-col gap-1 sm:text-right">
            <span className="text-2xl font-extrabold">{totalSteps}</span>
            <span className="text-xs text-brand-300">steps to complete</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="bg-brand-700/50 rounded-xl px-3 py-2">
            <div className="font-semibold text-white">{auSteps.length} steps</div>
            <div className="text-brand-300">Australian export</div>
          </div>
          <div className="bg-brand-700/50 rounded-xl px-3 py-2">
            <div className="font-semibold text-white">{destSteps.length > 0 ? `${destSteps.length} steps` : "General guidance"}</div>
            <div className="text-brand-300">At destination</div>
          </div>
          <div className="bg-brand-700/50 rounded-xl px-3 py-2 col-span-2 sm:col-span-1">
            <div className="font-semibold text-white">
              {result.tier === 1 ? "Detailed rules" : "Authority guidance"}
            </div>
            <div className="text-brand-300">Rule coverage</div>
          </div>
        </div>

        {result.hasLongLeadTimeWarning && (
          <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-2 text-xs text-amber-200">
            ⚠ {result.destinationName} requires significant lead time (6+ months). Start preparation now.
          </div>
        )}
      </div>

      {/* ── Long lead time notice ─────────────────────────────────────────────── */}
      {result.tier !== 1 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">General guidance for {result.destinationName}</p>
          <p className="text-xs">
            We have full Australian export requirements below. For destination-specific rules,
            please verify with the official animal import authority in {result.destinationName} before travelling.
          </p>
        </div>
      )}

      {/* ── Before leaving Australia ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
            <PlaneIcon />
          </div>
          <h2 className="text-base font-bold text-gray-900">Before leaving Australia</h2>
          <span className="text-xs text-gray-400 font-medium ml-auto">{auSteps.length} steps</span>
        </div>
        <div className="flex flex-col gap-3">
          {auSteps.map((step, i) => (
            <StepCard key={step.id} step={step} index={i} />
          ))}
        </div>
      </section>

      {/* ── At destination ────────────────────────────────────────────────────── */}
      {destSteps.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center">
              <PinIcon />
            </div>
            <h2 className="text-base font-bold text-gray-900">
              Arriving in {result.destinationName}
            </h2>
            <span className="text-xs text-gray-400 font-medium ml-auto">{destSteps.length} steps</span>
          </div>
          <div className="flex flex-col gap-3">
            {destSteps.map((step, i) => (
              <StepCard key={step.id} step={step} index={auSteps.length + i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Cost summary ─────────────────────────────────────────────────────── */}
      <CostSummary steps={result.steps} />

      {/* ── Disclaimer ───────────────────────────────────────────────────────── */}
      <div className="bg-gray-50 border border-card-border rounded-2xl p-4 text-xs text-gray-500 leading-relaxed">
        <p className="font-semibold text-gray-700 mb-1">Important notice</p>
        <p>{result.disclaimer}</p>
        <p className="mt-2">
          Rules last verified: {result.lastVerified}.{" "}
          <a
            href="https://www.agriculture.gov.au/biosecurity-trade/export/controlled-goods/live-animals/companion-and-other-live-animals"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-brand-600"
          >
            Verify at DAFF
          </a>
        </p>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="secondary" onClick={onReset} className="flex-1">
          ← Plan another trip
        </Button>
        <Button
          onClick={() => window.print()}
          className="flex-1"
        >
          🖨 Print timeline
        </Button>
      </div>
    </div>
  );
}
