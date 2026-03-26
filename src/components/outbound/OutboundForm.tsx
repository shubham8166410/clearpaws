"use client";

import { useReducer } from "react";
import { DESTINATION_COUNTRIES } from "@/lib/outbound-schema";
import type { OutboundTimelineResponse } from "@/lib/outbound-schema";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ComboboxBreed } from "@/components/ui/ComboboxBreed";
import { BreedChecker } from "@/components/ui/BreedChecker";
import { Alert } from "@/components/ui/Alert";
import { StepIndicator } from "@/components/ui/StepIndicator";
import dynamic from "next/dynamic";
import Lottie from "lottie-react";
import dogAnimData from "@/assets/animations/dog icon.json";
import catAnimData from "@/assets/animations/cat.json";

const LottiePawSpinner = dynamic(
  () => import("@/components/icons/LottiePawSpinner").then((m) => ({ default: m.LottiePawSpinner })),
  { ssr: false }
);
import { OutboundTimelineResult } from "./OutboundTimelineResult";

// ── Country flag helper ──────────────────────────────────────────────────────
function getCountryFlag(code: string): string {
  if (code.length !== 2) return "";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

// ── Lead-time warning ────────────────────────────────────────────────────────
const LONG_LEAD_TIME_CODES = new Set(["JP", "SG"]); // 6+ months required

function getDepartureDateWarning(
  destinationCode: string,
  departureDateStr: string
): { severity: "warning" | "info"; message: string } | null {
  if (!departureDateStr || !destinationCode) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const departure = new Date(departureDateStr);
  departure.setHours(0, 0, 0, 0);
  const days = Math.round((departure.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (LONG_LEAD_TIME_CODES.has(destinationCode) && days < 180) {
    const dest = DESTINATION_COUNTRIES.find((c) => c.code === destinationCode);
    return {
      severity: "warning",
      message: `⚠ ${dest?.name ?? destinationCode} typically requires 6+ months of preparation for a blood titer test wait. Your timeline will flag urgent steps.`,
    };
  }

  if (days < 30) {
    return {
      severity: "warning",
      message: `⚠ Departing in under 30 days is very tight. Check your timeline immediately for urgent actions.`,
    };
  }

  return null;
}

// ── State ────────────────────────────────────────────────────────────────────
type PetType = "dog" | "cat";

interface FormState {
  currentStep: number;
  petType: PetType | null;
  petBreed: string;
  isAlreadyMicrochipped: boolean | null;
  destinationCountry: string;
  departureDate: string;
  isSubmitting: boolean;
  error: string | null;
  result: OutboundTimelineResponse | null;
}

type FormAction =
  | { type: "SET_PET_TYPE"; petType: PetType }
  | { type: "SET_PET_BREED"; breed: string }
  | { type: "SET_MICROCHIPPED"; value: boolean }
  | { type: "SET_DESTINATION"; code: string }
  | { type: "SET_DEPARTURE_DATE"; date: string }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; result: OutboundTimelineResponse }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "RESET" };

const initialState: FormState = {
  currentStep: 1,
  petType: null,
  petBreed: "",
  isAlreadyMicrochipped: null,
  destinationCountry: "",
  departureDate: "",
  isSubmitting: false,
  error: null,
  result: null,
};

function reducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_PET_TYPE":       return { ...state, petType: action.petType, petBreed: "" };
    case "SET_PET_BREED":      return { ...state, petBreed: action.breed };
    case "SET_MICROCHIPPED":   return { ...state, isAlreadyMicrochipped: action.value };
    case "SET_DESTINATION":    return { ...state, destinationCountry: action.code };
    case "SET_DEPARTURE_DATE": return { ...state, departureDate: action.date };
    case "NEXT_STEP":          return { ...state, currentStep: state.currentStep + 1, error: null };
    case "PREV_STEP":          return { ...state, currentStep: Math.max(1, state.currentStep - 1), error: null };
    case "SUBMIT_START":       return { ...state, isSubmitting: true, error: null };
    case "SUBMIT_SUCCESS":     return { ...state, isSubmitting: false, result: action.result };
    case "SUBMIT_ERROR":       return { ...state, isSubmitting: false, error: action.error };
    case "RESET":              return initialState;
    default:                   return state;
  }
}

// ── Date helpers ─────────────────────────────────────────────────────────────
function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getMaxDateStr(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return d.toISOString().split("T")[0];
}

function addDays(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

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

// ── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: 1 | 2 | 3 }) {
  if (tier === 1) {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
        Detailed rules available
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
      General guidance
    </span>
  );
}

const STEP_LABELS = ["Your pet", "Destination", "Departure date"];

// ── Main component ────────────────────────────────────────────────────────────
export function OutboundForm() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const today = getTodayStr();
  const maxDate = getMaxDateStr();

  const selectedDestination = DESTINATION_COUNTRIES.find(
    (c) => c.code === state.destinationCountry
  );

  const canGoToStep2 =
    state.petType !== null &&
    state.petBreed.trim().length > 0 &&
    state.petBreed.trim().length <= 100 &&
    state.isAlreadyMicrochipped !== null;

  const canGoToStep3 = state.destinationCountry !== "";
  const canSubmit = state.departureDate !== "";

  const departureDateWarning = getDepartureDateWarning(
    state.destinationCountry,
    state.departureDate
  );

  const destOptions = DESTINATION_COUNTRIES.map((c) => ({
    value: c.code,
    label: c.name,
    icon: getCountryFlag(c.code),
    note: c.tier === 1 ? "Detailed rules" : undefined,
  }));

  async function handleSubmit() {
    if (!state.petType || state.isAlreadyMicrochipped === null) return;
    dispatch({ type: "SUBMIT_START" });

    try {
      const res = await fetch("/api/generate-outbound-timeline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          petType: state.petType,
          petBreed: state.petBreed.trim(),
          destinationCountry: state.destinationCountry,
          departureDate: state.departureDate,
          isAlreadyMicrochipped: state.isAlreadyMicrochipped,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        dispatch({ type: "SUBMIT_ERROR", error: body.error ?? "Something went wrong." });
        return;
      }
      dispatch({ type: "SUBMIT_SUCCESS", result: body });
    } catch {
      dispatch({ type: "SUBMIT_ERROR", error: "Network error. Please check your connection." });
    }
  }

  // ── Result view ─────────────────────────────────────────────────────────────
  if (state.result) {
    return (
      <OutboundTimelineResult
        result={state.result}
        onReset={() => dispatch({ type: "RESET" })}
      />
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state.isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <LottiePawSpinner />
        <p className="text-sm text-gray-500 text-center max-w-xs">
          Building your outbound travel timeline…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator currentStep={state.currentStep} totalSteps={STEP_LABELS.length} labels={STEP_LABELS} />

      {state.error && (
        <Alert severity="critical">
          {state.error}
        </Alert>
      )}

      {/* ── Step 1: Pet ───────────────────────────────────────────────────────── */}
      {state.currentStep === 1 && (
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              What type of pet are you taking?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["dog", "cat"] as PetType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => dispatch({ type: "SET_PET_TYPE", petType: type })}
                  className={[
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    state.petType === type
                      ? "border-brand-600 bg-brand-50"
                      : "border-card-border hover:border-brand-200",
                  ].join(" ")}
                  aria-pressed={state.petType === type}
                >
                  <PetLottieIcon petType={type} active={state.petType === type} />
                  <span
                    className={[
                      "text-sm font-semibold capitalize",
                      state.petType === type ? "text-brand-700" : "text-gray-600",
                    ].join(" ")}
                  >
                    {type}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {state.petType && (
            <ComboboxBreed
              id="outbound-breed"
              petType={state.petType}
              label="Breed"
              placeholder={`e.g. ${state.petType === "cat" ? "Domestic Shorthair" : "Labrador Retriever"}`}
              value={state.petBreed}
              onChange={(breed) => dispatch({ type: "SET_PET_BREED", breed })}
              hint={state.petBreed.length === 0 ? "Type to search, then select from the list" : undefined}
              hideBanWarnings
            />
          )}

          {state.petType && state.petBreed.trim().length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Is your pet already microchipped?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Yes, already chipped", value: true },
                  { label: "Not yet / not sure", value: false },
                ].map(({ label, value }) => (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => dispatch({ type: "SET_MICROCHIPPED", value })}
                    className={[
                      "px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all text-left",
                      state.isAlreadyMicrochipped === value
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-card-border hover:border-brand-200 text-gray-600",
                    ].join(" ")}
                    aria-pressed={state.isAlreadyMicrochipped === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {state.isAlreadyMicrochipped === true && (
                <p className="text-xs text-gray-500 mt-2">
                  Your timeline will show a verification step — we'll confirm the chip meets ISO 11784/11785 and was implanted before any vaccinations.
                </p>
              )}
            </div>
          )}

          <Button
            onClick={() => dispatch({ type: "NEXT_STEP" })}
            disabled={!canGoToStep2}
            className="w-full"
          >
            Continue →
          </Button>
        </div>
      )}

      {/* ── Step 2: Destination ───────────────────────────────────────────────── */}
      {state.currentStep === 2 && (
        <div className="flex flex-col gap-5">
          <div>
            <label htmlFor="outbound-dest" className="block text-sm font-semibold text-gray-700 mb-1">
              Where are you taking your {state.petType}?
            </label>
            <Select
              id="outbound-dest"
              value={state.destinationCountry}
              onChange={(value) => dispatch({ type: "SET_DESTINATION", code: value })}
              options={[{ value: "", label: "Select a country…" }, ...destOptions]}
            />
          </div>

          {selectedDestination && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-card-border">
              <span className="text-2xl" aria-hidden="true">
                {getCountryFlag(selectedDestination.code)}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-gray-800">
                  {selectedDestination.name}
                </span>
                <TierBadge tier={selectedDestination.tier} />
              </div>
            </div>
          )}

          {selectedDestination?.tier !== 1 && selectedDestination && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              We have general guidance for {selectedDestination.name}. Your timeline will show all Australian export requirements plus a recommendation to verify destination requirements with {selectedDestination.name}&apos;s official animal import authority.
            </div>
          )}

          {/* Inline breed restriction check — runs automatically once breed + destination are known */}
          {state.petType && state.petBreed.trim().length > 0 && state.destinationCountry && (
            <BreedChecker
              breed={state.petBreed.trim()}
              countryCode={state.destinationCountry}
              petType={state.petType}
              mode="inline"
            />
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => dispatch({ type: "PREV_STEP" })} className="flex-1">
              ← Back
            </Button>
            <Button onClick={() => dispatch({ type: "NEXT_STEP" })} disabled={!canGoToStep3} className="flex-1">
              Continue →
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Departure date ────────────────────────────────────────────── */}
      {state.currentStep === 3 && (
        <div className="flex flex-col gap-5">
          <div>
            <label htmlFor="outbound-date" className="block text-sm font-semibold text-gray-700 mb-1">
              When are you planning to depart?
            </label>
            <Input
              id="outbound-date"
              type="date"
              value={state.departureDate}
              min={addDays(today, 1)}
              max={maxDate}
              onChange={(e) => dispatch({ type: "SET_DEPARTURE_DATE", date: e.target.value })}
            />
          </div>

          {/* Quick shortcuts */}
          {!state.departureDate && (
            <div className="flex flex-wrap gap-2">
              <p className="text-xs text-gray-500 w-full">Quick pick:</p>
              {[
                { label: "3 months", days: 90 },
                { label: "6 months", days: 180 },
                { label: "12 months", days: 365 },
                { label: "18 months", days: 548 },
              ].map(({ label, days }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    dispatch({ type: "SET_DEPARTURE_DATE", date: addDays(today, days) })
                  }
                  className="text-xs px-3 py-1.5 rounded-full border border-card-border hover:border-brand-400 hover:bg-brand-50 text-gray-600 hover:text-brand-700 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {departureDateWarning && (
            <div
              className={[
                "text-xs rounded-xl p-3 border",
                departureDateWarning.severity === "warning"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-blue-50 border-blue-200 text-blue-800",
              ].join(" ")}
            >
              {departureDateWarning.message}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => dispatch({ type: "PREV_STEP" })} className="flex-1">
              ← Back
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
              Generate my timeline →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
