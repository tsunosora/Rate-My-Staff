"use client";

import { Card, Empty, hm, rupiah, shortDate, soft } from "./ui";
import type { AttendanceRow, OutputTotals } from "./types";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Omzet & pekerjaan yang diselesaikan karyawan. Omzet ditampilkan SATU angka per hari
 * (gabungan perannya) agar tidak membingungkan; rinciannya baru muncul untuk yang
 * benar-benar merangkap lebih dari satu peran.
 *
 * Istilah (nama field dari PosPro tidak seluruhnya sepadan dengan istilah di toko):
 * - `designJobs`     = **layout materi** — sales order yang dia siapkan untuk cetak.
 * - `designServices` = **jasa desain** — produk "Jasa Desain" yang benar-benar terjual,
 *   berjenjang Easy A/B, Standar, Medium, Hard.
 */
export function DailyOutputPanel({
  rows,
  totals,
  periodLabel,
}: {
  rows: AttendanceRow[];
  totals: OutputTotals;
  periodLabel: string;
}) {
  const days = rows.filter((r) => (r.clockIn || r.clockOut) && r.output);
  const today = todayStr();
  const hariIni = days.find((r) => r.date === today)?.output ?? null;

  const hadir = days.reduce(
    (a, r) => ({
      transactions: a.transactions + r.output!.transactions,
      omzet: a.omzet + r.output!.omzet,
      designJobs: a.designJobs + r.output!.designJobs,
      designOmzet: a.designOmzet + r.output!.designOmzet,
      designServiceCount: a.designServiceCount + r.output!.designServiceCount,
      designServiceValue: a.designServiceValue + r.output!.designServiceValue,
      operatorJobs: a.operatorJobs + r.output!.operatorJobs,
      operatorOmzet: a.operatorOmzet + r.output!.operatorOmzet,
      tasksOnTime: a.tasksOnTime + r.output!.tasksOnTime,
      tasksLate: a.tasksLate + r.output!.tasksLate,
      totalOmzet: a.totalOmzet + r.output!.totalOmzet,
    }),
    {
      transactions: 0, omzet: 0, designJobs: 0, designOmzet: 0,
      designServiceCount: 0, designServiceValue: 0,
      operatorJobs: 0, operatorOmzet: 0, tasksOnTime: 0, tasksLate: 0, totalOmzet: 0,
    }
  );

  const sisaOmzet = Math.round(totals.totalOmzet - hadir.totalOmzet);

  const asKasir = totals.transactions > 0 || totals.omzet > 0;
  const asDesainer = totals.designJobs > 0;
  const asOperator = totals.operatorJobs > 0;
  // Rincian per peran hanya berguna bagi yang merangkap; selebihnya cuma menduplikasi
  // angka yang sama dan membuat seolah ada dua omzet berbeda.
  const multiPeran = [asKasir, asDesainer, asOperator].filter(Boolean).length > 1;
  const adaTask = hadir.tasksOnTime + hadir.tasksLate > 0;

  // Jasa desain di PosPro berjenjang (Easy A/B, Standar, Medium, Hard). Jumlah order
  // saja menyamakan Easy A dengan Hard, jadi jenjangnya ditampilkan apa adanya.
  const jenjang = new Map<string, number>();
  for (const r of days) {
    for (const d of r.output!.designServices) {
      jenjang.set(d.level, (jenjang.get(d.level) ?? 0) + d.qty);
    }
  }
  const ringkasJenjang = [...jenjang.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([lvl, n]) => `${lvl} ${n}×`)
    .join(" · ");

  return (
    <Card title={`Omzet & pekerjaan — ${periodLabel}`}>
      {days.length === 0 ? (
        <Empty>Belum ada hasil kerja tercatat di PosPro pada hari-hari Anda absen.</Empty>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl p-4" style={soft("var(--success)", 16)}>
              <div className="text-xs font-medium text-muted">Omzet hari ini</div>
              <div className="tabular mt-1 font-display text-3xl font-extrabold text-success">
                {hariIni ? rupiah(hariIni.totalOmzet) : "Rp0"}
              </div>
              <div className="mt-0.5 text-xs text-subtle">
                {hariIni
                  ? [
                      hariIni.transactions ? `${hariIni.transactions} closing` : null,
                      hariIni.designJobs ? `${hariIni.designJobs} layout` : null,
                      hariIni.operatorJobs ? `${Math.round(hariIni.operatorJobs * 100) / 100} produksi` : null,
                    ].filter(Boolean).join(" · ") || "belum ada transaksi hari ini"
                  : "belum ada catatan hari ini"}
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4">
              <div className="text-xs font-medium text-muted">Omzet {periodLabel}</div>
              <div className="tabular mt-1 font-display text-3xl font-extrabold text-fg">
                {rupiah(hadir.totalOmzet)}
              </div>
              <div className="mt-0.5 text-xs text-subtle">dari {days.length} hari Anda masuk</div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {asKasir && <Counter label="Closing / nota" value={hadir.transactions} tone="var(--info)" />}
            {asDesainer && <Counter label="Layout materi" value={hadir.designJobs} tone="var(--primary)" />}
            {hadir.designServiceCount > 0 && (
              <Counter
                label="Jasa desain"
                value={hadir.designServiceCount}
                hint={rupiah(hadir.designServiceValue)}
                tone="var(--primary)"
              />
            )}
            {asOperator && (
              <Counter
                label="Kartu produksi"
                value={Math.round(hadir.operatorJobs * 100) / 100}
                tone="var(--warning)"
              />
            )}
            {adaTask && (
              <Counter
                label="Task selesai"
                value={hadir.tasksOnTime + hadir.tasksLate}
                hint={hadir.tasksLate > 0 ? `${hadir.tasksOnTime} tepat waktu` : "semua tepat waktu"}
                tone="var(--success)"
              />
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-subtle">
                  <th className="pb-2 pr-3 font-medium">Tanggal</th>
                  <th className="pb-2 pr-3 font-medium">Jam kerja</th>
                  <th className="pb-2 pr-3 text-right font-medium">Omzet</th>
                  <th className="pb-2 font-medium">Pekerjaan</th>
                </tr>
              </thead>
              <tbody>
                {days.map((r) => {
                  const o = r.output!;
                  const jasa = o.designServices.map((d) => `${d.level} ${d.qty}×`).join(", ");
                  const kerja = [
                    o.transactions ? `${o.transactions} closing` : null,
                    o.designJobs ? `${o.designJobs} layout materi` : null,
                    jasa ? `jasa desain: ${jasa}` : null,
                    o.operatorJobs ? `${Math.round(o.operatorJobs * 100) / 100} produksi` : null,
                    o.tasksOnTime ? `${o.tasksOnTime} task` : null,
                    o.tasksLate ? `${o.tasksLate} task telat` : null,
                  ].filter(Boolean);
                  return (
                    <tr
                      key={r.date}
                      className={`border-b border-border/60 last:border-0 ${r.date === today ? "bg-surface-2" : ""}`}
                    >
                      <td className="py-2 pr-3 text-fg">
                        {shortDate(r.date)}
                        {r.date === today && <span className="ml-1.5 text-[11px] text-primary">hari ini</span>}
                      </td>
                      <td className="tabular py-2 pr-3 text-muted">
                        {r.workedMinutes > 0 ? hm(r.workedMinutes) : "—"}
                      </td>
                      <td className="tabular py-2 pr-3 text-right font-medium text-fg">
                        {o.totalOmzet > 0 ? rupiah(o.totalOmzet) : "—"}
                      </td>
                      <td className="py-2 text-xs text-muted">{kerja.join(" · ") || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {ringkasJenjang && (
            <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3">
              <div className="mb-1 text-xs font-semibold text-fg">Jasa desain yang terjual</div>
              <p className="text-xs text-muted">{ringkasJenjang}</p>
              <p className="mt-1 text-[11px] text-subtle">
                Nilai jasa desainnya {rupiah(hadir.designServiceValue)}. Jenjang yang lebih sulit
                (Medium, Hard) bernilai poin lebih tinggi daripada Easy.
              </p>
            </div>
          )}

          {multiPeran && (
            <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3">
              <div className="mb-1.5 text-xs font-semibold text-fg">Rincian omzet per peran</div>
              <ul className="space-y-1 text-xs text-muted">
                {asKasir && <li>Kasir — {rupiah(hadir.omzet)} dari {hadir.transactions} nota</li>}
                {asDesainer && (
                  <li>Layout materi — {rupiah(hadir.designOmzet)} dari {hadir.designJobs} order</li>
                )}
                {asOperator && <li>Produksi — {rupiah(hadir.operatorOmzet)} dari kartu yang Anda kerjakan</li>}
              </ul>
            </div>
          )}

          <p className="mt-3 text-xs leading-relaxed text-subtle">
            Omzet adalah uang yang Anda hasilkan untuk toko — nilai nota yang Anda tutup, order
            order yang Anda layout, dan item yang Anda produksi. Bukan penjualan toko secara keseluruhan.
            {sisaOmzet > 0 && (
              <>
                {" "}Ada <b className="text-muted">{rupiah(sisaOmzet)}</b> lagi atas nama Anda di tanggal
                tanpa absensi — biasanya karena lupa scan.
              </>
            )}
          </p>
        </>
      )}
    </Card>
  );
}

function Counter({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl p-3" style={soft(tone, 12)}>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="tabular mt-0.5 font-display text-lg font-bold" style={{ color: tone }}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-subtle">{hint}</div>}
    </div>
  );
}
