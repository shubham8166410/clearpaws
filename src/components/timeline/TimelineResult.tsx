"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { TimelineOutput } from "@/types/timeline";
import type { AgencyRow } from "@/types/database";
import type { QuarantineAvailability } from "@/lib/mickleham";
import { TimelineStep } from "./TimelineStep";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DAFF_RULES } from "@/lib/daff-rules";

interface TimelineResultProps {
  result: TimelineOutput;
  savedTimelineId: string | null;
  onReset: () => void;
}

const groupInfo: Record<number, { label: string; badge: string; badgeClass: string }> = {
  1: { label: "New Zealand / Norfolk Island", badge: "Group 1 — Simplest",    badgeClass: "bg-green-100 text-green-800" },
  2: { label: "Rabies-free countries",        badge: "Group 2 — Moderate",    badgeClass: "bg-amber-100 text-amber-800" },
  3: { label: "All other countries",          badge: "Group 3 — Most complex", badgeClass: "bg-red-100 text-red-800" },
};

function formatCost(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "AUD", minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
  });
}


function handleAgencyQuoteClick(agency: AgencyRow) {
  const encodedName = encodeURIComponent(agency.name);
  void fetch(`/api/agencies/${encodedName}/click`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourcePage: "/generate" }),
  }).catch(() => {});
  // Validate scheme before navigating — guard against javascript: URLs in DB
  if (agency.url && (agency.url.startsWith("https://") || agency.url.startsWith("http://"))) {
    window.open(agency.url, "_blank", "noopener,noreferrer");
  }
}

function AgencyReferralSection() {
  const [topAgencies, setTopAgencies] = useState<AgencyRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/agencies")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((body: { data: AgencyRow[] }) => {
        if (!cancelled) setTopAgencies(body.data.slice(0, 3));
      })
      .catch(() => {
        // Don't show section if fetch fails — non-blocking
      });
    return () => { cancelled = true; };
  }, []);

  if (topAgencies.length === 0) return null;

  return (
    <div className="bg-white border border-card-border rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 text-base">Want someone to handle all of this?</h3>
        <p className="text-sm text-gray-500 mt-1">
          Get a free quote from Australia's leading pet transport agencies.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {topAgencies.map((agency) => (
          <div
            key={agency.id}
            className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-card-border"
          >
            <div>
              <div className="font-semibold text-sm text-gray-900">{agency.name}</div>
              {agency.tagline && (
                <div className="text-xs text-gray-500 mt-0.5">{agency.tagline}</div>
              )}
              {agency.price_range && (
                <div className="text-xs text-gray-400 mt-0.5">{agency.price_range}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleAgencyQuoteClick(agency)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-accent-500 hover:bg-accent-600 active:bg-accent-600 px-3 py-1.5 rounded-lg transition-colors min-h-[36px] cursor-pointer"
              aria-label={`Get a free quote from ${agency.name}`}
            >
              Get Quote
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <Link
        href="/dashboard/agencies"
        className="mt-3 block text-center text-xs text-brand-600 hover:underline"
      >
        Compare all agencies &rarr;
      </Link>
    </div>
  );
}

function useMicklehamStatus() {
  const [status, setStatus] = useState<QuarantineAvailability | null>(null);
  useEffect(() => {
    fetch("/api/mickleham-status")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: QuarantineAvailability) => setStatus(data))
      .catch(() => {}); // non-blocking, UI degrades gracefully
  }, []);
  return status;
}

const micklehamBadge: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: "bg-green-50 border-green-200", text: "text-green-800", label: "Spaces available" },
  limited:   { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", label: "Limited availability" },
  closed:    { bg: "bg-red-50 border-red-200",     text: "text-red-800",   label: "Currently closed" },
  unknown:   { bg: "bg-gray-50 border-gray-200",   text: "text-gray-600",  label: "Status unknown" },
};

function MicklehamStatusBanner({ status }: { status: QuarantineAvailability }) {
  const cfg = micklehamBadge[status.status] ?? micklehamBadge.unknown;
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${cfg.bg}`}>
      <div className="flex items-center justify-between gap-3">
        <div className={`font-semibold ${cfg.text}`}>
          Mickleham Quarantine — {cfg.label}
        </div>
        <a
          href={status.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs underline ${cfg.text}`}
        >
          Check bookings ↗
        </a>
      </div>
      {status.notice && (
        <p className={`mt-1 text-xs ${cfg.text}`}>{status.notice}</p>
      )}
    </div>
  );
}

function handlePrint() {
  window.print();
}

function handleEmailSelf(result: TimelineOutput) {
  const subject = encodeURIComponent("My PetBorder DAFF Compliance Timeline");
  const steps = result.steps
    .map((s) => `${s.stepNumber}. ${s.title} — Due: ${s.dueDate}`)
    .join("\n");
  const body = encodeURIComponent(
    `Your DAFF Compliance Timeline\n\n${result.summary}\n\nEarliest travel date: ${result.earliestTravelDate}\nEstimated cost: A$${result.totalEstimatedCostAUD}\n\nSteps:\n${steps}\n\nGenerated by PetBorder — petborder.com\n(Always verify requirements with DAFF before travelling.)`
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

export function TimelineResult({ result, savedTimelineId, onReset }: TimelineResultProps) {
  const group = groupInfo[result.originGroup];
  const criticalWarnings = result.warnings.filter((w) => w.severity === "critical");
  const otherWarnings = result.warnings.filter((w) => w.severity !== "critical");
  const micklehamStatus = useMicklehamStatus();

  // Check if travel date is very soon (< 60 days)
  const isUrgent = result.steps.some((s) => s.daysFromNow < 0) ||
    result.warnings.some((w) => w.severity === "critical");

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto animate-fade-up">
      {/* Urgent banner */}
      {isUrgent && (
        <div className="bg-red-600 text-white rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="font-semibold">Some deadlines may already be overdue</p>
            <p className="text-sm text-red-100 mt-0.5">Review all steps carefully. Some actions may need to start immediately.</p>
          </div>
        </div>
      )}

      {/* Summary card */}
      <div className="bg-brand-600 text-white rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-lg font-bold leading-snug">Your DAFF Compliance Timeline</h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${group.badgeClass}`}>
            {group.badge}
          </span>
        </div>
        <p className="text-sm text-brand-100 mb-4">{result.summary}</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Origin group", value: group.label },
            { label: "Quarantine", value: `${result.quarantineDays} days at Mickleham` },
            { label: "Earliest travel date", value: formatDate(result.earliestTravelDate) },
            { label: "Estimated total", value: `${formatCost(result.totalEstimatedCostAUD)} AUD` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-brand-100 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mickleham live status */}
      {micklehamStatus && <MicklehamStatusBanner status={micklehamStatus} />}

      {/* Critical warnings */}
      {criticalWarnings.map((w) => (
        <Alert key={w.message} severity="critical">{w.message}</Alert>
      ))}

      {/* Steps section */}
      <section aria-label="DAFF compliance steps">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">
            {result.steps.length} compliance steps
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />Urgent</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />Book soon</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />Upcoming</span>
          </div>
        </div>
        <div>
          {result.steps.map((step, i) => (
            <TimelineStep
              key={step.stepNumber}
              step={step}
              isLast={i === result.steps.length - 1}
            />
          ))}
        </div>
      </section>

      {/* Data freshness bar */}
      <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
        <p>✓ Timeline based on DAFF rules verified <strong>{new Date(DAFF_RULES.lastVerified + "T00:00:00").toLocaleDateString("en-AU", { month: "long", year: "numeric" })}</strong></p>
        <p className="mt-1">
          Always confirm requirements at{" "}
          <a
            href="https://www.agriculture.gov.au/biosecurity-trade/cats-dogs"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-700"
          >
            agriculture.gov.au
          </a>{" "}
          before travel.
        </p>
      </div>

      {/* Other warnings */}
      {otherWarnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {otherWarnings.map((w) => (
            <Alert key={w.message} severity={w.severity}>{w.message}</Alert>
          ))}
        </div>
      )}

      {/* Cost breakdown box */}
      <div className="bg-white border border-card-border rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 mb-3">Estimated cost breakdown</h3>
        <div className="flex flex-col gap-2">
          {result.steps
            .filter((s) => s.estimatedCost)
            .map((s) => (
              <div key={s.stepNumber} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{s.estimatedCost!.description}</span>
                <span className="font-medium text-gray-900 tabular-nums">
                  {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0 }).format(s.estimatedCost!.amountAUD)}
                </span>
              </div>
            ))}
        </div>
        <div className="border-t border-card-border mt-3 pt-3 flex items-center justify-between">
          <span className="font-semibold text-gray-900">Total estimate</span>
          <span className="text-xl font-bold text-brand-600 tabular-nums">
            {formatCost(result.totalEstimatedCostAUD)}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Estimates only. Actual costs vary by provider, airline, and pet size.
        </p>
      </div>

      {/* Share / save actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleEmailSelf(result)}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-100 px-4 py-2.5 rounded-xl transition-colors min-h-[44px]"
          aria-label="Email this timeline to yourself"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
          Email to myself
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-100 px-4 py-2.5 rounded-xl transition-colors min-h-[44px]"
          aria-label="Print this timeline"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
          </svg>
          Print
        </button>
        {savedTimelineId ? (
          <Link
            href={`/dashboard/timelines/${savedTimelineId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-100 px-4 py-2.5 rounded-xl transition-colors min-h-[44px]"
            aria-label="Get the full document pack PDF"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download PDF — $15 AUD
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-100 px-4 py-2.5 rounded-xl transition-colors min-h-[44px]"
            aria-label="Sign in to save this timeline and get the PDF"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Sign in to get PDF
          </Link>
        )}
      </div>

      {/* Referral CTA — live agency data from /api/agencies */}
      <AgencyReferralSection />

      {/* Reset */}
      <Button variant="secondary" onClick={onReset} className="self-start">
        ← Generate another timeline
      </Button>
    </div>
  );
}
