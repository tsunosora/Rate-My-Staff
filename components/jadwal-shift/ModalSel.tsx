"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { jamJadwal, labelTanggal, NAMA_HARI_PANJANG, warnaJadwal, type JadwalKerja, type Pilihan } from "./jenis";

/** Ubah satu sel: pilih jadwal kerja, Libur, atau kembali ke jadwal tetap karyawan. */
export function ModalSel({
  nama,
  tanggal,
  jadwal,
  jadwalTetap,
  sekarang,
  catatanAwal,
  sibuk,
  onTutup,
  onPilih,
}: {
  nama: string;
  tanggal: string;
  jadwal: JadwalKerja[];
  jadwalTetap: JadwalKerja | null;
  /** Isi roster sekarang; null = belum ada roster (pakai jadwal tetap). */
  sekarang: Pilihan | null;
  catatanAwal: string | null;
  sibuk: boolean;
  onTutup: () => void;
  onPilih: (p: Pilihan, catatan: string | null) => void;
}) {
  const [catatan, setCatatan] = useState(catatanAwal ?? "");
  const hari = NAMA_HARI_PANJANG[new Date(`${tanggal}T00:00:00`).getDay()];
  const aktif = (p: Pilihan) =>
    sekarang != null && sekarang.libur === p.libur && sekarang.workScheduleId === p.workScheduleId;
  const kirim = (p: Pilihan) => onPilih(p, catatan.trim() || null);

  return (
    <Modal title={`${nama} · ${hari}, ${labelTanggal(tanggal)}`} onClose={onTutup}>
      <p className="mb-3 text-sm text-muted">
        Jadwal tetap: <span className="font-medium text-fg">{jadwalTetap ? jadwalTetap.name : "tanpa jadwal"}</span>
        {jadwalTetap && jamJadwal(jadwalTetap) ? ` (${jamJadwal(jadwalTetap)})` : ""}. Pilihan di sini hanya berlaku
        untuk tanggal ini.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {jadwal
          .filter((j) => !j.dihapus)
          .map((j) => {
            const p = { workScheduleId: j.id, libur: false };
            return (
              <button
                key={j.id}
                disabled={sibuk}
                onClick={() => kirim(p)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition hover:border-primary ${
                  aktif(p) ? "border-primary bg-surface-2" : "border-border-strong"
                }`}
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: warnaJadwal(jadwal, j.id) }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-fg">{j.name}</span>
                  {jamJadwal(j) && <span className="block text-xs text-subtle tabular">{jamJadwal(j)}</span>}
                </span>
              </button>
            );
          })}
        <button
          disabled={sibuk}
          onClick={() => kirim({ workScheduleId: null, libur: true })}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition hover:border-warning ${
            aktif({ workScheduleId: null, libur: true }) ? "border-warning bg-surface-2" : "border-border-strong"
          }`}
        >
          <span className="h-3 w-3 shrink-0 rounded-full bg-warning" />
          <span>
            <span className="block font-medium text-fg">Libur</span>
            <span className="block text-xs text-subtle">dihitung seperti hari libur</span>
          </span>
        </button>
      </div>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-muted">Catatan (opsional)</span>
        <input
          className="input"
          maxLength={255}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="mis. tukar shift dengan rekan"
        />
      </label>

      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <button
          disabled={sibuk || sekarang == null}
          onClick={() => onPilih({ workScheduleId: null, libur: false }, null)}
          className="btn-ghost"
          title={sekarang == null ? "Tanggal ini sudah memakai jadwal tetap" : undefined}
        >
          Kembali ke jadwal tetap
        </button>
        <button onClick={onTutup} className="btn-ghost">
          Batal
        </button>
      </div>
    </Modal>
  );
}
