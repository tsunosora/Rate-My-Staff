"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconChevronLeft, IconX } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { soft } from "@/components/portal/ui";

type Jumlah = { menunggu: number; diterima: number; ditolak: number };
type Sesi = {
  id: number;
  namaTempat: string;
  mulaiAt: string;
  lat: number;
  lng: number;
  akurasiM: number;
  pic: string;
  orang: number;
  jumlah: Jumlah;
};
type Daftar = { menungguTotal: number; freelanceBaru: number; items: Sesi[] };
type Baris = {
  id: number;
  jenis: "in" | "out";
  waktu: string;
  lat: number;
  lng: number;
  akurasiM: number;
  jarakM: number;
  status: "menunggu" | "diterima" | "ditolak";
  catatan: string | null;
  diputusOleh: string | null;
  foto: string;
  karyawanId: number;
  nama: string;
  kode: string;
  freelance: boolean;
  freelanceBaru: boolean;
  didaftarkanOleh: string | null;
};
type Detail = Omit<Sesi, "orang"> & { baris: Baris[] };
type Freelance = { id: number; nama: string; kode: string; hp: string | null; didaftarkan: string; oleh: string | null; absen: number };

const FILTER = [
  { key: "menunggu", label: "Ada yang menunggu" },
  { key: "diterima", label: "Disetujui" },
  { key: "ditolak", label: "Ditolak" },
  { key: "", label: "Semua" },
] as const;

const STATUS: Record<Baris["status"], { label: string; warna: string }> = {
  menunggu: { label: "Menunggu", warna: "var(--warning)" },
  diterima: { label: "Disetujui", warna: "var(--success)" },
  ditolak: { label: "Ditolak", warna: "var(--danger)" },
};

const tanggalPanjang = (t: string) =>
  new Date(t).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const jamSaja = (t: string) => new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
const peta = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;
/** Jarak yang enak dibaca: 850 m, 3,2 km. */
const jarakTeks = (m: number) => (m < 1000 ? `${m} m` : `${(m / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`);

export default function AbsenTimPage() {
  const [filter, setFilter] = useState<string>("menunggu");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [data, setData] = useState<Daftar | null>(null);
  const [freelance, setFreelance] = useState<Freelance[]>([]);
  const [buka, setBuka] = useState<number | null>(null);
  const [galat, setGalat] = useState("");
  const [info, setInfo] = useState("");
  const [versi, setVersi] = useState(0);
  const muat = useCallback(() => setVersi((v) => v + 1), []);

  useEffect(() => {
    let hidup = true;
    const q = new URLSearchParams();
    if (filter) q.set("status", filter);
    if (dari) q.set("dari", dari);
    if (sampai) q.set("sampai", sampai);
    Promise.all([api<Daftar>(`/api/absen-tim?${q}`), api<Freelance[]>("/api/absen-tim/freelance")])
      .then(([d, f]) => {
        if (!hidup) return;
        setData(d);
        setFreelance(f);
        setGalat("");
      })
      .catch((e: unknown) => hidup && setGalat(e instanceof Error ? e.message : "Gagal memuat data."));
    return () => {
      hidup = false;
    };
  }, [filter, dari, sampai, versi]);

  async function ubahFreelance(f: Freelance, aksi: "periksa" | "nonaktifkan") {
    if (aksi === "nonaktifkan" && !confirm(`Nonaktifkan ${f.nama}? Riwayat absennya tetap, tapi dia tidak bisa diabsen lagi.`)) return;
    setGalat("");
    try {
      await api(`/api/absen-tim/freelance/${f.id}`, { method: "PATCH", body: JSON.stringify({ aksi }) });
      setInfo(aksi === "periksa" ? `${f.nama} ditandai sudah diperiksa.` : `${f.nama} dinonaktifkan.`);
      muat();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-fg">Absen tim</h1>
        <p className="mt-0.5 max-w-3xl text-sm text-muted">
          PIC lapangan mengabsenkan anggota timnya dari HP PIC, per tempat kerja per hari. Tiap absen menunggu persetujuan
          Anda dan baru masuk laporan setelah disetujui — dengan jam saat PIC mencatatnya, bukan jam Anda menyetujui. PIC
          ditandai di Pengaturan → Absen lewat HP.
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

      {freelance.length > 0 && buka === null && (
        <section className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-fg">Freelance baru — perlu diperiksa ({freelance.length})</h2>
          <p className="mt-0.5 text-xs text-muted">
            Didaftarkan PIC di tempat kerja. Pastikan orangnya memang ada, lalu tandai sudah diperiksa. Freelance dihitung ke
            batas jumlah karyawan paket; menonaktifkan yang fiktif atau sudah tidak bekerja membebaskan tempatnya.
          </p>
          <ul className="mt-3 divide-y divide-border">
            {freelance.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                <div className="min-w-48 flex-1">
                  <div className="font-medium text-fg">
                    {f.nama} <span className="text-xs font-normal text-subtle">{f.kode}</span>
                  </div>
                  <div className="text-xs text-subtle">
                    Dari PIC {f.oleh ?? "—"} · {tanggalPanjang(f.didaftarkan)}
                    {f.hp ? ` · ${f.hp}` : " · tanpa nomor HP"} · {f.absen} kali diabsen
                  </div>
                </div>
                <button className="btn-primary h-8 px-3 text-xs" onClick={() => ubahFreelance(f, "periksa")}>
                  <IconCheck className="text-[14px]" /> Sudah diperiksa
                </button>
                <button className="btn-ghost h-8 px-3 text-xs" onClick={() => ubahFreelance(f, "nonaktifkan")}>
                  Nonaktifkan
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {buka !== null ? (
        <DetailSesi
          id={buka}
          onKembali={() => {
            setBuka(null);
            muat();
          }}
          // setState stabil — DetailSesi memakainya di dependensi efek, jadi jangan dibungkus arrow baru.
          onInfo={setInfo}
          onGalat={setGalat}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2">
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
                {f.key === "menunggu" && data && data.menungguTotal > 0 && (
                  <span className="ml-1.5 rounded-full bg-white px-1.5 text-xs font-semibold text-amber-700 shadow-sm">{data.menungguTotal}</span>
                )}
              </button>
            ))}
            <label className="ml-auto space-y-1 text-xs text-muted">
              <span className="block">Dari</span>
              <input type="date" className="input h-9" value={dari} onChange={(e) => setDari(e.target.value)} />
            </label>
            <label className="space-y-1 text-xs text-muted">
              <span className="block">Sampai</span>
              <input type="date" className="input h-9" value={sampai} onChange={(e) => setSampai(e.target.value)} />
            </label>
          </div>

          {!data ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass h-20 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">Tidak ada sesi absen tim pada saringan ini.</div>
          ) : (
            <ul className="space-y-2">
              {data.items.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => {
                      setInfo("");
                      setBuka(s.id);
                    }}
                    className="glass flex w-full flex-wrap items-center gap-3 rounded-2xl p-4 text-left transition hover:shadow-lg"
                  >
                    <div className="min-w-48 flex-1">
                      <div className="font-display font-bold text-fg">{s.namaTempat}</div>
                      <div className="text-sm text-muted">
                        {tanggalPanjang(s.mulaiAt)} · PIC {s.pic} · {s.orang} orang
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(["menunggu", "diterima", "ditolak"] as const).map((k) =>
                        s.jumlah[k] > 0 ? (
                          <span key={k} className="badge" style={soft(STATUS[k].warna, 18)}>
                            {s.jumlah[k]} {STATUS[k].label.toLowerCase()}
                          </span>
                        ) : null,
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function DetailSesi({ id, onKembali, onInfo, onGalat }: {
  id: number;
  onKembali: () => void;
  onInfo: (t: string) => void;
  onGalat: (t: string) => void;
}) {
  const [d, setD] = useState<Detail | null>(null);
  const [putus, setPutus] = useState<{ baris: Baris; aksi: "setujui" | "tolak" } | null>(null);
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [versi, setVersi] = useState(0);

  useEffect(() => {
    let hidup = true;
    api<Detail>(`/api/absen-tim/${id}`)
      .then((x) => hidup && setD(x))
      .catch((e: unknown) => hidup && onGalat(e instanceof Error ? e.message : "Gagal memuat sesi."));
    return () => {
      hidup = false;
    };
  }, [id, versi, onGalat]);

  async function setujuiSemua() {
    if (!d) return;
    if (!confirm(`Setujui ${d.jumlah.menunggu} absen yang menunggu di ${d.namaTempat}?`)) return;
    setSibuk(true);
    onGalat("");
    try {
      const r = await api<{ disetujui: number }>(`/api/absen-tim/${id}/setujui`, { method: "POST", body: JSON.stringify({}) });
      onInfo(`${r.disetujui} absen di ${d.namaTempat} tercatat di absensi.`);
      setVersi((v) => v + 1);
    } catch (e) {
      onGalat(e instanceof Error ? e.message : "Gagal menyetujui.");
    } finally {
      setSibuk(false);
    }
  }

  async function kirimPutus() {
    if (!putus) return;
    setSibuk(true);
    onGalat("");
    try {
      await api(`/api/absen-tim/baris/${putus.baris.id}`, {
        method: "PATCH",
        body: JSON.stringify({ aksi: putus.aksi, catatan: catatan || null }),
      });
      const jenis = putus.baris.jenis === "out" ? "pulang" : "masuk";
      onInfo(
        putus.aksi === "setujui"
          ? `Absen ${jenis} ${putus.baris.nama} jam ${jamSaja(putus.baris.waktu)} tercatat di absensi.`
          : `Absen ${jenis} ${putus.baris.nama} ditolak. Absensi tidak berubah.`,
      );
      setPutus(null);
      setCatatan("");
      setVersi((v) => v + 1);
    } catch (e) {
      onGalat(e instanceof Error ? e.message : "Gagal menyimpan keputusan.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <section className="space-y-4">
      <button onClick={onKembali} className="btn-ghost h-9 text-sm">
        <IconChevronLeft className="text-[16px]" /> Semua sesi
      </button>

      {!d ? (
        <div className="glass h-40 animate-pulse rounded-2xl" />
      ) : (
        <>
          <div className="glass flex flex-wrap items-start justify-between gap-3 rounded-2xl p-4">
            <div>
              <h2 className="font-display text-xl font-bold text-fg">{d.namaTempat}</h2>
              <p className="text-sm text-muted">
                {tanggalPanjang(d.mulaiAt)} · dibuka {jamSaja(d.mulaiAt)} oleh PIC {d.pic}
              </p>
              <a href={peta(d.lat, d.lng)} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                Titik sesi di peta (GPS ±{d.akurasiM} m)
              </a>
            </div>
            {d.jumlah.menunggu > 0 && (
              <button onClick={setujuiSemua} disabled={sibuk} className="btn-primary h-10 disabled:opacity-60">
                <IconCheck className="text-[16px]" /> Setujui semua yang menunggu ({d.jumlah.menunggu})
              </button>
            )}
          </div>

          {d.baris.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">Belum ada absen di sesi ini.</div>
          ) : (
            <ul className="space-y-3">
              {d.baris.map((b) => (
                <li key={b.id} className="glass flex flex-col gap-4 rounded-2xl p-4 sm:flex-row">
                  <a href={b.foto} target="_blank" rel="noreferrer" className="shrink-0 self-start" title="Buka foto ukuran penuh">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.foto} alt={`Foto absen ${b.nama}`} className="h-28 w-20 rounded-xl object-cover" loading="lazy" />
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-display font-bold text-fg">
                          {b.nama}
                          <span className="ml-2 text-xs font-normal text-subtle">{b.kode}</span>
                        </h3>
                        {b.freelance && (
                          <span className="badge mt-0.5" style={soft("var(--warning)", 18)}>
                            {b.freelanceBaru ? `Freelance baru — dari PIC ${b.didaftarkanOleh ?? "?"}` : "Freelance"}
                          </span>
                        )}
                        <p className="mt-1 text-sm text-muted">
                          <b className="text-fg">{b.jenis === "out" ? "Pulang" : "Masuk"}</b> · {jamSaja(b.waktu)}
                        </p>
                      </div>
                      <span className="badge" style={soft(STATUS[b.status]?.warna ?? "var(--fg-subtle)", 18)}>
                        {STATUS[b.status]?.label ?? b.status}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
                      <span>{jarakTeks(b.jarakM)} dari titik sesi</span>
                      <span>GPS ±{b.akurasiM} m</span>
                      <a href={peta(b.lat, b.lng)} target="_blank" rel="noreferrer" className="text-primary underline">
                        Lihat di peta
                      </a>
                      {b.diputusOleh && <span>Diputus oleh {b.diputusOleh}</span>}
                    </div>

                    {b.catatan && (
                      <p className="mt-2 text-xs text-muted">
                        <b className="text-fg">Catatan:</b> {b.catatan}
                      </p>
                    )}

                    {b.status === "menunggu" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setPutus({ baris: b, aksi: "setujui" });
                            setCatatan("");
                          }}
                          className="btn-primary h-9 text-xs"
                        >
                          <IconCheck className="text-[15px]" /> Setujui
                        </button>
                        <button
                          onClick={() => {
                            setPutus({ baris: b, aksi: "tolak" });
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
        </>
      )}

      {putus && (
        <Modal title={putus.aksi === "setujui" ? "Setujui absen tim" : "Tolak absen tim"} onClose={() => setPutus(null)}>
          <p className="text-sm text-muted">
            <b className="text-fg">{putus.baris.nama}</b>, {putus.baris.jenis === "out" ? "pulang" : "masuk"} jam {jamSaja(putus.baris.waktu)}.
          </p>
          <p className="mt-3 rounded-xl border border-border bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            {putus.aksi === "setujui"
              ? "Satu absen dicatat di absensi dengan jam dan jenis (masuk/pulang) yang dicatat PIC, lalu status telat hari itu dihitung ulang."
              : "Absensi tidak diubah sama sekali. PIC melihat status Ditolak beserta catatan Anda di layar Absen tim."}
          </p>
          <label className="mt-4 block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Catatan untuk PIC {putus.aksi === "tolak" ? "(disarankan)" : "(opsional)"}</span>
            <textarea className="input" rows={3} maxLength={1000} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setPutus(null)} className="btn-ghost h-10">
              Batal
            </button>
            <button onClick={kirimPutus} disabled={sibuk} className="btn-primary h-10">
              {sibuk ? "Menyimpan…" : "Konfirmasi"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
