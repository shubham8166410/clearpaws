import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AgencyPortalProvider } from "./AgencyPortalProvider";
import { AgencySidebarNav } from "./AgencySidebarNav";
import { ActivateButton } from "./ActivateButton";
import type { AgencyRow } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AgencyPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/agency-portal");
  }

  // 2. Look up agency by owner_user_id
  const serviceClient = createServiceClient();
  const { data: agency, error } = await serviceClient
    .from("agencies")
    .select("*")
    .eq("owner_user_id", user.id)
    .not("slug", "is", null)
    .maybeSingle();

  if (error) {
    console.error("[agency-portal layout] Agency lookup failed:", error.message);
  }

  // State 1 — no agency account
  if (!agency) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="text-2xl mb-4" aria-hidden="true">🏢</p>
          <h1 className="text-xl font-bold text-gray-900 mb-3">
            No agency account found
          </h1>
          <p className="text-gray-600">
            You don&apos;t have a white-label agency account. Contact us at{" "}
            <a
              href="mailto:hello@petborder.com"
              className="text-brand-600 hover:underline font-medium"
            >
              hello@petborder.com
            </a>{" "}
            to get started.
          </p>
        </div>
      </div>
    );
  }

  const agencyRow = agency as AgencyRow;

  // State 2 — agency exists but not subscribed
  if (!agencyRow.stripe_subscription_id) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E5E3DF] p-8 text-center shadow-sm">
          <p className="text-3xl mb-4" aria-hidden="true">🚀</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Activate your white-label portal
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            $299/month · Unlimited leads · Custom branding · API access
          </p>
          <ActivateButton />
        </div>
      </div>
    );
  }

  // State 3 — agency active: full sidebar layout
  return (
    <AgencyPortalProvider agency={agencyRow}>
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
        {/* Header */}
        <header className="border-b border-[#E5E3DF] bg-white px-6 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <span className="text-lg font-bold text-[#1B4F72]">
                {agencyRow.name}
              </span>
              <span className="ml-2 text-sm text-gray-500">
                · PetBorder Agency Portal
              </span>
            </div>
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              Agency
            </span>
          </div>
        </header>

        <div className="flex flex-1 mx-auto w-full max-w-7xl">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-[#E5E3DF] flex-shrink-0">
            <AgencySidebarNav slug={agencyRow.slug!} />
          </aside>

          {/* Main content */}
          <main className="flex-1 px-6 py-8 min-w-0">{children}</main>
        </div>
      </div>
    </AgencyPortalProvider>
  );
}
