"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = { label: string; href: string };
type NavGroup = { label: string; href?: string; children?: NavItem[] };

const NAV: NavGroup[] = [
  { label: "Dashboard", href: "/dashboard" },
  {
    label: "Attendance",
    children: [
      { label: "Dashboard", href: "/attendance" },
      { label: "Detailed Report", href: "/attendance/report" },
    ],
  },
  { label: "Directory", href: "/employees" },
  {
    label: "Assessment",
    children: [
      { label: "New Score", href: "/assessments/single" },
      { label: "Bulk Score", href: "/assessments/bulk" },
      { label: "Templates", href: "/assessments/templates" },
      { label: "Reports", href: "/reports" },
    ],
  },
  {
    label: "Settings",
    children: [
      { label: "General", href: "/settings" },
      { label: "Work Schedules", href: "/settings/work-schedules" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-4">
      <div className="mb-4 px-2 text-lg font-bold text-slate-800">RateMyStaff</div>
      <nav className="flex flex-col gap-1 text-sm">
        {NAV.map((group) =>
          group.children ? (
            <NavGroupItem key={group.label} group={group} isActive={isActive} />
          ) : (
            <Link
              key={group.label}
              href={group.href!}
              className={linkClass(isActive(group.href!))}
            >
              {group.label}
            </Link>
          )
        )}
      </nav>
    </aside>
  );
}

function NavGroupItem({
  group,
  isActive,
}: {
  group: NavGroup;
  isActive: (href: string) => boolean;
}) {
  const anyActive = group.children!.some((c) => isActive(c.href));
  const [open, setOpen] = useState(anyActive);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100"
      >
        <span>{group.label}</span>
        <span className="text-xs text-slate-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="ml-3 mt-1 flex flex-col gap-1 border-l border-slate-200 pl-2">
          {group.children!.map((c) => (
            <Link key={c.href} href={c.href} className={linkClass(isActive(c.href))}>
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function linkClass(active: boolean) {
  return [
    "rounded-lg px-3 py-2 transition",
    active
      ? "bg-slate-800 text-white"
      : "text-slate-600 hover:bg-slate-100",
  ].join(" ");
}
