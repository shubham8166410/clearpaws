"use client";

import { useState, useEffect } from "react";
import { useAgencyPortal } from "../AgencyPortalProvider";
import type { AgencyRow } from "@/types/database";

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function AgencySettingsPage() {
  const { agency } = useAgencyPortal();

  const [logoUrl, setLogoUrl] = useState(agency.logo_url ?? "");
  const [primaryColour, setPrimaryColour] = useState(agency.primary_colour ?? "#1B4F72");
  const [primaryHex, setPrimaryHex] = useState(agency.primary_colour ?? "#1B4F72");
  const [secondaryColour, setSecondaryColour] = useState(agency.secondary_colour ?? "");
  const [secondaryHex, setSecondaryHex] = useState(agency.secondary_colour ?? "");
  const [contactEmail, setContactEmail] = useState(agency.contact_email ?? "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Sync pickers with hex inputs
  function handlePrimaryPickerChange(val: string) {
    setPrimaryColour(val);
    setPrimaryHex(val);
  }
  function handlePrimaryHexChange(val: string) {
    setPrimaryHex(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setPrimaryColour(val);
  }
  function handleSecondaryPickerChange(val: string) {
    setSecondaryColour(val);
    setSecondaryHex(val);
  }
  function handleSecondaryHexChange(val: string) {
    setSecondaryHex(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setSecondaryColour(val);
  }
  function clearSecondary() {
    setSecondaryColour("");
    setSecondaryHex("");
  }

  async function handleSave() {
    setSaving(true);
    setToast(null);
    try {
      const body: {
        logo_url?: string | null;
        primary_colour?: string;
        secondary_colour?: string | null;
        contact_email?: string;
      } = {};

      if (logoUrl.trim() === "") {
        body.logo_url = null;
      } else if (isValidUrl(logoUrl.trim())) {
        body.logo_url = logoUrl.trim();
      }

      if (/^#[0-9a-fA-F]{6}$/.test(primaryColour)) {
        body.primary_colour = primaryColour;
      }

      if (secondaryColour === "") {
        body.secondary_colour = null;
      } else if (/^#[0-9a-fA-F]{6}$/.test(secondaryColour)) {
        body.secondary_colour = secondaryColour;
      }

      if (contactEmail.trim()) {
        body.contact_email = contactEmail.trim();
      }

      const res = await fetch(`/api/agencies/${agency.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setToast({ type: "success", message: "Settings saved successfully." });
      } else {
        const json = (await res.json()) as { error?: string };
        setToast({ type: "error", message: json.error ?? "Failed to save settings." });
      }
    } catch {
      setToast({ type: "error", message: "Network error. Please try again." });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  const previewBg = primaryColour && /^#[0-9a-fA-F]{6}$/.test(primaryColour)
    ? primaryColour
    : "#1B4F72";
  const showLogoPreview = logoUrl.trim() !== "" && isValidUrl(logoUrl.trim());

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Customise your white-label branding</p>
      </div>

      {/* Live preview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Preview</h2>
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ backgroundColor: previewBg }}
        >
          {showLogoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl.trim()}
              alt="Agency logo preview"
              className="h-10 w-10 rounded-lg object-contain bg-white"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {agency.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-white font-bold text-base">{agency.name}</span>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-5">
        {/* Agency name — read-only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Agency name</label>
          <input
            type="text"
            value={agency.name}
            readOnly
            className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
          />
        </div>

        {/* White-label URL — read-only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            White-label URL
          </label>
          <input
            type="text"
            value={`https://${agency.slug}.clearpaws.com.au`}
            readOnly
            className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50 cursor-not-allowed font-mono"
          />
        </div>

        {/* Logo URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo URL</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          {showLogoPreview && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl.trim()}
                alt="Logo preview"
                className="h-16 rounded-lg border border-gray-200 object-contain bg-gray-50 p-1"
              />
            </div>
          )}
        </div>

        {/* Primary colour */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Primary colour
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColour}
              onChange={(e) => handlePrimaryPickerChange(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-gray-200 p-0.5"
            />
            <input
              type="text"
              value={primaryHex}
              onChange={(e) => handlePrimaryHexChange(e.target.value)}
              maxLength={7}
              placeholder="#1B4F72"
              className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
        </div>

        {/* Secondary colour */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Secondary colour{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={secondaryColour || "#ffffff"}
              onChange={(e) => handleSecondaryPickerChange(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-gray-200 p-0.5"
            />
            <input
              type="text"
              value={secondaryHex}
              onChange={(e) => handleSecondaryHexChange(e.target.value)}
              maxLength={7}
              placeholder="#E67E22"
              className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            {secondaryColour && (
              <button
                onClick={clearSecondary}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Contact email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Contact email
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="you@yourcompany.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="self-start inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors min-h-[44px]"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
