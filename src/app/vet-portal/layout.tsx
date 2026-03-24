import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { VetProfileRow } from "@/types/database";

export const metadata: Metadata = {
  title: "Vet Portal | PetBorder",
  robots: { index: false, follow: false },
};

interface Props {
  children: React.ReactNode;
}

/**
 * Vet portal layout — server component.
 * Guards access and renders appropriate state based on vet verification status.
 */
export default async function VetPortalLayout({ children }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/vet-portal");
  }

  const service = createServiceClient();
  const { data: vetProfileData } = await service
    .from("vet_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const vetProfile = vetProfileData as VetProfileRow | null;

  // No vet profile — show registration prompt
  if (!vetProfile) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <header className="border-b border-[#E5E3DF] bg-white px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <span className="text-lg font-bold text-[#1B4F72]">PetBorder Vet Portal</span>
          </div>
        </header>
        <main className="mx-auto max-w-lg px-6 py-16 text-center">
          <div className="rounded-2xl border border-[#E5E3DF] bg-white p-10">
            <p className="mb-3 text-4xl" aria-hidden="true">🩺</p>
            <h1 className="mb-2 text-xl font-bold text-[#1B4F72]">Join the Vet Portal</h1>
            <p className="mb-6 text-sm text-gray-500">
              Register your AHPRA credentials to manage compliance timelines for your clients.
            </p>
            <Link
              href="/vet-portal/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1B4F72] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#154060]"
            >
              Register as a vet →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Profile exists but not yet verified
  if (!vetProfile.verified_at) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <header className="border-b border-[#E5E3DF] bg-white px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <span className="text-lg font-bold text-[#1B4F72]">PetBorder Vet Portal</span>
          </div>
        </header>
        <main className="mx-auto max-w-lg px-6 py-16 text-center">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10">
            <p className="mb-3 text-4xl" aria-hidden="true">⏳</p>
            <h1 className="mb-2 text-xl font-bold text-amber-800">Application Under Review</h1>
            <p className="mb-4 text-sm text-amber-700">
              Your application is under review. We typically respond within 2 business days.
            </p>
            <p className="text-sm text-amber-600">
              Questions?{" "}
              <a
                href={`mailto:${process.env.ADMIN_EMAIL ?? "support@petborder.com"}`}
                className="font-semibold underline underline-offset-2"
              >
                Contact support
              </a>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Verified vet — render full portal with sidebar nav
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="border-b border-[#E5E3DF] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-lg font-bold text-[#1B4F72]">PetBorder Vet Portal</span>
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
            Verified Vet
          </span>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-8">
        {/* Sidebar */}
        <nav className="w-48 flex-shrink-0">
          <ul className="flex flex-col gap-1">
            <li>
              <Link
                href="/vet-portal"
                className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-[#EAF2F8] hover:text-[#1B4F72]"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/vet-portal/clients"
                className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-[#EAF2F8] hover:text-[#1B4F72]"
              >
                Clients
              </Link>
            </li>
            <li>
              <Link
                href="/vet-portal/profile"
                className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-[#EAF2F8] hover:text-[#1B4F72]"
              >
                Profile
              </Link>
            </li>
          </ul>
        </nav>

        {/* Main content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
