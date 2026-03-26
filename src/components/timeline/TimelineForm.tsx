"use client";

import { useReducer, useEffect, useState } from "react";
import type { PetType, TimelineOutput, TimelineInput } from "@/types/timeline";
import type { Country } from "@/types/timeline";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { ComboboxBreed, detectBannedBreed } from "@/components/ui/ComboboxBreed";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import Lottie from "lottie-react";
import dogAnimData from "@/assets/animations/dog icon.json";
import catAnimData from "@/assets/animations/cat.json";

const LottiePawSpinner = dynamic(
  () => import("@/components/icons/LottiePawSpinner").then((m) => ({ default: m.LottiePawSpinner })),
  { ssr: false }
);
import { TimelineResult } from "./TimelineResult";

// ── Flag emoji helper ───────────────────────────────────────────────────────
function getCountryFlag(code: string): string {
  if (code === "HI") return "🇺🇸"; // Hawaii → USA flag
  if (code.length !== 2) return "";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

// ── State ───────────────────────────────────────────────────────────────────
interface FormState {
  currentStep: number;
  petType: PetType | null;
  petBreed: string;
  originCountry: string;
  travelDate: string;
  isSubmitting: boolean;
  error: string | null;
  result: TimelineOutput | null;
  savedTimelineId: string | null;
}

type FormAction =
  | { type: "SET_PET_TYPE"; petType: PetType }
  | { type: "SET_PET_BREED"; breed: string }
  | { type: "SET_COUNTRY"; country: string }
  | { type: "SET_TRAVEL_DATE"; date: string }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; result: TimelineOutput }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "SET_SAVED_ID"; id: string }
  | { type: "RESET" };

const initialState: FormState = {
  currentStep: 1, petType: null, petBreed: "", originCountry: "",
  travelDate: "", isSubmitting: false, error: null, result: null, savedTimelineId: null,
};

function reducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_PET_TYPE":    return { ...state, petType: action.petType, petBreed: "" };
    case "SET_PET_BREED":   return { ...state, petBreed: action.breed };
    case "SET_COUNTRY":     return { ...state, originCountry: action.country };
    case "SET_TRAVEL_DATE": return { ...state, travelDate: action.date };
    case "NEXT_STEP":       return { ...state, currentStep: state.currentStep + 1, error: null };
    case "PREV_STEP":       return { ...state, currentStep: Math.max(1, state.currentStep - 1), error: null };
    case "SUBMIT_START":    return { ...state, isSubmitting: true, error: null };
    case "SUBMIT_SUCCESS":  return { ...state, isSubmitting: false, result: action.result };
    case "SUBMIT_ERROR":    return { ...state, isSubmitting: false, error: action.error };
    case "SET_SAVED_ID":    return { ...state, savedTimelineId: action.id };
    case "RESET":           return initialState;
    default:                return state;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getMaxDateStr(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return d.toISOString().split("T")[0];
}

/** Days between today and a date string (negative = in the past) */
function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Format a date as "12 Jan 2026" */
function formatDate(d: Date): string {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

/** Earliest realistic travel date for Group 3 (180-day RNATT wait + 30-day buffer) */
function getGroup3EarliestDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 210);
  return formatDate(d);
}

interface DateValidation {
  severity: "success" | "warning" | "critical";
  message: string;
}

function validateTravelDate(
  dateStr: string,
  group: number,
  countryName: string,
  petType: PetType | null
): DateValidation | null {
  if (!dateStr) return null;
  const days = daysUntil(dateStr);
  const pet = petType === "cat" ? "cat" : "dog";

  if (group === 1) {
    if (days < 28) {
      return {
        severity: "warning",
        message: `⚠ This is very soon. Contact a pet transport agency immediately to check if this is achievable.`,
      };
    }
    return null;
  }

  if (group === 2) {
    if (days < 90) {
      return {
        severity: "warning",
        message: `⚠ This date may not give you enough time. ${countryName} is a Group 2 country — you need at least 3 months. Your timeline will show what is at risk.`,
      };
    }
    return null;
  }

  // Group 3
  if (days < 180) {
    return {
      severity: "critical",
      message: `🚨 This date is not possible. The mandatory RNATT blood test requires a 180-day wait after the lab receives your ${pet}'s sample. Your earliest realistic travel date from ${countryName} is ${getGroup3EarliestDate()}. Update your date or your timeline will show critical missed deadlines.`,
    };
  }
  if (days < 240) {
    return {
      severity: "warning",
      message: `⚠ This date is tight. You will need to start the RNATT blood test process immediately — this week. Your timeline will show urgent first steps.`,
    };
  }
  return {
    severity: "success",
    message: `✓ Good news — you have enough time to complete all requirements comfortably. Your timeline will show a relaxed schedule.`,
  };
}

const STEP_LABELS = ["Your pet", "Origin", "Travel date"];

// ── Pet Lottie icons ──────────────────────────────────────────────────────────
function PetLottieIcon({ petType, active }: { petType: "dog" | "cat"; active: boolean }) {
  return (
    <div
      className="w-20 h-20 sm:w-24 sm:h-24"
      style={{
        filter: active ? "none" : "grayscale(100%) opacity(0.4)",
        transition: "filter 200ms ease",
      }}
      aria-hidden="true"
    >
      <Lottie
        animationData={petType === "dog" ? dogAnimData : catAnimData}
        loop={active}
        autoplay={active}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
interface TimelineFormProps {
  /** Optional callback fired when a timeline is successfully generated. */
  onResult?: (result: TimelineOutput, savedTimelineId: string | null) => void;
}

export function TimelineForm({ onResult }: TimelineFormProps = {}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countriesError, setCountriesError] = useState(false);

  function fetchCountries() {
    setLoadingCountries(true);
    setCountriesError(false);
    fetch("/api/countries")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((data: Country[]) => { setCountries(data); setLoadingCountries(false); })
      .catch(() => { setLoadingCountries(false); setCountriesError(true); });
  }

  useEffect(() => { fetchCountries(); }, []);

  // ── Pending timeline: persist for unauthenticated users so it survives login ──

  const PENDING_KEY = "petborder_pending_timeline";

  // Store inputs + result in sessionStorage whenever a result exists but isn't saved
  // (user isn't logged in yet). Cleared once we successfully save after login.
  useEffect(() => {
    if (!state.result || state.savedTimelineId) return;
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) return; // logged in — the save call handles it
      if (!state.petType) return;
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({
        input: { petType: state.petType, petBreed: state.petBreed, originCountry: state.originCountry, travelDate: state.travelDate },
        result: state.result,
      }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.result]);

  // On mount: if user just logged in and there's a pending timeline, restore + save it
  useEffect(() => {
    const stored = sessionStorage.getItem(PENDING_KEY);
    if (!stored) return;
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) return; // still not logged in
      try {
        const { input, result } = JSON.parse(stored) as { input: TimelineInput; result: TimelineOutput };
        sessionStorage.removeItem(PENDING_KEY);
        dispatch({ type: "SUBMIT_SUCCESS", result });
        fetch("/api/timelines", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ input, output: result }),
        })
          .then(async (r) => { if (r.ok) return r.json(); return null; })
          .then((saved) => { if (saved?.id) dispatch({ type: "SET_SAVED_ID", id: saved.id }); })
          .catch(() => {});
      } catch {
        sessionStorage.removeItem(PENDING_KEY);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent when a result is available (fires once on initial result, then when savedId is set)
  useEffect(() => {
    if (state.result && onResult) {
      onResult(state.result, state.savedTimelineId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.result, state.savedTimelineId]);

  const countryOptions = countries.map((c) => ({
    value: c.code,
    label: c.name,
    note: c.group === 1 ? "Group 1" : c.group === 2 ? "Group 2" : undefined,
    icon: getCountryFlag(c.code),
  }));

  const isBanned = state.petType
    ? !!detectBannedBreed(state.petType, state.petBreed)
    : false;

  const canGoToStep2 = state.petType !== null &&
    state.petBreed.trim().length > 0 &&
    state.petBreed.trim().length <= 100 &&
    !isBanned;

  const canGoToStep3 = state.originCountry !== "";
  const canSubmit = state.travelDate !== "";

  async function handleSubmit() {
    if (!state.petType) return;
    dispatch({ type: "SUBMIT_START" });

    const payload: TimelineInput = {
      petType: state.petType,
      petBreed: state.petBreed.trim(),
      originCountry: state.originCountry,
      travelDate: state.travelDate,
    };

    try {
      const res = await fetch("/api/generate-timeline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        dispatch({ type: "SUBMIT_ERROR", error: body.error ?? "Something went wrong." });
        return;
      }

      dispatch({ type: "SUBMIT_SUCCESS", result: body });

      // Save to user account if authenticated — capture the saved ID for PDF link
      fetch("/api/timelines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: payload, output: body }),
      })
        .then(async (r) => {
          if (r.ok) return r.json();
          return null;
        })
        .then((saved) => {
          if (saved?.id) dispatch({ type: "SET_SAVED_ID", id: saved.id });
        })
        .catch(() => {
          // Non-critical — timeline still shown even if save fails
        });
    } catch {
      dispatch({ type: "SUBMIT_ERROR", error: "Network error. Please check your connection and try again." });
    }
  }

  // Show result
  if (state.result) {
    return (
      <TimelineResult
        result={state.result}
        savedTimelineId={state.savedTimelineId}
        onReset={() => dispatch({ type: "RESET" })}
      />
    );
  }

  // Show the animated paw spinner with cycling messages while AI generates
  if (state.isSubmitting) {
    return <LottiePawSpinner withMessages size={140} />;
  }

  const selectedCountry = countries.find((c) => c.code === state.originCountry);

  return (
    <div className="flex flex-col gap-6 w-full">
      <StepIndicator totalSteps={3} currentStep={state.currentStep} labels={STEP_LABELS} />

      {/* ── Step 1: Pet ── */}
      {state.currentStep === 1 && (
        <div className="flex flex-col gap-5 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-gray-900">First, tell us about your pet</h2>
            <p className="text-sm text-gray-500 mt-1">
              Your breed matters — some have extra steps, and some can&apos;t be imported at all. We&apos;ll tell you straight away.
            </p>
          </div>

          {/* Pet type cards */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-3">
              What type of pet? <span className="text-red-500" aria-hidden="true">*</span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {(["dog", "cat"] as PetType[]).map((type) => {
                const active = state.petType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => dispatch({ type: "SET_PET_TYPE", petType: type })}
                    aria-pressed={active}
                    className={[
                      "flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-5 rounded-2xl border-2 transition-all duration-150 min-h-[100px] sm:min-h-[120px] w-full",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600",
                      active
                        ? "border-brand-600 bg-brand-50 shadow-sm"
                        : "border-card-border bg-white hover:border-gray-300",
                    ].join(" ")}
                  >
                    <PetLottieIcon petType={type} active={active} />
                    <span className={`font-semibold text-sm capitalize ${active ? "text-brand-700" : "text-gray-600"}`}>
                      {type}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Breed input — disabled until pet type is chosen */}
          <ComboboxBreed
            id="pet-breed"
            petType={state.petType ?? "dog"}
            label="Breed"
            placeholder={state.petType === "cat" ? "e.g. Domestic Shorthair" : "e.g. Labrador Retriever"}
            value={state.petBreed}
            onChange={(breed) => dispatch({ type: "SET_PET_BREED", breed })}
            required
            disabled={!state.petType}
            hint={state.petBreed.length === 0 ? "Type to search, then select from the list" : undefined}
          />

          <Button
            onClick={() => dispatch({ type: "NEXT_STEP" })}
            disabled={!canGoToStep2}
            size="md"
            className="w-full"
          >
            Continue →
          </Button>
        </div>
      )}

      {/* ── Step 2: Country ── */}
      {state.currentStep === 2 && (
        <div className="flex flex-col gap-5 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Which country are you moving from?</h2>
            <p className="text-sm text-gray-500 mt-1">
              Your origin country determines everything — which tests are needed, how long it takes, and what it costs.
            </p>
          </div>

          <Select
            label="Country of origin"
            hint="This determines which DAFF group applies to your pet"
            placeholder="Select your country…"
            options={countryOptions}
            value={state.originCountry}
            onChange={(v) => dispatch({ type: "SET_COUNTRY", country: v })}
            required
          />

          {loadingCountries && (
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-brand-600 rounded-full animate-spin" aria-hidden="true" />
              Loading countries…
            </p>
          )}
          {countriesError && (
            <div className="flex items-center gap-3 text-sm text-red-600">
              <span>Could not load country list.</span>
              <button type="button" onClick={fetchCountries} className="underline font-medium hover:text-red-800">
                Retry
              </button>
            </div>
          )}

          {/* Group info banner — personalised to selected country */}
          {selectedCountry && (() => {
            const { name, group } = selectedCountry;
            if (group === 1) return (
              <Alert severity="success">
                ✓ Great news — {name} is one of the easiest countries to travel from. No quarantine required and minimal paperwork.
              </Alert>
            );
            if (group === 2) return (
              <Alert severity="warning">
                📋 {name} is a Group 2 country — rabies-free, which means a simpler process. You will need a 10-day quarantine stay in Melbourne and some vet paperwork. Plan for 3–4 months minimum.
              </Alert>
            );
            return (
              <Alert severity="critical">
                ⚠ {name} is a Group 3 country. This means your {state.petType ?? "pet"} needs a rabies blood test (RNATT) with a mandatory 180-day waiting period after the test. Plan for at least 7–8 months minimum — do not book flights until you have read your full timeline.
              </Alert>
            );
          })()}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => dispatch({ type: "PREV_STEP" })}>
              ← Back
            </Button>
            <Button onClick={() => dispatch({ type: "NEXT_STEP" })} disabled={!canGoToStep3}>
              Continue →
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Travel date ── */}
      {state.currentStep === 3 && (
        <div className="flex flex-col gap-5 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-gray-900">When do you want to arrive in Australia?</h2>
            <p className="text-sm text-gray-500 mt-1">
              We calculate every deadline from this date. If it&apos;s tight, we&apos;ll warn you straight away.
            </p>
          </div>

          <Input
            id="travel-date"
            type="date"
            label="Planned travel date"
            value={state.travelDate}
            onChange={(e) => dispatch({ type: "SET_TRAVEL_DATE", date: e.target.value })}
            min={getTodayStr()}
            max={getMaxDateStr()}
            required
            hint={
              selectedCountry?.group === 1
                ? `✓ From ${selectedCountry.name} you have plenty of flexibility. Most owners complete the process in 4–6 weeks.`
                : selectedCountry?.group === 2
                ? `📋 From ${selectedCountry.name} we recommend at least 3–4 months to complete vet checks, paperwork and quarantine booking.`
                : selectedCountry
                ? `⚠ From ${selectedCountry.name} your earliest possible travel date is ${getGroup3EarliestDate()}. If you select a date before then we will warn you.`
                : "We recommend at least 6 months for most countries. Group 3 countries require 7–12 months."
            }
          />

          {/* Quick date suggestions */}
          <div className="flex flex-wrap gap-2" aria-label="Quick date shortcuts">
            {[3, 6, 9, 12].map((months) => {
              const d = new Date();
              d.setMonth(d.getMonth() + months);
              const val = d.toISOString().split("T")[0];
              const label = `+${months}mo`;
              return (
                <button
                  key={months}
                  type="button"
                  aria-label={`Set travel date to ${months} months from now`}
                  aria-pressed={state.travelDate === val}
                  onClick={() => dispatch({ type: "SET_TRAVEL_DATE", date: val })}
                  className={[
                    "text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
                    state.travelDate === val
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-600 border-card-border hover:border-brand-300",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Travel date validation — group-specific warnings */}
          {state.travelDate && selectedCountry && (() => {
            const validation = validateTravelDate(
              state.travelDate,
              selectedCountry.group,
              selectedCountry.name,
              state.petType
            );
            if (!validation) return null;
            return <Alert severity={validation.severity}>{validation.message}</Alert>;
          })()}

          {state.error && (
            <Alert severity="critical">{state.error}</Alert>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => dispatch({ type: "PREV_STEP" })}>
              ← Back
            </Button>
            <Button
              variant="cta"
              onClick={handleSubmit}
              disabled={!canSubmit}
              size="md"
            >
              Build my compliance plan →
            </Button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            This takes 10–20 seconds while we calculate your compliance dates.
          </p>
        </div>
      )}
    </div>
  );
}
