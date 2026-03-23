import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "FAQ — PetBorder",
  description:
    "Answers to common questions about bringing pets to Australia and taking pets overseas, including DAFF rules, quarantine, RNATT, and the outbound export process.",
};

interface FAQItem {
  q: string;
  a: string;
}

const inboundFAQs: FAQItem[] = [
  {
    q: "How long does the whole import process take?",
    a: "It depends on your origin country. From Group 1 countries (New Zealand, Norfolk Island) it can be a few weeks. From Group 2 countries (UK, Ireland, Japan) allow 4–6 months. From Group 3 countries (USA, Europe, most of Asia) you need at least 7–12 months due to the mandatory 180-day RNATT wait.",
  },
  {
    q: "What is the RNATT blood test?",
    a: "The Rabies Neutralising Antibody Titre Test (RNATT) confirms your pet has sufficient immunity to rabies. It is required for Group 3 country pets. The 180-day mandatory wait begins from the date the approved laboratory receives the blood sample — not the date it was drawn. Starting the test as early as possible is critical.",
  },
  {
    q: "Do I need an import permit?",
    a: "Group 3 country pets require an import permit from DAFF via the BICON portal. The fee is $1,265 AUD and the permit is valid for 12 months from issue. Group 1 and Group 2 pets do not need an import permit.",
  },
  {
    q: "How long is quarantine, and where does it happen?",
    a: "All quarantine takes place at the Mickleham Post Entry Quarantine (PEQ) Facility in Melbourne — the only facility in Australia approved for imported pets. Group 1 pets have no quarantine. Group 2 pets spend 10 days. Group 3 pets spend 10 days if identity was verified before the RNATT blood draw, or 30 days if verified after. Spots are limited — book well in advance.",
  },
  {
    q: "Which airport can my pet fly into?",
    a: "All imported cats and dogs must enter Australia through Melbourne Airport. No other airport is accepted, regardless of where in Australia you are moving to. The only exception is pets travelling from New Zealand or Norfolk Island, which may arrive at other airports.",
  },
  {
    q: "Does my pet's microchip matter?",
    a: "Yes — critically. The microchip must be ISO 11784/11785 compliant (15-digit) and must be implanted before the rabies vaccination and before any blood sampling. If the microchip is inserted after these steps, the procedures may need to be repeated.",
  },
  {
    q: "Are Bengal cats or other breeds banned?",
    a: "Yes. Bengal cats are banned from import to Australia as of March 2026, when the previous exemption for 5th generation and beyond was removed. Savannah cats are also banned regardless of generation. Restricted dog breeds include Pit Bull Terrier (American Pit Bull), Dogo Argentino, Fila Brasileiro, and Japanese Tosa.",
  },
  {
    q: "What is the BICON portal?",
    a: "BICON (Biosecurity Import Conditions) is DAFF's online portal for lodging import permit applications. For Group 3 pets, your import permit application must be submitted through BICON and approved before your pet can travel. The $1,265 AUD fee is paid through the portal.",
  },
];

const outboundFAQs: FAQItem[] = [
  {
    q: "Do I need DAFF approval to take my pet out of Australia?",
    a: "Yes. DAFF requires you to lodge a Notice of Intention to Export at least 10 business days before your departure date. You will also need a formal export permit, which DAFF issues within 72 hours before your flight. Missing this window means your pet cannot travel.",
  },
  {
    q: "What paperwork does my vet need to complete?",
    a: "Your vet must complete a veterinary health certificate (endorsed by DAFF) within 5 days before your pet's departure. The exact requirements vary by destination country. For EU countries, an EU-format health certificate is required. Your vet must be DAFF-accredited to sign export documents.",
  },
  {
    q: "Will my destination country impose quarantine on my pet?",
    a: "It depends on the destination. Some countries (like New Zealand, the UK, Singapore, and Japan) have strict biosecurity requirements and may require quarantine on arrival. Others (like the USA and most of Europe) do not quarantine pets from Australia, but do require specific health certificates and vaccinations. PetBorder's outbound planner covers entry requirements for 15+ countries.",
  },
  {
    q: "How long does the outbound process take to prepare for?",
    a: "Allow at least 6–8 weeks for straightforward destinations (USA, most of Europe). Some destinations, like New Zealand, require specific timing for treatments. Countries with stricter rules (UK, Japan, Singapore) may require 3–6 months of preparation. Start early — the 10 business day Notice of Intention window closes fast.",
  },
  {
    q: "Can I use PetBorder for both inbound and outbound planning?",
    a: "Yes. PetBorder covers both directions. Use the 'Bringing a pet to Australia' planner for DAFF import compliance, and the 'Taking a pet overseas' planner for Australian export steps plus destination entry requirements.",
  },
  {
    q: "Is the outbound timeline as accurate as the inbound one?",
    a: "The Australian export steps (DAFF Notice of Intention, export permit, health certificate) are fully verified against official DAFF guidance. Destination country requirements are covered in detail for 15 countries. For all other destinations, PetBorder provides general guidance and links to the relevant authority — always verify with the destination country's animal import authority before booking.",
  },
];

function FAQSection({ title, items }: { title: string; items: FAQItem[] }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="flex flex-col divide-y divide-card-border border border-card-border rounded-2xl bg-white overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className="px-6 py-5">
            <p className="font-semibold text-gray-900 mb-1.5">{item.q}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function FAQPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Help centre</p>
            <h1 className="text-3xl font-bold text-gray-900">Frequently asked questions</h1>
            <p className="text-gray-500 mt-2">
              Common questions about pet travel compliance to and from Australia.
            </p>
          </div>

          <div className="flex flex-col gap-10">
            <FAQSection title="Bringing a pet to Australia (inbound)" items={inboundFAQs} />
            <FAQSection title="Taking a pet out of Australia (outbound)" items={outboundFAQs} />
          </div>

          <div className="mt-10 bg-brand-50 border border-brand-100 rounded-2xl p-6 text-sm text-brand-800">
            <p className="font-semibold mb-1">Still have questions?</p>
            <p>
              PetBorder provides general planning guidance only. For definitive answers, always verify with{" "}
              <a
                href="https://www.agriculture.gov.au/biosecurity-trade/cats-dogs"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                DAFF
              </a>{" "}
              before booking travel for your pet.{" "}
              <a href="/contact" className="underline font-medium">
                Contact us
              </a>{" "}
              if you&apos;d like help understanding your specific situation.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
