"use client";

import { useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { IconAlert } from "@/components/ui/icons";
import { soft } from "@/components/portal/ui";

export type KaryawanPilihan = { id: number; nama: string; kode: string; departemen: string | null };

export type EntriAdmin = {
  id: number;
  employeeId: number;
  employeeName: string;
  tanggal: string;
  mulai: string;
  selesai: string;
  menit: number;
  proyek: string;
  kegiatan: string;
  catatan: string | null;
  sumber: string;
};

function hariIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Owner menambah (tanpa `entri`) atau menyunting satu catatan timesheet. */
export function FormEntriAdmin({
  entri,
  karyawan,
  proyek,
  onClose,
  onSaved,
}: {
  entri: EntriAdmin | null;
  karyawan: KaryawanPilihan[];
  proyek: string[];
  onClose: () => void;
  onSaved: (pesan: string) => void;
}) {
  const [f, setF] = useState({
    employeeId: entri ? String(entri.employeeId) : "",
    tanggal: entri?.tanggal ?? hariIni(),
    mulai: entri?.mulai ?? "",
    selesai: entri?.selesai ?? "",
    proyek: entri?.proyek ?? "",
    kegiatan: entri?.kegiatan ?? "",
    catatan: entri?.catatan ?? "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));

  async function simpan() {
    setError("");
    if (!entri && !f.employeeId) return setError("Pilih karyawannya.");
    if (!f.mulai || !f.selesai) return setError("Isi jam mulai dan selesai.");
    if (f.selesai <= f.mulai) return setError("Jam selesai harus lebih besar dari jam mulai.");
    if (f.kegiatan.trim().length < 2) return setError("Tulis kegiatannya.");
    setBusy(true);
    try {
      const body = JSON.stringify({
        ...f,
        employeeId: entri ? undefined : Number(f.employeeId),
        proyek: f.proyek || null,
        catatan: f.catatan || null,
      });
      if (entri) await api(`/api/timesheet/${entri.id}`, { method: "PATCH", body });
      else await api(`/api/timesheet`, { method: "POST", body });
      onSaved(entri ? "Catatan diperbarui." : "Catatan ditambahkan.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={entri ? `Sunting catatan — ${entri.employeeName}` : "Tambah catatan timesheet"} onClose={onClose}>
      <div className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger" style={soft("var(--danger)")}>
            <IconAlert className="text-[16px] shrink-0" /> {error}
          </div>
        )}
        {!entri && (
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Karyawan *</span>
            <select className="input h-11" value={f.employeeId} onChange={set("employeeId")}>
              <option value="">Pilih karyawan…</option>
              {karyawan.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama} ({k.kode})
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Tanggal *</span>
            <input type="date" className="input h-11" max={hariIni()} value={f.tanggal} onChange={set("tanggal")} />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Mulai *</span>
            <input type="time" className="input h-11" value={f.mulai} onChange={set("mulai")} />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Selesai *</span>
            <input type="time" className="input h-11" value={f.selesai} onChange={set("selesai")} />
          </label>
        </div>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-muted">Proyek</span>
          <input className="input h-11" list="saran-proyek-admin" maxLength={100} placeholder="Boleh kosong" value={f.proyek} onChange={set("proyek")} />
          <datalist id="saran-proyek-admin">
            {proyek.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-muted">Kegiatan *</span>
          <input className="input h-11" maxLength={255} value={f.kegiatan} onChange={set("kegiatan")} />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-muted">Catatan</span>
          <textarea className="input" rows={2} maxLength={2000} value={f.catatan} onChange={set("catatan")} />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost h-10">
            Batal
          </button>
          <button onClick={simpan} disabled={busy} className="btn-primary h-10">
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
        <p className="text-xs text-subtle">
          Owner boleh mengisi tanggal lama. Jam tetap tidak boleh bertumpang-tindih dengan catatan lain karyawan itu.
        </p>
      </div>
    </Modal>
  );
}
