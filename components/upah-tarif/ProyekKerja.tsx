"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { IconCheck, IconPencil, IconPlus, IconTrash } from "@/components/ui/icons";
import { angkaAtauNull, Isian, IsianRupiah, rupiah, soft, type Kirim } from "./umum";

export type Proyek = {
  id: number; kode: string | null; nama: string; lokasi: string | null; mulai: string | null; selesai: string | null;
  upahHarian: number | null; lemburPerJam: number | null; aktif: boolean; sumber: string; dipakai: number;
};

type Form = { kode: string; nama: string; lokasi: string; mulai: string; selesai: string; upahHarian: string; lemburPerJam: string };
const kosong: Form = { kode: "", nama: "", lokasi: "", mulai: "", selesai: "", upahHarian: "", lemburPerJam: "" };

const keForm = (p: Proyek): Form => ({
  kode: p.kode ?? "",
  nama: p.nama,
  lokasi: p.lokasi ?? "",
  mulai: p.mulai ?? "",
  selesai: p.selesai ?? "",
  upahHarian: p.upahHarian === null ? "" : String(p.upahHarian),
  lemburPerJam: p.lemburPerJam === null ? "" : String(p.lemburPerJam),
});

const keBody = (f: Form) => ({
  kode: f.kode.trim() || null,
  nama: f.nama.trim(),
  lokasi: f.lokasi.trim() || null,
  mulai: f.mulai || null,
  selesai: f.selesai || null,
  upahHarian: angkaAtauNull(f.upahHarian),
  lemburPerJam: angkaAtauNull(f.lemburPerJam),
});

const tgl = (ymd: string | null) =>
  ymd ? new Date(`${ymd}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : null;

function rentang(p: Proyek) {
  const a = tgl(p.mulai);
  const b = tgl(p.selesai);
  if (a && b) return a === b ? a : `${a} – ${b}`;
  return a ? `mulai ${a}` : b ? `sampai ${b}` : "tanggal belum diisi";
}

/** Kolom-kolom form proyek — dipakai form tambah dan dialog ubah. */
function KolomProyek({ f, set }: { f: Form; set: (f: Form) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Isian label="Nama proyek / event *" className="col-span-2">
        <input className="input" maxLength={150} placeholder="mis. Pameran Otomotif" value={f.nama} onChange={(e) => set({ ...f, nama: e.target.value })} />
      </Isian>
      <Isian label="Kode">
        <input className="input" maxLength={30} placeholder="opsional" value={f.kode} onChange={(e) => set({ ...f, kode: e.target.value })} />
      </Isian>
      <Isian label="Lokasi">
        <input className="input" maxLength={150} placeholder="opsional" value={f.lokasi} onChange={(e) => set({ ...f, lokasi: e.target.value })} />
      </Isian>
      <Isian label="Mulai">
        <input type="date" className="input" value={f.mulai} onChange={(e) => set({ ...f, mulai: e.target.value })} />
      </Isian>
      <Isian label="Selesai">
        <input type="date" className="input" value={f.selesai} min={f.mulai || undefined} onChange={(e) => set({ ...f, selesai: e.target.value })} />
      </Isian>
      <Isian label="Upah harian khusus (Rp)">
        <IsianRupiah label="Upah harian khusus" placeholder="kosong = pakai tarif biasa" value={f.upahHarian} onChange={(v) => set({ ...f, upahHarian: v })} />
      </Isian>
      <Isian label="Lembur/jam khusus (Rp)">
        <IsianRupiah label="Lembur per jam khusus" placeholder="kosong = pakai tarif biasa" value={f.lemburPerJam} onChange={(v) => set({ ...f, lemburPerJam: v })} />
      </Isian>
    </div>
  );
}

export function ProyekKerja({ daftar, kirim }: { daftar: Proyek[]; kirim: Kirim }) {
  const [baru, setBaru] = useState<Form>(kosong);
  const [bukaBaru, setBukaBaru] = useState(false);
  const [ubah, setUbah] = useState<Proyek | null>(null);
  const [formUbah, setFormUbah] = useState<Form>(kosong);

  async function tambah() {
    if (await kirim("/api/upah/proyek", "POST", keBody(baru), `Proyek ${baru.nama.trim()} ditambahkan.`)) {
      setBaru(kosong);
      setBukaBaru(false);
    }
  }

  async function simpanUbah() {
    if (!ubah) return;
    if (await kirim(`/api/upah/proyek/${ubah.id}`, "PATCH", keBody(formUbah), "Proyek disimpan.")) setUbah(null);
  }

  function hapus(p: Proyek) {
    if (p.dipakai > 0) {
      if (confirm(`${p.nama} sudah dipakai di ${p.dipakai} catatan harian, jadi tidak bisa dihapus. Nonaktifkan saja?`)) {
        kirim(`/api/upah/proyek/${p.id}`, "PATCH", { aktif: false }, "Proyek dinonaktifkan.");
      }
      return;
    }
    if (confirm(`Hapus proyek ${p.nama}?`)) kirim(`/api/upah/proyek/${p.id}`, "DELETE", undefined, "Proyek dihapus.");
  }

  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h2 className="text-lg font-semibold text-fg">Proyek &amp; event</h2>
          <p className="mt-0.5 text-sm text-muted">
            Pilihan proyek di catatan harian. Isi upah khusus kalau proyek ini dibayar beda — upah khusus mengalahkan tarif
            kota × divisi dan tarif karyawan. Kosongkan kalau proyek dibayar dengan tarif biasa.
          </p>
        </div>
        {!bukaBaru && (
          <button className="btn-primary h-10" onClick={() => setBukaBaru(true)}>
            <IconPlus className="text-[16px]" /> Proyek
          </button>
        )}
      </div>

      {bukaBaru && (
        <div className="mt-3 rounded-xl border border-dashed border-border-strong p-3">
          <KolomProyek f={baru} set={setBaru} />
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn-ghost h-10" onClick={() => { setBukaBaru(false); setBaru(kosong); }}>Batal</button>
            <button className="btn-primary h-10" disabled={!baru.nama.trim()} onClick={tambah}>
              <IconCheck className="text-[16px]" /> Simpan proyek
            </button>
          </div>
        </div>
      )}

      {daftar.length === 0 ? (
        <p className="py-6 text-center text-sm text-subtle">Belum ada proyek.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {daftar.map((p) => (
            <li key={p.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 text-sm ${p.aktif ? "" : "opacity-60"}`}>
              <div className="min-w-56 flex-1">
                <div className="font-medium text-fg">
                  {p.kode && <span className="mr-1.5 font-mono text-xs text-subtle">{p.kode}</span>}
                  {p.nama}
                  {p.sumber !== "lokal" && <span className="badge ml-1.5" style={soft("var(--primary)", 16)}>dari {p.sumber}</span>}
                </div>
                <div className="text-xs text-subtle">
                  {rentang(p)}
                  {p.lokasi ? ` · ${p.lokasi}` : ""}
                  {p.dipakai > 0 ? ` · ${p.dipakai} catatan harian` : ""}
                </div>
              </div>
              <div className="tabular text-xs text-muted">
                {p.upahHarian !== null || p.lemburPerJam !== null
                  ? `${rupiah(p.upahHarian)}/hari · lembur ${rupiah(p.lemburPerJam)}/jam`
                  : "tarif biasa"}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" className="accent-[color:var(--primary)]" checked={p.aktif}
                  onChange={(e) => kirim(`/api/upah/proyek/${p.id}`, "PATCH", { aktif: e.target.checked },
                    e.target.checked ? "Proyek diaktifkan." : "Proyek dinonaktifkan — tidak muncul lagi di pilihan.")} />
                Aktif
              </label>
              <button className="btn-ghost h-8 px-2.5 text-xs" onClick={() => { setUbah(p); setFormUbah(keForm(p)); }}>
                <IconPencil className="text-[14px]" /> Ubah
              </button>
              <button className="btn-ghost h-8 px-2.5 text-xs text-danger" onClick={() => hapus(p)}>
                <IconTrash className="text-[14px]" /> Hapus
              </button>
            </li>
          ))}
        </ul>
      )}

      {ubah && (
        <Modal title={`Ubah ${ubah.nama}`} onClose={() => setUbah(null)} size="xl">
          <KolomProyek f={formUbah} set={setFormUbah} />
          <p className="mt-3 text-xs text-subtle">
            Upah khusus yang diubah berlaku untuk upah yang belum dibayar. Upah yang sudah dibayar tidak berubah.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setUbah(null)}>Batal</button>
            <button className="btn-primary" disabled={!formUbah.nama.trim()} onClick={simpanUbah}>
              <IconCheck className="text-[16px]" /> Simpan
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
