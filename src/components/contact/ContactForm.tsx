"use client";

import { useState } from "react";

type Reason = "general" | "timeline" | "agency" | "vet" | "api" | "bug" | "other";

const REASONS: { value: Reason; label: string }[] = [
  { value: "general", label: "General enquiry" },
  { value: "timeline", label: "Question about my timeline" },
  { value: "agency", label: "Agency / white-label portal" },
  { value: "vet", label: "Vet portal" },
  { value: "api", label: "API access" },
  { value: "bug", label: "Bug report" },
  { value: "other", label: "Other" },
];

const inputClass =
  "w-full border border-card-border rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-colors bg-white";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<Reason>("general");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, reason, message }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("sent");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3" aria-hidden="true">✅</div>
        <h2 className="font-bold text-gray-900 mb-1">Message sent!</h2>
        <p className="text-sm text-gray-600">
          Thanks for reaching out. We&apos;ll get back to you within 1–2 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-card-border rounded-2xl p-6 sm:p-8 flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-name" className="text-xs font-semibold text-gray-700">
            Name <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={inputClass}
            autoComplete="name"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-email" className="text-xs font-semibold text-gray-700">
            Email <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
            autoComplete="email"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-reason" className="text-xs font-semibold text-gray-700">
          What&apos;s this about? <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <select
          id="contact-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as Reason)}
          className={inputClass}
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="text-xs font-semibold text-gray-700">
          Message <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you need..."
          className={`${inputClass} resize-none`}
        />
        <p className="text-xs text-gray-400 text-right">{message.length}/2000</p>
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors min-h-[44px]"
      >
        {status === "sending" ? "Sending…" : "Send message →"}
      </button>

      <p className="text-xs text-gray-400 text-center">
        We respond within 1–2 business days.
      </p>
    </form>
  );
}
