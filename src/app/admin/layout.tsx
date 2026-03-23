import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/subscription";

const NAV_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/vets", label: "Vet Verification" },
  { href: "/admin/agencies", label: "Agencies" },
  { href: "/admin/acquisition", label: "Acquisition" },
  { href: "/admin/daff-monitor", label: "DAFF Monitor" },
] as const;

/**
 * Server-side admin double-check.
 * Middleware already gates /admin routes, but this provides a defense-in-depth
 * server component check in case middleware is bypassed.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/admin");
  }

  const role = await getUserRole(user.id);
  if (role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="border-b border-[#E5E3DF] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-lg font-bold text-[#1B4F72]">
            PetBorder Admin
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Admin
          </span>
        </div>
      </header>

      {/* Sidebar + content layout */}
      <div className="mx-auto flex max-w-6xl gap-0 px-6 py-8 lg:gap-8">
        {/* Sidebar nav */}
        <nav className="hidden w-48 shrink-0 lg:block">
          <ul className="space-y-1">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-[#EBF5FB] hover:text-[#1B4F72] transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile horizontal nav */}
        <div className="mb-6 flex gap-2 overflow-x-auto lg:hidden">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 rounded-lg border border-[#E5E3DF] bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-[#EBF5FB] hover:text-[#1B4F72] transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Page content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
