"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { C, cleanX, cleanY, dotLegend, glassTooltip, pillBars } from "@/components/charts/theme";
import { Card, Empty, hm } from "./ui";
import type { AttendanceRow } from "./types";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

/**
 * Jam kerja per hari (batang) ditumpuk dengan menit telat (garis) — supaya karyawan
 * bisa melihat sendiri hari mana ia datang terlambat dan berapa lama ia bekerja.
 */
export function WorkChart({ rows, periodLabel }: { rows: AttendanceRow[]; periodLabel: string }) {
  const worked = rows.filter((r) => r.clockIn || r.clockOut);

  const { data, options } = useMemo(() => {
    const labels = worked.map((r) => r.date.slice(8)); // tanggal saja, biar muat
    return {
      data: {
        labels,
        datasets: [
          {
            type: "bar" as const,
            label: "Jam kerja",
            data: worked.map((r) => Math.round((r.workedMinutes / 60) * 100) / 100),
            backgroundColor: worked.map((r) =>
              r.lateMinutes > 0 ? C.warning : r.status === "longshift" ? C.info : C.success
            ),
            yAxisID: "y",
            ...pillBars,
            maxBarThickness: 18,
          },
          {
            type: "line" as const,
            label: "Telat (menit)",
            data: worked.map((r) => r.lateMinutes),
            borderColor: C.danger,
            backgroundColor: C.danger,
            borderWidth: 2,
            tension: 0.35,
            pointRadius: worked.map((r) => (r.lateMinutes > 0 ? 3 : 0)),
            pointHoverRadius: 5,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index" as const, intersect: false },
        plugins: {
          legend: dotLegend,
          tooltip: {
            ...glassTooltip,
            callbacks: {
              title: (items: { dataIndex: number }[]) => {
                const r = worked[items[0].dataIndex];
                return r ? r.date : "";
              },
              label: (ctx: { datasetIndex: number; dataIndex: number }) => {
                const r = worked[ctx.dataIndex];
                if (!r) return "";
                if (ctx.datasetIndex === 0) {
                  return ` Kerja ${hm(r.workedMinutes)} (${r.clockIn ?? "—"} → ${r.clockOut ?? "—"})`;
                }
                return r.lateMinutes > 0 ? ` Telat ${hm(r.lateMinutes)}` : " Tepat waktu";
              },
            },
          },
        },
        scales: {
          x: cleanX,
          y: {
            ...cleanY,
            position: "left" as const,
            title: { display: true, text: "jam", color: "#94a3b8", font: { size: 10 } },
          },
          y1: {
            ...cleanY,
            position: "right" as const,
            grid: { display: false },
            title: { display: true, text: "menit telat", color: "#94a3b8", font: { size: 10 } },
          },
        },
      } as ChartOptions<"bar">,
    };
  }, [worked]);

  return (
    <Card title={`Jam kerja harian — ${periodLabel}`}>
      {worked.length === 0 ? (
        <Empty>Belum ada hari kerja tercatat di periode ini.</Empty>
      ) : (
        <>
          <div className="h-64">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Chart type="bar" data={data as any} options={options} />
          </div>
          <p className="mt-3 text-xs text-subtle">
            Batang hijau = datang tepat waktu, kuning = terlambat, biru = longshift.
            Garis merah menunjukkan berapa menit keterlambatannya.
          </p>
        </>
      )}
    </Card>
  );
}
