import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { OutboundForm } from "@/components/outbound/OutboundForm";

export const metadata: Metadata = {
  title: "Taking Your Pet Out of Australia — PetBorder",
  description:
    "Get a personalised outbound travel timeline for taking your dog or cat from Australia to the UK, USA, Japan, Singapore, and 80+ countries.",
};

export default function OutboundPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Page intro */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1 px-4 py-2.5 rounded-2xl bg-accent-50 mb-4" aria-hidden="true">
              <span className="text-2xl">🇦🇺</span>
              <span className="text-lg text-accent-300 font-light mx-0.5">→</span>
              <span className="text-2xl">✈️</span>
              <span className="text-lg text-accent-300 font-light mx-0.5">→</span>
              <span className="text-2xl">🌍</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Taking your pet out of Australia
            </h1>
            <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto">
              Tell us your destination and departure date — we'll calculate every DAFF export step and destination entry requirement.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white border border-card-border rounded-2xl p-4 sm:p-8 shadow-sm">
            <OutboundForm />
          </div>

          {/* Links */}
          <div className="mt-6 text-center flex flex-col gap-2">
            <p className="text-xs text-gray-400">
              Bringing a pet <em>to</em> Australia instead?{" "}
              <Link href="/generate" className="underline hover:text-gray-600">
                Use the inbound planner →
              </Link>
            </p>
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
