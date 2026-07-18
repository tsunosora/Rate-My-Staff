"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType, type SVGProps } from "react";
import {
  IconDashboard,
  IconAttendance,
  IconUsers,
  IconStar,
  IconSettings,
  IconChevronDown,
} from "@/components/ui/icons";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;
type Access = "all" | "manager" | "admin";
type NavItem = { label: string; href: string; require?: Access };
type NavGroup = {
  label: string;
  href?: string;
  icon: IconType;
  require?: Access;
  children?: NavItem[];
};

const NAV: NavGroup[] = [
  { label: "Dashboard", href: "/dashboard", icon: IconDashboard },
  {
    label: "Absensi",
    icon: IconAttendance,
    require: "manager",
    children: [
      { label: "Dashboard", href: "/attendance" },
      { label: "Laporan Detail", href: "/attendance/report" },
      { label: "Struk", href: "/attendance/receipt" },
    ],
  },
  { label: "Direktori", href: "/employees", icon: IconUsers, require: "manager" },
  {
    label: "Penilaian",
    icon: IconStar,
    children: [
      { label: "Skor Baru", href: "/assessments/single" },
      { label: "Skor Massal", href: "/assessments/bulk" },
      { label: "Template", href: "/assessments/templates" },
      { label: "Laporan", href: "/reports" },
    ],
  },
  {
    label: "Pengaturan",
    icon: IconSettings,
    require: "manager",
    children: [
      { label: "Umum", href: "/settings" },
      { label: "Jadwal Kerja", href: "/settings/work-schedules" },
      { label: "Akun & Peran", href: "/settings/users", require: "admin" },
    ],
  },
];

function allowed(access: Access | undefined, role?: string | null): boolean {
  const isAdmin = role === "ADMIN" || role === "OWNER";
  const isManager = isAdmin || role === "HR";
  if (access === "admin") return isAdmin;
  if (access === "manager") return isManager;
  return true;
}

/** Saring NAV sesuai role: buang grup/anak yang tak diizinkan. */
function navForRole(role?: string | null): NavGroup[] {
  return NAV.filter((g) => allowed(g.require, role))
    .map((g) =>
      g.children
        ? { ...g, children: g.children.filter((c) => allowed(c.require, role)) }
        : g
    )
    .filter((g) => !g.children || g.children.length > 0);
}

export function Sidebar({ role }: { role?: string | null }) {
  return (
    <aside className="glass sticky top-0 z-20 hidden h-screen w-64 shrink-0 flex-col gap-1 rounded-none border-y-0 border-l-0 p-4 lg:flex">
      <SidebarNav role={role} />
    </aside>
  );
}

/** Shared nav content — used by the desktop aside and the mobile drawer. */
export function SidebarNav({ role }: { role?: string | null }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  const nav = navForRole(role);

  return (
    <>
      <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-on-primary shadow-lg shadow-primary/30">
          <span className="font-display text-lg font-extrabold">R</span>
        </span>
        <span className="font-display text-lg font-bold tracking-tight text-fg">
          Rate<span className="text-primary">My</span>Staff
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 text-sm">
        {nav.map((group) =>
          group.children ? (
            <NavGroupItem key={group.label} group={group} isActive={isActive} />
          ) : (
            <Link
              key={group.label}
              href={group.href!}
              className={linkClass(isActive(group.href!))}
            >
              <group.icon className="text-[18px] shrink-0" />
              <span>{group.label}</span>
            </Link>
          )
        )}
      </nav>

      <div className="mt-auto rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted">
        <p className="font-semibold text-fg">Team Management</p>
        <p className="mt-0.5 leading-relaxed">
          Absensi, proyek, briefing &amp; penilaian dalam satu tempat.
        </p>
      </div>
    </>
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
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
          anyActive && !open
            ? "text-fg"
            : "text-muted hover:bg-surface-2 hover:text-fg"
        }`}
      >
        <group.icon className="text-[18px] shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <IconChevronDown
          className={`text-[15px] text-subtle transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-200 ${
          open ? "mt-1 grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="ml-4 flex flex-col gap-0.5 border-l border-border pl-3">
            {group.children!.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className={subLinkClass(isActive(c.href))}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function linkClass(active: boolean) {
  return [
    "flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition",
    active
      ? "bg-gradient-to-r from-primary to-primary-2 text-on-primary shadow-lg shadow-primary/25"
      : "text-muted hover:bg-surface-2 hover:text-fg",
  ].join(" ");
}

function subLinkClass(active: boolean) {
  return [
    "rounded-lg px-3 py-2 transition",
    active
      ? "bg-surface-2 font-medium text-primary"
      : "text-muted hover:bg-surface-2 hover:text-fg",
  ].join(" ");
}
