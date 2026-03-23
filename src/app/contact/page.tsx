import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Contact Us — PetBorder",
  description:
    "Get in touch with the PetBorder team. Questions about your timeline, agency partnerships, API access, or bug reports — we'd love to hear from you.",
};

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 px-4 py-12">
        <div className="max-w-xl mx-auto">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Get in touch</p>
            <h1 className="text-3xl font-bold text-gray-900">Contact us</h1>
            <p className="text-gray-500 mt-2">
              Questions about your timeline, agency partnerships, API access, or anything else — we&apos;d love to hear from you.
            </p>
          </div>

          <ContactForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
