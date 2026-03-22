import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase/server";
import { AgencyBrandingProvider } from "@/components/whitelabel/AgencyBrandingProvider";
import type { AgencyBranding } from "@/components/whitelabel/AgencyBrandingProvider";
import type { AgencyRow } from "@/types/database";

interface WlLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function WlLayout({ children, params }: WlLayoutProps) {
  const { slug } = await params;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", slug)
    .not("slug", "is", null)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const agency = data as AgencyRow;

  if (!agency.slug) {
    notFound();
  }

  const primaryColour = agency.primary_colour ?? "#1B4F72";

  const branding: AgencyBranding = {
    name: agency.name,
    logoUrl: agency.logo_url ?? null,
    primaryColour,
    secondaryColour: agency.secondary_colour ?? null,
    contactEmail: agency.contact_email ?? null,
    slug: agency.slug,
  };

  return (
    <div
      className="flex flex-col min-h-screen bg-surface text-gray-900 antialiased"
      style={{ "--brand-primary": primaryColour } as React.CSSProperties}
    >
      {/* Branded header */}
      <header
        className="px-4 py-3 border-b border-card-border"
        style={{ borderColor: `${primaryColour}22` }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {agency.logo_url ? (
            <Image
              src={agency.logo_url}
              alt={`${agency.name} logo`}
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <span
              className="text-lg font-bold"
              style={{ color: primaryColour }}
            >
              {agency.name}
            </span>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <AgencyBrandingProvider branding={branding}>
          {children}
        </AgencyBrandingProvider>
      </main>

      {/* Powered-by footer */}
      <footer className="border-t border-card-border px-4 py-4 text-center text-xs text-gray-400">
        Powered by{" "}
        <Link
          href="https://clearpaws.com.au"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-600 underline transition-colors"
        >
          ClearPaws
        </Link>
        {" "}— Always verify requirements with{" "}
        <a
          href="https://www.agriculture.gov.au/biosecurity-trade/cats-dogs"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-600"
        >
          DAFF
        </a>{" "}
        before travelling.
      </footer>
    </div>
  );
}
