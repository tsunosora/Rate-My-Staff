"use client";

import { useEffect, useState } from "react";
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
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

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

  if (!d) return <div className="text-slate-400">Memuat…</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Karyawan aktif" value={d.kpis.employees} />
        <Kpi label="Review tertunda" value={d.kpis.pendingReviews} />
        <Kpi label="Rata-rata skor" value={d.kpis.avgScore.toFixed(2)} />
        <Kpi label="Notifikasi" value={d.kpis.unread} />
      </div>

      {d.alerts.length > 0 && (
        <div className="space-y-1 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          {d.alerts.map((a, i) => (
            <div key={i}>• {a}</div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Tren Performa (6 bulan)">
          <Line
            data={{
              labels: d.performanceTrend.map((p) => p.month),
              datasets: [
                {
                  label: "Rata-rata skor",
                  data: d.performanceTrend.map((p) => p.avg),
                  borderColor: "#6366f1",
                  backgroundColor: "rgba(99,102,241,0.2)",
                  tension: 0.3,
                },
              ],
            }}
            options={{ scales: { y: { min: 0, max: 5 } }, plugins: { legend: { display: false } } }}
          />
        </Card>
        <Card title="Absensi (7 hari)">
          <Bar
            data={{
              labels: d.attendanceTrend.map((a) => a.date.slice(5)),
              datasets: [
                { label: "Tepat", data: d.attendanceTrend.map((a) => a.onTime), backgroundColor: "#22c55e" },
                { label: "Telat", data: d.attendanceTrend.map((a) => a.late), backgroundColor: "#eab308" },
                { label: "Absen", data: d.attendanceTrend.map((a) => a.absent), backgroundColor: "#ef4444" },
              ],
            }}
            options={{ scales: { x: { stacked: true }, y: { stacked: true } } }}
          />
        </Card>
      </div>

      <Card title="Aktivitas Terbaru">
        {d.recentActivity.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada aktivitas.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {d.recentActivity.map((a) => (
              <li key={a.id} className="flex justify-between py-2">
                <span className="text-slate-700">{a.text}</span>
                <span className="text-xs text-slate-400">{new Date(a.date).toLocaleDateString("id-ID")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-600">{title}</h2>
      {children}
    </section>
  );
}
