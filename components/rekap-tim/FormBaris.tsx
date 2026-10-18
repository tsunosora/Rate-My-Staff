"use client";

import { useId, useState } from "react";

export type Pilihan = {
  tim: { id: number; nama: string; warna: string; aktif: boolean }[];
  karyawan: { id: number; nama: string; kode: string; timId: number | null; kota: string | null; divisi: string | null; freelance: boolean }[];
  proyek: { id: number; nama: string; kode: string | null; aktif: boolean }[];
  kota: string[];
  divisi: string[];
};

export type IsiBaris = {
  status: "hadir" | "setengah" | "absen";
  lemburJam: number;
  kota: string | null;
  divisi: string | null;
  proyekId: number | null;
  catatan: string | null;
  employeeId?: number;
  tanggal?: string;
};

type Awal = { status: IsiBaris["status"]; lemburJam: number; kota: string | null; divisi: string | null; proyekId: number | null; catatan: string | null };

const PILIHAN_STATUS: { v: IsiBaris["status"]; l: string }[] = [
  { v: "hadir", l: "Hadir" },
  { v: "setengah", l: "½ Hari" },
  { v: "absen", l: "Absen" },
];

/** Formulir isi satu baris rekap — dipakai "Ubah" (awal = baris) dan "Tambah baris" (tambah = tanggal awal). */
export function FormBaris({ pilihan, awal, tambah, sibuk, labelSimpan, onBatal, onSimpan }: {
  pilihan: Pilihan;
  awal?: Awal;
  tambah?: { tanggal: string };
  sibuk: boolean;
  labelSimpan: string;
  onBatal: () => void;
  onSimpan: (isi: IsiBaris) => void;
}) {
  const id = useId();
  const [orang, setOrang] = useState("");
  const [tanggal, setTanggal] = useState(tambah?.tanggal ?? "");
  const [status, setStatus] = useState<IsiBaris["status"]>(awal?.status ?? "hadir");
  const [lembur, setLembur] = useState(String(awal?.lemburJam ?? 0));
  const [kota, setKota] = useState(awal?.kota ?? "");
  const [divisi, setDivisi] = useState(awal?.divisi ?? "");
  const [proyekId, setProyekId] = useState(awal?.proyekId ? String(awal.proyekId) : "");
  const [catatan, setCatatan] = useState(awal?.catatan ?? "");

  const lemburAngka = Number(lembur.replace(",", "."));
  const lemburSah = Number.isFinite(lemburAngka) && lemburAngka >= 0 && lemburAngka <= 24;
  const siap = lemburSah && (!tambah || (orang && tanggal));

  function pilihOrang(v: string) {
    setOrang(v);
    const k = pilihan.karyawan.find((x) => String(x.id) === v);
    // Isi kota/divisi dari bawaan orangnya kalau masih kosong — tetap bisa diubah.
    if (k?.kota && !kota) setKota(k.kota);
    if (k?.divisi && !divisi) setDivisi(k.divisi);
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!siap) return;
    onSimpan({
      status,
      lemburJam: Math.round(lemburAngka * 100) / 100,
      kota: kota.trim() || null,
      divisi: divisi.trim() || null,
      proyekId: proyekId ? Number(proyekId) : null,
      catatan: catatan.trim() || null,
      ...(tambah ? { employeeId: Number(orang), tanggal } : {}),
    });
  }

  return (
    <form onSubmit={simpan} className="space-y-3 text-sm">
      {tambah && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="font-medium text-muted">Orang</span>
            <select className="input" value={orang} onChange={(e) => pilihOrang(e.target.value)} required>
              <option value="">Pilih orang…</option>
              {pilihan.karyawan.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama} ({k.kode}){k.freelance ? " · freelance" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="font-medium text-muted">Tanggal</span>
            <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
          </label>
        </div>
      )}

      <fieldset>
        <legend className="mb-1.5 font-medium text-muted">Kehadiran</legend>
        <div className="flex flex-wrap gap-2">
          {PILIHAN_STATUS.map((s) => (
            <label
              key={s.v}
              className={`cursor-pointer rounded-xl border px-4 py-2 ${status === s.v ? "border-primary bg-primary/10 font-semibold text-fg" : "border-border text-muted"}`}
            >
              <input type="radio" name={`${id}-status`} className="sr-only" checked={status === s.v} onChange={() => setStatus(s.v)} />
              {s.l}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="font-medium text-muted">Lembur (jam)</span>
          <input className="input" inputMode="decimal" value={lembur} onChange={(e) => setLembur(e.target.value)} />
          {!lemburSah && <span className="block text-xs text-danger">Isi 0 sampai 24.</span>}
        </label>
        <label className="block space-y-1.5">
          <span className="font-medium text-muted">Proyek / event</span>
          <select className="input" value={proyekId} onChange={(e) => setProyekId(e.target.value)}>
            <option value="">Tanpa proyek</option>
            {pilihan.proyek.map((p) => (
              <option key={p.id} value={p.id}>
                {p.kode ? `${p.kode} · ` : ""}
                {p.nama}
                {p.aktif ? "" : " (nonaktif)"}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="font-medium text-muted">Kota</span>
          <input className="input" list={`${id}-kota`} maxLength={100} value={kota} onChange={(e) => setKota(e.target.value)} />
          <datalist id={`${id}-kota`}>
            {pilihan.kota.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </label>
        <label className="block space-y-1.5">
          <span className="font-medium text-muted">Divisi</span>
          <input className="input" list={`${id}-divisi`} maxLength={100} value={divisi} onChange={(e) => setDivisi(e.target.value)} />
          <datalist id={`${id}-divisi`}>
            {pilihan.divisi.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="font-medium text-muted">Catatan</span>
        <input className="input" maxLength={255} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onBatal} className="btn-ghost h-10">
          Batal
        </button>
        <button type="submit" disabled={sibuk || !siap} className="btn-primary h-10">
          {sibuk ? "Menyimpan…" : labelSimpan}
        </button>
      </div>
    </form>
  );
}
