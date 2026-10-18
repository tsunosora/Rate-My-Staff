"use client";

import { useCallback, useEffect, useState } from "react";
import { IconAlert, IconCheck, IconChevronLeft, IconPlus, IconSearch } from "@/components/ui/icons";
import { pesanDari, type Minta } from "./peramban";

/**
 * "Kelola tim" di HP PIC: lihat anggota, keluarkan, tambah karyawan yang BELUM punya tim, dan
 * daftarkan tukang freelance (langsung masuk tim ini). Memindahkan orang dari tim lain bukan
 * wewenang PIC — server menolaknya dengan "minta admin memindahkan".
 */

type Orang = { id: number; nama: string; jabatan: string | null; freelance: boolean; freelanceBaru: boolean; kepala?: boolean };
type Keadaan = { tim: { id: number; nama: string; kepala: string | null }; anggota: Orang[] };
type Pesan = { ok: boolean; teks: string } | null;

function soft(c: string, pct = 14): React.CSSProperties {
  return { background: `color-mix(in oklab, ${c} ${pct}%, transparent)`, color: c };
}

export function KelolaTim({ minta, tim, onKembali }: { minta: Minta; tim: { nama: string }; onKembali: () => void }) {
  const [keadaan, setKeadaan] = useState<Keadaan | null>(null);
  const [pesan, setPesan] = useState<Pesan>(null);
  const [yakin, setYakin] = useState<number | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const terima = useCallback((r: { ok: boolean; d: unknown }) => {
    if (!r.ok) return setPesan({ ok: false, teks: pesanDari(r.d, "Daftar anggota tidak bisa dibuka.") });
    setKeadaan(r.d as Keadaan);
  }, []);
  const gagal = useCallback(() => setPesan({ ok: false, teks: "Tidak tersambung ke server. Periksa internet lalu coba lagi." }), []);
  const muat = useCallback(() => minta("/kelola").then(terima, gagal), [minta, terima, gagal]);

  useEffect(() => {
    let hidup = true;
    minta("/kelola").then((r) => hidup && terima(r), () => hidup && gagal());
    return () => {
      hidup = false;
    };
  }, [minta, terima, gagal]);

  async function keluarkan(o: Orang) {
    if (yakin !== o.id) return setYakin(o.id);
    setYakin(null);
    setPesan(null);
    setSibuk(true);
    try {
      const { ok, d } = await minta(`/kelola?employeeId=${o.id}`, { method: "DELETE" });
      if (!ok) return setPesan({ ok: false, teks: pesanDari(d, "Gagal mengeluarkan dari tim.") });
      setPesan({ ok: true, teks: `${o.nama} dikeluarkan dari tim.` });
      await muat();
    } catch {
      gagal();
    } finally {
      setSibuk(false);
    }
  }

  async function tambah(o: Orang) {
    setPesan(null);
    setSibuk(true);
    try {
      const { ok, d } = await minta("/kelola", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: o.id }),
      });
      if (!ok) return setPesan({ ok: false, teks: pesanDari(d, "Gagal menambahkan ke tim.") });
      setPesan({ ok: true, teks: `${o.nama} masuk tim.` });
      await muat();
    } catch {
      gagal();
    } finally {
      setSibuk(false);
    }
  }

  return (
    <section className="glass-2 space-y-4 rounded-3xl p-4 shadow-xl">
      <div className="flex items-center justify-between gap-2">
        <button className="btn-ghost h-10 px-3 text-sm" onClick={onKembali}>
          <IconChevronLeft className="text-[16px]" /> Kembali ke rekap
        </button>
        <h2 className="text-sm font-semibold text-fg">Kelola tim</h2>
      </div>

      <div>
        <div className="font-display text-lg font-bold text-fg">{keadaan?.tim.nama ?? tim.nama}</div>
        <div className="text-xs text-subtle">
          {keadaan ? `${keadaan.anggota.length} anggota` : "Memuat…"}
          {keadaan?.tim.kepala ? ` · kepala tim ${keadaan.tim.kepala}` : ""}
        </div>
      </div>

      {pesan && (
        <p className="flex items-start gap-2 rounded-xl px-3 py-2 text-left text-sm" style={soft(pesan.ok ? "var(--success)" : "var(--danger)")}>
          {pesan.ok ? <IconCheck className="mt-0.5 shrink-0" /> : <IconAlert className="mt-0.5 shrink-0" />}
          <span>{pesan.teks}</span>
        </p>
      )}

      <CariTambah minta={minta} sibuk={sibuk} onTambah={tambah} />
      <DaftarFreelance minta={minta} setPesan={setPesan} onSelesai={muat} />

      {keadaan && (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {keadaan.anggota.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
              <span className="min-w-0">
                <span className="block text-sm text-fg">{o.nama}</span>
                <span className="text-xs text-subtle">
                  {[o.kepala ? "Kepala tim" : null, o.jabatan, o.freelance ? (o.freelanceBaru ? "freelance baru" : "freelance") : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              {!o.kepala && (
                <button
                  className="btn-ghost h-10 shrink-0 px-3 text-sm disabled:opacity-60"
                  style={yakin === o.id ? soft("var(--danger)", 16) : undefined}
                  disabled={sibuk}
                  onClick={() => keluarkan(o)}
                  onBlur={() => setYakin((y) => (y === o.id ? null : y))}
                >
                  {yakin === o.id ? "Yakin keluarkan?" : "Keluarkan"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CariTambah({ minta, sibuk, onTambah }: { minta: Minta; sibuk: boolean; onTambah: (o: Orang) => Promise<void> }) {
  const [q, setQ] = useState("");
  const [hasil, setHasil] = useState<Orang[]>([]);

  useEffect(() => {
    const kata = q.trim();
    if (kata.length < 2) return; // hasil disembunyikan saat dirender (lihat `tampil`)
    let hidup = true;
    const jeda = setTimeout(async () => {
      try {
        const { ok, d } = await minta(`/kelola?q=${encodeURIComponent(kata)}`);
        if (hidup && ok) setHasil((d as { tersedia: Orang[] }).tersedia);
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

  return (
    <div className="space-y-2">
      <label className="relative block">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input className="input pl-9" placeholder="Tambah anggota: cari nama karyawan" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {q.trim().length >= 2 && tampil.length === 0 && (
        <p className="text-xs text-subtle">Tidak ada karyawan tanpa tim dengan nama itu. Orang yang sudah di tim lain hanya bisa dipindah admin.</p>
      )}
      {tampil.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {tampil.map((h) => (
            <li key={h.id}>
              <button
                className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-sm disabled:opacity-60"
                disabled={sibuk}
                onClick={async () => {
                  await onTambah(h);
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
    </div>
  );
}

function DaftarFreelance({ minta, setPesan, onSelesai }: { minta: Minta; setPesan: (p: Pesan) => void; onSelesai: () => Promise<unknown> }) {
  const [buka, setBuka] = useState(false);
  const [nama, setNama] = useState("");
  const [hp, setHp] = useState("");
  const [namaAda, setNamaAda] = useState(false);
  const [sibuk, setSibuk] = useState(false);

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
      const e = d as { nama: string };
      setPesan({ ok: true, teks: `${e.nama} terdaftar sebagai freelance baru dan masuk tim.` });
      setBuka(false);
      setNama("");
      setHp("");
      setNamaAda(false);
      await onSelesai();
    } catch {
      setPesan({ ok: false, teks: "Tidak tersambung ke server. Periksa internet lalu coba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  if (!buka) {
    return (
      <button className="btn-ghost h-11 w-full text-sm" onClick={() => setBuka(true)}>
        <IconPlus className="text-[16px]" /> Daftarkan freelance
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-2xl border border-border p-3">
      <div className="text-sm font-medium text-fg">Daftarkan tukang freelance</div>
      <input className="input" maxLength={150} placeholder="Nama lengkap (wajib)" value={nama} onChange={(e) => { setNama(e.target.value); setNamaAda(false); }} />
      <input className="input" inputMode="tel" maxLength={20} placeholder="No. HP (boleh kosong)" value={hp} onChange={(e) => setHp(e.target.value)} />
      <p className="text-xs leading-relaxed text-subtle">Owner akan memeriksa freelance baru. Sampai diperiksa, namanya berlabel “freelance baru”.</p>
      <div className="flex gap-2">
        <button className="btn-ghost h-11 flex-1" onClick={() => { setBuka(false); setNamaAda(false); }}>Batal</button>
        {namaAda ? (
          <button className="btn-primary h-11 flex-1 disabled:opacity-60" disabled={sibuk} onClick={() => daftarkan(true)}>
            Tetap daftarkan
          </button>
        ) : (
          <button className="btn-primary h-11 flex-1 disabled:opacity-60" disabled={sibuk || nama.trim().length < 2} onClick={() => daftarkan(false)}>
            {sibuk ? "Mendaftarkan…" : "Daftarkan"}
          </button>
        )}
      </div>
    </div>
  );
}
