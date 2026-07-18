"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
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
import { IconUsers, IconClock, IconStar, IconBell, IconAlert } from "@/components/ui/icons";
import { C, cleanX, cleanY, dotLegend, glassTooltip, areaGradient, pillBars } from "@/components/charts/theme";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

type Dash = {
  kpis: { employees: number; pendingReviews: number; avgScore: number; unread: number };
  performanceTrend: { month: string; avg: number }[];
  attendanceTrend: { date: string; onTime: number; late: number; absent: number }[];
  alerts: string[];
  recentActivity: { id: number; text: string; date: string }[];
};

export default function DashboardPage() {
  const [d, setD] = useState<Dash | null>(null);

  useEffect(() => {
    api<Dash>("/api/dashboard").then(setD);
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
