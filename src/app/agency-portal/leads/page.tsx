"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgencyLeadListItem } from "@/types/api";
import type { AgencyLeadStatus } from "@/types/database";

const PAGE_SIZE = 25;

const STATUS_TABS: { label: string; value: AgencyLeadStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Converted", value: "converted" },
  { label: "Lost", value: "lost" },
];

const STATUS_BADGE: Record<AgencyLeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-gray-100 text-gray-500",
};

type SortField = "created_at" | "pet_owner_name";
type SortDir = "asc" | "desc";

export default function LeadsPage() {
  const [leads, setLeads] = useState<AgencyLeadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AgencyLeadStatus | "all">("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/agency-leads?${params.toString()}`);
      const json = (await res.json()) as { data?: AgencyLeadListItem[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load leads");
        return;
      }
      setLeads(json.data ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sortedLeads = [...leads].sort((a, b) => {
    let aVal = sortField === "created_at" ? a.created_at : (a.pet_owner_name ?? "");
    let bVal = sortField === "created_at" ? b.created_at : (b.pet_owner_name ?? "");
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  async function updateLead(id: string, patch: { status?: AgencyLeadStatus; notes?: string }) {
    const res = await fetch(`/api/agency-leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
      );
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and track your incoming leads</p>
        </div>
        <button
          onClick={() => window.open("/api/agency-leads/export", "_blank")}
          className="inline-flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : error ? (
          <div className="py-16 text-center text-red-600 text-sm">{error}</div>
        ) : sortedLeads.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 text-sm">
              No leads yet. Share your white-label link to start capturing leads.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="text-left font-medium text-gray-500 px-4 py-3 cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => toggleSort("pet_owner_name")}
                  >
                    Name <SortIcon field="pet_owner_name" />
                  </th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Email</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Status</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Notes</th>
                  <th
                    className="text-left font-medium text-gray-500 px-4 py-3 cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => toggleSort("created_at")}
                  >
                    Date <SortIcon field="created_at" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLeads.map((lead) => (
                  <>
                    <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {lead.pet_owner_name ?? "Anonymous"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{lead.pet_owner_email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            void updateLead(lead.id, {
                              status: e.target.value as AgencyLeadStatus,
                            })
                          }
                          className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-brand-200 ${STATUS_BADGE[lead.status]}`}
                        >
                          <option value="new">new</option>
                          <option value="contacted">contacted</option>
                          <option value="converted">converted</option>
                          <option value="lost">lost</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            setExpandedNotes((prev) => ({
                              ...prev,
                              [lead.id]: !prev[lead.id],
                            }))
                          }
                          className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          {expandedNotes[lead.id] ? "▲ Hide" : "▼ Notes"}
                          {lead.notes ? " •" : ""}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString("en-AU")}
                      </td>
                    </tr>
                    {expandedNotes[lead.id] && (
                      <tr key={`${lead.id}-notes`} className="bg-gray-50 border-b border-gray-100">
                        <td colSpan={5} className="px-4 py-3">
                          <textarea
                            rows={3}
                            defaultValue={lead.notes ?? ""}
                            placeholder="Add notes…"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-brand-200"
                            onChange={(e) =>
                              setEditingNotes((prev) => ({
                                ...prev,
                                [lead.id]: e.target.value,
                              }))
                            }
                            onBlur={() => {
                              const notes = editingNotes[lead.id];
                              if (notes !== undefined) {
                                void updateLead(lead.id, { notes });
                              }
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && sortedLeads.length > 0 && (
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={sortedLeads.length < PAGE_SIZE}
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
