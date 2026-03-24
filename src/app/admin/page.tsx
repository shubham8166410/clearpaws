import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/subscription";
import type { AdminStats } from "@/types/admin";

export const metadata: Metadata = {
  title: "Admin Dashboard | PetBorder",
};

// ── Data fetching helpers ─────────────────────────────────────────────────────

async function fetchAdminStats(): Promise<AdminStats> {
  const service = createServiceClient();
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  // All queries in parallel
  const [
    profilesResult,
    purchasesResult,
    subscriptionsResult,
    clicksResult,
    timelinesResult,
    recentTimelinesResult,
  ] = await Promise.all([
    service.from("profiles").select("role"),
    service.from("purchases").select("amount_cents"),
    service.from("subscriptions").select("id").eq("status", "active"),
    service.from("referral_clicks").select("agency_name"),
    service.from("timelines").select("id"),
    service.from("timelines").select("id").gte("created_at", thirtyDaysAgo),
  ]);

  // Users by role
  const profileRows = (profilesResult.data ?? []) as Array<{ role: string }>;
  const byRole = { free: 0, paid_once: 0, subscriber: 0, admin: 0 };
  for (const row of profileRows) {
    const r = row.role as keyof typeof byRole;
    if (r in byRole) byRole[r]++;
  }

  // Purchases
  const purchaseRows = (purchasesResult.data ?? []) as Array<{
    amount_cents: number;
  }>;
  const totalPurchases = purchaseRows.length;
  const purchaseRevenueAUD =
    purchaseRows.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0) / 100;

  // Active subscriptions
  const activeSubscriptions = (subscriptionsResult.data ?? []).length;

  // Referral clicks
  const clicks = (clicksResult.data ?? []) as Array<{ agency_name: string }>;
  const totalClicks = clicks.length;
  const clickMap = new Map<string, number>();
  for (const click of clicks) {
    const name = click.agency_name;
    clickMap.set(name, (clickMap.get(name) ?? 0) + 1);
  }
  const topAgencies = [...clickMap.entries()]
    .map(([agency_name, count]) => ({ agency_name, clicks: count }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  return {
    users: { total: profileRows.length, byRole },
    revenue: { totalPurchases, purchaseRevenueAUD, activeSubscriptions },
    referrals: { totalClicks, topAgencies },
    timelines: {
      total: (timelinesResult.data ?? []).length,
      last30Days: (recentTimelinesResult.data ?? []).length,
    },
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[12px] border border-[#E5E3DF] bg-white p-6 shadow-sm"
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-3xl font-bold text-[#1B4F72]">{value}</p>
      {children && <div className="mt-3 text-sm text-gray-600">{children}</div>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  // Defense-in-depth: verify admin role even though layout also checks
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/admin");
  const role = await getUserRole(user.id);
  if (role !== "admin") redirect("/dashboard");

  const stats = await fetchAdminStats();

  const revenueDisplay = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
  }).format(stats.revenue.purchaseRevenueAUD);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1B4F72]">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform overview — all time
        </p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Users */}
        <StatCard title="Total Users" value={String(stats.users.total)}>
          <ul className="space-y-0.5">
            <li>
              Free:{" "}
              <span className="font-semibold">{stats.users.byRole.free}</span>
            </li>
            <li>
              Paid:{" "}
              <span className="font-semibold">
                {stats.users.byRole.paid_once}
              </span>
            </li>
            <li>
              Subscriber:{" "}
              <span className="font-semibold">
                {stats.users.byRole.subscriber}
              </span>
            </li>
            <li>
              Admin:{" "}
              <span className="font-semibold">{stats.users.byRole.admin}</span>
            </li>
          </ul>
        </StatCard>

        {/* Revenue */}
        <StatCard title="Revenue" value={revenueDisplay}>
          <p>
            {stats.revenue.totalPurchases} document pack
            {stats.revenue.totalPurchases !== 1 ? "s" : ""} sold
          </p>
          <p className="mt-0.5">
            <span className="font-semibold text-green-600">
              {stats.revenue.activeSubscriptions}
            </span>{" "}
            active subscription
            {stats.revenue.activeSubscriptions !== 1 ? "s" : ""}
          </p>
        </StatCard>

        {/* Referral Clicks */}
        <StatCard
          title="Referral Clicks"
          value={String(stats.referrals.totalClicks)}
        >
          {stats.referrals.topAgencies.length > 0 ? (
            <ul className="space-y-0.5">
              {stats.referrals.topAgencies.map((a) => (
                <li key={a.agency_name} className="flex justify-between">
                  <span>{a.agency_name}</span>
                  <span className="font-semibold text-[#E67E22]">
                    {a.clicks}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No clicks yet</p>
          )}
        </StatCard>

        {/* Timelines */}
        <StatCard
          title="Timelines Generated"
          value={String(stats.timelines.total)}
        >
          <p>
            <span className="font-semibold text-[#E67E22]">
              {stats.timelines.last30Days}
            </span>{" "}
            in the last 30 days
          </p>
        </StatCard>
      </div>

      {/* Top Agencies Table */}
      {stats.referrals.topAgencies.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[#1B4F72]">
            Top Referral Agencies
          </h2>
          <div className="overflow-hidden rounded-[12px] border border-[#E5E3DF] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Agency</th>
                  <th className="px-6 py-3 font-medium">Total Clicks</th>
                  <th className="px-6 py-3 font-medium">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3DF]">
                {stats.referrals.topAgencies.map((agency) => {
                  const pct =
                    stats.referrals.totalClicks > 0
                      ? (
                          (agency.clicks / stats.referrals.totalClicks) *
                          100
                        ).toFixed(1)
                      : "0.0";
                  return (
                    <tr key={agency.agency_name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-[#1B4F72]">
                        {agency.agency_name}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {agency.clicks}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section className="flex gap-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 rounded-[12px] bg-[#1B4F72] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#154060] transition-colors"
        >
          View All Users
        </Link>
      </section>
    </div>
  );
}
