import type { Metadata } from "next";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { AdminUser } from "@/types/admin";

export const metadata: Metadata = {
  title: "Users | PetBorder Admin",
};

const PAGE_SIZE = 20;

// ── Role badge ────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  paid_once: "bg-blue-100 text-blue-700",
  subscriber: "bg-green-100 text-green-700",
  admin: "bg-red-100 text-red-700",
};

function RoleBadge({ role }: { role: string }) {
  const classes = ROLE_BADGE[role] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${classes}`}
    >
      {role.replace("_", " ")}
    </span>
  );
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchUsers(page: number): Promise<{ users: AdminUser[]; total: number }> {
  const service = createServiceClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await service
    .from("profiles")
    .select("id, email, role, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  return {
    users: (data ?? []) as AdminUser[],
    total: count ?? 0,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawPage = params.page;
  const page = Math.max(1, parseInt(typeof rawPage === "string" ? rawPage : "1", 10) || 1);

  const { users, total } = await fetchUsers(page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B4F72]">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} total user{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-[#1B4F72] underline underline-offset-2 hover:text-[#154060]"
        >
          Back to dashboard
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[12px] border border-[#E5E3DF] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E3DF]">
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-12 text-center text-gray-400"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {u.email}
                  </td>
                  <td className="px-6 py-4">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {formatDate(u.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={`/admin/users?page=${page - 1}`}
                className="rounded-[8px] border border-[#E5E3DF] bg-white px-4 py-2 font-medium text-[#1B4F72] hover:bg-gray-50 transition-colors"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-[8px] border border-[#E5E3DF] bg-gray-50 px-4 py-2 font-medium text-gray-300 cursor-not-allowed">
                Previous
              </span>
            )}

            {page < totalPages ? (
              <Link
                href={`/admin/users?page=${page + 1}`}
                className="rounded-[8px] border border-[#E5E3DF] bg-white px-4 py-2 font-medium text-[#1B4F72] hover:bg-gray-50 transition-colors"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-[8px] border border-[#E5E3DF] bg-gray-50 px-4 py-2 font-medium text-gray-300 cursor-not-allowed">
                Next
              </span>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
