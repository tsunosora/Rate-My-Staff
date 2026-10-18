"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { IconAlert } from "@/components/ui/icons";
import { soft } from "@/components/portal/ui";
import { PILIHAN_KATEGORI, hariIni, kecilkanFoto, kirimForm, mundur, rapikanJumlah } from "./ui";

export type Karyawan = { id: number; fullName: string; employeeCode: string };

/** Owner mencatat klaim atas nama karyawan (mis. nota diserahkan langsung). Foto opsional. */
export function CatatKlaim({
  karyawan,
  onClose,
  onSaved,
}: {
  karyawan: Karyawan[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [tanggal, setTanggal] = useState(hariIni());
  const [kategori, setKategori] = useState("transport");
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function simpan() {
    setError("");
    if (!employeeId) return setError("Pilih karyawan.");
    if (!jumlah) return setError("Isi jumlahnya.");
    setBusy(true);
    try {
      const form = new FormData();
      form.set("employeeId", employeeId);
      form.set("tanggal", tanggal);
      form.set("kategori", kategori);
      form.set("jumlah", jumlah);
      form.set("keterangan", keterangan);
      if (foto) form.set("foto", await kecilkanFoto(foto), "nota.jpg");
      await kirimForm("/api/reimbursements", form);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Catat klaim" onClose={onClose}>
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger" style={soft("var(--danger)")}>
          <IconAlert className="text-[16px] shrink-0" /> {error}
        </div>
      )}
      <div className="space-y-3">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-muted">Karyawan *</span>
          <select className="input h-11" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">— pilih —</option>
            {karyawan.map((k) => (
              <option key={k.id} value={k.id}>
                {k.fullName} ({k.employeeCode})
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Tanggal nota *</span>
            <input type="date" className="input h-11" value={tanggal} min={mundur(60)} max={hariIni()} onChange={(e) => setTanggal(e.target.value)} />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Kategori</span>
            <select className="input h-11" value={kategori} onChange={(e) => setKategori(e.target.value)}>
              {PILIHAN_KATEGORI.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Jumlah (Rp) *</span>
            <input inputMode="numeric" className="input h-11" value={jumlah} placeholder="25.000" onChange={(e) => setJumlah(rapikanJumlah(e.target.value))} />
          </label>
        </div>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-muted">Keterangan *</span>
          <textarea className="input" rows={2} maxLength={1000} value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-muted">Foto nota (opsional)</span>
          <input type="file" accept="image/*" className="input h-11 py-2" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        </label>
        <p className="text-xs text-subtle">Klaim masuk sebagai “Menunggu” — setujui sesudahnya seperti klaim dari karyawan.</p>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost h-10">
          Batal
        </button>
        <button onClick={simpan} disabled={busy} className="btn-primary h-10">
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </Modal>
  );
}
