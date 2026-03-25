import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroAnimation } from "@/components/icons/HeroAnimation";
import { PawPrint } from "@/components/icons/PawPrint";
import { WebSiteSchema, OrganizationSchema, SoftwareApplicationSchema } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "PetBorder — Pet Travel to & from Australia. Know Exactly What to Do.",
  description:
    "Get a personalised DAFF compliance timeline in 60 seconds. Know every step, date, and cost for bringing your dog or cat to Australia — or taking them overseas.",
};

const FAQ_ITEMS = [
  {
    q: "Which airport do I fly my pet into?",
    a: "All pet imports to Australia must arrive at Melbourne Tullamarine Airport. No other airport is approved for cat and dog imports.",
  },
  {
    q: "How long does the whole process take?",
    a: "It depends on your origin country. From Group 1 countries (New Zealand) it can be a few weeks. From Group 3 countries (USA, Europe, Asia) you need at least 7–12 months due to the mandatory 180-day RNATT wait.",
  },
  {
    q: "What is the RNATT blood test?",
    a: "The Rabies Neutralising Antibody Titre Test (RNATT) confirms your pet has sufficient rabies immunity. Required for Group 3 countries. The 180-day wait begins from the date the approved laboratory receives the sample — not when it is drawn.",
  },
  {
    q: "Do I need an import permit?",
    a: "Group 3 country pets require an import permit from DAFF via the BICON portal. The fee is $1,265 AUD. Group 1 and Group 2 pets do not need an import permit.",
  },
  {
    q: "How long is quarantine?",
    a: "Group 1 pets have no quarantine. Group 2 pets spend 10 days at Mickleham. Group 3 pets spend 10 days (identity verified before RNATT) or 30 days (verified after). All quarantine is at Mickleham Quarantine Station in Melbourne.",
  },
  {
    q: "Are Bengal cats allowed?",
    a: "No. Bengal cats are banned from import to Australia as of March 2026 under DAFF regulations.",
  },
  {
    q: "Can I take my pet out of Australia?",
    a: "Yes. You need to complete DAFF's export process — including a Notice of Intention (at least 10 business days before departure) and an export permit issued within 72 hours of your flight. Destination countries have their own import requirements. Use PetBorder's outbound planner for a full timeline.",
  },
];

// Inline SVG icons for How It Works cards
function PlaneIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <WebSiteSchema />
      <OrganizationSchema />
      <SoftwareApplicationSchema />
      <Header />

      <main className="flex-1">
        {/* -- Hero -- */}
        <section className="bg-paw-pattern bg-surface px-4 pt-6 pb-10 sm:pt-14 sm:pb-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col-reverse lg:grid lg:grid-cols-[3fr_2fr] gap-8 lg:gap-10 items-center">
              {/* Text side (visually second on mobile via flex-col-reverse, first on desktop) */}
              <div className="flex flex-col gap-5 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-accent-50 border border-accent-100 text-accent-600 text-xs font-semibold px-3 py-1.5 rounded-full self-center lg:self-start">
                  <PawPrint className="w-3.5 h-3.5" aria-hidden="true" />
                  Free • Built on verified DAFF requirements
                </div>

                <h1 className="font-extrabold text-gray-900 leading-tight tracking-tight" style={{ fontSize: "clamp(1.6rem, 5vw, 3rem)" }}>
                  Moving your pet to Australia or overseas?{" "}
                  <span className="text-brand-600">Know every step before you book.</span>
                </h1>

                <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-lg mx-auto lg:mx-0">
                  Answer 3 quick questions and get a personalised step-by-step plan — every deadline, cost, and requirement mapped out for your exact situation.
                </p>

                <div className="flex flex-col items-center lg:items-start gap-3">
                  <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <Link
                      href="/generate"
                      className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm sm:text-base font-semibold px-6 py-3 sm:py-4 rounded-2xl transition-colors shadow-lg shadow-brand-600/20 min-h-[52px] sm:min-h-[56px] w-full sm:w-auto"
                    >
                      <span aria-hidden="true">✈️🇦🇺</span>
                      Bringing pet to Australia →
                    </Link>
                    <Link
                      href="/outbound"
                      className="inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white text-sm sm:text-base font-semibold px-6 py-3 sm:py-4 rounded-2xl transition-colors shadow-lg shadow-accent-500/20 min-h-[52px] sm:min-h-[56px] w-full sm:w-auto"
                    >
                      <span aria-hidden="true">🇦🇺✈️</span>
                      Taking pet overseas →
                    </Link>
                  </div>
                  <p className="text-xs text-gray-400 flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-1">
                    <span>✓ Free</span>
                    <span>✓ No account needed</span>
                    <span>✓ Official DAFF rules only</span>
                  </p>
                </div>
              </div>

              {/* Animation — top on mobile, right column on desktop */}
              <div className="flex justify-center lg:justify-end">
                <HeroAnimation className="w-[180px] h-[180px] sm:w-[260px] sm:h-[260px] lg:w-[380px] lg:h-[380px] lg:-mr-8" />
              </div>
            </div>
          </div>
        </section>

        {/* -- Trust bar -- */}
        <section className="border-y border-card-border bg-white px-4 py-5" aria-label="Key features">
          <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-medium text-gray-600">
            {[
              { icon: "🐾", text: "Accuracy-checked DAFF requirements" },
              { icon: "🔄", text: "Import & export pet journeys covered" },
              { icon: "⏱️", text: "Your plan in under a minute" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <span aria-hidden="true">{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* -- Direction picker -- */}
        <section className="px-4 py-12 max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Bringing a pet in, or taking one out?</h2>
            <p className="text-gray-500 mt-1.5 text-sm">Tell us your direction — we&apos;ll handle the rest.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Inbound */}
            <div className="bg-white border-2 border-brand-100 rounded-2xl p-6 flex flex-col gap-3 hover:border-brand-300 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">✈️🇦🇺</span>
                <div>
                  <h3 className="font-bold text-gray-900">Moving to Australia with your pet</h3>
                  <p className="text-xs text-gray-500">Coming from overseas</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                DAFF compliance timeline — every import step, blood test deadline, quarantine booking, and cost.
              </p>
              <ul className="text-xs text-gray-500 flex flex-col gap-1">
                <li>✓ All 3 DAFF country groups</li>
                <li>✓ RNATT 180-day wait calculation</li>
                <li>✓ Mickleham quarantine costs</li>
              </ul>
              <Link
                href="/generate"
                className="mt-auto inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors min-h-[44px]"
              >
                Get my arrival plan →
              </Link>
            </div>

            {/* Outbound */}
            <div className="bg-white border-2 border-accent-100 rounded-2xl p-6 flex flex-col gap-3 hover:border-accent-300 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">🇦🇺✈️</span>
                <div>
                  <h3 className="font-bold text-gray-900">Moving your pet out of Australia</h3>
                  <p className="text-xs text-gray-500">Relocating or moving overseas</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                DAFF export steps plus destination country entry requirements for the UK, USA, Japan, Singapore, and 80+ countries.
              </p>
              <ul className="text-xs text-gray-500 flex flex-col gap-1">
                <li>✓ DAFF Notice of Intention + export permit</li>
                <li>✓ Destination import rules (15 countries)</li>
                <li>✓ 72-hour permit window warning</li>
              </ul>
              <Link
                href="/outbound"
                className="mt-auto inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors min-h-[44px]"
              >
                Get my departure plan →
              </Link>
            </div>
          </div>
        </section>

        {/* -- How it works -- */}
        <section id="how-it-works" className="px-4 py-16 max-w-4xl mx-auto scroll-mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">How it works</h2>
            <p className="text-gray-500 mt-2 text-sm sm:text-base max-w-md mx-auto">
              Three questions. One minute. Every DAFF step laid out for you.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                Icon: PlaneIcon,
                step: "01",
                title: "Tell us about your pet & journey",
                desc: "Direction, country, date, pet type. Four questions. Done in 30 seconds.",
              },
              {
                Icon: DocumentIcon,
                step: "02",
                title: "Your personalised plan, instant",
                desc: "Every compliance step, every due date, every cost — built for your exact situation.",
              },
              {
                Icon: CheckIcon,
                step: "03",
                title: "Arrive prepared",
                desc: "Every deadline clear. Every step accounted for. Travel knowing nothing's been missed.",
              },
            ].map(({ Icon, step, title, desc }) => (
              <div
                key={step}
                className="bg-white border border-card-border rounded-2xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Icon />
                  </div>
                  <span className="text-2xl font-extrabold text-gray-100 select-none">{step}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-base">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* -- Country groups table -- */}
        <section className="bg-white border-y border-card-border px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Bringing a pet to Australia</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Your origin country determines your whole timeline</h2>
              <p className="text-gray-500 mt-2 text-sm">Australia groups countries by rabies risk — your group decides how long, how much, and which tests are needed.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  group: "Group 1",
                  badge: "Simplest",
                  badgeBg: "bg-green-100 text-green-800",
                  border: "border-green-200",
                  dot: "bg-green-500",
                  countries: "New Zealand, Norfolk Island",
                  time: "A few weeks",
                  cost: "~$600–$1,500",
                  requirements: ["No import permit", "No quarantine", "Microchip + health certificate"],
                },
                {
                  group: "Group 2",
                  badge: "Moderate",
                  badgeBg: "bg-amber-100 text-amber-800",
                  border: "border-amber-200",
                  dot: "bg-amber-500",
                  countries: "UK, Ireland, Cyprus, Malta, Hawaii",
                  time: "2–4 months",
                  cost: "~$3,000–$5,500",
                  requirements: ["No import permit", "10-day quarantine at Mickleham", "No RNATT required"],
                },
                {
                  group: "Group 3",
                  badge: "Most complex",
                  badgeBg: "bg-red-100 text-red-800",
                  border: "border-red-200",
                  dot: "bg-red-500",
                  countries: "USA, Europe, Asia, South America, Africa, Middle East",
                  time: "7–12 months",
                  cost: "~$5,000–$14,000+",
                  requirements: ["$1,265 import permit", "RNATT + 180-day wait", "10–30 day quarantine"],
                },
              ].map(({ group, badge, badgeBg, border, dot, countries, time, cost, requirements }) => (
                <div key={group} className={`border ${border} rounded-2xl p-5 flex flex-col gap-3`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${dot}`} aria-hidden="true" />
                    <span className="font-bold text-gray-900">{group}</span>
                    <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${badgeBg}`}>{badge}</span>
                  </div>
                  <p className="text-xs text-gray-500">{countries}</p>
                  <div className="text-sm text-gray-700 flex flex-col gap-0.5">
                    <div><span className="font-semibold">Time:</span> {time}</div>
                    <div><span className="font-semibold">Est. cost:</span> {cost}</div>
                  </div>
                  <ul className="text-xs text-gray-600 flex flex-col gap-1.5 mt-1">
                    {requirements.map((r) => (
                      <li key={r} className="flex items-start gap-1.5">
                        <svg className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                        </svg>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -- FAQ -- */}
        <section id="faq" className="px-4 py-16 scroll-mt-20">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Frequently asked questions</h2>
            </div>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
                    "@type": "Question",
                    name: q,
                    acceptedAnswer: { "@type": "Answer", text: a },
                  })),
                }),
              }}
            />
            <dl className="flex flex-col gap-3">
              {FAQ_ITEMS.map(({ q, a }) => (
                <div key={q} className="bg-white rounded-2xl border border-card-border p-5">
                  <dt className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{q}</dt>
                  <dd className="text-sm text-gray-600 leading-relaxed">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* -- Final CTA -- */}
        <section className="bg-brand-600 px-4 py-14 text-center">
          <div className="max-w-xl mx-auto flex flex-col items-center gap-4">
            <PawPrint className="w-10 h-10 text-accent-500" aria-hidden="true" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Let&apos;s get your pet&apos;s plan sorted.
            </h2>
            <p className="text-brand-100 text-sm">
              Free. Accurate. Done in 60 seconds. For any direction.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full sm:w-auto">
              <Link
                href="/generate"
                className="inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white text-base font-semibold px-7 py-4 rounded-2xl transition-colors shadow-lg min-h-[56px]"
              >
                Bringing pet to Australia →
              </Link>
              <Link
                href="/outbound"
                className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white text-base font-semibold px-7 py-4 rounded-2xl transition-colors border border-white/30 min-h-[56px]"
              >
                Taking pet overseas →
              </Link>
            </div>
            <p className="text-xs text-brand-200">Free forever · No account needed · 5 plans per day</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
