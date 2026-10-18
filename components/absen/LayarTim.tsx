"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconAlert, IconCheck, IconChevronLeft, IconPlus, IconSearch } from "@/components/ui/icons";
import { bacaLokasi, idPerangkat, jamDari, kecilkan } from "./peramban";

/**
 * Layar "Absen tim" untuk PIC lapangan (bagian halaman /absen/[token]). PIC membuka sesi di satu
 * tempat kerja, lalu mengabsenkan anggotanya satu per satu: foto selfie anggota + GPS HP PIC.
 * Semua yang dicatat di sini MENUNGGU persetujuan owner/HR (Absensi → Absen Tim).
 */

type StatusBaris = "menunggu" | "diterima" | "ditolak";
type Baris = {
  id: number;
  jenis: "in" | "out";
  jam: string;
  status: StatusBaris;
  catatan: string | null;
  karyawanId: number;
  nama: string;
  freelanceBaru: boolean;
};
type Sesi = { id: number; namaTempat: string; mulaiAt: string; jumlah: Record<StatusBaris, number>; baris: Baris[] };
type Keadaan = { pic: { id: number; nama: string }; saran: string[]; sesi: Sesi[] };
type Anggota = { id: number; nama: string; jabatan?: string | null; freelanceBaru?: boolean };

const STATUS: Record<StatusBaris, { label: string; warna: string }> = {
  menunggu: { label: "Menunggu", warna: "var(--warning)" },
  diterima: { label: "Diterima", warna: "var(--success)" },
  ditolak: { label: "Ditolak", warna: "var(--danger)" },
};

function soft(c: string, pct = 14): React.CSSProperties {
  return { background: `color-mix(in oklab, ${c} ${pct}%, transparent)`, color: c };
}

/** Pesan galat dari jawaban server: rute tim memakai `alasan`, penjaga lisensi memakai `message`. */
function pesanDari(d: unknown, cadangan: string): string {
  const o = (d ?? {}) as { alasan?: string; message?: string };
  return o.alasan || o.message || cadangan;
}

export function LayarTim({ token, onTutup }: { token: string; onTutup: () => void }) {
  const [keadaan, setKeadaan] = useState<Keadaan | null>(null);
  const [sesiId, setSesiId] = useState<number | null>(null);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [galatMuat, setGalatMuat] = useState("");

  const minta = useCallback(
    async (jalur: string, init: RequestInit = {}) => {
      const r = await fetch(`/api/public/absen/${token}/tim${jalur}`, {
        ...init,
        headers: { ...(init.headers ?? {}), "x-perangkat": idPerangkat() },
      });
      const d = await r.json().catch(() => ({}));
      return { ok: r.ok, d };
    },
    [token],
  );

  const terima = useCallback((r: { ok: boolean; d: unknown }) => {
    if (!r.ok) return setGalatMuat(pesanDari(r.d, "Layar tim tidak bisa dibuka."));
    setGalatMuat("");
    setKeadaan(r.d as Keadaan);
  }, []);
  const gagalMuat = useCallback(() => setGalatMuat("Tidak tersambung ke server. Periksa internet lalu coba lagi."), []);
  const muat = useCallback(async () => {
    await minta("").then(terima, gagalMuat);
  }, [minta, terima, gagalMuat]);
  useEffect(() => {
    let hidup = true;
    minta("").then((r) => hidup && terima(r), () => hidup && gagalMuat());
    return () => {
      hidup = false;
    };
  }, [minta, terima, gagalMuat]);

  const sesi = keadaan?.sesi.find((s) => s.id === sesiId) ?? null;

  return (
    <section className="glass-2 space-y-4 rounded-3xl p-4 shadow-xl">
      <div className="flex items-center justify-between gap-2">
        <button className="btn-ghost h-9 px-3 text-sm" onClick={sesi ? () => setSesiId(null) : onTutup}>
          <IconChevronLeft className="text-[16px]" /> {sesi ? "Ganti tempat" : "Kembali"}
        </button>
        <h2 className="text-sm font-semibold text-fg">Absen tim</h2>
      </div>

      {galatMuat && (
        <p className="flex items-start gap-2 rounded-xl px-3 py-2 text-sm" style={soft("var(--danger)")}>
          <IconAlert className="mt-0.5 shrink-0" /> <span>{galatMuat}</span>
        </p>
      )}
      {pesan && (
        <p className="flex items-start gap-2 rounded-xl px-3 py-2 text-left text-sm" style={soft(pesan.ok ? "var(--success)" : "var(--danger)")}>
          {pesan.ok ? <IconCheck className="mt-0.5 shrink-0" /> : <IconAlert className="mt-0.5 shrink-0" />}
          <span>{pesan.teks}</span>
        </p>
      )}

      {!keadaan ? (
        !galatMuat && <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-border-strong border-t-primary" />
      ) : sesi ? (
        <IsiSesi sesi={sesi} minta={minta} setPesan={setPesan} muat={muat} />
      ) : (
        <PilihSesi
          keadaan={keadaan}
          minta={minta}
          setPesan={setPesan}
          onBuka={async (id) => {
            await muat();
            setSesiId(id);
          }}
        />
      )}
    </section>
  );
}

type Minta = (jalur: string, init?: RequestInit) => Promise<{ ok: boolean; d: unknown }>;
type SetPesan = (p: { ok: boolean; teks: string } | null) => void;

function PilihSesi({ keadaan, minta, setPesan, onBuka }: { keadaan: Keadaan; minta: Minta; setPesan: SetPesan; onBuka: (id: number) => void }) {
  const [tempat, setTempat] = useState("");
  const [sibuk, setSibuk] = useState(false);

  async function mulai() {
    setPesan(null);
    if (!("geolocation" in navigator)) return setPesan({ ok: false, teks: "HP ini tidak bisa membaca lokasi." });
    setSibuk(true);
    try {
      let pos: GeolocationPosition;
      try {
        pos = await bacaLokasi();
      } catch {
        return setPesan({ ok: false, teks: "Lokasi tidak terbaca. Nyalakan GPS dan izinkan akses lokasi untuk halaman ini, lalu coba lagi." });
      }
      const { ok, d } = await minta("/sesi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namaTempat: tempat, lat: pos.coords.latitude, lng: pos.coords.longitude, akurasi: pos.coords.accuracy }),
      });
      if (!ok) return setPesan({ ok: false, teks: pesanDari(d, "Sesi gagal dibuka.") });
      const s = d as { id: number; baru: boolean; namaTempat: string };
      setPesan({ ok: true, teks: s.baru ? `Sesi di ${s.namaTempat} dimulai.` : `Sesi hari ini di ${s.namaTempat} dibuka lagi.` });
      onBuka(s.id);
    } catch {
      setPesan({ ok: false, teks: "Tidak tersambung ke server. Periksa internet lalu coba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="space-y-4">
      {keadaan.sesi.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted">Sesi hari ini</div>
          {keadaan.sesi.map((s) => (
            <button key={s.id} onClick={() => onBuka(s.id)} className="glass flex w-full items-center justify-between gap-2 rounded-2xl p-3 text-left">
              <span>
                <span className="block font-medium text-fg">{s.namaTempat}</span>
                <span className="text-xs text-subtle">
                  Mulai {jamDari(s.mulaiAt)} · {s.baris.length} absen
                  {s.jumlah.menunggu ? ` · ${s.jumlah.menunggu} menunggu` : ""}
                </span>
              </span>
              <span className="text-sm text-primary">Buka</span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-muted">{keadaan.sesi.length ? "Atau mulai di tempat lain" : "Tempat kerja hari ini"}</span>
          <input
            className="input"
            list="saran-tempat-tim"
            maxLength={150}
            placeholder="mis. JCC Hall B"
            value={tempat}
            onChange={(e) => setTempat(e.target.value)}
          />
          <datalist id="saran-tempat-tim">
            {keadaan.saran.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <button className="btn-primary h-12 w-full disabled:opacity-60" disabled={sibuk || tempat.trim().length < 2} onClick={mulai}>
          {sibuk ? "Membaca lokasi…" : "Mulai sesi di sini"}
        </button>
        <p className="text-xs leading-relaxed text-subtle">
          Lokasi HP Anda saat ini jadi titik sesi. Semua absen yang Anda catat menunggu persetujuan owner.
        </p>
      </div>
    </div>
  );
}

function IsiSesi({ sesi, minta, setPesan, muat }: { sesi: Sesi; minta: Minta; setPesan: SetPesan; muat: () => Promise<void> }) {
  // Anggota yang ditambahkan PIC tapi belum diabsen — sisanya diturunkan dari baris sesi.
  const [tambahan, setTambahan] = useState<Anggota[]>([]);
  const [target, setTarget] = useState<{ id: number; nama: string; jenis: "in" | "out" } | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const fotoInput = useRef<HTMLInputElement>(null);

  const anggota = useMemo(() => {
    const peta = new Map<number, Anggota & { baris: Baris[] }>();
    for (const b of sesi.baris) {
      const a = peta.get(b.karyawanId) ?? { id: b.karyawanId, nama: b.nama, freelanceBaru: b.freelanceBaru, baris: [] };
      a.baris.push(b);
      peta.set(b.karyawanId, a);
    }
    for (const t of tambahan) if (!peta.has(t.id)) peta.set(t.id, { ...t, baris: [] });
    return [...peta.values()];
  }, [sesi.baris, tambahan]);

  function tambahAnggota(a: Anggota) {
    setTambahan((t) => (t.some((x) => x.id === a.id) ? t : [a, ...t]));
  }

  // Kamera dibuka LANGSUNG di dalam ketukan (peramban hanya mengizinkannya sesaat sesudah
  // ketukan), lokasi dibaca SESUDAH foto diambil — urutan yang sama dengan absen HP biasa.
  function absen(a: Anggota, jenis: "in" | "out") {
    setPesan(null);
    if (!("geolocation" in navigator)) return setPesan({ ok: false, teks: "HP ini tidak bisa membaca lokasi." });
    setTarget({ id: a.id, nama: a.nama, jenis });
    fotoInput.current?.click();
  }

  async function fotoDipilih(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    const t = target;
    if (!f || !t) return setTarget(null);
    setMengirim(true);
    try {
      let foto: Blob;
      try {
        foto = await kecilkan(f);
      } catch {
        return setPesan({ ok: false, teks: "Foto tidak terbaca. Coba ambil ulang." });
      }
      let pos: GeolocationPosition;
      try {
        pos = await bacaLokasi();
      } catch {
        return setPesan({ ok: false, teks: "Lokasi tidak terbaca. Nyalakan GPS dan izinkan akses lokasi, lalu coba lagi." });
      }
      const fd = new FormData();
      fd.set("sesi", String(sesi.id));
      fd.set("karyawan", String(t.id));
      fd.set("jenis", t.jenis);
      fd.set("foto", foto, "foto.jpg");
      fd.set("lat", String(pos.coords.latitude));
      fd.set("lng", String(pos.coords.longitude));
      fd.set("akurasi", String(pos.coords.accuracy));
      const { ok, d } = await minta("/absen", { method: "POST", body: fd });
      if (!ok) return setPesan({ ok: false, teks: pesanDari(d, "Absen gagal. Coba lagi.") });
      const r = d as { jam: string };
      setPesan({ ok: true, teks: `${t.nama}: absen ${t.jenis === "out" ? "pulang" : "masuk"} jam ${jamDari(r.jam)} tercatat, menunggu persetujuan owner.` });
      await muat();
    } catch {
      setPesan({ ok: false, teks: "Tidak tersambung ke server. Periksa internet lalu coba lagi." });
    } finally {
      setMengirim(false);
      setTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="font-display text-xl font-bold text-fg">{sesi.namaTempat}</div>
        <div className="text-xs text-subtle">
          Mulai {jamDari(sesi.mulaiAt)} · {sesi.jumlah.menunggu} menunggu · {sesi.jumlah.diterima} diterima
          {sesi.jumlah.ditolak ? ` · ${sesi.jumlah.ditolak} ditolak` : ""}
        </div>
      </div>

      <input ref={fotoInput} type="file" accept="image/*" capture="user" className="hidden" onChange={fotoDipilih} />

      <CariAnggota minta={minta} onPilih={tambahAnggota} setPesan={setPesan} />

      {anggota.length === 0 ? (
        <p className="text-center text-sm text-subtle">Cari nama anggota tim di atas, atau daftarkan freelance.</p>
      ) : (
        <ul className="space-y-2">
          {anggota.map((a) => {
            const sibukIni = mengirim && target?.id === a.id;
            return (
              <li key={a.id} className="glass space-y-2 rounded-2xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-fg">{a.nama}</div>
                    {a.freelanceBaru && (
                      <span className="badge" style={soft("var(--warning)", 18)}>Freelance baru</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary h-10 px-4 text-sm disabled:opacity-60" disabled={mengirim} onClick={() => absen(a, "in")}>
                      {sibukIni && target?.jenis === "in" ? "Mengirim…" : "Masuk"}
                    </button>
                    <button className="btn-ghost h-10 px-4 text-sm disabled:opacity-60" disabled={mengirim} onClick={() => absen(a, "out")}>
                      {sibukIni && target?.jenis === "out" ? "Mengirim…" : "Pulang"}
                    </button>
                  </div>
                </div>
                {a.baris.length > 0 && (
                  <ul className="space-y-1 text-xs">
                    {a.baris.map((b) => (
                      <li key={b.id} className="space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-fg">
                            {b.jenis === "out" ? "Pulang" : "Masuk"} · {jamDari(b.jam)}
                          </span>
                          <span className="badge" style={soft(STATUS[b.status]?.warna ?? "var(--fg-subtle)", 18)}>
                            {STATUS[b.status]?.label ?? b.status}
                          </span>
                        </div>
                        {b.catatan && (
                          <div className="text-muted">
                            <b className="text-fg">Catatan owner:</b> {b.catatan}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CariAnggota({ minta, onPilih, setPesan }: { minta: Minta; onPilih: (a: Anggota) => void; setPesan: SetPesan }) {
  const [q, setQ] = useState("");
  const [hasil, setHasil] = useState<Anggota[]>([]);
  const [daftar, setDaftar] = useState(false);
  const [nama, setNama] = useState("");
  const [hp, setHp] = useState("");
  const [namaAda, setNamaAda] = useState(false);
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    const kata = q.trim();
    if (kata.length < 2) return; // hasil disembunyikan saat dirender (lihat `tampil`)
    let hidup = true;
    const jeda = setTimeout(async () => {
      try {
        const { ok, d } = await minta(`/anggota?q=${encodeURIComponent(kata)}`);
        if (hidup && ok) setHasil((d as { items: Anggota[] }).items);
      } catch {
        /* pencarian berikutnya mencoba lagi */
      }
    }, 300);
    return () => {
      hidup = false;
      clearTimeout(jeda);
    };
  }, [q, minta]);

  const tampil = q.trim().length >= 2 ? hasil : [];

  async function daftarkan(tetap: boolean) {
    setPesan(null);
    setSibuk(true);
    try {
      const { ok, d } = await minta("/freelance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, hp: hp || null, tetapDaftarkan: tetap }),
      });
      if (!ok) {
        setNamaAda(Boolean((d as { namaAda?: boolean }).namaAda));
        return setPesan({ ok: false, teks: pesanDari(d, "Freelance gagal didaftarkan.") });
      }
      const e = d as { id: number; nama: string };
      onPilih({ id: e.id, nama: e.nama, freelanceBaru: true });
      setPesan({ ok: true, teks: `${e.nama} terdaftar sebagai freelance baru. Sekarang absen masuknya.` });
      setDaftar(false);
      setNama("");
      setHp("");
      setNamaAda(false);
    } catch {
      setPesan({ ok: false, teks: "Tidak tersambung ke server. Periksa internet lalu coba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="relative block">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input className="input pl-9" placeholder="Cari nama anggota tim" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {tampil.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {tampil.map((h) => (
            <li key={h.id}>
              <button
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm"
                onClick={() => {
                  onPilih(h);
                  setQ("");
                  setHasil([]);
                }}
              >
                <span>
                  <span className="text-fg">{h.nama}</span>
                  {h.jabatan && <span className="ml-1.5 text-xs text-subtle">{h.jabatan}</span>}
                </span>
                <IconPlus className="text-primary" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!daftar ? (
        <button className="btn-ghost h-10 w-full text-sm" onClick={() => setDaftar(true)}>
          <IconPlus className="text-[16px]" /> Daftarkan freelance
        </button>
      ) : (
        <div className="space-y-2 rounded-2xl border border-border p-3">
          <div className="text-sm font-medium text-fg">Daftarkan tukang freelance</div>
          <input className="input" maxLength={150} placeholder="Nama lengkap (wajib)" value={nama} onChange={(e) => { setNama(e.target.value); setNamaAda(false); }} />
          <input className="input" inputMode="tel" maxLength={20} placeholder="No. HP (boleh kosong)" value={hp} onChange={(e) => setHp(e.target.value)} />
          <p className="text-xs leading-relaxed text-subtle">Owner akan memeriksa freelance baru. Sampai diperiksa, namanya berlabel “freelance baru”.</p>
          <div className="flex gap-2">
            <button className="btn-ghost h-10 flex-1" onClick={() => { setDaftar(false); setNamaAda(false); }}>Batal</button>
            {namaAda ? (
              <button className="btn-primary h-10 flex-1 disabled:opacity-60" disabled={sibuk} onClick={() => daftarkan(true)}>
                Tetap daftarkan
              </button>
            ) : (
              <button className="btn-primary h-10 flex-1 disabled:opacity-60" disabled={sibuk || nama.trim().length < 2} onClick={() => daftarkan(false)}>
                {sibuk ? "Mendaftarkan…" : "Daftarkan"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
