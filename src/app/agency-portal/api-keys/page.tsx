"use client";

import { useState, useEffect } from "react";
import type { ApiKeyListItem, ApiKeyDisplay } from "@/types/api";

export default function AgencyApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<ApiKeyDisplay | null>(null);
  const [copied, setCopied] = useState(false);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  async function fetchKeys() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/api-keys");
      const json = (await res.json()) as { success?: boolean; data?: ApiKeyListItem[]; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to load API keys");
        return;
      }
      setKeys(json.data ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchKeys();
  }, []);

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const json = (await res.json()) as { success?: boolean; data?: ApiKeyDisplay; error?: string };
      if (!res.ok || !json.success || !json.data) {
        setCreateError(json.error ?? "Failed to create API key");
        return;
      }
      setCreatedKey(json.data);
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  function handleModalClose() {
    setShowModal(false);
    setNewKeyName("");
    setCreateError(null);
    if (createdKey) {
      // Add to list without raw key
      const listItem: ApiKeyListItem = {
        id: createdKey.id,
        name: createdKey.name,
        key_prefix: createdKey.key.slice(0, 8),
        last_used_at: null,
        request_count: 0,
        is_active: true,
        agency_id: null,
        created_at: createdKey.created_at,
      };
      setKeys((prev) => [listItem, ...prev]);
      setCreatedKey(null);
    }
    setCopied(false);
  }

  async function handleToggle(key: ApiKeyListItem) {
    const res = await fetch(`/api/api-keys/${key.id}`, { method: "PATCH" });
    const json = (await res.json()) as { success?: boolean; data?: ApiKeyListItem };
    if (res.ok && json.success && json.data) {
      setKeys((prev) => prev.map((k) => (k.id === key.id ? json.data! : k)));
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/api-keys/${confirmDeleteId}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setKeys((prev) => prev.filter((k) => k.id !== confirmDeleteId));
      }
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
      setConfirmDeleteName("");
    }
  }

  async function copyKey() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage API keys for programmatic access</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors min-h-[44px]"
        >
          + Create New Key
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : error ? (
          <div className="py-16 text-center text-red-600 text-sm">{error}</div>
        ) : keys.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 text-sm">
              No API keys yet. Create one to start using the PetBorder API.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Name</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Key</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Last Used</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Requests</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Status</th>
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{key.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">
                      cpk_{key.key_prefix}…
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString("en-AU")
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {key.request_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void handleToggle(key)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          key.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {key.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setConfirmDeleteId(key.id);
                          setConfirmDeleteName(key.name);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            {createdKey ? (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Key Created</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Copy your new API key now. You won&apos;t be able to see it again.
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 break-all">
                    {createdKey.key}
                  </code>
                  <button
                    onClick={() => void copyKey()}
                    className="flex-shrink-0 px-3 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-5">
                  <span className="text-red-500 flex-shrink-0">⚠</span>
                  <p className="text-xs text-red-700">
                    This key will never be shown again. Copy it now and store it securely.
                  </p>
                </div>

                <button
                  onClick={handleModalClose}
                  className="w-full bg-gray-900 text-white font-semibold py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Create New API Key</h2>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Key name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. Production integration"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-200 mb-4"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreate();
                  }}
                />
                {createError && (
                  <p className="text-sm text-red-600 mb-3">{createError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setNewKeyName("");
                      setCreateError(null);
                    }}
                    className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleCreate()}
                    disabled={creating || !newKeyName.trim()}
                    className="flex-1 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    {creating ? "Creating…" : "Create Key"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete API Key</h2>
            <p className="text-sm text-gray-600 mb-5">
              Delete key &ldquo;{confirmDeleteName}&rdquo;? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmDeleteId(null);
                  setConfirmDeleteName("");
                }}
                className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
