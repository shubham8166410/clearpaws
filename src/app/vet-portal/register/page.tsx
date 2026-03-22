"use client";

import { useState, useEffect } from "react";
import type { VetClinicRow } from "@/types/database";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types/api";

interface RegistrationState {
  status: "idle" | "submitting" | "success" | "error";
  errorMessage: string;
}

export default function VetRegisterPage() {
  const [clinics, setClinics] = useState<VetClinicRow[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);
  const [clinicSearch, setClinicSearch] = useState("");
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [ahpraNumber, setAhpraNumber] = useState("");
  const [state, setState] = useState<RegistrationState>({
    status: "idle",
    errorMessage: "",
  });

  // Fetch clinics on mount
  useEffect(() => {
    async function loadClinics() {
      try {
        const res = await fetch("/api/vet-clinics");
        const json = (await res.json()) as ApiSuccessResponse<VetClinicRow[]> | ApiErrorResponse;
        if (json.success) {
          setClinics(json.data);
        }
      } catch {
        // Clinics failed to load — user will see empty dropdown
      } finally {
        setClinicsLoading(false);
      }
    }
    void loadClinics();
  }, []);

  const filteredClinics = clinics.filter((c) =>
    c.name.toLowerCase().includes(clinicSearch.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: "submitting", errorMessage: "" });

    try {
      const res = await fetch("/api/vet/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: selectedClinicId, ahpra_number: ahpraNumber }),
      });

      const json = (await res.json()) as
        | ApiSuccessResponse<{ id: string; status: string }>
        | ApiErrorResponse;

      if (!res.ok || !json.success) {
        const errMsg = json.success === false ? json.error : "Registration failed";
        setState({ status: "error", errorMessage: errMsg });
        return;
      }

      setState({ status: "success", errorMessage: "" });
    } catch {
      setState({ status: "error", errorMessage: "Network error. Please try again." });
    }
  }

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
        <p className="mb-3 text-4xl" aria-hidden="true">✅</p>
        <h1 className="mb-2 text-xl font-bold text-green-800">Application Submitted</h1>
        <p className="text-sm text-green-700">
          We&apos;ll review your application within 2 business days and notify you by email.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[#1B4F72]">Register as a Vet</h1>
      <p className="mb-8 text-sm text-gray-500">
        Provide your clinic and AHPRA credentials to apply for vet portal access.
      </p>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="max-w-md space-y-6 rounded-2xl border border-[#E5E3DF] bg-white p-8"
      >
        {/* Clinic search + select */}
        <div>
          <label
            htmlFor="clinic-search"
            className="mb-1.5 block text-sm font-semibold text-gray-700"
          >
            Clinic
          </label>
          <input
            id="clinic-search"
            type="text"
            placeholder="Search clinics…"
            value={clinicSearch}
            onChange={(e) => setClinicSearch(e.target.value)}
            className="mb-2 w-full rounded-xl border border-[#E5E3DF] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
          />
          <select
            id="clinic-id"
            required
            value={selectedClinicId}
            onChange={(e) => setSelectedClinicId(e.target.value)}
            className="w-full rounded-xl border border-[#E5E3DF] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20 disabled:text-gray-400"
            disabled={clinicsLoading}
          >
            <option value="">
              {clinicsLoading ? "Loading clinics…" : "Select your clinic"}
            </option>
            {filteredClinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.state ? ` — ${c.state}` : ""}
              </option>
            ))}
          </select>
          {!clinicsLoading && filteredClinics.length === 0 && clinicSearch && (
            <p className="mt-1 text-xs text-gray-400">No clinics match your search.</p>
          )}
        </div>

        {/* AHPRA number */}
        <div>
          <label
            htmlFor="ahpra-number"
            className="mb-1.5 block text-sm font-semibold text-gray-700"
          >
            AHPRA Number
          </label>
          <input
            id="ahpra-number"
            type="text"
            required
            minLength={1}
            maxLength={20}
            value={ahpraNumber}
            onChange={(e) => setAhpraNumber(e.target.value)}
            placeholder="e.g. VET0012345"
            className="w-full rounded-xl border border-[#E5E3DF] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
          />
        </div>

        {/* Error */}
        {state.status === "error" && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {state.errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={state.status === "submitting" || !selectedClinicId || !ahpraNumber}
          className="w-full rounded-xl bg-[#1B4F72] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#154060] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.status === "submitting" ? "Submitting…" : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
