"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconChevronLeft, IconChevronRight, IconDownload } from "@/components/ui/icons";
import { rupiah, soft } from "@/components/portal/ui";
import { geser, labelRentang, mingguIni } from "./periode";

type Ringkas = {
  hadir: number;
  setengah: number;
  absen: number;
  lemburJam: number;
  upahPokok: number;
  upahLembur: number;
  upahKhusus: number;
  penyesuaian: number;
  total: number;
  tarifKosong: number;
};
type Orang = {
  employeeId: number;
  nama: string;
  kode: string;
  freelance: boolean;
  tim: { id: number; nama: string } | null;
  ringkas: Ringkas;
  belumDibayar: number;
  statusBayar: "kosong" | "belum" | "sebagian" | "lunas";
  menunggu: number;
};
type Data = { dari: string; sampai: string; total: number; belumDibayar: number; orang: Orang[] };
type Tim = { id: number; nama: string; aktif: boolean };

export const BAYAR: Record<Orang["statusBayar"], { label: string; warna: string }> = {
  kosong: { label: "—", warna: "var(--fg-subtle)" },
  belum: { label: "Belum dibayar", warna: "var(--warning)" },
  sebagian: { label: "Dibayar sebagian", warna: "var(--primary)" },
  lunas: { label: "Lunas", warna: "var(--success)" },
};

const jam = (n: number) => (n ? n.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "–");

export function RekapUpah({ awal }: { awal: { dari: string; sampai: string; timId: string } }) {
  const bawaan = mingguIni();
  const [dari, setDari] = useState(awal.dari || bawaan.dari);
  const [sampai, setSampai] = useState(awal.sampai || bawaan.sampai);
  const [timId, setTimId] = useState(awal.timId);
  const [tim, setTim] = useState<Tim[]>([]);
  const [data, setData] = useState<Data | null>(null);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    api<{ tim: Tim[] }>("/api/rekap-tim/pilihan").then((p) => setTim(p.tim)).catch(() => setTim([]));
  }, []);

  useEffect(() => {
    let hidup = true;
    const q = new URLSearchParams({ dari, sampai });
    if (timId) q.set("timId", timId);
    // Simpan periode di alamat, supaya kembali dari rincian satu orang mendarat di periode yang sama.
    window.history.replaceState(null, "", `/upah?${q}`);
    api<Data>(`/api/upah?${q}`)
      .then((d) => {
        if (!hidup) return;
        setData(d);
        setGalat("");
      })
      .catch((e: unknown) => hidup && setGalat(e instanceof Error ? e.message : "Gagal memuat upah."));
    return () => {
      hidup = false;
    };
  }, [dari, sampai, timId]);

  function pindah(arah: 1 | -1) {
    const r = geser(dari, sampai, arah);
    setDari(r.dari);
    setSampai(r.sampai);
  }

  const q = new URLSearchParams({ dari, sampai });
  if (timId) q.set("timId", timId);
  const menungguTotal = data?.orang.reduce((n, o) => n + o.menunggu, 0) ?? 0;
  const tanpaTarif = data?.orang.filter((o) => o.ringkas.tarifKosong > 0).length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Rekap upah</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted">
            Upah tukang dari rekap harian yang sudah disetujui. Rekap yang masih menunggu belum dihitung. Buka nama
            untuk melihat rincian per hari, menambah bonus atau potongan, dan menandai dibayar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/attendance/rekap-tim" className="btn-ghost h-10 text-sm">
            Persetujuan rekap
          </Link>
          <a href={`/api/upah/ekspor?${q}`} className="btn-ghost h-10 text-sm">
            <IconDownload className="text-[16px]" /> Ekspor Excel
          </a>
        </div>
      </div>

      <div className="glass flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <div className="flex items-center gap-1">
          <button className="btn-ghost h-9 w-9 justify-center p-0" onClick={() => pindah(-1)} aria-label="Periode sebelumnya">
            <IconChevronLeft className="text-[16px]" />
          </button>
          <div className="min-w-44 px-2 text-center text-sm font-semibold text-fg">{labelRentang(dari, sampai)}</div>
          <button className="btn-ghost h-9 w-9 justify-center p-0" onClick={() => pindah(1)} aria-label="Periode berikutnya">
            <IconChevronRight className="text-[16px]" />
          </button>
          <button
            className="btn-ghost ml-1 h-9 text-xs"
            onClick={() => {
              setDari(bawaan.dari);
              setSampai(bawaan.sampai);
            }}
          >
            Minggu ini
          </button>
        </div>
        <label className="space-y-1 text-xs text-muted">
          <span className="block">Dari</span>
          <input type="date" className="input h-9" value={dari} onChange={(e) => e.target.value && setDari(e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-muted">
          <span className="block">Sampai</span>
          <input type="date" className="input h-9" value={sampai} onChange={(e) => e.target.value && setSampai(e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-muted">
          <span className="block">Tim</span>
          <select className="input h-9" value={timId} onChange={(e) => setTimId(e.target.value)}>
            <option value="">Semua tim</option>
            {tim.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nama}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-subtle">Paling panjang 31 hari.</span>
      </div>

      {galat && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-danger" style={soft("var(--danger)")}>
          <IconAlert className="shrink-0 text-[16px]" /> {galat}
        </div>
      )}

      {data && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="glass rounded-2xl p-4">
            <div className="text-xs text-muted">Total upah periode ini</div>
            <div className="mt-1 font-display text-2xl font-bold text-fg">{rupiah(data.total)}</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-xs text-muted">Belum dibayar</div>
            <div className="mt-1 font-display text-2xl font-bold text-fg">{rupiah(data.belumDibayar)}</div>
          </div>
          <div className="glass rounded-2xl p-4 text-sm">
            <div className="text-xs text-muted">Perlu dicek</div>
            <div className="mt-1 space-y-0.5 text-muted">
              <div>{menungguTotal ? `${menungguTotal} rekap masih menunggu persetujuan` : "Tidak ada rekap yang menunggu"}</div>
              <div>{tanpaTarif ? `${tanpaTarif} orang tarifnya belum diatur` : "Semua tarif sudah diatur"}</div>
            </div>
          </div>
        </div>
      )}

      {!data ? (
        !galat && <div className="glass h-48 animate-pulse rounded-2xl" />
      ) : data.orang.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">Belum ada rekap yang disetujui di periode ini.</div>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-2 py-3 text-right font-medium">Hadir</th>
                <th className="px-2 py-3 text-right font-medium">½ hari</th>
                <th className="px-2 py-3 text-right font-medium">Absen</th>
                <th className="px-2 py-3 text-right font-medium">Lembur (jam)</th>
                <th className="px-2 py-3 text-right font-medium">Upah pokok</th>
                <th className="px-2 py-3 text-right font-medium">Lembur</th>
                <th className="px-2 py-3 text-right font-medium">Khusus</th>
                <th className="px-2 py-3 text-right font-medium">Penyesuaian</th>
                <th className="px-2 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.orang.map((o) => (
                <tr key={o.employeeId} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={`/upah/${o.employeeId}?${new URLSearchParams({ dari, sampai })}`} className="font-semibold text-primary hover:underline">
                      {o.nama}
                    </Link>
                    <div className="text-xs text-subtle">
                      {o.kode}
                      {o.tim ? ` · ${o.tim.nama}` : ""}
                      {o.freelance ? " · freelance" : ""}
                    </div>
                    {o.menunggu > 0 && <div className="mt-1 text-xs text-warning">{o.menunggu} rekap menunggu, belum dihitung</div>}
                    {o.ringkas.tarifKosong > 0 && <div className="mt-1 text-xs text-danger">Tarif belum diatur ({o.ringkas.tarifKosong} hari)</div>}
                  </td>
                  <td className="px-2 py-3 text-right">{o.ringkas.hadir || "–"}</td>
                  <td className="px-2 py-3 text-right">{o.ringkas.setengah || "–"}</td>
                  <td className="px-2 py-3 text-right">{o.ringkas.absen || "–"}</td>
                  <td className="px-2 py-3 text-right">{jam(o.ringkas.lemburJam)}</td>
                  <td className="px-2 py-3 text-right">{rupiah(o.ringkas.upahPokok)}</td>
                  <td className="px-2 py-3 text-right">{rupiah(o.ringkas.upahLembur)}</td>
                  <td className="px-2 py-3 text-right">{o.ringkas.upahKhusus ? rupiah(o.ringkas.upahKhusus) : "–"}</td>
                  <td className="px-2 py-3 text-right">{o.ringkas.penyesuaian ? rupiah(o.ringkas.penyesuaian) : "–"}</td>
                  <td className="px-2 py-3 text-right font-semibold text-fg">{rupiah(o.ringkas.total)}</td>
                  <td className="px-4 py-3">
                    <span className="badge" style={soft(BAYAR[o.statusBayar].warna, 18)}>
                      {BAYAR[o.statusBayar].label}
                    </span>
                    {o.statusBayar === "sebagian" && <div className="mt-1 text-xs text-muted">Sisa {rupiah(o.belumDibayar)}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
