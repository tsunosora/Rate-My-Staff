"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconChevronLeft, IconChevronRight, IconDownload, IconPencil, IconTrash } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { soft } from "@/components/portal/ui";
import { LABEL_JENIS, LABEL_STATUS, labelSumber, tanggalPendek } from "@/lib/services/upah/label";
import type { BarisHitung, HitunganPeriode, JenisPenyesuaian } from "@/lib/services/upah/hitung";
import { BAYAR } from "./RekapUpah";
import { geser, labelRentang, mingguIni } from "./periode";

type Data = {
  dari: string;
  sampai: string;
  karyawan: {
    id: number;
    nama: string;
    kode: string;
    freelance: boolean;
    tim: { id: number; nama: string } | null;
    upahHarian: number | null;
    upahLemburPerJam: number | null;
  };
  hitungan: HitunganPeriode | null;
  belumDibayar: HitunganPeriode["ringkas"] | null;
  statusBayar: keyof typeof BAYAR;
  menunggu: { id: number; tanggal: string; status: string }[];
  pembayaran: {
    id: number;
    periodeMulai: string;
    periodeSelesai: string;
    jumlah: number;
    catatan: string | null;
    dibayarAt: string;
    oleh: string | null;
  }[];
};

const rp = (n: number) => `${n < 0 ? "-" : ""}Rp${Math.abs(Math.round(n)).toLocaleString("id-ID")}`;
const jam = (n: number) => (n ? `${n.toLocaleString("id-ID", { maximumFractionDigits: 2 })} jam` : "–");
const JENIS: JenisPenyesuaian[] = ["bonus", "tunjangan", "potongan", "kasbon"];

export function RincianUpah({ employeeId, dari: dariAwal, sampai: sampaiAwal, bolehBatal }: {
  employeeId: number;
  dari: string;
  sampai: string;
  bolehBatal: boolean;
}) {
  const bawaan = mingguIni();
  const [dari, setDari] = useState(dariAwal || bawaan.dari);
  const [sampai, setSampai] = useState(sampaiAwal || bawaan.sampai);
  const [d, setD] = useState<Data | null>(null);
  const [galat, setGalat] = useState("");
  const [info, setInfo] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [versi, setVersi] = useState(0);
  const [bayar, setBayar] = useState(false);
  const [catatanBayar, setCatatanBayar] = useState("");
  const [khusus, setKhusus] = useState<BarisHitung | null>(null);
  const [nilaiKhusus, setNilaiKhusus] = useState("");
  const [catatanKhusus, setCatatanKhusus] = useState("");
  const [pj, setPj] = useState({ tanggal: "", jenis: "bonus" as JenisPenyesuaian, jumlah: "", catatan: "" });
  const muat = useCallback(() => setVersi((v) => v + 1), []);

  useEffect(() => {
    let hidup = true;
    const q = new URLSearchParams({ dari, sampai });
    window.history.replaceState(null, "", `/upah/${employeeId}?${q}`);
    api<Data>(`/api/upah/${employeeId}?${q}`)
      .then((x) => {
        if (!hidup) return;
        setD(x);
        setGalat("");
      })
      .catch((e: unknown) => hidup && setGalat(e instanceof Error ? e.message : "Gagal memuat rincian."));
    return () => {
      hidup = false;
    };
  }, [employeeId, dari, sampai, versi]);

  async function jalankan(kerja: () => Promise<string>) {
    setSibuk(true);
    setGalat("");
    setInfo("");
    try {
      setInfo(await kerja());
      muat();
      return true;
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan.");
      return false;
    } finally {
      setSibuk(false);
    }
  }

  function pindah(arah: 1 | -1) {
    const r = geser(dari, sampai, arah);
    setDari(r.dari);
    setSampai(r.sampai);
  }

  const h = d?.hitungan ?? null;
  const sisa = d?.belumDibayar ?? null;
  const adaYangBelum = !!h && (h.baris.some((b) => b.pembayaranId == null) || h.penyesuaian.some((p) => p.pembayaranId == null));
  const q = new URLSearchParams({ dari, sampai });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link href={`/upah?${q}`} className="btn-ghost h-9 text-sm">
        <IconChevronLeft className="text-[16px]" /> Rekap upah
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">{d?.karyawan.nama ?? "Rincian upah"}</h1>
          {d && (
            <p className="mt-0.5 text-sm text-muted">
              {d.karyawan.kode}
              {d.karyawan.tim ? ` · ${/^tim\s/i.test(d.karyawan.tim.nama) ? "" : "Tim "}${d.karyawan.tim.nama}` : ""}
              {d.karyawan.freelance ? " · freelance" : ""} · tarif orang{" "}
              {d.karyawan.upahHarian ? `${rp(d.karyawan.upahHarian)}/hari` : "belum diatur"}
              {d.karyawan.upahLemburPerJam ? `, lembur ${rp(d.karyawan.upahLemburPerJam)}/jam` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-ghost h-9 w-9 justify-center p-0" onClick={() => pindah(-1)} aria-label="Periode sebelumnya">
            <IconChevronLeft className="text-[16px]" />
          </button>
          <div className="min-w-44 px-2 text-center text-sm font-semibold text-fg">{labelRentang(dari, sampai)}</div>
          <button className="btn-ghost h-9 w-9 justify-center p-0" onClick={() => pindah(1)} aria-label="Periode berikutnya">
            <IconChevronRight className="text-[16px]" />
          </button>
        </div>
      </div>

      {info && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-success" style={soft("var(--success)")}>
          <IconCheck className="shrink-0 text-[16px]" /> {info}
        </div>
      )}
      {galat && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-danger" style={soft("var(--danger)")}>
          <IconAlert className="shrink-0 text-[16px]" /> {galat}
        </div>
      )}

      {!d ? (
        !galat && <div className="glass h-48 animate-pulse rounded-2xl" />
      ) : (
        <>
          {d.menunggu.length > 0 && (
            <div className="rounded-2xl px-4 py-3 text-sm text-warning" style={soft("var(--warning)")}>
              {d.menunggu.length} rekap masih menunggu persetujuan dan belum dihitung:{" "}
              {d.menunggu.map((m) => tanggalPendek(m.tanggal)).join(", ")}.{" "}
              <Link href="/attendance/rekap-tim" className="font-semibold underline">
                Buka persetujuan
              </Link>
            </div>
          )}
          {h && h.ringkas.tarifKosong > 0 && (
            <div className="rounded-2xl px-4 py-3 text-sm text-danger" style={soft("var(--danger)")}>
              Ada {h.ringkas.tarifKosong} hari tanpa tarif, jadi dihitung Rp0.{" "}
              <Link href="/settings/upah" className="font-semibold underline">
                Atur tarif
              </Link>
            </div>
          )}

          <div className="glass flex flex-wrap items-center gap-4 rounded-2xl p-4">
            <div className="min-w-40">
              <div className="text-xs text-muted">Total periode</div>
              <div className="font-display text-2xl font-bold text-fg">{rp(h?.ringkas.total ?? 0)}</div>
            </div>
            <div className="min-w-40">
              <div className="text-xs text-muted">Belum dibayar</div>
              <div className="font-display text-2xl font-bold text-fg">{rp(sisa?.total ?? 0)}</div>
            </div>
            <span className="badge" style={soft(BAYAR[d.statusBayar].warna, 18)}>
              {BAYAR[d.statusBayar].label}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              {h && (
                <a href={`/api/upah/${employeeId}/slip?${q}`} className="btn-ghost h-10 text-sm">
                  <IconDownload className="text-[16px]" /> Slip PDF
                </a>
              )}
              {adaYangBelum && (
                <button
                  className="btn-primary h-10 text-sm"
                  disabled={sibuk}
                  onClick={() => {
                    setCatatanBayar("");
                    setBayar(true);
                  }}
                >
                  <IconCheck className="text-[16px]" /> Tandai dibayar
                </button>
              )}
            </div>
          </div>

          <section className="glass overflow-x-auto rounded-2xl">
            <h2 className="px-4 pt-4 text-sm font-semibold text-fg">Rincian harian (yang disetujui)</h2>
            {!h || h.baris.length === 0 ? (
              <p className="px-4 pb-4 pt-2 text-sm text-subtle">Belum ada rekap yang disetujui di periode ini.</p>
            ) : (
              <table className="mt-2 w-full min-w-[860px] text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 font-medium">Tanggal</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Proyek / kota · divisi</th>
                    <th className="px-2 py-2 text-right font-medium">Lembur</th>
                    <th className="px-2 py-2 font-medium">Tarif dari</th>
                    <th className="px-2 py-2 text-right font-medium">Pokok</th>
                    <th className="px-2 py-2 text-right font-medium">Lembur Rp</th>
                    <th className="px-2 py-2 text-right font-medium">Khusus</th>
                    <th className="px-2 py-2 text-right font-medium">Upah</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {h.baris.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-2 whitespace-nowrap">{tanggalPendek(b.tanggal)}</td>
                      <td className="px-2 py-2">{LABEL_STATUS[b.status]}</td>
                      <td className="px-2 py-2 text-muted">{b.proyek ?? ([b.kota, b.divisi].filter(Boolean).join(" · ") || "–")}</td>
                      <td className="px-2 py-2 text-right">{jam(b.lemburJam)}</td>
                      <td className={`px-2 py-2 ${b.tarifKosong ? "text-danger" : "text-muted"}`}>
                        {labelSumber(b.sumberTarif)}
                        {b.upahHarian ? <span className="block text-xs text-subtle">{rp(b.upahHarian)}/hari</span> : null}
                      </td>
                      <td className="px-2 py-2 text-right">{rp(b.upahPokok)}</td>
                      <td className="px-2 py-2 text-right">{b.upahLembur ? rp(b.upahLembur) : "–"}</td>
                      <td className="px-2 py-2 text-right" title={b.upahKhususCatatan ?? undefined}>
                        {b.upahKhusus ? rp(b.upahKhusus) : "–"}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-fg">{rp(b.upah)}</td>
                      <td className="px-4 py-2 text-right">
                        {b.pembayaranId != null ? (
                          <span className="badge" style={soft("var(--success)", 18)}>
                            Dibayar
                          </span>
                        ) : (
                          b.status !== "absen" && (
                            <button
                              className="btn-ghost h-8 px-2 text-xs"
                              aria-label={`Upah khusus ${tanggalPendek(b.tanggal)}`}
                              onClick={() => {
                                setKhusus(b);
                                setNilaiKhusus(b.upahKhusus ? String(b.upahKhusus) : "");
                                setCatatanKhusus(b.upahKhususCatatan ?? "");
                              }}
                            >
                              <IconPencil className="text-[14px]" /> Upah khusus
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-fg">Penyesuaian</h2>
            <p className="mt-0.5 text-xs text-muted">Bonus dan tunjangan menambah. Potongan dan kasbon mengurangi.</p>
            {h && h.penyesuaian.length > 0 && (
              <ul className="mt-3 divide-y divide-border text-sm">
                {h.penyesuaian.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                    <span className="w-28 text-muted">{tanggalPendek(p.tanggal)}</span>
                    <span className="w-24 font-medium text-fg">{LABEL_JENIS[p.jenis]}</span>
                    <span className="min-w-32 flex-1 text-muted">{p.catatan ?? ""}</span>
                    <span className={`font-semibold ${p.nilai < 0 ? "text-danger" : "text-fg"}`}>{rp(p.nilai)}</span>
                    {p.pembayaranId != null ? (
                      <span className="badge" style={soft("var(--success)", 18)}>
                        Dibayar
                      </span>
                    ) : (
                      <button
                        className="btn-ghost h-8 px-2 text-xs"
                        disabled={sibuk}
                        aria-label={`Hapus ${LABEL_JENIS[p.jenis]}`}
                        onClick={() => {
                          if (!confirm(`Hapus ${LABEL_JENIS[p.jenis].toLowerCase()} ${rp(Math.abs(p.nilai))}?`)) return;
                          void jalankan(async () => {
                            await api(`/api/upah/penyesuaian/${p.id}`, { method: "DELETE" });
                            return "Penyesuaian dihapus.";
                          });
                        }}
                      >
                        <IconTrash className="text-[14px]" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await jalankan(async () => {
                  await api("/api/upah/penyesuaian", {
                    method: "POST",
                    body: JSON.stringify({
                      employeeId,
                      tanggal: pj.tanggal || sampai,
                      jenis: pj.jenis,
                      jumlah: Number(pj.jumlah.replace(/\./g, "").replace(",", ".")),
                      catatan: pj.catatan || null,
                    }),
                  });
                  return `${LABEL_JENIS[pj.jenis]} ditambahkan.`;
                });
                if (ok) setPj((x) => ({ ...x, jumlah: "", catatan: "" }));
              }}
            >
              <label className="space-y-1 text-xs text-muted">
                <span className="block">Tanggal</span>
                <input type="date" className="input h-9" value={pj.tanggal || sampai} min={dari} max={sampai} onChange={(e) => setPj({ ...pj, tanggal: e.target.value })} />
              </label>
              <label className="space-y-1 text-xs text-muted">
                <span className="block">Jenis</span>
                <select className="input h-9" value={pj.jenis} onChange={(e) => setPj({ ...pj, jenis: e.target.value as JenisPenyesuaian })}>
                  {JENIS.map((j) => (
                    <option key={j} value={j}>
                      {LABEL_JENIS[j]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted">
                <span className="block">Jumlah (Rp)</span>
                <input className="input h-9 w-32" inputMode="numeric" value={pj.jumlah} onChange={(e) => setPj({ ...pj, jumlah: e.target.value })} required />
              </label>
              <label className="min-w-40 flex-1 space-y-1 text-xs text-muted">
                <span className="block">Catatan</span>
                <input className="input h-9" maxLength={255} value={pj.catatan} onChange={(e) => setPj({ ...pj, catatan: e.target.value })} />
              </label>
              <button type="submit" className="btn-primary h-9 text-sm" disabled={sibuk || !pj.jumlah}>
                Tambah
              </button>
            </form>
          </section>

          {d.pembayaran.length > 0 && (
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-fg">Pembayaran</h2>
              <ul className="mt-2 divide-y divide-border text-sm">
                {d.pembayaran.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
                    <div className="min-w-48 flex-1">
                      <div className="font-semibold text-fg">{rp(p.jumlah)}</div>
                      <div className="text-xs text-muted">
                        {new Date(p.dibayarAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                        {p.oleh ? ` · ${p.oleh}` : ""} · periode {labelRentang(p.periodeMulai, p.periodeSelesai)}
                        {p.catatan ? ` · ${p.catatan}` : ""}
                      </div>
                    </div>
                    <a href={`/api/upah/${employeeId}/slip?pembayaranId=${p.id}`} className="btn-ghost h-8 px-3 text-xs">
                      <IconDownload className="text-[14px]" /> Slip
                    </a>
                    {bolehBatal && (
                      <button
                        className="btn-ghost h-8 px-3 text-xs"
                        disabled={sibuk}
                        onClick={() => {
                          if (!confirm(`Batalkan pembayaran ${rp(p.jumlah)}? Hari-harinya kembali belum dibayar dan bisa diubah lagi.`)) return;
                          void jalankan(async () => {
                            await api(`/api/upah/pembayaran/${p.id}`, { method: "DELETE" });
                            return "Pembayaran dibatalkan.";
                          });
                        }}
                      >
                        Batalkan
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {bayar && d && sisa && (
        <Modal title="Tandai dibayar" onClose={() => setBayar(false)}>
          <p className="text-sm text-muted">
            <b className="text-fg">{d.karyawan.nama}</b>, {labelRentang(dari, sampai)}.
          </p>
          <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3 text-sm">
            <div className="text-xs text-muted">Jumlah yang dibayar</div>
            <div className="font-display text-2xl font-bold text-fg">{rp(sisa.total)}</div>
            <div className="mt-1 text-xs text-muted">
              Hanya hari yang sudah disetujui dan belum dibayar
              {d.menunggu.length ? `. ${d.menunggu.length} rekap yang masih menunggu tidak ikut.` : "."} Sesudah ditandai, hari-hari
              itu terkunci.
            </div>
          </div>
          {sisa.total < 0 && <p className="mt-2 text-sm text-danger">Potongan dan kasbon lebih besar dari upahnya.</p>}
          <label className="mt-4 block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Catatan (opsional)</span>
            <input className="input" maxLength={255} value={catatanBayar} onChange={(e) => setCatatanBayar(e.target.value)} />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setBayar(false)} className="btn-ghost h-10">
              Batal
            </button>
            <button
              className="btn-primary h-10"
              disabled={sibuk || sisa.total < 0}
              onClick={async () => {
                const ok = await jalankan(async () => {
                  await api(`/api/upah/${employeeId}/bayar`, {
                    method: "POST",
                    body: JSON.stringify({ dari, sampai, jumlahDilihat: sisa.total, catatan: catatanBayar || null }),
                  });
                  return `${rp(sisa.total)} ditandai dibayar.`;
                });
                if (ok) setBayar(false);
              }}
            >
              {sibuk ? "Menyimpan…" : `Bayar ${rp(sisa.total)}`}
            </button>
          </div>
        </Modal>
      )}

      {khusus && (
        <Modal title="Upah khusus" onClose={() => setKhusus(null)}>
          <p className="text-sm text-muted">
            {tanggalPendek(khusus.tanggal)} — {LABEL_STATUS[khusus.status]}. Tambahan di luar tarif, misalnya kerja di
            ketinggian. Kosongkan untuk menghapus.
          </p>
          <label className="mt-4 block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Jumlah (Rp)</span>
            <input className="input" inputMode="numeric" value={nilaiKhusus} onChange={(e) => setNilaiKhusus(e.target.value)} />
          </label>
          <label className="mt-3 block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Catatan</span>
            <input className="input" maxLength={255} value={catatanKhusus} onChange={(e) => setCatatanKhusus(e.target.value)} />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setKhusus(null)} className="btn-ghost h-10">
              Batal
            </button>
            <button
              className="btn-primary h-10"
              disabled={sibuk}
              onClick={async () => {
                const angka = Number(nilaiKhusus.replace(/\./g, "").replace(",", ".")) || 0;
                const ok = await jalankan(async () => {
                  await api(`/api/upah/rekap/${khusus.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ upahKhusus: angka || null, upahKhususCatatan: catatanKhusus || null }),
                  });
                  return angka ? `Upah khusus ${rp(angka)} disimpan.` : "Upah khusus dihapus.";
                });
                if (ok) setKhusus(null);
              }}
            >
              Simpan
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
