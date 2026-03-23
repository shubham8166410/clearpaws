import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { ProgressTracker } from "@/components/dashboard/ProgressTracker";
import { PurchaseButton } from "@/components/dashboard/PurchaseButton";
import { PaymentSuccessCelebration } from "@/components/dashboard/PaymentSuccessCelebration";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}

export default async function TimelineDetailPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const { id } = await params;
  const { payment } = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: timeline }, { data: progressRows }, { data: purchase }] = await Promise.all([
    supabase.from("timelines").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("timeline_progress").select("step_index").eq("timeline_id", id).eq("user_id", user.id),
    supabase.from("purchases").select("id").eq("timeline_id", id).eq("user_id", user.id).single(),
  ]);

  if (!timeline) notFound();

  const completedStepIndices = (progressRows ?? []).map((r) => r.step_index);
  const hasPurchase = !!purchase;
  const steps = timeline.generated_steps.steps ?? [];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">

          {/* Payment celebration */}
          {payment === "success" && (
            <PaymentSuccessCelebration timelineId={id} />
          )}
          {payment === "cancelled" && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-sm text-amber-800">Payment was cancelled. Your progress is saved.</p>
            </div>
          )}

          {/* Header card */}
          <div className="bg-brand-600 text-white rounded-2xl p-5">
            <h1 className="text-lg font-bold mb-1">
              {timeline.pet_breed} · {timeline.pet_type}
            </h1>
            <p className="text-sm text-brand-100">
              {timeline.origin_country} → Australia · Group {timeline.daff_group}
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-xs text-brand-100 mb-0.5">Travel date</p>
                <p className="text-sm font-semibold">
                  {new Date(timeline.travel_date + "T00:00:00").toLocaleDateString("en-AU", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-xs text-brand-100 mb-0.5">Progress</p>
                <p className="text-sm font-semibold">
                  {completedStepIndices.length} / {steps.length} steps done
                </p>
              </div>
            </div>
          </div>

          {/* Progress tracker */}
          <ProgressTracker
            timelineId={id}
            steps={steps}
            initialCompletedIndices={completedStepIndices}
          />

          {/* PDF purchase CTA */}
          <PurchaseButton timelineId={id} hasPurchase={hasPurchase} />

          {/* Summary */}
          {timeline.generated_steps.summary && (
            <div className="bg-white border border-card-border rounded-2xl p-5">
              <h2 className="font-bold text-gray-900 mb-2">Summary</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{timeline.generated_steps.summary}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
