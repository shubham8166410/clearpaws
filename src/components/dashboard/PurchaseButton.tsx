"use client";

import { useState } from "react";

interface PurchaseButtonProps {
  timelineId: string;
  hasPurchase: boolean;
}

export function PurchaseButton({ timelineId, hasPurchase }: PurchaseButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ timelineId }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Could not start checkout. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = body.url;
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  }

  if (hasPurchase) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-green-900">Document pack purchased</p>
          <p className="text-sm text-green-700 mt-0.5">Your full PDF checklist and document templates are ready.</p>
        </div>
        <a
          href={`/api/pdf/${timelineId}`}
          className="flex-shrink-0 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors min-h-[44px]"
          aria-label="Download document pack PDF"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download PDF
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white border border-card-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900">Full document pack — $15 AUD</h2>
          <p className="text-sm text-gray-500 mt-1">
            Get a professionally formatted PDF checklist, vet certificate templates, and
            step-by-step DAFF document guide tailored to your timeline.
          </p>
          {error && (
            <p className="text-sm text-red-600 mt-2" role="alert">{error}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className="flex-shrink-0 inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors min-h-[44px] disabled:opacity-50"
        >
          {loading ? "Redirecting…" : "Buy document pack →"}
        </button>
      </div>
    </div>
  );
}
