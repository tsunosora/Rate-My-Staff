"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { IconAlert, IconCheck, IconPencil, IconPlus, IconTrash, IconX } from "@/components/ui/icons";
import { KotakPesan, Isian, soft, type Pesan } from "@/components/upah-tarif/umum";

type Anggota = { id: number; nama: string; jabatan: string | null; freelance: boolean; perluDiperiksa: boolean };
type Tim = {
  id: number; nama: string; warna: string; aktif: boolean; catatan: string | null;
  pic: { id: number; nama: string; absenHp: boolean; aktif: boolean } | null;
  anggota: Anggota[];
};
type Karyawan = { id: number; nama: string; freelance: boolean; timId: number | null; absenHp: boolean; memimpinTimId: number | null };
type Data = { tim: Tim[]; karyawan: Karyawan[] };

const WARNA = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#64748b"];

export default function TimKerjaPage() {
  const [data, setData] = useState<Data>({ tim: [], karyawan: [] });
  const [pesan, setPesan] = useState<Pesan>(null);
  const [ubah, setUbah] = useState<Tim | null>(null);

  const muat = useCallback(async () => setData(await api<Data>("/api/tim-kerja")), []);
  useEffect(() => {
    // Lewat Promise supaya setState terjadi sesudah render, bukan di badan efek.
    Promise.resolve()
      .then(muat)
      .catch((e: unknown) => setPesan({ ok: false, teks: e instanceof Error ? e.message : "Gagal memuat." }));
  }, [muat]);

  async function kirim(url: string, method: string, body?: unknown, sukses?: string): Promise<boolean> {
    setPesan(null);
    try {
      const r = await api<{ peringatan?: string | null }>(url, { method, body: body ? JSON.stringify(body) : undefined });
      // Peringatan dari server (mis. PIC belum memakai absen HP) lebih penting daripada "berhasil".
      if (r?.peringatan) setPesan({ ok: false, teks: r.peringatan });
      else if (sukses) setPesan({ ok: true, teks: sukses });
      await muat();
      return true;
    } catch (e) {
      setPesan({ ok: false, teks: e instanceof Error ? e.message : "Gagal menyimpan." });
      await muat().catch(() => {});
      return false;
    }
  }

  const namaTim = (id: number | null) => data.tim.find((t) => t.id === id)?.nama ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-fg">Tim Kerja</h1>
        <p className="mt-0.5 max-w-3xl text-sm text-muted">
          Kelompok tukang lapangan. Kepala tim (PIC) mencatat kehadiran anggotanya tiap hari dari HP-nya sendiri, lalu
          catatannya menunggu persetujuan Anda di Absensi → Rekap Tim. Satu orang hanya di satu tim.
        </p>
      </div>

      <KotakPesan pesan={pesan} />

      <TimBaru karyawan={data.karyawan} kirim={kirim} />

      {data.tim.length === 0 ? (
        <p className="glass rounded-2xl py-10 text-center text-sm text-subtle">Belum ada tim.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.tim.map((t) => (
            <KartuTim key={t.id} tim={t} karyawan={data.karyawan} namaTim={namaTim} kirim={kirim} onUbah={() => setUbah(t)} />
          ))}
        </div>
      )}

      {ubah && <UbahTim tim={ubah} kirim={kirim} onTutup={() => setUbah(null)} />}
    </div>
  );
}

type Kirim = (url: string, method: string, body?: unknown, sukses?: string) => Promise<boolean>;

/** Pilihan PIC: karyawan aktif yang belum memimpin tim lain. */
function PilihanPic({ karyawan, timId }: { karyawan: Karyawan[]; timId: number | null }) {
  return (
    <>
      {karyawan
        .filter((k) => k.memimpinTimId === null || k.memimpinTimId === timId)
        .map((k) => (
          <option key={k.id} value={k.id}>
            {k.nama}{k.freelance ? " (freelance)" : ""}{k.absenHp ? "" : " — absen HP belum aktif"}
          </option>
        ))}
    </>
  );
}

function TimBaru({ karyawan, kirim }: { karyawan: Karyawan[]; kirim: Kirim }) {
  const [nama, setNama] = useState("");
  const [warna, setWarna] = useState(WARNA[0]);
  const [picId, setPicId] = useState("");

  async function buat() {
    const ok = await kirim("/api/tim-kerja", "POST", { nama: nama.trim(), warna, picId: picId ? Number(picId) : null }, `Tim ${nama.trim()} dibuat.`);
    if (ok) {
      setNama("");
      setPicId("");
    }
  }

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-3 text-lg font-semibold text-fg">Tim baru</h2>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <Isian label="Nama tim">
          <input className="input h-10" maxLength={80} placeholder="mis. Tim Pasang Booth" value={nama} onChange={(e) => setNama(e.target.value)} />
        </Isian>
        <Isian label="Kepala tim (PIC)">
          <select className="input h-10" value={picId} onChange={(e) => setPicId(e.target.value)}>
            <option value="">— pilih nanti —</option>
            <PilihanPic karyawan={karyawan} timId={null} />
          </select>
        </Isian>
        <Isian label="Warna">
          <input type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent" value={warna} onChange={(e) => setWarna(e.target.value)} />
        </Isian>
        <button className="btn-primary h-10" disabled={!nama.trim()} onClick={buat}>
          <IconPlus className="text-[16px]" /> Buat tim
        </button>
      </div>
      <p className="mt-2 text-xs text-subtle">
        Kepala tim otomatis jadi anggota timnya dan boleh mengabsenkan tim. Dia juga perlu absen HP aktif di Pengaturan → Absen
        lewat HP.
      </p>
    </section>
  );
}

function KartuTim({ tim, karyawan, namaTim, kirim, onUbah }: {
  tim: Tim; karyawan: Karyawan[]; namaTim: (id: number | null) => string | null; kirim: Kirim; onUbah: () => void;
}) {
  const [calon, setCalon] = useState("");
  const tanpaTim = karyawan.filter((k) => k.timId === null);
  // Kepala tim lain tidak ditawarkan: memindahkannya membuat tim lamanya tanpa kepala.
  const diTimLain = karyawan.filter((k) => k.timId !== null && k.timId !== tim.id && k.memimpinTimId === null);

  async function tambah() {
    const k = karyawan.find((x) => String(x.id) === calon);
    if (!k) return;
    if (k.timId !== null && !confirm(`${k.nama} sekarang di ${namaTim(k.timId) ?? "tim lain"}. Pindahkan ke ${tim.nama}?`)) return;
    if (await kirim(`/api/tim-kerja/${tim.id}/anggota`, "POST", { employeeId: k.id },
      k.timId !== null ? `${k.nama} dipindah ke ${tim.nama}.` : `${k.nama} masuk ${tim.nama}.`)) setCalon("");
  }

  function gantiPic(nilai: string) {
    if (!nilai) {
      if (confirm(`Lepas kepala tim ${tim.nama}? Tanpa kepala tim, tidak ada yang mencatat kehadiran tim ini dari HP.`)) {
        kirim(`/api/tim-kerja/${tim.id}`, "PATCH", { picId: null }, "Kepala tim dilepas.");
      }
      return;
    }
    const k = karyawan.find((x) => String(x.id) === nilai);
    kirim(`/api/tim-kerja/${tim.id}`, "PATCH", { picId: Number(nilai) }, `${k?.nama ?? "Karyawan"} jadi kepala ${tim.nama}.`);
  }

  return (
    <section className={`glass rounded-2xl p-5 ${tim.aktif ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: tim.warna }} aria-hidden="true" />
        <h2 className="flex-1 text-lg font-semibold text-fg">{tim.nama}</h2>
        <span className="text-xs text-subtle">{tim.anggota.length} anggota</span>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" className="accent-[color:var(--primary)]" checked={tim.aktif}
            onChange={(e) => kirim(`/api/tim-kerja/${tim.id}`, "PATCH", { aktif: e.target.checked },
              e.target.checked ? "Tim diaktifkan." : "Tim dinonaktifkan.")} />
          Aktif
        </label>
        <button className="btn-ghost h-8 px-2.5 text-xs" onClick={onUbah}>
          <IconPencil className="text-[14px]" /> Ubah
        </button>
      </div>
      {tim.catatan && <p className="mt-1 text-xs text-subtle">{tim.catatan}</p>}

      <div className="mt-3">
        <Isian label="Kepala tim (PIC)">
          <select className="input h-10" value={tim.pic?.id ?? ""} onChange={(e) => gantiPic(e.target.value)}>
            <option value="">— belum ada —</option>
            <PilihanPic karyawan={karyawan} timId={tim.id} />
          </select>
        </Isian>
        {tim.pic && !tim.pic.absenHp && (
          <p className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={soft("var(--warning)")}>
            <IconAlert className="shrink-0" /> {tim.pic.nama} belum memakai absen HP. Nyalakan di{" "}
            <a href="/settings/absen-hp" className="underline">Absen lewat HP</a> supaya bisa mencatat timnya.
          </p>
        )}
        {!tim.pic && (
          <p className="mt-2 text-xs text-subtle">Tanpa kepala tim, kehadiran tim ini tidak dicatat dari HP.</p>
        )}
      </div>

      <ul className="mt-3 divide-y divide-border">
        {tim.anggota.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
            <span className="font-medium text-fg">{a.nama}</span>
            {a.jabatan && <span className="text-xs text-subtle">{a.jabatan}</span>}
            {tim.pic?.id === a.id && <span className="badge" style={soft("var(--primary)", 16)}>PIC</span>}
            {a.freelance && (
              <span className="badge" style={soft("var(--warning)", 18)}>
                {a.perluDiperiksa ? "Freelance baru — perlu diperiksa" : "Freelance"}
              </span>
            )}
            {tim.pic?.id !== a.id && (
              <button className="btn-ghost ml-auto h-8 px-2.5 text-xs"
                onClick={() => confirm(`Keluarkan ${a.nama} dari ${tim.nama}? Catatan hariannya tetap tersimpan.`) &&
                  kirim(`/api/tim-kerja/${tim.id}/anggota?employeeId=${a.id}`, "DELETE", undefined, `${a.nama} dikeluarkan.`)}>
                <IconX className="text-[14px]" /> Keluarkan
              </button>
            )}
          </li>
        ))}
        {tim.anggota.length === 0 && <li className="py-3 text-center text-xs text-subtle">Belum ada anggota.</li>}
      </ul>

      <div className="mt-3 flex gap-2">
        <select className="input h-10 min-w-0 flex-1" aria-label={`Tambah anggota ke ${tim.nama}`} value={calon} onChange={(e) => setCalon(e.target.value)}>
          <option value="">Tambah anggota…</option>
          {tanpaTim.length > 0 && (
            <optgroup label="Belum punya tim">
              {tanpaTim.map((k) => <option key={k.id} value={k.id}>{k.nama}{k.freelance ? " (freelance)" : ""}</option>)}
            </optgroup>
          )}
          {diTimLain.length > 0 && (
            <optgroup label="Pindahkan dari tim lain">
              {diTimLain.map((k) => <option key={k.id} value={k.id}>{k.nama} — {namaTim(k.timId)}</option>)}
            </optgroup>
          )}
        </select>
        <button className="btn-primary h-10 shrink-0" disabled={!calon} onClick={tambah}>
          <IconPlus className="text-[16px]" /> Tambah
        </button>
      </div>
    </section>
  );
}

function UbahTim({ tim, kirim, onTutup }: { tim: Tim; kirim: Kirim; onTutup: () => void }) {
  const [nama, setNama] = useState(tim.nama);
  const [warna, setWarna] = useState(tim.warna);
  const [catatan, setCatatan] = useState(tim.catatan ?? "");

  async function simpan() {
    if (await kirim(`/api/tim-kerja/${tim.id}`, "PATCH", { nama: nama.trim(), warna, catatan: catatan.trim() || null }, "Tim disimpan.")) onTutup();
  }

  async function hapus() {
    if (!confirm(`Hapus ${tim.nama}? ${tim.anggota.length} anggotanya jadi tanpa tim. Catatan harian mereka tetap tersimpan.`)) return;
    if (await kirim(`/api/tim-kerja/${tim.id}`, "DELETE", undefined, "Tim dihapus.")) onTutup();
  }

  return (
    <Modal title={`Ubah ${tim.nama}`} onClose={onTutup}>
      <div className="grid gap-3">
        <Isian label="Nama tim">
          <input className="input" maxLength={80} value={nama} onChange={(e) => setNama(e.target.value)} />
        </Isian>
        <Isian label="Warna">
          <div className="flex flex-wrap items-center gap-2">
            {WARNA.map((w) => (
              <button key={w} type="button" aria-label={`Warna ${w}`} onClick={() => setWarna(w)}
                className={`h-7 w-7 rounded-full border-2 ${warna === w ? "border-fg" : "border-transparent"}`} style={{ background: w }} />
            ))}
            <input type="color" className="h-8 w-12 cursor-pointer rounded-lg border border-border bg-transparent" value={warna} onChange={(e) => setWarna(e.target.value)} />
          </div>
        </Isian>
        <Isian label="Catatan">
          <textarea className="input min-h-20" maxLength={1000} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </Isian>
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <button className="btn-ghost text-danger" onClick={hapus}>
          <IconTrash className="text-[16px]" /> Hapus tim
        </button>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onTutup}>Batal</button>
          <button className="btn-primary" disabled={!nama.trim()} onClick={simpan}>
            <IconCheck className="text-[16px]" /> Simpan
          </button>
        </div>
      </div>
    </Modal>
  );
}
