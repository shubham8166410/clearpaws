"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/agency-portal" },
  { label: "Leads", href: "/agency-portal/leads" },
  { label: "API Keys", href: "/agency-portal/api-keys" },
  { label: "Settings", href: "/agency-portal/settings" },
] as const;

interface AgencySidebarNavProps {
  slug: string;
}

export function AgencySidebarNav({ slug }: AgencySidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/agency-portal"
            ? pathname === "/agency-portal"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-brand-100 text-brand-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <a
        href={`https://${slug}.clearpaws.com.au`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors mt-2 border-t border-gray-100 pt-4"
      >
        View white-label site ↗
      </a>
    </nav>
  );
}
