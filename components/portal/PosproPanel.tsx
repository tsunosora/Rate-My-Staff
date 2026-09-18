"use client";

import { Card, rupiah, soft } from "./ui";
import type { PosproKpi } from "./types";

/**
 * Kinerja operasional dari PosPro (kasir): rating pelanggan, papan tugas, penjualan.
 * Hanya tampil bila karyawan sudah dipetakan ke akun PosPro.
 */
export function PosproPanel({ kpi, periodLabel }: { kpi: PosproKpi; periodLabel: string }) {
  const { csRating, tasks, sales } = kpi;
  const hasAny = csRating.count > 0 || tasks.assigned > 0 || sales.transactions > 0;

  return (
    <Card title={`Kinerja operasional — ${periodLabel}`}>
      {!hasAny ? (
        <p className="py-6 text-center text-sm text-subtle">
          Belum ada aktivitas tercatat di PosPro pada periode ini.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {csRating.count > 0 && (
            <Metric
              label="Rating pelanggan"
              value={csRating.avgStars.toFixed(2)}
              unit="★"
              hint={`${csRating.satisfiedCount} dari ${csRating.count} puas (${csRating.satisfactionRate}%)`}
              tone="var(--warning)"
              ratio={csRating.avgStars / 5}
            />
          )}
          {tasks.assigned > 0 && (
            <Metric
              label="Tugas & piket"
              value={`${tasks.completionRate}`}
              unit="%"
              hint={`${tasks.done}/${tasks.assigned} selesai${tasks.late > 0 ? ` · ${tasks.late} terlambat` : ""}`}
              tone={tasks.completionRate >= 80 ? "var(--success)" : tasks.completionRate >= 50 ? "var(--warning)" : "var(--danger)"}
              ratio={tasks.completionRate / 100}
            />
          )}
          {sales.transactions > 0 && (
            <Metric
              label="Penjualan"
              value={rupiah(sales.grandTotal)}
              hint={`${sales.transactions} transaksi · rata-rata ${rupiah(sales.averageTicket)}`}
              tone="var(--info)"
            />
          )}
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-subtle">
        Diambil dari PosPro. Angka penjualan dicocokkan lewat nama kasir pada nota — kalau ada
        yang terasa tidak pas, beri tahu admin untuk memeriksa pemetaan akunnya.
      </p>
    </Card>
  );
}

function Metric({
  label,
  value,
  unit,
  hint,
  tone,
  ratio,
}: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  tone: string;
  ratio?: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="tabular mt-1 font-display text-2xl font-extrabold text-fg">
        {value}
        {unit && <span className="ml-0.5 text-base font-bold" style={{ color: tone }}>{unit}</span>}
      </div>
      {ratio !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={soft(tone, 20)}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%`, background: tone }}
          />
        </div>
      )}
      <div className="mt-1.5 text-xs text-subtle">{hint}</div>
    </div>
  );
}
