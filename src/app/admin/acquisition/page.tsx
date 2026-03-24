import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/subscription";
import { AcquisitionDashboard } from "./AcquisitionDashboard";
import type { AcquisitionStats } from "@/types/admin";
import type { ApiSuccessResponse } from "@/types/api";

export const metadata: Metadata = {
  title: "Acquisition Analytics | PetBorder Admin",
};

export const dynamic = "force-dynamic";

async function fetchAcquisitionStats(): Promise<AcquisitionStats | null> {
  try {
    const service = createServiceClient();

    // ── MRR ──────────────────────────────────────────────────────────────────
    const [
      activeSubsResult,
      activeAgencySubsResult,
      allProfilesResult,
      newProfilesResult,
      cancelledSubsResult,
      activeSubsCountResult,
      totalTimelinesResult,
      purchasesResult,
      topCountriesResult,
      apiUsageResult,
      whitelabelResult,
      referralClicksResult,
      mrrHistoryResult,
    ] = await Promise.all([
      service.from("subscriptions").select("id").eq("status", "active"),
      service
        .from("agencies")
        .select("id, name, stripe_subscription_id")
        .not("stripe_subscription_id", "is", null),
      service.from("profiles").select("id"),
      service
        .from("profiles")
        .select("id")
        .gte(
          "created_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        ),
      service
        .from("subscriptions")
        .select("id")
        .eq("status", "cancelled")
        .gte(
          "created_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        ),
      service.from("subscriptions").select("id").eq("status", "active"),
      service.from("timelines").select("id, created_at"),
      service
        .from("purchases")
        .select("id, timeline_id, paid_at, created_at"),
      service.from("timelines").select("origin_country"),
      service
        .from("api_keys")
        .select("agency_id, request_count")
        .not("agency_id", "is", null),
      service.from("agency_leads").select("agency_id"),
      service.from("referral_clicks").select("agency_name"),
      service
        .from("subscriptions")
        .select("created_at, status")
        .order("created_at", { ascending: true }),
    ]);

    // MRR
    const activeConsumerCount = (activeSubsResult.data ?? []).length;
    const activeAgencyCount = (activeAgencySubsResult.data ?? []).length;
    const mrr = activeConsumerCount * 990 + activeAgencyCount * 29900;

    // MRR history
    const now = new Date();
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      months.push(`${y}-${m}`);
    }

    const allSubs = (mrrHistoryResult.data ?? []) as Array<{
      created_at: string;
      status: string;
    }>;

    const mrrHistory = months.map((ym) => {
      const start = `${ym}-01T00:00:00.000Z`;
      const [y, mo] = ym.split("-").map(Number);
      const endDate = new Date(y, mo, 1);
      endDate.setMilliseconds(-1);
      const end = endDate.toISOString();
      const createdThisMonth = allSubs.filter(
        (s) => s.created_at >= start && s.created_at <= end
      ).length;
      return { month: ym, mrr: createdThisMonth * 990 };
    });

    // Users
    const totalUsers = (allProfilesResult.data ?? []).length;
    const newUsersLast7Days = (newProfilesResult.data ?? []).length;
    const churnedLast30Days = (cancelledSubsResult.data ?? []).length;
    const activeSubs = (activeSubsCountResult.data ?? []).length;
    const churnRate =
      activeSubs + churnedLast30Days > 0
        ? Math.round(
            (churnedLast30Days / (activeSubs + churnedLast30Days)) * 1000
          ) / 10
        : 0;

    // Conversion
    const timelines = (totalTimelinesResult.data ?? []) as Array<{
      id: string;
      created_at: string;
    }>;
    const totalTimelines = timelines.length;

    const purchases = (purchasesResult.data ?? []) as Array<{
      id: string;
      timeline_id: string | null;
      paid_at: string;
      created_at: string;
    }>;
    const totalPurchases = purchases.length;

    const timelineToPaymentRate =
      totalTimelines > 0
        ? Math.round((totalPurchases / totalTimelines) * 1000) / 10
        : 0;

    const timelineMap = new Map(timelines.map((t) => [t.id, t.created_at]));
    const diffs: number[] = [];
    for (const p of purchases) {
      if (p.timeline_id && timelineMap.has(p.timeline_id)) {
        const tCreated = new Date(timelineMap.get(p.timeline_id)!).getTime();
        const pPaid = new Date(p.paid_at ?? p.created_at).getTime();
        const diffDays = (pPaid - tCreated) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0) diffs.push(diffDays);
      }
    }
    const avgDaysTimelineToPurchase =
      diffs.length > 0
        ? Math.round(
            (diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10
          ) / 10
        : 0;

    // Top origin countries
    const countryRows = (topCountriesResult.data ?? []) as Array<{
      origin_country: string;
    }>;
    const countryMap = new Map<string, number>();
    for (const row of countryRows) {
      const c = row.origin_country;
      countryMap.set(c, (countryMap.get(c) ?? 0) + 1);
    }
    const topOriginCountries = [...countryMap.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // API usage by partner
    const apiKeyRows = (apiUsageResult.data ?? []) as Array<{
      agency_id: string | null;
      request_count: number;
    }>;
    const apiByAgency = new Map<string, number>();
    for (const row of apiKeyRows) {
      if (row.agency_id) {
        apiByAgency.set(
          row.agency_id,
          (apiByAgency.get(row.agency_id) ?? 0) + (row.request_count ?? 0)
        );
      }
    }
    const agencyIdsForApi = [...apiByAgency.keys()];
    const apiAgencyNames = new Map<string, string>();
    if (agencyIdsForApi.length > 0) {
      const { data: agenciesData } = await service
        .from("agencies")
        .select("id, name")
        .in("id", agencyIdsForApi);
      for (const a of agenciesData ?? []) {
        const row = a as { id: string; name: string };
        apiAgencyNames.set(row.id, row.name);
      }
    }
    const apiUsageByPartner = [...apiByAgency.entries()]
      .map(([agencyId, requestCount]) => ({
        agencyId,
        agencyName: apiAgencyNames.get(agencyId) ?? agencyId,
        requestCount,
      }))
      .sort((a, b) => b.requestCount - a.requestCount);

    // White-label leads
    const leadRows = (whitelabelResult.data ?? []) as Array<{
      agency_id: string;
    }>;
    const leadByAgency = new Map<string, number>();
    for (const row of leadRows) {
      leadByAgency.set(
        row.agency_id,
        (leadByAgency.get(row.agency_id) ?? 0) + 1
      );
    }
    const agencyIdsForLeads = [...leadByAgency.keys()];
    const leadAgencyNames = new Map<string, string>();
    if (agencyIdsForLeads.length > 0) {
      const { data: agenciesData } = await service
        .from("agencies")
        .select("id, name")
        .in("id", agencyIdsForLeads);
      for (const a of agenciesData ?? []) {
        const row = a as { id: string; name: string };
        leadAgencyNames.set(row.id, row.name);
      }
    }
    const whitelabelUsageByAgency = [...leadByAgency.entries()]
      .map(([agencyId, leadCount]) => ({
        agencyId,
        agencyName: leadAgencyNames.get(agencyId) ?? agencyId,
        leadCount,
      }))
      .sort((a, b) => b.leadCount - a.leadCount);

    // Referral clicks
    const clickRows = (referralClicksResult.data ?? []) as Array<{
      agency_name: string;
    }>;
    const clickMap = new Map<string, number>();
    for (const row of clickRows) {
      const n = row.agency_name;
      clickMap.set(n, (clickMap.get(n) ?? 0) + 1);
    }
    const referralClicksByAgency = [...clickMap.entries()]
      .map(([agencyName, clicks]) => ({ agencyName, clicks, conversions: 0 }))
      .sort((a, b) => b.clicks - a.clicks);

    const stats: AcquisitionStats = {
      mrr,
      mrrHistory,
      totalUsers,
      newUsersLast7Days,
      churnedLast30Days,
      churnRate,
      totalTimelines,
      totalPurchases,
      timelineToPaymentRate,
      avgDaysTimelineToPurchase,
      topOriginCountries,
      apiUsageByPartner,
      whitelabelUsageByAgency,
      referralClicksByAgency,
    };

    return stats;
  } catch (err) {
    console.error("[admin/acquisition] fetchAcquisitionStats error:", err);
    return null;
  }
}

export default async function AcquisitionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/admin/acquisition");
  const role = await getUserRole(user.id);
  if (role !== "admin") redirect("/dashboard");

  const stats = await fetchAcquisitionStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1B4F72]">
          Acquisition Analytics
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Revenue, growth, and conversion metrics for acquisition readiness
        </p>
      </div>
      <AcquisitionDashboard stats={stats} />
    </div>
  );
}
