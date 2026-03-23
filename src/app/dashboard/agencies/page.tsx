import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AgencyList } from "@/components/agencies/AgencyList";

export const metadata: Metadata = {
  title: "Pet Transport Agencies | PetBorder",
  description:
    "Compare Australia's leading pet transport agencies for international pet relocation. Get free quotes from Petraveller, Dogtainers, Jetpets, and more.",
};

export default async function AgenciesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/agencies");
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 px-4 py-8 sm:py-12" style={{ backgroundColor: "#FAFAF8" }}>
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-500">
            <a href="/dashboard" className="hover:text-brand-600 transition-colors">Dashboard</a>
            <span aria-hidden="true">›</span>
            <span className="text-gray-800 font-medium">Pet Transport Agencies</span>
          </nav>

          {/* Page title */}
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "#1B4F72" }}>
              Pet Transport Agencies
            </h1>
            <p className="text-gray-600 mt-2 text-sm">
              Let the experts handle the paperwork. Compare Australia's leading pet relocation agencies.
            </p>
          </div>

          {/* Agency list with filter */}
          <AgencyList />

          {/* Disclaimer */}
          <div className="rounded-2xl border border-card-border bg-white p-4">
            <p className="text-xs text-gray-400 text-center">
              PetBorder is not affiliated with these agencies. Prices are indicative only.
              Always verify costs and services directly with the agency before booking.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
