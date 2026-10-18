"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconPencil, IconPlus, IconX } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { soft } from "@/components/portal/ui";
import { bolehHalaman, useLisensi } from "@/components/lisensi/Lisensi";
import { FormBaris, type IsiBaris, type Pilihan } from "./FormBaris";

type Baris = {
  id: number;
  employeeId: number;
  nama: string;
  kode: string;
  freelance: boolean;
  freelanceBaru: boolean;
  tanggal: string;
  status: "hadir" | "setengah" | "absen";
  lemburJam: number;
  kota: string | null;
  divisi: string | null;
  proyekId: number | null;
  proyek: string | null;
  catatan: string | null;
  foto: string | null;
  lat: number | null;
  lng: number | null;
  akurasiM: number | null;
  pic: string | null;
  sumber: string;
  persetujuan: "menunggu" | "disetujui" | "ditolak";
  diputusOleh: string | null;
  alasanTolak: string | null;
  dibayar: boolean;
  versi: string;
};
type Kelompok = {
  timId: number | null;
  nama: string;
  warna: string | null;
  pic: string[];
  jumlah: { menunggu: number; disetujui: number; ditolak: number };
  baris: Baris[];
};
type Data = { dari: string; sampai: string; dimuatAt: string; menunggu: number; hari: { tanggal: string; tim: Kelompok[] }[] };

const STATUS: Record<Baris["status"], { label: string; warna: string }> = {
  hadir: { label: "Hadir", warna: "var(--success)" },
  setengah: { label: "½ Hari", warna: "var(--warning)" },
  absen: { label: "Absen", warna: "var(--danger)" },
};
const PERSETUJUAN: Record<Baris["persetujuan"], { label: string; warna: string }> = {
  menunggu: { label: "Menunggu", warna: "var(--warning)" },
  disetujui: { label: "Disetujui", warna: "var(--success)" },
  ditolak: { label: "Ditolak", warna: "var(--danger)" },
};

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const tanggalPanjang = (ymd: string) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const peta = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;
const jam = (n: number) => `${n.toLocaleString("id-ID", { maximumFractionDigits: 2 })} jam`;

type Putus =
  | { jenis: "tolak"; baris: Baris }
  | { jenis: "ubah"; baris: Baris }
  | { jenis: "tambah" };

export function PersetujuanRekap() {
  const lisensi = useLisensi();
  const bisaUpah = bolehHalaman(lisensi, "/upah");
  const [dari, setDari] = useState(hariIni);
  const [sampai, setSampai] = useState(hariIni);
  const [timId, setTimId] = useState("");
  const [status, setStatus] = useState("");
  const [orangId, setOrangId] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [pilihan, setPilihan] = useState<Pilihan | null>(null);
  const [galat, setGalat] = useState("");
  const [info, setInfo] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [putus, setPutus] = useState<Putus | null>(null);
  const [alasan, setAlasan] = useState("");
  const [versi, setVersi] = useState(0);
  const muat = useCallback(() => setVersi((v) => v + 1), []);

  useEffect(() => {
    api<Pilihan>("/api/rekap-tim/pilihan").then(setPilihan).catch(() => setPilihan(null));
  }, []);

  useEffect(() => {
    let hidup = true;
    const q = new URLSearchParams({ dari, sampai });
    if (timId) q.set("timId", timId);
    if (status) q.set("persetujuan", status);
    if (orangId) q.set("employeeId", orangId);
    api<Data>(`/api/rekap-tim?${q}`)
      .then((d) => {
        if (!hidup) return;
        setData(d);
        setGalat("");
      })
      .catch((e: unknown) => hidup && setGalat(e instanceof Error ? e.message : "Gagal memuat rekap."));
    return () => {
      hidup = false;
    };
  }, [dari, sampai, timId, status, orangId, versi]);

  const menungguTampil = useMemo(
    () => data?.hari.reduce((n, h) => n + h.tim.reduce((m, t) => m + t.jumlah.menunggu, 0), 0) ?? 0,
    [data],
  );

  async function jalankan(kerja: () => Promise<string>) {
    setSibuk(true);
    setGalat("");
    setInfo("");
    try {
      setInfo(await kerja());
      setPutus(null);
      muat();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSibuk(false);
    }
  }

  function setujuiMassal(cakupan: { tanggal?: string; timId?: number | null; label: string; jumlah: number }) {
    if (!data || !confirm(`Setujui ${cakupan.jumlah} rekap yang menunggu ${cakupan.label}?`)) return;
    const satuTim = cakupan.tanggal !== undefined;
    void jalankan(async () => {
      const r = await api<{ disetujui: number }>("/api/rekap-tim/setujui", {
        method: "POST",
        body: JSON.stringify({
          dari: cakupan.tanggal ?? data.dari,
          sampai: cakupan.tanggal ?? data.sampai,
          timId: satuTim ? (cakupan.timId ?? "tanpa") : timId || null,
          employeeId: orangId || null,
          dimuatAt: data.dimuatAt,
        }),
      });
      const sisa = cakupan.jumlah - r.disetujui;
      return `${r.disetujui} rekap disetujui.${sisa > 0 ? ` ${sisa} baru saja diubah PIC, jadi masih menunggu — periksa dulu.` : ""}`;
    });
  }

  function setujuiSatu(b: Baris) {
    void jalankan(async () => {
      await api(`/api/rekap-tim/${b.id}`, { method: "PATCH", body: JSON.stringify({ aksi: "setujui", versi: b.versi }) });
      return `Rekap ${b.nama} disetujui.`;
    });
  }

  function kirimTolak(b: Baris) {
    void jalankan(async () => {
      await api(`/api/rekap-tim/${b.id}`, { method: "PATCH", body: JSON.stringify({ aksi: "tolak", versi: b.versi, alasan }) });
      return `Rekap ${b.nama} ditolak.`;
    });
  }

  function kirimUbah(b: Baris, isi: IsiBaris) {
    void jalankan(async () => {
      await api(`/api/rekap-tim/${b.id}`, { method: "PATCH", body: JSON.stringify({ aksi: "ubah", versi: b.versi, ...isi }) });
      return `Rekap ${b.nama} diubah dan disetujui.`;
    });
  }

  function kirimTambah(isi: IsiBaris & { employeeId: number; tanggal: string }) {
    void jalankan(async () => {
      await api("/api/rekap-tim", { method: "POST", body: JSON.stringify(isi) });
      return "Baris ditambahkan dan langsung disetujui.";
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Rekap harian tim</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted">
            Kehadiran harian tukang yang dicatat PIC dari HP-nya. Periksa lalu setujui. Hanya rekap yang disetujui yang
            dihitung upahnya. Kalau PIC mengubah rekap yang sudah disetujui, rekap itu kembali menunggu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {bisaUpah && (
            <Link href="/upah" className="btn-ghost h-10 text-sm">
              Lihat upah
            </Link>
          )}
          <button className="btn-ghost h-10 text-sm" onClick={() => setPutus({ jenis: "tambah" })} disabled={!pilihan}>
            <IconPlus className="text-[16px]" /> Tambah baris
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

      <div className="glass flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <label className="space-y-1 text-xs text-muted">
          <span className="block">Dari</span>
          <input type="date" className="input h-9" value={dari} onChange={(e) => setDari(e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-muted">
          <span className="block">Sampai</span>
          <input type="date" className="input h-9" value={sampai} onChange={(e) => setSampai(e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-muted">
          <span className="block">Tim</span>
          <select className="input h-9" value={timId} onChange={(e) => setTimId(e.target.value)}>
            <option value="">Semua tim</option>
            {pilihan?.tim.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nama}
                {t.aktif ? "" : " (nonaktif)"}
              </option>
            ))}
            <option value="tanpa">Tanpa tim</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted">
          <span className="block">Status</span>
          <select className="input h-9" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua</option>
            <option value="menunggu">Menunggu</option>
            <option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </label>
        <label className="min-w-44 flex-1 space-y-1 text-xs text-muted">
          <span className="block">Orang</span>
          <select className="input h-9" value={orangId} onChange={(e) => setOrangId(e.target.value)}>
            <option value="">Semua orang</option>
            {pilihan?.karyawan.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama} ({k.kode})
              </option>
            ))}
          </select>
        </label>
        {menungguTampil > 0 && (
          <button
            className="btn-primary h-9 text-sm"
            disabled={sibuk}
            onClick={() => setujuiMassal({ label: "di saringan ini", jumlah: menungguTampil })}
          >
            <IconCheck className="text-[15px]" /> Setujui semua yang menunggu ({menungguTampil})
          </button>
        )}
      </div>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-24 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : data.hari.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">Belum ada rekap pada saringan ini.</div>
      ) : (
        data.hari.map((h) => (
          <section key={h.tanggal} className="space-y-3">
            <h2 className="font-display text-lg font-bold text-fg">{tanggalPanjang(h.tanggal)}</h2>
            {h.tim.map((t) => (
              <div key={`${h.tanggal}-${t.timId ?? "tanpa"}`} className="glass overflow-hidden rounded-2xl">
                <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: t.warna ?? "var(--fg-subtle)" }} />
                  <div className="min-w-40 flex-1">
                    <div className="font-semibold text-fg">{t.nama}</div>
                    <div className="text-xs text-subtle">
                      {t.baris.length} orang · dicatat {t.pic.length ? `PIC ${t.pic.join(", ")}` : "admin"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(["menunggu", "disetujui", "ditolak"] as const).map((k) =>
                      t.jumlah[k] > 0 ? (
                        <span key={k} className="badge" style={soft(PERSETUJUAN[k].warna, 18)}>
                          {t.jumlah[k]} {PERSETUJUAN[k].label.toLowerCase()}
                        </span>
                      ) : null,
                    )}
                  </div>
                  {t.jumlah.menunggu > 0 && (
                    <button
                      className="btn-primary h-8 px-3 text-xs"
                      disabled={sibuk}
                      onClick={() =>
                        setujuiMassal({ tanggal: h.tanggal, timId: t.timId, label: `di ${t.nama}`, jumlah: t.jumlah.menunggu })
                      }
                    >
                      <IconCheck className="text-[14px]" /> Setujui semua ({t.jumlah.menunggu})
                    </button>
                  )}
                </div>
                <ul className="divide-y divide-border">
                  {t.baris.map((b) => (
                    <BarisRekap
                      key={b.id}
                      b={b}
                      sibuk={sibuk}
                      onSetujui={() => setujuiSatu(b)}
                      onTolak={() => {
                        setAlasan("");
                        setPutus({ jenis: "tolak", baris: b });
                      }}
                      onUbah={() => setPutus({ jenis: "ubah", baris: b })}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))
      )}

      {putus?.jenis === "tolak" && (
        <Modal title="Tolak rekap" onClose={() => setPutus(null)}>
          <p className="text-sm text-muted">
            <b className="text-fg">{putus.baris.nama}</b>, {tanggalPanjang(putus.baris.tanggal)} — {STATUS[putus.baris.status].label}.
          </p>
          <p className="mt-3 rounded-xl border border-border bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            Rekap yang ditolak tidak dihitung upahnya. PIC melihat alasan Anda dan bisa membetulkannya; rekap lalu menunggu lagi.
          </p>
          <label className="mt-4 block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Alasan (wajib)</span>
            <textarea className="input" rows={3} maxLength={1000} value={alasan} onChange={(e) => setAlasan(e.target.value)} />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setPutus(null)} className="btn-ghost h-10">
              Batal
            </button>
            <button
              onClick={() => kirimTolak(putus.baris)}
              disabled={sibuk || alasan.trim().length < 3}
              className="btn-primary h-10"
            >
              {sibuk ? "Menyimpan…" : "Tolak"}
            </button>
          </div>
        </Modal>
      )}

      {putus?.jenis === "ubah" && pilihan && (
        <Modal title={`Ubah rekap ${putus.baris.nama}`} onClose={() => setPutus(null)}>
          <p className="mb-3 text-xs text-muted">
            {tanggalPanjang(putus.baris.tanggal)}. Menyimpan perubahan sekaligus menyetujui rekap ini.
          </p>
          <FormBaris
            pilihan={pilihan}
            awal={putus.baris}
            sibuk={sibuk}
            labelSimpan="Simpan & setujui"
            onBatal={() => setPutus(null)}
            onSimpan={(isi) => kirimUbah(putus.baris, isi)}
          />
        </Modal>
      )}

      {putus?.jenis === "tambah" && pilihan && (
        <Modal title="Tambah baris rekap" onClose={() => setPutus(null)}>
          <p className="mb-3 text-xs text-muted">
            Untuk hari yang lupa dicatat PIC. Baris tambahan Anda langsung disetujui. Satu orang hanya satu baris per hari.
          </p>
          <FormBaris
            pilihan={pilihan}
            tambah={{ tanggal: sampai }}
            sibuk={sibuk}
            labelSimpan="Tambah & setujui"
            onBatal={() => setPutus(null)}
            onSimpan={(isi) => kirimTambah(isi as IsiBaris & { employeeId: number; tanggal: string })}
          />
        </Modal>
      )}
    </div>
  );
}

function BarisRekap({ b, sibuk, onSetujui, onTolak, onUbah }: {
  b: Baris;
  sibuk: boolean;
  onSetujui: () => void;
  onTolak: () => void;
  onUbah: () => void;
}) {
  const tempat = [b.kota, b.divisi].filter(Boolean).join(" · ");
  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
      {b.foto ? (
        <a href={b.foto} target="_blank" rel="noreferrer" className="shrink-0 self-start" title="Buka foto ukuran penuh">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.foto} alt={`Foto ${b.nama}`} className="h-16 w-12 rounded-lg object-cover" loading="lazy" />
        </a>
      ) : (
        <div className="hidden h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[10px] text-subtle sm:flex">
          tanpa foto
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-fg">{b.nama}</span>
          <span className="text-xs text-subtle">{b.kode}</span>
          <span className="badge" style={soft(STATUS[b.status].warna, 18)}>
            {STATUS[b.status].label}
          </span>
          {b.lemburJam > 0 && <span className="badge" style={soft("var(--primary)", 14)}>Lembur {jam(b.lemburJam)}</span>}
          {b.freelance && (
            <span className="badge" style={soft("var(--warning)", 18)}>
              {b.freelanceBaru ? "Freelance baru — belum diperiksa" : "Freelance"}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
          {b.proyek && <span>Proyek: {b.proyek}</span>}
          {tempat && <span>{tempat}</span>}
          <span>{b.sumber === "admin" ? "Ditambah admin" : `PIC ${b.pic ?? "—"}`}</span>
          {b.lat != null && b.lng != null && (
            <a href={peta(b.lat, b.lng)} target="_blank" rel="noreferrer" className="text-primary underline">
              Lokasi{b.akurasiM != null ? ` (±${b.akurasiM} m)` : ""}
            </a>
          )}
          {b.diputusOleh && b.persetujuan !== "menunggu" && <span>Diputus oleh {b.diputusOleh}</span>}
        </div>
        {b.catatan && <p className="mt-1 text-xs text-muted">Catatan: {b.catatan}</p>}
        {b.persetujuan === "ditolak" && b.alasanTolak && <p className="mt-1 text-xs text-danger">Alasan ditolak: {b.alasanTolak}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {b.dibayar ? (
          <span className="badge" style={soft("var(--fg-subtle)", 18)} title="Sudah dibayar, tidak bisa diubah">
            Sudah dibayar
          </span>
        ) : (
          <>
            <span className="badge" style={soft(PERSETUJUAN[b.persetujuan].warna, 18)}>
              {PERSETUJUAN[b.persetujuan].label}
            </span>
            {b.persetujuan !== "disetujui" && (
              <button className="btn-primary h-8 px-3 text-xs" disabled={sibuk} onClick={onSetujui}>
                <IconCheck className="text-[14px]" /> Setujui
              </button>
            )}
            {b.persetujuan !== "ditolak" && (
              <button className="btn-ghost h-8 px-3 text-xs" disabled={sibuk} onClick={onTolak}>
                <IconX className="text-[14px]" /> Tolak
              </button>
            )}
            <button className="btn-ghost h-8 px-3 text-xs" disabled={sibuk} onClick={onUbah} aria-label={`Ubah rekap ${b.nama}`}>
              <IconPencil className="text-[14px]" /> Ubah
            </button>
          </>
        )}
      </div>
    </li>
  );
}
