"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconCopy, IconPlus, IconQr, IconTrash } from "@/components/ui/icons";

type Lokasi = { id: number; nama: string; lat: number; lng: number; radiusM: number; wajibQr: boolean; layarToken: string; aktif: boolean };
type Karyawan = { id: number; nama: string; jabatan: string | null; aktif: boolean; pic: boolean; freelance: boolean; hpTerkunciSejak: string | null; punyaPin: boolean; token: string | null };
type Bukti = {
  id: number; waktu: string; nama: string; lokasi: string; jarakM: number | null; akurasiM: number; qr: boolean; jenis: string | null; foto: string;
  status: "diterima" | "menunggu" | "ditolak"; luar: boolean; alasan: string | null;
};

const STATUS_BUKTI: Record<string, { label: string; warna: string }> = {
  menunggu: { label: "Menunggu persetujuan", warna: "var(--warning)" },
  ditolak: { label: "Ditolak", warna: "var(--danger)" },
};

function soft(c: string, pct = 14): React.CSSProperties {
  return { background: `color-mix(in oklab, ${c} ${pct}%, transparent)`, color: c };
}

const jam = (t: string) => new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** "-7.912, 110.401" atau "-7.912 110.401" (seperti yang disalin dari Google Maps). */
function bacaKoordinat(teks: string): { lat: number; lng: number } | null {
  const m = teks.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export default function AbsenHpPage() {
  const [lokasi, setLokasi] = useState<Lokasi[]>([]);
  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [bukti, setBukti] = useState<Bukti[]>([]);
  const [tanggal, setTanggal] = useState(hariIni);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  const muat = useCallback(async () => {
    const [l, k] = await Promise.all([api<Lokasi[]>("/api/absen-hp/lokasi"), api<Karyawan[]>("/api/absen-hp/karyawan")]);
    setLokasi(l);
    setKaryawan(k);
  }, []);
  const muatBukti = useCallback(async () => setBukti(await api<Bukti[]>(`/api/absen-hp/bukti?tanggal=${tanggal}`)), [tanggal]);

  useEffect(() => {
    muat().catch((e: unknown) => setPesan({ ok: false, teks: e instanceof Error ? e.message : "Gagal memuat." }));
  }, [muat]);
  useEffect(() => {
    muatBukti().catch(() => {});
  }, [muatBukti]);

  async function kirim(url: string, method: string, body?: unknown, sukses?: string) {
    setPesan(null);
    try {
      await api(url, { method, body: body ? JSON.stringify(body) : undefined });
      if (sukses) setPesan({ ok: true, teks: sukses });
      await muat();
    } catch (e) {
      setPesan({ ok: false, teks: e instanceof Error ? e.message : "Gagal menyimpan." });
    }
  }

  const aktifCount = karyawan.filter((k) => k.aktif).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-fg">Absen lewat HP</h1>
        <p className="mt-0.5 max-w-3xl text-sm text-muted">
          Karyawan yang dipilih absen dari HP-nya sendiri. Absen diterima kalau HP berada di dalam radius
          lokasi kerja, karyawan berfoto, memakai HP yang sama dengan absen pertamanya, dan — kalau
          lokasinya mewajibkan — memindai QR yang berganti di layar lokasi.
        </p>
      </div>

      {pesan && (
        <p className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={soft(pesan.ok ? "var(--success)" : "var(--danger)")}>
          {pesan.ok ? <IconCheck /> : <IconAlert />} {pesan.teks}
        </p>
      )}

      <LokasiKartu lokasi={lokasi} kirim={kirim} />
      <KaryawanKartu karyawan={karyawan} aktifCount={aktifCount} kirim={kirim} adaLokasi={lokasi.some((l) => l.aktif)} />
      <SetelanLuarKartu />

      <section className="glass rounded-2xl p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-fg">Bukti absen</h2>
          <input type="date" className="input h-9 w-44" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        {bukti.length === 0 ? (
          <p className="py-6 text-center text-sm text-subtle">Belum ada absen lewat HP pada tanggal ini.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bukti.map((b) => (
              <li key={b.id} className="flex gap-3 rounded-xl border border-border p-2.5">
                <a href={b.foto} target="_blank" rel="noreferrer" className="shrink-0" title="Buka foto ukuran penuh">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.foto} alt={`Foto absen ${b.nama}`} className="h-20 w-16 rounded-lg object-cover" loading="lazy" />
                </a>
                <div className="min-w-0 text-sm">
                  <div className="truncate font-medium text-fg">{b.nama}</div>
                  <div className="text-muted">
                    {jam(b.waktu)} · {b.jenis === "in" ? "Masuk" : b.jenis === "out" ? "Pulang" : "—"}
                  </div>
                  <div className="truncate text-xs text-subtle">
                    {b.lokasi}{b.jarakM !== null ? ` · ${b.jarakM < 1000 ? `${b.jarakM} m` : `${(b.jarakM / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`}` : ""} (±{b.akurasiM} m){b.qr ? " · QR ✓" : ""}
                  </div>
                  {b.luar && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="badge" style={soft(STATUS_BUKTI[b.status]?.warna ?? "var(--success)", 18)}>
                        {STATUS_BUKTI[b.status]?.label ?? "Di luar lokasi · disetujui"}
                      </span>
                      {b.status === "menunggu" && (
                        <a href="/attendance/absen-luar" className="text-primary underline">Putuskan</a>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LokasiKartu({ lokasi, kirim }: { lokasi: Lokasi[]; kirim: (u: string, m: string, b?: unknown, s?: string) => Promise<void> }) {
  const [nama, setNama] = useState("");
  const [koor, setKoor] = useState("");
  const [radius, setRadius] = useState("100");
  const [wajibQr, setWajibQr] = useState(false);
  const [cari, setCari] = useState("");

  function pakaiLokasiSaya() {
    setCari("Mencari lokasi…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setKoor(`${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`);
        setCari(`Terbaca (±${Math.round(p.coords.accuracy)} m).`);
      },
      () => setCari("Lokasi tidak terbaca — izinkan akses lokasi, atau tempel koordinat dari Google Maps."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const titik = bacaKoordinat(koor);
  const asal = typeof window !== "undefined" ? window.location.origin : "";

  async function tambah() {
    if (!titik) return;
    await kirim("/api/absen-hp/lokasi", "POST", { nama: nama.trim(), lat: titik.lat, lng: titik.lng, radiusM: Number(radius) || 100, wajibQr }, "Lokasi ditambahkan.");
    setNama("");
    setKoor("");
    setCari("");
    setWajibQr(false);
  }

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-1 text-lg font-semibold text-fg">Lokasi absen</h2>
      <p className="mb-3 text-sm text-muted">Tempat karyawan boleh absen. HP harus berada di dalam radiusnya.</p>

      {lokasi.length > 0 && (
        <ul className="mb-4 divide-y divide-border">
          {lokasi.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <span className={`font-medium ${l.aktif ? "text-fg" : "text-subtle line-through"}`}>{l.nama}</span>
              <span className="text-xs text-subtle">
                radius {l.radiusM} m ·{" "}
                <a className="underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${l.lat},${l.lng}`}>
                  lihat di peta
                </a>
              </span>
              <label className="ml-auto flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" className="accent-[color:var(--primary)]" checked={l.wajibQr}
                  onChange={(e) => kirim(`/api/absen-hp/lokasi/${l.id}`, "PATCH", { wajibQr: e.target.checked })} />
                Wajib QR
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" className="accent-[color:var(--primary)]" checked={l.aktif}
                  onChange={(e) => kirim(`/api/absen-hp/lokasi/${l.id}`, "PATCH", { aktif: e.target.checked })} />
                Aktif
              </label>
              {l.wajibQr && (
                <a href={`/absen-layar/${l.layarToken}`} target="_blank" rel="noreferrer" className="btn-ghost h-8 px-2.5 text-xs">
                  <IconQr className="text-[14px]" /> Buka layar QR
                </a>
              )}
              {l.wajibQr && (
                <button className="btn-ghost h-8 px-2.5 text-xs" title="Salin alamat layar untuk tablet/TV di lokasi"
                  onClick={() => navigator.clipboard?.writeText(`${asal}/absen-layar/${l.layarToken}`)}>
                  <IconCopy className="text-[14px]" /> Salin alamat layar
                </button>
              )}
              <button className="btn-ghost h-8 px-2.5 text-xs text-danger"
                onClick={() => confirm(`Hapus lokasi ${l.nama}? Riwayat absennya tetap tersimpan.`) && kirim(`/api/absen-hp/lokasi/${l.id}`, "DELETE", undefined, "Lokasi dihapus.")}>
                <IconTrash className="text-[14px]" /> Hapus
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 rounded-xl border border-dashed border-border-strong p-3 sm:grid-cols-[1fr_1.4fr_110px]">
        <input className="input h-10" placeholder="Nama lokasi, mis. Toko Pusat" value={nama} onChange={(e) => setNama(e.target.value)} />
        <div className="flex gap-2">
          <input className="input h-10 min-w-0 flex-1" placeholder="Koordinat, mis. -7.912345, 110.401234" value={koor} onChange={(e) => setKoor(e.target.value)} />
          <button type="button" className="btn-ghost h-10 shrink-0 px-3 text-xs" onClick={pakaiLokasiSaya}>Lokasi saya</button>
        </div>
        <input className="input h-10" inputMode="numeric" value={radius} onChange={(e) => setRadius(e.target.value.replace(/\D/g, ""))} aria-label="Radius (meter)" title="Radius (meter)" />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <label className="flex items-center gap-1.5 text-sm text-muted">
            <input type="checkbox" className="accent-[color:var(--primary)]" checked={wajibQr} onChange={(e) => setWajibQr(e.target.checked)} />
            Wajib pindai QR di layar lokasi
          </label>
          <span className="text-xs text-subtle">{cari || "Radius dalam meter (30–2000). Tekan \"Lokasi saya\" saat berdiri di lokasinya."}</span>
          <button className="btn-primary ml-auto h-10" disabled={!nama.trim() || !titik} onClick={tambah}>
            <IconPlus className="text-[16px]" /> Tambah lokasi
          </button>
        </div>
      </div>
    </section>
  );
}

function KaryawanKartu({ karyawan, aktifCount, kirim, adaLokasi }: {
  karyawan: Karyawan[]; aktifCount: number; adaLokasi: boolean;
  kirim: (u: string, m: string, b?: unknown, s?: string) => Promise<void>;
}) {
  const asal = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-1 text-lg font-semibold text-fg">Karyawan <span className="text-sm font-normal text-subtle">({aktifCount} memakai absen HP)</span></h2>
      <p className="mb-3 text-sm text-muted">
        Nyalakan per orang, lalu kirim tautan absennya. Karyawan membuat PIN sendiri saat pertama membuka
        tautan, dan HP pertama yang dipakai absen jadi terkunci untuknya. Centang <b className="text-fg">PIC</b> untuk
        karyawan lapangan yang boleh mengabsenkan anggota timnya dari HP-nya (Absensi → Absen Tim) — absen yang
        dicatat PIC menunggu persetujuan Anda.
      </p>
      {!adaLokasi && (
        <p className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={soft("var(--warning)")}>
          <IconAlert /> Tambahkan minimal satu lokasi absen dulu — tanpa itu semua absen HP ditolak.
        </p>
      )}
      <ul className="divide-y divide-border">
        {karyawan.map((k) => (
          <li key={k.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
            <label className="flex min-w-48 flex-1 items-center gap-2">
              <input type="checkbox" className="accent-[color:var(--primary)]" checked={k.aktif}
                onChange={(e) => kirim(`/api/absen-hp/karyawan/${k.id}`, "PATCH", { aktif: e.target.checked })} />
              <span className="font-medium text-fg">{k.nama}</span>
              {k.jabatan && <span className="text-xs text-subtle">{k.jabatan}</span>}
              {k.freelance && <span className="badge" style={soft("var(--warning)", 18)}>Freelance</span>}
            </label>
            {k.aktif && (
              <>
                <label className="flex items-center gap-1.5 text-xs text-muted" title="Boleh mengabsenkan anggota tim dari HP-nya">
                  <input type="checkbox" className="accent-[color:var(--primary)]" checked={k.pic}
                    onChange={(e) => kirim(`/api/absen-hp/karyawan/${k.id}`, "PATCH", { pic: e.target.checked },
                      e.target.checked ? `${k.nama} sekarang PIC: tombol "Absen tim" muncul di halaman absennya.` : `${k.nama} bukan PIC lagi.`)} />
                  PIC (boleh absenkan tim)
                </label>
                <span className="text-xs text-subtle">
                  {k.hpTerkunciSejak ? `HP terkunci sejak ${new Date(k.hpTerkunciSejak).toLocaleDateString("id-ID")}` : "HP belum terkunci"}
                  {" · "}
                  {k.punyaPin ? "PIN sudah dibuat" : "PIN belum dibuat"}
                </span>
                {k.token && (
                  <button className="btn-ghost h-8 px-2.5 text-xs" onClick={() => navigator.clipboard?.writeText(`${asal}/absen/${k.token}`)}>
                    <IconCopy className="text-[14px]" /> Salin tautan absen
                  </button>
                )}
                {k.hpTerkunciSejak && (
                  <button className="btn-ghost h-8 px-2.5 text-xs"
                    onClick={() => confirm(`Lepas kunci HP ${k.nama}? HP berikutnya yang dipakai absen akan terkunci untuknya.`) && kirim(`/api/absen-hp/karyawan/${k.id}`, "PATCH", { lepasHp: true }, "Kunci HP dilepas.")}>
                    Lepas HP
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Sakelar absen di luar lokasi — berlaku untuk semua karyawan yang absen HP-nya menyala. */
function SetelanLuarKartu() {
  const [luar, setLuar] = useState<boolean | null>(null);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    api<{ luarLokasi: boolean }>("/api/absen-hp/setelan")
      .then((s) => setLuar(s.luarLokasi))
      .catch((e: unknown) => setGalat(e instanceof Error ? e.message : "Gagal memuat setelan."));
  }, []);

  async function ubah(nilai: boolean) {
    setGalat("");
    const lama = luar;
    setLuar(nilai);
    try {
      await api("/api/absen-hp/setelan", { method: "PATCH", body: JSON.stringify({ luarLokasi: nilai }) });
    } catch (e) {
      setLuar(lama);
      setGalat(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }

  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-fg">Absen di luar lokasi</h2>
          <p className="mt-0.5 text-sm text-muted">
            Untuk karyawan lapangan atau dinas luar. Kalau HP-nya di luar radius, karyawan bisa mengajukan absen dengan
            alasan, foto, dan lokasi GPS. Absennya baru tercatat setelah Anda setujui di{" "}
            <a href="/attendance/absen-luar" className="text-primary underline">Absen di luar lokasi</a>. HP terkunci dan
            GPS akurat tetap wajib.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-fg">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={luar === true}
            disabled={luar === null}
            onChange={(e) => ubah(e.target.checked)}
          />
          {luar ? "Boleh mengajukan" : "Tidak boleh"}
        </label>
      </div>
      {galat && <p className="mt-2 text-sm text-danger">{galat}</p>}
    </section>
  );
}
