"use client";

import { useMemo } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, type ChartOptions } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { C, glassTooltip } from "@/components/charts/theme";

ChartJS.register(ArcElement, Tooltip);

const COLORS = {
  present: C.success,
  late: C.warning,
  absent: C.danger,
};

export function AttendanceDonut({
  present,
  late,
  absent,
}: {
  present: number;
  late: number;
  absent: number;
}) {
  const total = present + late + absent;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  const { data, options } = useMemo(() => {
    const empty = total === 0;
    return {
      data: {
        labels: ["Hadir", "Terlambat", "Absen"],
        datasets: [
          {
            data: empty ? [1] : [present, late, absent],
            backgroundColor: empty
              ? ["rgba(148,163,184,0.18)"]
              : [COLORS.present, COLORS.late, COLORS.absent],
            borderWidth: 0,
            borderRadius: empty ? 0 : 10,
            spacing: empty ? 0 : 3,
            hoverOffset: empty ? 0 : 6,
          },
        ],
      },
      options: {
        cutout: "78%",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...glassTooltip,
            enabled: !empty,
            callbacks: {
              label: (c) => ` ${c.label}: ${c.parsed}`,
            },
          },
        },
      } as ChartOptions<"doughnut">,
    };
  }, [present, late, absent, total]);

  const legend = [
    { label: "Hadir", value: present, color: COLORS.present },
    { label: "Terlambat", value: late, color: COLORS.late },
    { label: "Absen", value: absent, color: COLORS.absent },
  ];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-40 w-40 shrink-0">
        <Doughnut data={data} options={options} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular font-display text-3xl font-extrabold text-fg">
            {rate}%
          </span>
          <span className="text-xs text-subtle">Kehadiran</span>
        </div>
      </div>

      <ul className="flex w-full flex-col gap-2.5">
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: l.color }}
            />
            <span className="text-sm text-muted">{l.label}</span>
            <span className="tabular ml-auto text-sm font-semibold text-fg">
              {l.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
