import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "PetBorder's terms of use — the rules governing your use of our pet travel compliance planning service.",
  alternates: {
    canonical: "https://petborder.com/terms",
  },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "22 March 2026";
const CONTACT_EMAIL = "legal@petborder.com";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1 mb-4">
            Last updated: {LAST_UPDATED}
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Terms of Use</h1>
          <p className="text-gray-600 leading-relaxed">
            These Terms of Use (&quot;Terms&quot;) govern your access to and use of petborder.com and any related services provided by PetBorder (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By using PetBorder, you agree to these Terms. If you do not agree, please do not use our service.
          </p>
        </div>

        {/* Critical disclaimer — first and prominent */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 mb-10">
          <h2 className="font-bold text-amber-900 mb-2">Important disclaimer — read this first</h2>
          <p className="text-amber-800 text-sm leading-relaxed">
            PetBorder is a <strong>planning tool</strong>, not a licensed immigration, legal, or veterinary advice service. The compliance timelines and information we provide are based on publicly available DAFF rules that we verify periodically. DAFF requirements can change without notice. <strong>Always confirm current requirements directly with the Australian Department of Agriculture, Fisheries and Forestry (DAFF) at agriculture.gov.au before booking any travel for your pet.</strong> PetBorder is not responsible for any loss, cost, delay, or harm arising from reliance on information provided by this service.
          </p>
        </div>

        <div className="space-y-10 text-gray-700 leading-relaxed">

          {/* 1. The service */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. The service</h2>
            <p className="mb-3">
              PetBorder provides an online platform that generates personalised pet travel compliance timelines based on DAFF rules, helps pet owners track their progress through the import/export process, and connects users with pet transport agencies and relevant resources.
            </p>
            <p>
              We offer both free and paid tiers:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mt-3 text-sm">
              <li><strong>Free:</strong> generate up to 5 timelines per day (rate limited by IP address)</li>
              <li><strong>Document pack ($15 AUD):</strong> one-time purchase for a downloadable PDF compliance pack</li>
              <li><strong>Subscription ($9.90 AUD/month):</strong> save timelines, progress tracking, deadline reminders, and priority access to new features</li>
              <li><strong>Agency/white-label plans:</strong> subject to a separate B2B agreement</li>
            </ul>
          </section>

          {/* 2. Accuracy disclaimer */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Accuracy of information</h2>
            <p className="mb-3">
              We work hard to keep our DAFF compliance information accurate and current. Our knowledge base is reviewed regularly and includes source URLs and last-verified dates for each rule. However:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm mb-3">
              <li>DAFF regulations can change without notice — sometimes with immediate effect</li>
              <li>Country group classifications may be updated by DAFF at any time</li>
              <li>Quarantine fees, permit costs, and processing times are estimates only</li>
              <li>Our AI-generated step descriptions are based on rules we provide — they are not a substitute for reading the official DAFF documentation</li>
              <li>We cannot guarantee that any timeline is complete, accurate, or applicable to your specific circumstances</li>
            </ul>
            <p className="text-sm">
              <strong>Always verify your specific requirements with DAFF at{" "}
              <a href="https://www.agriculture.gov.au/biosecurity-trade/cats-dogs" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                agriculture.gov.au
              </a>{" "}
              before making any bookings.</strong>
            </p>
          </section>

          {/* 3. Your account */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Your account</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>You must be at least 16 years old to create an account</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials</li>
              <li>You are responsible for all activity that occurs under your account</li>
              <li>You must provide accurate information when creating your account</li>
              <li>You may not create accounts for the purpose of circumventing rate limits</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms</li>
            </ul>
          </section>

          {/* 4. Payments and refunds */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Payments and refunds</h2>

            <h3 className="font-semibold text-gray-800 mb-2 text-sm">Document pack ($15 AUD — one-time)</h3>
            <p className="text-sm mb-4">
              Payment is processed by Stripe. Due to the digital nature of the product, the document pack is non-refundable once downloaded. If you have not yet downloaded your pack and experience a technical issue, contact us within 7 days for a full refund.
            </p>

            <h3 className="font-semibold text-gray-800 mb-2 text-sm">Subscription ($9.90 AUD/month)</h3>
            <ul className="list-disc list-inside space-y-1.5 text-sm mb-4">
              <li>Billed monthly. You may cancel at any time from your account settings</li>
              <li>Cancellation takes effect at the end of the current billing period — you retain access until then</li>
              <li>No refunds for partial months</li>
              <li>We reserve the right to change subscription pricing with 30 days&apos; notice to existing subscribers</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mb-2 text-sm">Failed payments</h3>
            <p className="text-sm">
              If a subscription payment fails, we will retry automatically. After repeated failures, your subscription will be downgraded to the free tier. You will not lose your saved data.
            </p>
          </section>

          {/* 5. Acceptable use */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Acceptable use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Use PetBorder for any unlawful purpose or in violation of any applicable law</li>
              <li>Attempt to circumvent rate limits by using multiple IP addresses, VPNs, or creating multiple accounts</li>
              <li>Scrape, crawl, or systematically extract data from PetBorder without prior written permission</li>
              <li>Reverse engineer, decompile, or attempt to extract source code from PetBorder</li>
              <li>Use PetBorder to provide professional advice to third parties without disclosing that the information comes from an automated planning tool</li>
              <li>Submit false, misleading, or fraudulent information</li>
              <li>Interfere with or disrupt the service or its servers</li>
              <li>Attempt to gain unauthorised access to other users&apos; accounts or data</li>
            </ul>
          </section>

          {/* 6. Intellectual property */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Intellectual property</h2>
            <p className="mb-3 text-sm">
              The PetBorder platform, including its design, code, branding, and content, is owned by PetBorder and protected by Australian and international intellectual property laws.
            </p>
            <p className="mb-3 text-sm">
              Your generated timelines are yours — you own the output. You may share, print, and use your timelines for your own personal pet import/export purposes.
            </p>
            <p className="text-sm">
              You may not reproduce, redistribute, or commercially exploit PetBorder&apos;s content, branding, or platform without our written permission.
            </p>
          </section>

          {/* 7. Third-party links */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Third-party links and services</h2>
            <p className="text-sm mb-3">
              PetBorder links to third-party websites including DAFF, pet transport agencies, approved laboratories, and other resources. These links are provided for your convenience only.
            </p>
            <p className="text-sm">
              We do not endorse, control, or take responsibility for the content, accuracy, or practices of any third-party website. Referral links to pet transport agencies may generate commission for PetBorder — this does not affect our editorial recommendations, which are based on public information.
            </p>
          </section>

          {/* 8. Limitation of liability */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Limitation of liability</h2>
            <p className="mb-3 text-sm">
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm mb-3">
              <li>PetBorder is provided &quot;as is&quot; without warranties of any kind, express or implied</li>
              <li>We do not warrant that the service will be uninterrupted, error-free, or that the information provided is complete or accurate</li>
              <li>We are not liable for any direct, indirect, incidental, special, or consequential damages arising from your use of PetBorder, including but not limited to: costs incurred from incorrect or out-of-date compliance information, costs of quarantine, permits, veterinary fees, or delayed or refused pet imports</li>
              <li>Our total liability to you for any claim arising from use of PetBorder shall not exceed the total amount paid by you to PetBorder in the 12 months preceding the claim</li>
            </ul>
            <p className="text-sm text-gray-500">
              Nothing in these Terms limits our liability for fraud, death, or personal injury caused by our negligence, or for any other liability that cannot be excluded by law.
            </p>
          </section>

          {/* 9. Australian Consumer Law */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Australian Consumer Law</h2>
            <p className="text-sm">
              Nothing in these Terms is intended to exclude, restrict, or modify any rights you have under the Australian Consumer Law (ACL) that cannot be excluded by agreement. If the ACL applies to your use of PetBorder, you may have statutory guarantees that we cannot contract out of.
            </p>
          </section>

          {/* 10. Governing law */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Governing law</h2>
            <p className="text-sm">
              These Terms are governed by the laws of New South Wales, Australia. You agree to submit to the non-exclusive jurisdiction of the courts of New South Wales for any dispute arising from these Terms or your use of PetBorder.
            </p>
          </section>

          {/* 11. Termination */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Termination</h2>
            <p className="text-sm mb-3">
              You may stop using PetBorder at any time and delete your account via your account settings.
            </p>
            <p className="text-sm">
              We may suspend or terminate your access to PetBorder at any time if we reasonably believe you have violated these Terms, with or without notice. Paid subscriptions will be refunded on a pro-rata basis if we terminate your account without cause.
            </p>
          </section>

          {/* 12. Changes */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Changes to these Terms</h2>
            <p className="text-sm">
              We may update these Terms from time to time. We will notify registered users of material changes by email at least 14 days before they take effect. The &quot;Last updated&quot; date at the top of this page reflects the most recent revision. Continued use of PetBorder after changes take effect constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* 13. Contact */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Contact us</h2>
            <p className="text-sm">
              For questions about these Terms, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              or via our{" "}
              <Link href="/contact" className="text-brand-600 hover:underline">
                contact form
              </Link>.
            </p>
          </section>
        </div>

        {/* Bottom nav */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>
          <Link href="/about" className="text-brand-600 hover:underline">About PetBorder</Link>
          <Link href="/contact" className="text-brand-600 hover:underline">Contact</Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
