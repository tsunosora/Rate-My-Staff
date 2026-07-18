"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { api } from "@/lib/fetcher";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { IconUsers, IconClock, IconStar, IconBell, IconAlert, IconCheck, IconAttendance } from "@/components/ui/icons";
import { C, cleanX, cleanY, dotLegend, glassTooltip, areaGradient, pillBars } from "@/components/charts/theme";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

type Dash = {
  kpis: { employees: number; pendingReviews: number; avgScore: number; unread: number };
  performanceTrend: { month: string; avg: number }[];
  attendanceTrend: { date: string; onTime: number; late: number; absent: number }[];
  alerts: string[];
  recentActivity: { id: number; text: string; date: string }[];
};

type EmpCard = {
  id: number;
  fullName: string;
  nickname: string | null;
  employeeCode: string;
  department: string | null;
  position: string | null;
  joinDate: string | null;
  avgScore: number;
  assessmentCount: number;
  onTime: number;
  late: number;
  izin: number;
  activity: { text: string; date: string } | null;
};

export default function DashboardPage() {
  const [d, setD] = useState<Dash | null>(null);
  const [cards, setCards] = useState<EmpCard[] | null>(null);

  useEffect(() => {
    api<Dash>("/api/dashboard").then(setD);
    api<{ cards: EmpCard[] }>("/api/dashboard/employees").then((r) => setCards(r.cards));
  }, []);

  if (!d) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-2" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass h-28 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="glass h-72 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-fg">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted">Ringkasan tim, performa &amp; kehadiran.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Karyawan aktif" value={d.kpis.employees} icon={IconUsers} tone="var(--primary)" />
        <Kpi label="Review tertunda" value={d.kpis.pendingReviews} icon={IconClock} tone="var(--warning)" />
        <Kpi label="Rata-rata skor" value={d.kpis.avgScore.toFixed(2)} icon={IconStar} tone="var(--success)" />
        <Kpi label="Notifikasi" value={d.kpis.unread} icon={IconBell} tone="var(--info)" />
      </div>

      {d.alerts.length > 0 && (
        <div
          className="space-y-1.5 rounded-2xl border p-4 text-sm"
          style={{ borderColor: "color-mix(in oklab, var(--warning) 35%, transparent)", background: "color-mix(in oklab, var(--warning) 10%, transparent)" }}
        >
          {d.alerts.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-fg">
              <IconAlert className="mt-0.5 shrink-0 text-[16px] text-warning" />
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Tren Performa (6 bulan)">
          <div className="h-64">
            <Line
              data={{
                labels: d.performanceTrend.map((p) => p.month),
                datasets: [
                  {
                    label: "Rata-rata skor",
                    data: d.performanceTrend.map((p) => p.avg),
                    borderColor: C.primary,
                    backgroundColor: areaGradient(C.primary),
                    fill: true,
                    tension: 0.45,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: C.primary,
                    pointHoverBorderColor: "#fff",
                    pointHoverBorderWidth: 2,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                scales: { x: cleanX, y: { ...cleanY, min: 0, max: 5 } },
                plugins: { legend: { display: false }, tooltip: glassTooltip },
              } as ChartOptions<"line">}
            />
          </div>
        </Card>
        <Card title="Absensi (7 hari)">
          <div className="h-64">
            <Bar
              data={{
                labels: d.attendanceTrend.map((a) => a.date.slice(5)),
                datasets: [
                  { label: "Tepat", data: d.attendanceTrend.map((a) => a.onTime), backgroundColor: C.success, ...pillBars },
                  { label: "Telat", data: d.attendanceTrend.map((a) => a.late), backgroundColor: C.warning, ...pillBars },
                  { label: "Absen", data: d.attendanceTrend.map((a) => a.absent), backgroundColor: C.danger, ...pillBars },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: cleanX, y: { ...cleanY, beginAtZero: true, ticks: { ...cleanY.ticks, precision: 0 } } },
                plugins: { legend: dotLegend, tooltip: glassTooltip },
              } as ChartOptions<"bar">}
            />
          </div>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-fg">Kinerja per Karyawan</h2>
          {cards && <span className="text-xs text-subtle">{cards.length} karyawan</span>}
        </div>
        {!cards ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass h-44 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-sm text-subtle">Belum ada karyawan aktif.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => (
              <EmployeeCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>

      <Card title="Aktivitas Terbaru">
        {d.recentActivity.length === 0 ? (
          <p className="py-6 text-center text-sm text-subtle">Belum ada aktivitas.</p>
        ) : (
          <ul className="text-sm">
            {d.recentActivity.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-t-0">
                <span className="flex items-center gap-2.5 text-fg">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {a.text}
                </span>
                <span className="tabular shrink-0 text-xs text-subtle">
                  {new Date(a.date).toLocaleDateString("id-ID")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: IconType; tone: string }) {
  return (
    <div className="glass flex flex-col justify-between gap-3 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${tone} 16%, transparent)`, color: tone }}>
          <Icon className="text-[18px]" />
        </span>
      </div>
      <div className="tabular font-display text-3xl font-extrabold text-fg">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-4 text-sm font-semibold text-muted">{title}</h2>
      {children}
    </section>
  );
}

function softChip(color: string): React.CSSProperties {
  return { background: `color-mix(in oklab, ${color} 16%, transparent)`, color };
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

function scoreTone(s: number) {
  return s === 0 ? "var(--fg-subtle)" : s >= 4 ? "var(--success)" : s >= 3 ? "var(--warning)" : "var(--danger)";
}

/** Lama kerja dari joinDate → "2 thn 3 bln". */
function tenure(joinISO: string | null) {
  if (!joinISO) return "—";
  const j = new Date(joinISO);
  const now = new Date();
  let months = (now.getFullYear() - j.getFullYear()) * 12 + (now.getMonth() - j.getMonth());
  if (now.getDate() < j.getDate()) months--;
  if (months < 0) return "—";
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} thn`);
  if (m) parts.push(`${m} bln`);
  return parts.length ? parts.join(" ") : "Baru";
}

function relTime(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86400000;
  if (diff < day) return "hari ini";
  const days = Math.floor(diff / day);
  if (days < 30) return `${days} hr lalu`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo} bln lalu`;
  return `${Math.floor(mo / 12)} thn lalu`;
}

function EmployeeCard({ c }: { c: EmpCard }) {
  const tone = scoreTone(c.avgScore);
  const today = new Date().toISOString().slice(0, 10);
  // Awal rentang: sejak bergabung bila ada, jika tidak awal tahun ini
  // (menghindari iterasi ribuan hari kosong di laporan).
  const from = c.joinDate ? c.joinDate.slice(0, 10) : `${new Date().getFullYear()}-01-01`;
  const attHref = (status: string) =>
    `/attendance/report?${new URLSearchParams({
      employee_id: String(c.id),
      status,
      start_date: from,
      end_date: today,
    })}`;
  const scoreHref = `/reports?search=${encodeURIComponent(c.fullName)}`;

  return (
    <div className="glass flex flex-col gap-4 rounded-2xl p-5">
      {/* Header: identitas + skor (klik → laporan penilaian) */}
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-primary" style={softChip("var(--primary)")}>
          {initials(c.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-fg">{c.fullName}</div>
          <div className="truncate text-xs text-subtle">
            {c.position ?? "—"}{c.department ? ` · ${c.department}` : ""}
          </div>
        </div>
        <Link
          href={scoreHref}
          title="Lihat penilaian"
          className="flex shrink-0 flex-col items-end rounded-lg px-1.5 py-0.5 transition hover:bg-surface-2"
        >
          <span className="tabular font-display text-xl font-extrabold" style={{ color: tone }}>
            {c.avgScore ? c.avgScore.toFixed(2) : "—"}
          </span>
          <span className="flex items-center gap-0.5 text-[10px] text-subtle">
            <IconStar className="text-[11px]" /> skor
          </span>
        </Link>
      </div>

      {/* Statistik kehadiran — klik menuju laporan absensi terfilter */}
      <div className="grid grid-cols-3 gap-2">
        <StatLink href={attHref("on_time")} tone="var(--success)" icon={IconCheck} label="Tepat" value={c.onTime} />
        <StatLink href={attHref("late")} tone="var(--warning)" icon={IconClock} label="Telat" value={c.late} />
        <StatLink href={attHref("izin")} tone="var(--info)" icon={IconAttendance} label="Izin" value={c.izin} />
      </div>

      {/* Footer: lifetime + aktivitas */}
      <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="text-muted">
          Lama kerja: <span className="font-medium text-fg">{tenure(c.joinDate)}</span>
        </span>
        <span className="text-subtle">
          {c.activity ? `${c.activity.text} ${relTime(c.activity.date)}` : "Belum ada aktivitas"}
        </span>
      </div>
    </div>
  );
}

function StatLink({
  href, tone, icon: Icon, label, value,
}: {
  href: string; tone: string; icon: IconType; label: string; value: number;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl px-2.5 py-2 transition hover:brightness-110 hover:ring-1"
      style={{ ...softChip(tone), ["--tw-ring-color" as string]: tone }}
      title={`Lihat data ${label.toLowerCase()}`}
    >
      <div className="flex items-center gap-1 text-[10px] font-medium opacity-80">
        <Icon className="text-[12px]" /> {label}
      </div>
      <div className="tabular mt-0.5 text-lg font-bold">{value}</div>
    </Link>
  );
}
