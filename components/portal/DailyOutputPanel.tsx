"use client";

import { Card, Empty, hm, rupiah, shortDate, soft } from "./ui";
import type { AttendanceRow, OutputTotals } from "./types";

/**
 * "Hari itu saya menghasilkan berapa" — hasil kerja dari PosPro disandingkan dengan
 * hari absen. Hanya hari yang ada scan masuk/pulang yang ditampilkan.
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

  // Total dihitung dari hari yang benar-benar ada absensinya, supaya angka di kartu
  // sama persis dengan isi tabel di bawahnya.
  const hadir = days.reduce(
    (a, r) => ({
      transactions: a.transactions + r.output!.transactions,
      omzet: a.omzet + r.output!.omzet,
      designJobs: a.designJobs + r.output!.designJobs,
      operatorJobs: a.operatorJobs + r.output!.operatorJobs,
    }),
    { transactions: 0, omzet: 0, designJobs: 0, operatorJobs: 0 }
  );
  // Sisa = tercatat di PosPro tapi hari itu tak ada absensinya (mis. lupa scan).
  const sisaOmzet = Math.round(totals.omzet - hadir.omzet);

  const anySales = totals.transactions > 0;
  const anyDesign = totals.designJobs > 0;
  const anyOperator = totals.operatorJobs > 0;

  return (
    <Card title={`Hasil kerja harian — ${periodLabel}`}>
      {days.length === 0 ? (
        <Empty>Belum ada hasil kerja tercatat di PosPro pada hari-hari Anda absen.</Empty>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {anySales && (
              <Total label="Omzet di hari Anda absen" value={rupiah(hadir.omzet)} tone="var(--success)" />
            )}
            {anySales && (
              <Total label="Nota ditutup" value={String(hadir.transactions)} tone="var(--info)" />
            )}
            {anyDesign && (
              <Total label="Order desain" value={String(hadir.designJobs)} tone="var(--primary)" />
            )}
            {anyOperator && (
              <Total
                label="Kartu produksi"
                value={String(Math.round(hadir.operatorJobs * 100) / 100)}
                tone="var(--warning)"
              />
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-subtle">
                  <th className="pb-2 pr-3 font-medium">Tanggal</th>
                  <th className="pb-2 pr-3 font-medium">Jam kerja</th>
                  {anySales && <th className="pb-2 pr-3 text-right font-medium">Omzet</th>}
                  {anySales && <th className="pb-2 pr-3 text-right font-medium">Nota</th>}
                  {anyDesign && <th className="pb-2 pr-3 text-right font-medium">Desain</th>}
                  {anyOperator && <th className="pb-2 text-right font-medium">Produksi</th>}
                </tr>
              </thead>
              <tbody>
                {days.map((r) => (
                  <tr key={r.date} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 text-fg">{shortDate(r.date)}</td>
                    <td className="tabular py-2 pr-3 text-muted">
                      {r.workedMinutes > 0 ? hm(r.workedMinutes) : "—"}
                    </td>
                    {anySales && (
                      <td className="tabular py-2 pr-3 text-right font-medium text-fg">
                        {r.output!.omzet > 0 ? rupiah(r.output!.omzet) : "—"}
                      </td>
                    )}
                    {anySales && (
                      <td className="tabular py-2 pr-3 text-right text-muted">
                        {r.output!.transactions || "—"}
                      </td>
                    )}
                    {anyDesign && (
                      <td className="tabular py-2 pr-3 text-right text-muted">
                        {r.output!.designJobs || "—"}
                      </td>
                    )}
                    {anyOperator && (
                      <td className="tabular py-2 text-right text-muted">
                        {r.output!.operatorJobs || "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-subtle">
            Angka diambil dari PosPro pada tanggal yang sama dengan absensi Anda. Omzet dihitung
            dari nota yang <b className="text-muted">Anda tutup</b>, bukan seluruh penjualan toko.
            {sisaOmzet > 0 && (
              <>
                {" "}Ada <b className="text-muted">{rupiah(sisaOmzet)}</b> lagi yang tercatat atas nama
                Anda di tanggal yang tidak ada absensinya — biasanya karena lupa scan.
              </>
            )}
          </p>
        </>
      )}
    </Card>
  );
}

function Total({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl p-3" style={soft(tone, 12)}>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="tabular mt-0.5 font-display text-lg font-bold" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}
