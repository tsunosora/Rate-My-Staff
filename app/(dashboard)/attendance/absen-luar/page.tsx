"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconX } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { soft } from "@/components/portal/ui";

type Row = {
  id: number;
  waktu: string;
  karyawanId: number;
  nama: string;
  kode: string;
  lat: number;
  lng: number;
  akurasiM: number;
  jarakM: number | null;
  lokasi: string | null;
  radiusM: number | null;
  status: "menunggu" | "diterima" | "ditolak";
  alasan: string | null;
  catatan: string | null;
  diputusPada: string | null;
  diputusOleh: string | null;
  tercatat: boolean;
  foto: string;
};
type Payload = { menunggu: number; items: Row[] };

const FILTER = [
  { key: "menunggu", label: "Menunggu" },
  { key: "diterima", label: "Disetujui" },
  { key: "ditolak", label: "Ditolak" },
  { key: "", label: "Semua" },
] as const;

const STATUS: Record<Row["status"], { label: string; warna: string }> = {
  menunggu: { label: "Menunggu persetujuan", warna: "var(--warning)" },
  diterima: { label: "Disetujui", warna: "var(--success)" },
  ditolak: { label: "Ditolak", warna: "var(--danger)" },
};

const waktuPanjang = (t: string) =>
  new Date(t).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const jamSaja = (t: string) => new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

/** Jarak yang enak dibaca: 850 m, 3,2 km. */
function jarakTeks(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`;
}

export default function AbsenLuarPage() {
  const [filter, setFilter] = useState<string>("menunggu");
  const [data, setData] = useState<Payload | null>(null);
  const [galat, setGalat] = useState("");
  const [info, setInfo] = useState("");
  const [putus, setPutus] = useState<{ row: Row; aksi: "setujui" | "tolak" } | null>(null);
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const [versi, setVersi] = useState(0);
  const muat = useCallback(() => setVersi((v) => v + 1), []);
  useEffect(() => {
    let hidup = true;
    api<Payload>(`/api/absen-hp/persetujuan${filter ? `?status=${filter}` : ""}`)
      .then((d) => {
        if (!hidup) return;
        setData(d);
        setGalat("");
      })
      .catch((e: unknown) => hidup && setGalat(e instanceof Error ? e.message : "Gagal memuat data."));
    return () => {
      hidup = false;
    };
  }, [filter, versi]);

  async function kirim() {
    if (!putus) return;
    setSibuk(true);
    setGalat("");
    try {
      await api(`/api/absen-hp/persetujuan/${putus.row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ aksi: putus.aksi, catatan: catatan || null }),
      });
      setInfo(
        putus.aksi === "setujui"
          ? `Absen ${putus.row.nama} jam ${jamSaja(putus.row.waktu)} tercatat di absensi.`
          : `Pengajuan ${putus.row.nama} ditolak. Absensi tidak berubah.`,
      );
      setPutus(null);
      setCatatan("");
      await muat();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan keputusan.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-fg">Absen di luar lokasi</h1>
        <p className="mt-0.5 max-w-3xl text-sm text-muted">
          Karyawan yang absen dari HP di luar radius lokasi kerja (dinas, kunjungan pelanggan) mengajukannya di sini
          dengan alasan, foto, dan titik GPS. Absen baru masuk laporan setelah Anda setujui, dengan jam saat karyawan
          mengajukan, bukan jam Anda menyetujui.
        </p>
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

      <div className="flex flex-wrap items-center gap-2">
        {FILTER.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              filter === f.key
                ? "bg-gradient-to-r from-primary to-primary-2 text-on-primary shadow-lg shadow-primary/25"
                : "btn-ghost"
            }`}
          >
            {f.label}
            {f.key === "menunggu" && data && data.menunggu > 0 && (
              <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 text-xs text-warning">{data.menunggu}</span>
            )}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-28 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">Tidak ada pengajuan pada filter ini.</div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((r) => (
            <li key={r.id} className="glass flex flex-col gap-4 rounded-2xl p-4 sm:flex-row">
              <a href={r.foto} target="_blank" rel="noreferrer" className="shrink-0 self-start" title="Buka foto ukuran penuh">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.foto} alt={`Foto absen ${r.nama}`} className="h-32 w-24 rounded-xl object-cover" loading="lazy" />
              </a>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display font-bold text-fg">
                      {r.nama}
                      <span className="ml-2 text-xs font-normal text-subtle">{r.kode}</span>
                    </h2>
                    <p className="text-sm text-muted">Diajukan {waktuPanjang(r.waktu)}</p>
                  </div>
                  <span className="badge" style={soft(STATUS[r.status]?.warna ?? "var(--fg-subtle)", 18)}>
                    {STATUS[r.status]?.label ?? r.status}
                  </span>
                </div>

                <p className="mt-2 rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">{r.alasan}</p>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
                  <span>
                    {r.lokasi && r.jarakM !== null
                      ? `${jarakTeks(r.jarakM)} dari ${r.lokasi}${r.radiusM ? ` (radius ${r.radiusM} m)` : ""}`
                      : "Belum ada lokasi absen saat diajukan"}
                  </span>
                  <span>GPS ±{r.akurasiM} m</span>
                  <a href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer" className="text-primary underline">
                    Lihat di peta
                  </a>
                  {r.diputusOleh && <span>Diputus oleh {r.diputusOleh}</span>}
                </div>

                {r.catatan && (
                  <p className="mt-2 text-xs text-muted">
                    <b className="text-fg">Catatan:</b> {r.catatan}
                  </p>
                )}

                {r.status === "menunggu" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setPutus({ row: r, aksi: "setujui" });
                        setCatatan("");
                      }}
                      className="btn-primary h-9 text-xs"
                    >
                      <IconCheck className="text-[15px]" /> Setujui
                    </button>
                    <button
                      onClick={() => {
                        setPutus({ row: r, aksi: "tolak" });
                        setCatatan("");
                      }}
                      className="btn-ghost h-9 text-xs"
                    >
                      <IconX className="text-[15px]" /> Tolak
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {putus && (
        <Modal
          title={putus.aksi === "setujui" ? "Setujui absen di luar lokasi" : "Tolak absen di luar lokasi"}
          onClose={() => setPutus(null)}
        >
          <p className="text-sm text-muted">
            <b className="text-fg">{putus.row.nama}</b>, diajukan {waktuPanjang(putus.row.waktu)}.
          </p>
          <p className="mt-3 rounded-xl border border-border bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            {putus.aksi === "setujui"
              ? "Satu absen dicatat di absensi dengan jam saat karyawan mengajukan, lalu label masuk/pulang dan status telat hari itu dihitung ulang bersama scan mesin."
              : "Absensi tidak diubah sama sekali. Karyawan melihat status Ditolak beserta catatan Anda di halaman absennya."}
          </p>
          <label className="mt-4 block space-y-1.5 text-sm">
            <span className="font-medium text-muted">
              Catatan untuk karyawan {putus.aksi === "tolak" ? "(disarankan)" : "(opsional)"}
            </span>
            <textarea className="input" rows={3} maxLength={1000} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setPutus(null)} className="btn-ghost h-10">
              Batal
            </button>
            <button onClick={kirim} disabled={sibuk} className="btn-primary h-10">
              {sibuk ? "Menyimpan…" : "Konfirmasi"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
