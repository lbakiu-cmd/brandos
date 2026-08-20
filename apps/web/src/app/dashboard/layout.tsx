"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/inbox", label: "Inbox" },
  { href: "/dashboard/content", label: "Content Studio" },
  { href: "/dashboard/audit", label: "Website Audit" },
  { href: "/dashboard/visibility", label: "AI Visibility" },
  { href: "/dashboard/integrations", label: "WordPress & Integrations" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-slate-800 bg-slate-950 p-4">
        <p className="mb-8 px-2 text-xl font-bold text-blue-400">BrandOS</p>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                pathname === item.href
                  ? "bg-blue-600 font-semibold text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="px-2 text-[10px] text-slate-600">
          AI Visibility Operating System
        </p>
      </aside>
      <div className="pl-60">{children}</div>
    </div>
  );
}