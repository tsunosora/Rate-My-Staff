"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconDownload, IconLink } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { hm, soft } from "@/components/portal/ui";

type Penanda = { kode: "jauh" | "singkat" | "kabur" | "tidak_selesai"; label: string };

type Baris = {
  id: number;
  employeeId: number;
  nama: string;
  kode: string;
  namaKlien: string;
  alamat: string | null;
  tujuan: string | null;
  masukAt: string;
  keluarAt: string | null;
  durasiMenit: number | null;
  jarakM: number | null;
  petaMasuk: string;
  petaKeluar: string | null;
  akurasiMasukM: number;
  akurasiKeluarM: number | null;
  adaFoto: boolean;
  hasil: string | null;
  catatan: string | null;
  status: "berjalan" | "selesai" | "tidak_selesai";
  penanda: Penanda[];
};

type Ringkasan = {
  employeeId: number;
  nama: string;
  jumlah: number;
  selesai: number;
  totalMenit: number;
  deal: number;
  ditandai: number;
};

type Payload = {
  items: Baris[];
  ringkasan: Ringkasan[];
  terpotong: boolean;
  karyawan: { id: number; nama: string }[];
};

const HASIL: { key: string; label: string; warna: string }[] = [
  { key: "deal", label: "Deal", warna: "var(--success)" },
  { key: "tertarik", label: "Tertarik", warna: "var(--info)" },
  { key: "follow_up", label: "Perlu follow up", warna: "var(--warning)" },
  { key: "tidak_tertarik", label: "Tidak tertarik", warna: "var(--danger)" },
  { key: "lainnya", label: "Lainnya", warna: "var(--fg-subtle)" },
];
const META_HASIL = Object.fromEntries(HASIL.map((h) => [h.key, h]));

function hariIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const jam = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
const tanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const jarakTeks = (m: number) =>
  m >= 1000 ? `${(m / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km` : `${m} m`;

function Lencana({ teks, warna }: { teks: string; warna: string }) {
  return (
    <span className="badge" style={{ ...soft(warna, 18), color: warna }}>
      {teks}
    </span>
  );
}

export default function KunjunganPage() {
  const [start, setStart] = useState(hariIni());
  const [end, setEnd] = useState(hariIni());
  const [employeeId, setEmployeeId] = useState("");
  const [hasil, setHasil] = useState("");
  const [cumaDitandai, setCumaDitandai] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [foto, setFoto] = useState<Baris | null>(null);

  const query = useMemo(() => {
    const q = new URLSearchParams({ start, end: end || start });
    if (employeeId) q.set("employeeId", employeeId);
    if (hasil) q.set("hasil", hasil);
    return q.toString();
  }, [start, end, employeeId, hasil]);

  useEffect(() => {
    let batal = false;
    api<Payload>(`/api/kunjungan?${query}`)
      .then((d) => {
        if (batal) return;
        setData(d);
        setError("");
      })
      .catch((e) => {
        if (!batal) setError(e instanceof Error ? e.message : "Gagal memuat kunjungan.");
      });
    return () => {
      batal = true;
    };
  }, [query]);

  const items = useMemo(
    () => (data?.items ?? []).filter((b) => !cumaDitandai || b.penanda.length > 0),
    [data, cumaDitandai],
  );

  function aturRentang(jenis: "hari" | "minggu" | "bulan") {
    const akhir = new Date();
    const awal = new Date();
    if (jenis === "minggu") awal.setDate(awal.getDate() - 6);
    if (jenis === "bulan") awal.setDate(1);
    const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setStart(f(awal));
    setEnd(f(akhir));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Kunjungan Klien</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted">
            Kunjungan sales & teknisi lapangan dari HP masing-masing: lokasi saat mulai dan selesai, durasi, dan hasilnya.
            Penanda kuning cuma petunjuk untuk diperiksa, bukan penolakan.
          </p>
        </div>
        <a href={`/api/kunjungan/ekspor?${query}`} className="btn-ghost h-10 text-sm">
          <IconDownload className="text-[16px]" /> Ekspor Excel
        </a>
      </div>

      <section className="glass flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <label className="space-y-1 text-sm">
          <span className="block text-xs font-medium text-muted">Dari</span>
          <input type="date" className="input h-10 w-40" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-xs font-medium text-muted">Sampai</span>
          <input type="date" className="input h-10 w-40" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <div className="flex gap-1">
          <button type="button" onClick={() => aturRentang("hari")} className="btn-ghost h-10 text-xs">Hari ini</button>
          <button type="button" onClick={() => aturRentang("minggu")} className="btn-ghost h-10 text-xs">7 hari</button>
          <button type="button" onClick={() => aturRentang("bulan")} className="btn-ghost h-10 text-xs">Bulan ini</button>
        </div>
        <label className="space-y-1 text-sm">
          <span className="block text-xs font-medium text-muted">Karyawan</span>
          <select className="input h-10 w-48" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Semua karyawan</option>
            {(data?.karyawan ?? []).map((k) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-xs font-medium text-muted">Hasil</span>
          <select className="input h-10 w-44" value={hasil} onChange={(e) => setHasil(e.target.value)}>
            <option value="">Semua hasil</option>
            {HASIL.map((h) => (
              <option key={h.key} value={h.key}>{h.label}</option>
            ))}
            <option value="tanpa_hasil">Belum ada hasil</option>
          </select>
        </label>
        <label className="flex h-10 items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={cumaDitandai} onChange={(e) => setCumaDitandai(e.target.checked)} />
          Cuma yang ditandai
        </label>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-danger" style={soft("var(--danger)")}>
          <IconAlert className="shrink-0 text-[16px]" /> {error}
        </div>
      )}

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-24 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {data.ringkasan.length > 0 && (
            <section className="glass overflow-x-auto rounded-2xl p-4">
              <h2 className="mb-3 font-display text-sm font-bold text-fg">Ringkasan per karyawan</h2>
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-subtle">
                    <th className="pb-2 font-medium">Karyawan</th>
                    <th className="pb-2 text-right font-medium">Kunjungan</th>
                    <th className="pb-2 text-right font-medium">Total durasi</th>
                    <th className="pb-2 text-right font-medium">Deal</th>
                    <th className="pb-2 text-right font-medium">Ditandai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.ringkasan.map((r) => (
                    <tr key={r.employeeId}>
                      <td className="py-2 text-fg">{r.nama}</td>
                      <td className="tabular py-2 text-right">{r.jumlah}</td>
                      <td className="tabular py-2 text-right">{hm(r.totalMenit)}</td>
                      <td className="tabular py-2 text-right">{r.deal}</td>
                      <td className={`tabular py-2 text-right ${r.ditandai > 0 ? "text-warning" : ""}`}>{r.ditandai}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {data.terpotong && (
            <p className="text-xs text-warning">Terlalu banyak kunjungan — yang tampil 2.000 terbaru. Persempit rentangnya.</p>
          )}

          {items.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">
              {cumaDitandai ? "Tidak ada kunjungan yang ditandai pada saringan ini." : "Belum ada kunjungan pada saringan ini."}
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((b) => {
                const h = b.hasil ? META_HASIL[b.hasil] : null;
                return (
                  <li key={b.id} className="glass flex gap-3 rounded-2xl p-4">
                    {b.adaFoto && (
                      <button type="button" onClick={() => setFoto(b)} className="shrink-0" title="Lihat foto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/kunjungan/${b.id}/foto`}
                          alt={`Foto kunjungan ke ${b.namaKlien}`}
                          className="h-20 w-20 rounded-xl object-cover"
                          loading="lazy"
                        />
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="font-display font-bold text-fg">{b.namaKlien}</h2>
                          <p className="text-sm text-muted">
                            {b.nama} <span className="text-xs text-subtle">{b.kode}</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {b.status === "berjalan" && <Lencana teks="Sedang berjalan" warna="var(--info)" />}
                          {h && <Lencana teks={h.label} warna={h.warna} />}
                        </div>
                      </div>

                      <p className="mt-1 text-sm text-muted">
                        {tanggal(b.masukAt)} · {jam(b.masukAt)}
                        {b.keluarAt ? `–${jam(b.keluarAt)}` : ""}
                        {b.durasiMenit !== null && ` · ${hm(b.durasiMenit)}`}
                        {b.jarakM !== null && ` · berpindah ${jarakTeks(b.jarakM)}`}
                      </p>
                      {(b.alamat || b.tujuan) && (
                        <p className="mt-0.5 text-xs text-subtle">
                          {b.alamat}
                          {b.alamat && b.tujuan ? " · " : ""}
                          {b.tujuan && `Tujuan: ${b.tujuan}`}
                        </p>
                      )}
                      {b.catatan && (
                        <p className="mt-2 rounded-xl border border-border bg-surface-2 p-2.5 text-sm text-muted">{b.catatan}</p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <a href={b.petaMasuk} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                          <IconLink className="text-[13px]" /> Titik mulai (±{b.akurasiMasukM} m)
                        </a>
                        {b.petaKeluar && (
                          <a href={b.petaKeluar} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                            <IconLink className="text-[13px]" /> Titik selesai (±{b.akurasiKeluarM} m)
                          </a>
                        )}
                      </div>

                      {b.penanda.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {b.penanda.map((p) => (
                            <Lencana key={p.kode} teks={p.label} warna={p.kode === "tidak_selesai" ? "var(--danger)" : "var(--warning)"} />
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {foto && (
        <Modal title={`Foto kunjungan ke ${foto.namaKlien}`} onClose={() => setFoto(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/kunjungan/${foto.id}/foto`}
            alt={`Foto kunjungan ke ${foto.namaKlien}`}
            className="mx-auto max-h-[75vh] max-w-full rounded-xl object-contain"
          />
        </Modal>
      )}
    </div>
  );
}
