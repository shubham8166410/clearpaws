import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { VetProfileRow, VetClientLinkRow, TimelineRow } from "@/types/database";

export const dynamic = "force-dynamic";

interface ClientSummary {
  timelineId: string;
  petType: string;
  petBreed: string;
  originCountry: string;
  travelDate: string;
  totalSteps: number;
  completedSteps: number;
}

async function fetchDashboardData(userId: string): Promise<{
  vetProfile: VetProfileRow;
  clients: ClientSummary[];
}> {
  const service = createServiceClient();

  // Get vet profile
  const { data: vetProfileData } = await service
    .from("vet_profiles")
    .select("*")
    .eq("user_id", userId)
    .not("verified_at", "is", null)
    .maybeSingle();

  if (!vetProfileData) {
    redirect("/vet-portal");
  }

  const vetProfile = vetProfileData as VetProfileRow;

  // Get all client links
  const { data: linksData } = await service
    .from("vet_client_links")
    .select("*")
    .eq("vet_profile_id", vetProfile.id);

  const links = (linksData ?? []) as VetClientLinkRow[];

  if (links.length === 0) {
    return { vetProfile, clients: [] };
  }

  const timelineIds = links.map((l) => l.timeline_id);

  // Fetch timelines and their progress in parallel
  const [timelinesResult, progressResult] = await Promise.all([
    service
      .from("timelines")
      .select("id, pet_type, pet_breed, origin_country, travel_date, generated_steps")
      .in("id", timelineIds),
    service
      .from("timeline_progress")
      .select("timeline_id, step_index")
      .in("timeline_id", timelineIds),
  ]);

  const timelines = (timelinesResult.data ?? []) as Pick<
    TimelineRow,
    "id" | "pet_type" | "pet_breed" | "origin_country" | "travel_date" | "generated_steps"
  >[];

  const progressRows = (progressResult.data ?? []) as Array<{
    timeline_id: string;
    step_index: number;
  }>;

  // Group completed steps by timeline
  const completedByTimeline = new Map<string, number>();
  for (const row of progressRows) {
    completedByTimeline.set(
      row.timeline_id,
      (completedByTimeline.get(row.timeline_id) ?? 0) + 1
    );
  }

  const clients: ClientSummary[] = timelines.map((t) => ({
    timelineId: t.id,
    petType: t.pet_type,
    petBreed: t.pet_breed,
    originCountry: t.origin_country,
    travelDate: t.travel_date,
    totalSteps: t.generated_steps.steps.length,
    completedSteps: completedByTimeline.get(t.id) ?? 0,
  }));

  // Sort by travel_date ascending
  clients.sort((a, b) => a.travelDate.localeCompare(b.travelDate));

  return { vetProfile, clients };
}

export default async function VetPortalDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/vet-portal");
  }

  const { clients } = await fetchDashboardData(user.id);

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const upcomingClients = clients.filter((c) => {
    const travelDate = new Date(c.travelDate + "T00:00:00");
    return travelDate >= now && travelDate <= thirtyDaysFromNow;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1B4F72]">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your linked clients</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[12px] border border-[#E5E3DF] bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Clients</p>
          <p className="mt-1 text-3xl font-bold text-[#1B4F72]">{clients.length}</p>
        </div>
        <div className="rounded-[12px] border border-[#E5E3DF] bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Travelling in Next 30 Days</p>
          <p className="mt-1 text-3xl font-bold text-[#E67E22]">{upcomingClients.length}</p>
        </div>
      </div>

      {/* Upcoming deadlines */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#1B4F72]">
          Clients with Upcoming Travel
        </h2>

        {clients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E3DF] py-16 text-center">
            <p className="text-sm text-gray-400">No clients linked yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[12px] border border-[#E5E3DF] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Pet</th>
                  <th className="px-6 py-3 font-medium">Origin</th>
                  <th className="px-6 py-3 font-medium">Travel Date</th>
                  <th className="px-6 py-3 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3DF]">
                {clients.map((c) => {
                  const pct =
                    c.totalSteps > 0
                      ? Math.round((c.completedSteps / c.totalSteps) * 100)
                      : 0;

                  return (
                    <tr key={c.timelineId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium capitalize text-gray-800">
                        {c.petType} — {c.petBreed}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{c.originCountry}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(c.travelDate + "T00:00:00").toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-teal-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {c.completedSteps}/{c.totalSteps}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
