"use client";

import { IconCheck, IconAlert, IconClock } from "@/components/ui/icons";
import { Card, hm, soft } from "./ui";
import type { Discipline } from "./types";

const TREND_META = {
  membaik: { label: "Semakin tertib", color: "var(--success)", arrow: "↓" },
  memburuk: { label: "Semakin sering telat", color: "var(--danger)", arrow: "↑" },
  sama: { label: "Setara periode lalu", color: "var(--info)", arrow: "→" },
  baru: { label: "Belum ada pembanding", color: "var(--fg-subtle)", arrow: "•" },
} as const;

/** Perbandingan kedisiplinan periode ini vs periode sebelumnya. */
export function DisciplineCard({ d }: { d: Discipline }) {
  const meta = TREND_META[d.trend];
  const punctual = d.trend === "membaik" || (d.trend === "sama" && d.current.onTimeRate >= 80);

  return (
    <Card title="Kedisiplinan Anda">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
          style={{ ...soft(meta.color, 18), color: meta.color }}
        >
          {punctual ? <IconCheck className="text-[22px]" /> : <IconAlert className="text-[22px]" />}
        </span>
        <div className="min-w-0">
          <div className="font-display text-lg font-bold" style={{ color: meta.color }}>
            {meta.arrow} {meta.label}
          </div>
          <p className="text-xs text-muted">
            {d.trend === "baru"
              ? "Periode sebelumnya belum ada data absensi."
              : `Rata-rata telat ${d.current.avgLateMinutes} menit/hari — periode lalu ${d.previous.avgLateMinutes} menit.`}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
        <Metric
          label="Tepat waktu"
          value={`${d.current.onTimeRate}%`}
          delta={d.trend === "baru" ? null : d.onTimeDelta}
          unit="%"
          higherIsBetter
        />
        <Metric
          label="Rata-rata telat"
          value={`${d.current.avgLateMinutes}m`}
          delta={d.trend === "baru" ? null : d.lateDelta}
          unit="m"
          higherIsBetter={false}
        />
        <Metric
          label="Rata-rata kerja"
          value={hm(d.current.avgWorkedMinutes)}
          delta={d.trend === "baru" ? null : d.workedDelta}
          unit="m"
          higherIsBetter
        />
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-subtle">
        <IconClock className="mt-0.5 shrink-0 text-[13px]" />
        Dibandingkan dengan rentang yang sama panjang tepat sebelum periode ini
        ({d.current.workedDays} hari kerja sekarang, {d.previous.workedDays} hari kerja sebelumnya).
      </p>
    </Card>
  );
}

function Metric({
  label,
  value,
  delta,
  unit,
  higherIsBetter,
}: {
  label: string;
  value: string;
  delta: number | null;
  unit: string;
  higherIsBetter: boolean;
}) {
  const good = delta === null ? null : higherIsBetter ? delta > 0 : delta < 0;
  const color = delta === null || delta === 0 ? "var(--fg-subtle)" : good ? "var(--success)" : "var(--danger)";
  return (
    <div>
      <div className="tabular font-display text-lg font-bold text-fg">{value}</div>
      <div className="text-[11px] text-subtle">{label}</div>
      {delta !== null && delta !== 0 && (
        <div className="tabular text-[11px] font-semibold" style={{ color }}>
          {delta > 0 ? "+" : ""}
          {delta}
          {unit}
        </div>
      )}
    </div>
  );
}
