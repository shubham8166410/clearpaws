import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PawPrint } from "@/components/icons/PawPrint";

export const metadata: Metadata = {
  title: "About PetBorder",
  description:
    "PetBorder is Australia's pet travel compliance planner — built to eliminate the confusion around DAFF rules for bringing pets to Australia and taking pets overseas.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="px-4 py-16 bg-brand-800 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-6">
              <PawPrint className="w-7 h-7 text-accent-400" aria-hidden="true" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
              Built for pet owners navigating one of the world&apos;s most complex biosecurity systems
            </h1>
            <p className="text-brand-200 text-lg leading-relaxed max-w-2xl mx-auto">
              Australia&apos;s DAFF rules for importing and exporting cats and dogs are strict, detailed, and change without warning. PetBorder exists so you don&apos;t have to piece it together from 12 different government PDF pages.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Our mission</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Moving internationally with a pet is stressful enough. The compliance side — blood tests, import permits, quarantine bookings, health certificates — shouldn&apos;t add to that stress.
                </p>
                <p className="text-gray-600 leading-relaxed mb-4">
                  PetBorder gives every pet owner a personalised, step-by-step compliance timeline in under 60 seconds. We cover every DAFF country group, every quarantine scenario, and every timeline variation — then show you exactly what to do and when.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  We also cover the outbound journey — DAFF export steps plus destination country entry requirements for the UK, USA, Japan, Singapore, and 80+ countries.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                {[
                  { icon: "📋", title: "All 3 DAFF country groups", desc: "Group 1 (NZ), Group 2 (UK, Japan), and Group 3 (USA, Europe, Asia) — fully covered." },
                  { icon: "🔄", title: "Inbound & outbound", desc: "Bringing a pet to Australia or taking one overseas — both directions handled." },
                  { icon: "✅", title: "Step-by-step timelines", desc: "Every date calculated backward from your travel date so nothing is missed." },
                  { icon: "💰", title: "Cost estimates included", desc: "Import permit, quarantine fees, and vet costs — no hidden surprises." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 bg-gray-50 rounded-2xl p-4">
                    <span className="text-2xl flex-shrink-0" aria-hidden="true">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Accuracy system */}
        <section className="px-4 py-16 bg-gray-50 border-y border-card-border">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900">How we ensure accuracy</h2>
              <p className="text-gray-500 mt-2 text-sm max-w-xl mx-auto">
                DAFF rules are complex and change without notice. We use a three-layer accuracy system to ensure our timelines are always up to date.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  layer: "Layer 1",
                  title: "Hardcoded knowledge base",
                  desc: "All stable DAFF rules are stored as structured data with source URLs and last-verified dates. Our system never guesses rules — it only uses requirements explicitly sourced from this knowledge base.",
                  color: "bg-brand-100 text-brand-700",
                },
                {
                  layer: "Layer 2",
                  title: "Weekly DAFF monitoring",
                  desc: "A weekly automated monitor checks official DAFF pages for content changes. When a change is detected, an admin alert is sent. No rule update goes live without human review and approval.",
                  color: "bg-accent-100 text-accent-700",
                },
                {
                  layer: "Layer 3",
                  title: "Live data fetch",
                  desc: "Mickleham quarantine availability and BICON processing time estimates are fetched in real time, cached with a 24-hour TTL, with automatic fallback to stale cache if the source is unavailable.",
                  color: "bg-green-100 text-green-700",
                },
              ].map((item) => (
                <div key={item.layer} className="bg-white border border-card-border rounded-2xl p-6">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.color}`}>
                    {item.layer}
                  </span>
                  <h3 className="font-bold text-gray-900 mt-3 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              Every timeline step includes a link to the official DAFF page that contains that rule.
            </p>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-800">
              <p className="font-semibold mb-1">Important notice</p>
              <p className="leading-relaxed">
                PetBorder is a planning tool, not legal or veterinary advice. Rules can change. Always verify current requirements with{" "}
                <a
                  href="https://www.agriculture.gov.au/biosecurity-trade/cats-dogs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  DAFF
                </a>{" "}
                before booking travel for your pet. If your timeline shows a step that conflicts with official DAFF guidance, DAFF&apos;s guidance takes precedence.
              </p>
            </div>
          </div>
        </section>

        {/* B2B CTA */}
        <section className="px-4 py-16 bg-brand-800 text-white">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-3">Are you a pet relocation agency?</h2>
            <p className="text-brand-200 mb-6 leading-relaxed">
              PetBorder offers white-label portals, API access, and a lead dashboard for Petraveller, Dogtainers, Jetpets, and other agencies. Brand the tool as your own, receive leads directly, and track conversions.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Get in touch →
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
