import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { AgencyLeadRow, ApiKeyRow } from "@/types/database";
import type { AgencyLeadStatus } from "@/types/database";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<AgencyLeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-gray-100 text-gray-500",
};

export default async function AgencyPortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/agency-portal");

  const serviceClient = createServiceClient();

  // Re-fetch the agency (same auth check as layout)
  const { data: agency } = await serviceClient
    .from("agencies")
    .select("id, name")
    .eq("owner_user_id", user.id)
    .not("slug", "is", null)
    .maybeSingle();

  if (!agency) redirect("/agency-portal");

  // Fetch all leads for stats
  const { data: allLeads } = await serviceClient
    .from("agency_leads")
    .select("id, status, created_at")
    .eq("agency_id", agency.id);

  const leads = (allLeads ?? []) as Pick<AgencyLeadRow, "id" | "status" | "created_at">[];

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === "new").length;
  const convertedLeads = leads.filter((l) => l.status === "converted").length;
  const conversionRate =
    totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  // Recent 5 leads
  const { data: recentLeadsData } = await serviceClient
    .from("agency_leads")
    .select("id, pet_owner_name, pet_owner_email, status, created_at")
    .eq("agency_id", agency.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentLeads = (recentLeadsData ?? []) as Pick<
    AgencyLeadRow,
    "id" | "pet_owner_name" | "pet_owner_email" | "status" | "created_at"
  >[];

  // Active API keys
  const { data: apiKeysData } = await serviceClient
    .from("api_keys")
    .select("id, name, request_count, is_active, key_prefix")
    .eq("agency_id", agency.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const apiKeys = (apiKeysData ?? []) as Pick<
    ApiKeyRow,
    "id" | "name" | "request_count" | "is_active" | "key_prefix"
  >[];

  const statCards = [
    { label: "Total Leads", value: totalLeads },
    { label: "New", value: newLeads },
    { label: "Converted", value: convertedLeads },
    { label: "Conversion Rate", value: `${conversionRate}%` },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Overview of your agency&apos;s leads and API usage
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <p className="text-sm text-gray-500 font-medium">{card.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent leads */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Leads</h2>
        {recentLeads.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No leads yet. Share your white-label link to start capturing leads.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-500 pb-3 pr-4">Name</th>
                  <th className="text-left font-medium text-gray-500 pb-3 pr-4">Email</th>
                  <th className="text-left font-medium text-gray-500 pb-3 pr-4">Status</th>
                  <th className="text-left font-medium text-gray-500 pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      {lead.pet_owner_name ?? "Anonymous"}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{lead.pet_owner_email}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[lead.status]}`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString("en-AU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* API Usage */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API Usage</h2>
        {apiKeys.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No active API keys. Create one in the API Keys section.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{key.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{key.key_prefix}…</p>
                </div>
                <p className="text-sm text-gray-600">
                  {key.request_count.toLocaleString()} requests
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
