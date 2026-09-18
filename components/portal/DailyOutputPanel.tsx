"use client";

import { Card, Empty, hm, rupiah, shortDate, soft } from "./ui";
import type { AttendanceRow, OutputTotals } from "./types";

/**
 * "Hari itu saya menghasilkan berapa" — hasil kerja dari PosPro disandingkan dengan
 * hari absen. Omzet dipecah per peran: kasir, desainer, operator.
 * Kolom hanya muncul untuk peran yang memang dijalani orang tersebut.
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
      designOmzet: a.designOmzet + r.output!.designOmzet,
      operatorJobs: a.operatorJobs + r.output!.operatorJobs,
      operatorOmzet: a.operatorOmzet + r.output!.operatorOmzet,
      totalOmzet: a.totalOmzet + r.output!.totalOmzet,
    }),
    {
      transactions: 0,
      omzet: 0,
      designJobs: 0,
      designOmzet: 0,
      operatorJobs: 0,
      operatorOmzet: 0,
      totalOmzet: 0,
    }
  );
  // Sisa = tercatat di PosPro tapi hari itu tak ada absensinya (mis. lupa scan).
  const sisaOmzet = Math.round(totals.totalOmzet - hadir.totalOmzet);

  // Peran ditentukan dari data periode penuh, bukan hari absen saja, agar kolom
  // tidak hilang-timbul saat berpindah bulan.
  const asKasir = totals.transactions > 0 || totals.omzet > 0;
  const asDesainer = totals.designJobs > 0;
  const asOperator = totals.operatorJobs > 0;
  const multiPeran = [asKasir, asDesainer, asOperator].filter(Boolean).length > 1;

  return (
    <Card title={`Hasil kerja harian — ${periodLabel}`}>
      {days.length === 0 ? (
        <Empty>Belum ada hasil kerja tercatat di PosPro pada hari-hari Anda absen.</Empty>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Total
              label="Total di hari Anda absen"
              value={rupiah(hadir.totalOmzet)}
              tone="var(--success)"
              strong
            />
            {asKasir && (
              <Total
                label={`Kasir · ${hadir.transactions} nota`}
                value={rupiah(hadir.omzet)}
                tone="var(--info)"
              />
            )}
            {asDesainer && (
              <Total
                label={`Desain · ${hadir.designJobs} order`}
                value={rupiah(hadir.designOmzet)}
                tone="var(--primary)"
              />
            )}
            {asOperator && (
              <Total
                label={`Produksi · ${Math.round(hadir.operatorJobs * 100) / 100} kartu`}
                value={rupiah(hadir.operatorOmzet)}
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
                  {asKasir && <th className="pb-2 pr-3 text-right font-medium">Kasir</th>}
                  {asDesainer && <th className="pb-2 pr-3 text-right font-medium">Desain</th>}
                  {asOperator && <th className="pb-2 pr-3 text-right font-medium">Produksi</th>}
                  {multiPeran && <th className="pb-2 text-right font-medium">Total</th>}
                </tr>
              </thead>
              <tbody>
                {days.map((r) => {
                  const o = r.output!;
                  return (
                    <tr key={r.date} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 text-fg">{shortDate(r.date)}</td>
                      <td className="tabular py-2 pr-3 text-muted">
                        {r.workedMinutes > 0 ? hm(r.workedMinutes) : "—"}
                      </td>
                      {asKasir && (
                        <Money value={o.omzet} sub={o.transactions ? `${o.transactions} nota` : null} />
                      )}
                      {asDesainer && (
                        <Money value={o.designOmzet} sub={o.designJobs ? `${o.designJobs} order` : null} />
                      )}
                      {asOperator && (
                        <Money
                          value={o.operatorOmzet}
                          sub={o.operatorJobs ? `${Math.round(o.operatorJobs * 100) / 100} kartu` : null}
                        />
                      )}
                      {multiPeran && (
                        <td className="tabular py-2 text-right font-semibold text-fg">
                          {o.totalOmzet > 0 ? rupiah(o.totalOmzet) : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-subtle">
            Diambil dari PosPro pada tanggal yang sama dengan absensi Anda.{" "}
            {asKasir && "Kasir = nilai nota yang Anda tutup. "}
            {asDesainer && "Desain = nilai nota dari order yang Anda desain. "}
            {asOperator && "Produksi = nilai item yang kartunya Anda kerjakan, dibagi rata bila dikerjakan berdua. "}
            Angka ini menunjukkan kontribusi, bukan penjualan toko secara keseluruhan.
            {sisaOmzet > 0 && (
              <>
                {" "}Ada <b className="text-muted">{rupiah(sisaOmzet)}</b> lagi atas nama Anda di tanggal
                yang tidak ada absensinya — biasanya karena lupa scan.
              </>
            )}
          </p>
        </>
      )}
    </Card>
  );
}

function Money({ value, sub }: { value: number; sub: string | null }) {
  return (
    <td className="tabular py-2 pr-3 text-right">
      <div className={value > 0 ? "font-medium text-fg" : "text-subtle"}>
        {value > 0 ? rupiah(value) : "—"}
      </div>
      {sub && <div className="text-[11px] text-subtle">{sub}</div>}
    </td>
  );
}

function Total({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl p-3" style={soft(tone, strong ? 18 : 12)}>
      <div className="text-[11px] text-muted">{label}</div>
      <div
        className={`tabular mt-0.5 font-display font-bold ${strong ? "text-xl" : "text-lg"}`}
        style={{ color: tone }}
      >
        {value}
      </div>
    </div>
  );
}
