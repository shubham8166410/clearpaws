"use client";

import { useState, useEffect, useCallback } from "react";
import { DAFF_MONITORED_PAGES } from "@/lib/daff-monitor";

interface Snapshot {
  id: string;
  page_url: string;
  content_hash: string;
  scraped_at: string;
  changes_detected: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function shortHash(hash: string): string {
  return hash.slice(0, 12);
}

const OUTBOUND_BASE = "/biosecurity-trade/export/controlled-goods/live-animals/companion-and-other-live-animals";

function urlLabel(url: string): string {
  try {
    const path = new URL(url).pathname;
    if (path.startsWith(OUTBOUND_BASE)) {
      const suffix = path.slice(OUTBOUND_BASE.length).replace(/^\//, "");
      return `[outbound] ${suffix || "main export page"}`;
    }
    return path.replace("/biosecurity-trade/cats-dogs", "").replace(/^\//, "") || "cats-dogs (main)";
  } catch {
    return url;
  }
}

function StatusBadge({ snapshot }: { snapshot: Snapshot }) {
  if (!snapshot.changes_detected) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        No change
      </span>
    );
  }
  if (snapshot.reviewed_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
        Reviewed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
      Change detected
    </span>
  );
}

function PageSection({
  url,
  snapshots,
  onMarkReviewed,
}: {
  url: string;
  snapshots: Snapshot[];
  onMarkReviewed: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);

  const unreviewedChange = snapshots.find(
    (s) => s.changes_detected && !s.reviewed_at
  );

  async function handleMarkReviewed(id: string) {
    setMarking(id);
    try {
      await onMarkReviewed(id);
    } finally {
      setMarking(null);
    }
  }

  return (
    <div className="rounded-[12px] border border-[#E5E3DF] bg-white overflow-hidden">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#E5E3DF]">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            {urlLabel(url)}
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#1B4F72] hover:underline truncate block"
          >
            {url}
          </a>
        </div>
        {unreviewedChange && (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 animate-pulse">
            Action required
          </span>
        )}
      </div>

      {/* Snapshot list */}
      {snapshots.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-400">No snapshots yet.</p>
      ) : (
        <div className="divide-y divide-[#F3F4F6]">
          {snapshots.map((snap) => (
            <div key={snap.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <StatusBadge snapshot={snap} />
                  <span className="text-xs text-gray-500">
                    {formatDate(snap.scraped_at)}
                  </span>
                  <code className="text-xs font-mono text-gray-400 hidden sm:inline">
                    {shortHash(snap.content_hash)}
                  </code>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {snap.changes_detected && !snap.reviewed_at && (
                    <button
                      type="button"
                      onClick={() => handleMarkReviewed(snap.id)}
                      disabled={marking === snap.id}
                      className="text-xs font-medium text-[#1B4F72] border border-[#1B4F72] rounded-lg px-2.5 py-1 hover:bg-[#EBF5FB] transition-colors disabled:opacity-50"
                    >
                      {marking === snap.id ? "Saving…" : "Mark reviewed"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === snap.id ? null : snap.id)}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    {expanded === snap.id ? "Hide" : "View content"}
                  </button>
                </div>
              </div>

              {snap.reviewed_at && (
                <p className="mt-1 text-xs text-gray-400">
                  Reviewed {formatDate(snap.reviewed_at)}
                </p>
              )}

              {expanded === snap.id && (
                <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 whitespace-pre-wrap break-words">
                  {/* raw_content not loaded in list query — prompt user to use DB */}
                  Hash: {snap.content_hash}{"\n"}
                  Scraped: {snap.scraped_at}{"\n"}
                  Changes: {snap.changes_detected ? "YES" : "no"}{"\n"}
                  Reviewed: {snap.reviewed_at ?? "—"}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DaffMonitorPage() {
  const [snapshotsByUrl, setSnapshotsByUrl] = useState<
    Record<string, Snapshot[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/daff-monitor");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { data: Snapshot[] };
      const grouped: Record<string, Snapshot[]> = {};
      for (const snap of body.data) {
        if (!grouped[snap.page_url]) grouped[snap.page_url] = [];
        grouped[snap.page_url].push(snap);
      }
      setSnapshotsByUrl(grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleMarkReviewed(id: string) {
    const res = await fetch(`/api/admin/daff-monitor/${id}/review`, {
      method: "PATCH",
    });
    if (!res.ok) {
      alert("Failed to mark as reviewed. Please try again.");
      return;
    }
    await load();
  }

  const unreviewedCount = Object.values(snapshotsByUrl)
    .flat()
    .filter((s) => s.changes_detected && !s.reviewed_at).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B4F72]">DAFF Rule Monitor</h1>
          <p className="mt-1 text-sm text-gray-500">
            Weekly content snapshots of official DAFF pages. Review any changes
            before updating the knowledge base.
          </p>
        </div>
        {unreviewedCount > 0 && (
          <div className="shrink-0 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm font-semibold text-red-800">
            {unreviewedCount} unreviewed change{unreviewedCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-[12px] bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {DAFF_MONITORED_PAGES.map((url) => (
            <PageSection
              key={url}
              url={url}
              snapshots={snapshotsByUrl[url] ?? []}
              onMarkReviewed={handleMarkReviewed}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Snapshots are taken weekly by the DAFF cron job (Sunday 11pm UTC = Monday 9am AEST).
        Changes are detected by SHA-256 hash comparison. Marking a change as reviewed
        records your user ID and timestamp — update <code>src/lib/daff-rules.ts</code> separately if needed.
      </p>
    </div>
  );
}
