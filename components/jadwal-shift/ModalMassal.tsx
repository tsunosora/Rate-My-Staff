"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { countDays } from "@/lib/services/leave/range";
import { MAKS_HARI_RENTANG, MAKS_SEL_SIMPAN } from "@/lib/services/jadwal-shift/aturan";
import { NAMA_HARI, type JadwalKerja, type KaryawanKisi, type Pilihan } from "./jenis";

const URUT_HARI = [1, 2, 3, 4, 5, 6, 0]; // Senin dulu

/** Nilai <select> untuk satu langkah: "s:<id>" | "libur" | "bawaan". */
function keNilai(p: Pilihan): string {
  if (p.libur) return "libur";
  return p.workScheduleId == null ? "bawaan" : `s:${p.workScheduleId}`;
}
function dariNilai(v: string): Pilihan {
  if (v === "libur") return { workScheduleId: null, libur: true };
  if (v === "bawaan") return { workScheduleId: null, libur: false };
  return { workScheduleId: Number(v.slice(2)), libur: false };
}

export type IsiMassal = {
  employeeIds: number[];
  dari: string;
  sampai: string;
  pola: Pilihan[];
  hari: number[] | null;
};

/** Isi banyak sel sekaligus: beberapa karyawan × rentang tanggal × satu jadwal atau pola berulang. */
export function ModalMassal({
  karyawan,
  terpilihAwal,
  jadwal,
  dariAwal,
  sampaiAwal,
  sibuk,
  onTutup,
  onSimpan,
}: {
  karyawan: KaryawanKisi[];
  terpilihAwal: number[];
  jadwal: JadwalKerja[];
  dariAwal: string;
  sampaiAwal: string;
  sibuk: boolean;
  onTutup: () => void;
  onSimpan: (isi: IsiMassal) => void;
}) {
  const aktif = jadwal.filter((j) => !j.dihapus);
  const [ids, setIds] = useState<Set<number>>(
    new Set(terpilihAwal.length ? terpilihAwal : karyawan.map((k) => k.id))
  );
  const [dari, setDari] = useState(dariAwal);
  const [sampai, setSampai] = useState(sampaiAwal);
  const [pola, setPola] = useState<Pilihan[]>([
    { workScheduleId: aktif[0]?.id ?? null, libur: aktif.length === 0 },
  ]);
  const [hari, setHari] = useState<Set<number>>(new Set(URUT_HARI));

  const jumlahHari = countDays(dari, sampai);
  const hariTerpilih = useMemo(() => {
    if (jumlahHari <= 0) return 0;
    let n = 0;
    for (let i = 0; i < jumlahHari; i++) {
      const d = new Date(`${dari}T00:00:00`);
      d.setDate(d.getDate() + i);
      if (hari.has(d.getDay())) n++;
    }
    return n;
  }, [dari, jumlahHari, hari]);
  const jumlahSel = hariTerpilih * ids.size;

  let galat = "";
  if (ids.size === 0) galat = "Pilih minimal satu karyawan.";
  else if (jumlahHari <= 0) galat = "Tanggal akhir sebelum tanggal awal.";
  else if (jumlahHari > MAKS_HARI_RENTANG) galat = `Rentang maksimal ${MAKS_HARI_RENTANG} hari.`;
  else if (hari.size === 0) galat = "Pilih minimal satu hari.";
  else if (jumlahSel > MAKS_SEL_SIMPAN) galat = `Terlalu banyak sel (${jumlahSel}); maksimal ${MAKS_SEL_SIMPAN}.`;

  const ubahLangkah = (i: number, v: string) => setPola((p) => p.map((x, j) => (j === i ? dariNilai(v) : x)));

  return (
    <Modal title="Isi jadwal massal" onClose={onTutup} size="xl">
      <div className="space-y-5 text-sm">
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-medium text-fg">Karyawan ({ids.size} dipilih)</h3>
            <div className="flex gap-2 text-xs">
              <button className="text-primary hover:underline" onClick={() => setIds(new Set(karyawan.map((k) => k.id)))}>
                Pilih semua
              </button>
              <button className="text-subtle hover:underline" onClick={() => setIds(new Set())}>
                Kosongkan
              </button>
            </div>
          </div>
          <div className="grid max-h-44 gap-1 overflow-y-auto rounded-xl border border-border p-2 sm:grid-cols-2">
            {karyawan.map((k) => (
              <label key={k.id} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={ids.has(k.id)}
                  onChange={(e) => {
                    const n = new Set(ids);
                    if (e.target.checked) n.add(k.id);
                    else n.delete(k.id);
                    setIds(n);
                  }}
                />
                <span className="truncate text-fg">{k.fullName}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-muted">Dari tanggal</span>
            <input type="date" className="input" value={dari} onChange={(e) => setDari(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-muted">Sampai tanggal</span>
            <input type="date" className="input" value={sampai} onChange={(e) => setSampai(e.target.value)} />
          </label>
        </section>

        <section>
          <h3 className="mb-2 font-medium text-fg">Hari yang diisi</h3>
          <div className="flex flex-wrap gap-1.5">
            {URUT_HARI.map((h) => (
              <button
                key={h}
                onClick={() => {
                  const n = new Set(hari);
                  if (n.has(h)) n.delete(h);
                  else n.add(h);
                  setHari(n);
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  hari.has(h) ? "border-primary bg-surface-2 text-fg" : "border-border-strong text-subtle"
                }`}
              >
                {NAMA_HARI[h]}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-medium text-fg">Jadwal / pola</h3>
          <p className="mb-2 text-xs text-subtle">
            Satu langkah = semua hari sama. Lebih dari satu = berulang per hari mulai tanggal awal, mis. Pagi,
            Pagi, Siang, Siang, Libur.
          </p>
          <ol className="space-y-2">
            {pola.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-right text-xs text-subtle tabular">{i + 1}.</span>
                <select className="input" value={keNilai(p)} onChange={(e) => ubahLangkah(i, e.target.value)}>
                  {aktif.map((j) => (
                    <option key={j.id} value={`s:${j.id}`}>
                      {j.name}
                    </option>
                  ))}
                  <option value="libur">Libur</option>
                  <option value="bawaan">Kembali ke jadwal tetap</option>
                </select>
                <button
                  aria-label="Hapus langkah"
                  disabled={pola.length === 1}
                  onClick={() => setPola((x) => x.filter((_, j) => j !== i))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border-strong text-muted transition hover:border-danger hover:text-danger disabled:opacity-40"
                >
                  <IconTrash className="text-[15px]" />
                </button>
              </li>
            ))}
          </ol>
          {pola.length < 31 && (
            <button
              className="btn-ghost mt-2 h-9"
              onClick={() => setPola((x) => [...x, x[x.length - 1] ?? { workScheduleId: null, libur: true }])}
            >
              <IconPlus className="text-[15px]" /> Tambah langkah
            </button>
          )}
        </section>

        {galat ? (
          <p className="text-danger">{galat}</p>
        ) : (
          <p className="text-muted">
            Akan mengubah <span className="font-medium text-fg tabular">{jumlahSel}</span> sel ({ids.size} karyawan ×{" "}
            {hariTerpilih} hari). Absensi tersimpan di rentang itu dihitung ulang.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onTutup} className="btn-ghost">
            Batal
          </button>
          <button
            disabled={sibuk || Boolean(galat)}
            className="btn-primary"
            onClick={() =>
              onSimpan({
                employeeIds: [...ids],
                dari,
                sampai,
                pola,
                hari: hari.size === 7 ? null : [...hari],
              })
            }
          >
            {sibuk ? "Menyimpan…" : "Terapkan"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
