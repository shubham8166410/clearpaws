import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WelcomeToast } from "@/components/dashboard/WelcomeToast";
import { DashboardTimelines } from "@/components/dashboard/DashboardTimelines";

// Always fetch fresh — timelines are added client-side after generation
export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{ welcome?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const { welcome } = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: timelines } = await supabase
    .from("timelines")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {welcome === "1" && (
        <Suspense>
          <WelcomeToast />
        </Suspense>
      )}
      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">Your timelines</h1>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{user.email}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link
                href="/generate"
                className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-3.5 py-2.5 rounded-xl transition-colors min-h-[44px]"
              >
                + Inbound
              </Link>
              <Link
                href="/outbound"
                className="inline-flex items-center gap-1.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold px-3.5 py-2.5 rounded-xl transition-colors min-h-[44px]"
              >
                + Outbound
              </Link>
            </div>
          </div>

          <DashboardTimelines initialTimelines={timelines ?? []} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
