import type { Metadata } from "next";
import Link from "next/link";
import { TimelineForm } from "@/components/timeline/TimelineForm";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Generate Your Pet Travel Timeline",
  description:
    "Enter your pet's details and travel plans to get a personalised DAFF compliance timeline for bringing your pet to Australia.",
};

export default function GeneratePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Page intro */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1 px-4 py-2.5 rounded-2xl bg-brand-50 mb-4" aria-hidden="true">
              <span className="text-2xl">🐾</span>
              <span className="text-lg text-brand-300 font-light mx-0.5">→</span>
              <span className="text-2xl">✈️</span>
              <span className="text-lg text-brand-300 font-light mx-0.5">→</span>
              <span className="text-2xl">🇦🇺</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Plan your pet&apos;s Australian arrival
            </h1>
            <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto">
              Answer 3 quick questions — we&apos;ll map every DAFF step, deadline, and cost for your exact situation.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white border border-card-border rounded-2xl p-4 sm:p-8 shadow-sm">
            <TimelineForm />
          </div>

          {/* Back link */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
