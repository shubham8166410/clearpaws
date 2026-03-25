"use client";

import { useState } from "react";
import type { UserRole } from "@/types/subscription";

interface UpgradePromptProps {
  /** The minimum role required to access this feature. */
  requiredRole: UserRole;
  /** Short description of what the user gets by upgrading. */
  featureDescription?: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  free: "Free",
  paid_once: "PDF Pack",
  subscriber: "Subscriber",
  admin: "Admin",
};

const PLAN_PRICE: Record<UserRole, string> = {
  free: "",
  paid_once: "$15 AUD one-time",
  subscriber: "$9.90/mo AUD",
  admin: "",
};

const UPGRADE_TITLES: Partial<Record<UserRole, string>> = {
  paid_once: "Unlock your DAFF document pack",
  subscriber: "Get everything — subscribe for $9.90/mo",
};

const UPGRADE_BUTTONS: Partial<Record<UserRole, string>> = {
  paid_once: "Get my document pack — $15 AUD",
  subscriber: "Subscribe — $9.90/mo AUD",
};

export function UpgradePrompt({ requiredRole, featureDescription }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: requiredRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to start checkout");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      // Only follow Stripe checkout URLs — guard against open-redirect
      if (!url.startsWith("https://checkout.stripe.com/")) {
        setError("Unexpected redirect URL. Please contact support.");
        return;
      }
      window.location.href = url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const label = ROLE_LABELS[requiredRole];
  const price = PLAN_PRICE[requiredRole];
  const title = UPGRADE_TITLES[requiredRole] ?? `${label} plan required`;
  const buttonLabel = UPGRADE_BUTTONS[requiredRole] ?? `Upgrade to ${label}`;

  return (
    <div className="rounded-xl border border-[#E5E3DF] bg-white p-6 shadow-sm text-center max-w-md mx-auto">
      <div className="text-4xl mb-3" aria-hidden>🔒</div>
      <h3 className="text-lg font-semibold text-[#1B4F72] mb-1">
        {title}
      </h3>
      {featureDescription && (
        <p className="text-sm text-gray-600 mb-4">{featureDescription}</p>
      )}
      {price && (
        <p className="text-sm font-medium text-[#E67E22] mb-4">{price}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 mb-3" role="alert">{error}</p>
      )}
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="w-full rounded-lg bg-[#1B4F72] px-4 py-2 text-sm font-semibold text-white hover:bg-[#154060] disabled:opacity-60 transition-colors"
      >
        {loading ? "Redirecting…" : buttonLabel}
      </button>
    </div>
  );
}
