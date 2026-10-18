"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { IconCheck, IconPencil, IconPlus, IconTrash } from "@/components/ui/icons";
import { kunciSel, namaUnik, susunMatriks } from "@/lib/services/upah-tarif/aturan";
import { Isian, IsianRupiah, rupiah, type Kirim } from "./umum";

export type Tarif = {
  id: number; kota: string; divisi: string; upahHarian: number; lemburPerJam: number; aktif: boolean; catatan: string | null;
};

type Form = { kota: string; divisi: string; upahHarian: string; lemburPerJam: string; catatan: string };
const kosong: Form = { kota: "", divisi: "", upahHarian: "", lemburPerJam: "", catatan: "" };

const keForm = (t: Tarif): Form => ({
  kota: t.kota,
  divisi: t.divisi,
  upahHarian: String(t.upahHarian),
  lemburPerJam: String(t.lemburPerJam),
  catatan: t.catatan ?? "",
});

const keBody = (f: Form) => ({
  kota: f.kota.trim(),
  divisi: f.divisi.trim(),
  upahHarian: Number(f.upahHarian || 0),
  lemburPerJam: Number(f.lemburPerJam || 0),
  catatan: f.catatan.trim() || null,
});

export function TarifKotaDivisi({ daftar, kirim }: { daftar: Tarif[]; kirim: Kirim }) {
  const [baru, setBaru] = useState<Form>(kosong);
  const [ubah, setUbah] = useState<Tarif | null>(null);
  const [formUbah, setFormUbah] = useState<Form>(kosong);

  const saranKota = namaUnik(daftar.map((t) => t.kota));
  const saranDivisi = namaUnik(daftar.map((t) => t.divisi));
  const matriks = susunMatriks(daftar);

  function bukaUbah(t: Tarif) {
    setUbah(t);
    setFormUbah(keForm(t));
  }

  async function tambah() {
    if (await kirim("/api/upah/tarif", "POST", keBody(baru), `Tarif ${baru.kota.trim()} · ${baru.divisi.trim()} ditambahkan.`)) {
      setBaru(kosong);
    }
  }

  async function simpanUbah() {
    if (!ubah) return;
    if (await kirim(`/api/upah/tarif/${ubah.id}`, "PATCH", keBody(formUbah), "Tarif disimpan.")) setUbah(null);
  }

  const bisaTambah = baru.kota.trim() && baru.divisi.trim() && baru.upahHarian !== "";

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="text-lg font-semibold text-fg">Tarif kota × divisi</h2>
      <p className="mb-3 mt-0.5 max-w-3xl text-sm text-muted">
        Upah standar per kota dan divisi. Dipakai untuk hari yang <b className="text-fg">tidak</b> memakai proyek, kalau kota dan
        divisi di catatan harian terisi. Huruf besar-kecil tidak dibedakan.
      </p>

      <datalist id="tarif-kota">{saranKota.map((k) => <option key={k} value={k} />)}</datalist>
      <datalist id="tarif-divisi">{saranDivisi.map((d) => <option key={d} value={d} />)}</datalist>

      <div className="grid gap-2 rounded-xl border border-dashed border-border-strong p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_140px_140px_auto]">
        <input className="input h-10" list="tarif-kota" placeholder="Kota, mis. Jakarta" aria-label="Kota"
          value={baru.kota} onChange={(e) => setBaru({ ...baru, kota: e.target.value })} />
        <input className="input h-10" list="tarif-divisi" placeholder="Divisi, mis. Tukang" aria-label="Divisi"
          value={baru.divisi} onChange={(e) => setBaru({ ...baru, divisi: e.target.value })} />
        <IsianRupiah label="Upah harian" placeholder="Upah/hari" value={baru.upahHarian} onChange={(v) => setBaru({ ...baru, upahHarian: v })} />
        <IsianRupiah label="Lembur per jam" placeholder="Lembur/jam" value={baru.lemburPerJam} onChange={(v) => setBaru({ ...baru, lemburPerJam: v })} />
        <button className="btn-primary h-10" disabled={!bisaTambah} onClick={tambah}>
          <IconPlus className="text-[16px]" /> Tambah
        </button>
      </div>

      {daftar.length === 0 ? (
        <p className="py-6 text-center text-sm text-subtle">Belum ada tarif. Tambahkan kota dan divisi di atas.</p>
      ) : (
        <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                  <th className="py-2 pr-3 font-medium">Kota</th>
                  <th className="py-2 pr-3 font-medium">Divisi</th>
                  <th className="py-2 pr-3 text-right font-medium">Upah/hari</th>
                  <th className="py-2 pr-3 text-right font-medium">Lembur/jam</th>
                  <th className="py-2 pr-3 font-medium">Aktif</th>
                  <th className="py-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((t) => (
                  <tr key={t.id} className={`border-t border-border ${t.aktif ? "" : "opacity-60"}`}>
                    <td className="py-2 pr-3 font-medium text-fg">{t.kota}</td>
                    <td className="py-2 pr-3 text-muted">
                      {t.divisi}
                      {t.catatan && <div className="text-xs text-subtle">{t.catatan}</div>}
                    </td>
                    <td className="tabular py-2 pr-3 text-right">{rupiah(t.upahHarian)}</td>
                    <td className="tabular py-2 pr-3 text-right">{rupiah(t.lemburPerJam)}</td>
                    <td className="py-2 pr-3">
                      <input type="checkbox" className="accent-[color:var(--primary)]" checked={t.aktif}
                        aria-label={`Aktifkan tarif ${t.kota} ${t.divisi}`}
                        onChange={(e) => kirim(`/api/upah/tarif/${t.id}`, "PATCH", { aktif: e.target.checked },
                          e.target.checked ? "Tarif diaktifkan." : "Tarif dinonaktifkan — tidak dipakai menghitung upah.")} />
                    </td>
                    <td className="py-2">
                      <div className="flex justify-end gap-1.5">
                        <button className="btn-ghost h-8 px-2.5 text-xs" onClick={() => bukaUbah(t)}>
                          <IconPencil className="text-[14px]" /> Ubah
                        </button>
                        <button className="btn-ghost h-8 px-2.5 text-xs text-danger"
                          onClick={() => confirm(`Hapus tarif ${t.kota} · ${t.divisi}? Upah yang sudah dibayar tidak berubah.`) &&
                            kirim(`/api/upah/tarif/${t.id}`, "DELETE", undefined, "Tarif dihapus.")}>
                          <IconTrash className="text-[14px]" /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Ringkas: upah per hari</p>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="py-1.5 pr-2 text-left text-xs font-medium text-subtle">Kota \ Divisi</th>
                  {matriks.divisi.map((d) => (
                    <th key={d} className="px-2 py-1.5 text-right text-xs font-medium text-subtle">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matriks.kota.map((k) => (
                  <tr key={k} className="border-t border-border">
                    <td className="py-1.5 pr-2 font-medium text-fg">{k}</td>
                    {matriks.divisi.map((d) => {
                      const sel = matriks.sel[kunciSel(k, d)];
                      const t = sel && daftar.find((x) => x.id === sel.id);
                      return (
                        <td key={d} className="px-2 py-1.5 text-right">
                          {t ? (
                            <button className={`tabular rounded-md px-1.5 py-0.5 hover:bg-surface-2 ${t.aktif ? "text-fg" : "text-subtle line-through"}`}
                              title={`${t.kota} · ${t.divisi} — lembur ${rupiah(t.lemburPerJam)}/jam${t.aktif ? "" : " (nonaktif)"}`}
                              onClick={() => bukaUbah(t)}>
                              {t.upahHarian.toLocaleString("id-ID")}
                            </button>
                          ) : (
                            <span className="text-subtle">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-subtle">
              Sel kosong = belum ada tarif: hari tanpa proyek di kota & divisi itu memakai upah per karyawan.
            </p>
          </div>
        </div>
      )}

      {ubah && (
        <Modal title={`Ubah tarif ${ubah.kota} · ${ubah.divisi}`} onClose={() => setUbah(null)}>
          <div className="grid grid-cols-2 gap-3">
            <Isian label="Kota">
              <input className="input" list="tarif-kota" value={formUbah.kota} onChange={(e) => setFormUbah({ ...formUbah, kota: e.target.value })} />
            </Isian>
            <Isian label="Divisi">
              <input className="input" list="tarif-divisi" value={formUbah.divisi} onChange={(e) => setFormUbah({ ...formUbah, divisi: e.target.value })} />
            </Isian>
            <Isian label="Upah harian (Rp)">
              <IsianRupiah label="Upah harian" value={formUbah.upahHarian} onChange={(v) => setFormUbah({ ...formUbah, upahHarian: v })} />
            </Isian>
            <Isian label="Lembur per jam (Rp)">
              <IsianRupiah label="Lembur per jam" value={formUbah.lemburPerJam} onChange={(v) => setFormUbah({ ...formUbah, lemburPerJam: v })} />
            </Isian>
            <Isian label="Catatan" className="col-span-2">
              <input className="input" maxLength={255} value={formUbah.catatan} onChange={(e) => setFormUbah({ ...formUbah, catatan: e.target.value })} />
            </Isian>
          </div>
          <p className="mt-3 text-xs text-subtle">
            Perubahan berlaku untuk upah yang belum dibayar. Upah yang sudah dibayar tidak berubah.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setUbah(null)}>Batal</button>
            <button className="btn-primary" disabled={!formUbah.kota.trim() || !formUbah.divisi.trim() || formUbah.upahHarian === ""} onClick={simpanUbah}>
              <IconCheck className="text-[16px]" /> Simpan
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
