"use client";

import { menitDariRentang, teksDurasi } from "@/lib/services/lembur/aturan";

export type NilaiLembur = {
  tanggal: string;
  mode: "jam" | "menit";
  mulai: string;
  selesai: string;
  menit: string;
  alasan: string;
};

export function hariIniYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ymdMundur(ymd: string, hari: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(y, m - 1, d - hari);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export function nilaiAwalLembur(): NilaiLembur {
  return { tanggal: hariIniYmd(), mode: "jam", mulai: "", selesai: "", menit: "", alasan: "" };
}

/** Badan JSON yang dikirim ke API dari isian ini. */
export function badanLembur(v: NilaiLembur) {
  return v.mode === "jam"
    ? { tanggal: v.tanggal, mulai: v.mulai || null, selesai: v.selesai || null, menit: null, alasan: v.alasan }
    : { tanggal: v.tanggal, mulai: null, selesai: null, menit: v.menit ? Number(v.menit) : null, alasan: v.alasan };
}

/** Pratinjau durasi supaya karyawan tahu angka yang akan dikirim (termasuk lewat tengah malam). */
function pratinjau(v: NilaiLembur): string | null {
  if (v.mode === "menit") {
    const n = Number(v.menit);
    return n > 0 ? teksDurasi(Math.round(n)) : null;
  }
  if (!v.mulai || !v.selesai) return null;
  const r = menitDariRentang(v.mulai, v.selesai);
  if (!r.ok) return r.error;
  const lewat = v.selesai <= v.mulai ? " (lewat tengah malam)" : "";
  return `${teksDurasi(r.nilai)}${lewat}`;
}

/**
 * Isian bersama pengajuan lembur: tanggal, jam mulai–selesai ATAU jumlah menit, alasan.
 * Dipakai portal karyawan, form tautan publik, dan pencatatan owner.
 */
export function IsianLembur({
  nilai,
  onChange,
  maksMundur = 7,
}: {
  nilai: NilaiLembur;
  onChange: (v: NilaiLembur) => void;
  maksMundur?: number;
}) {
  const hariIni = hariIniYmd();
  const set = (p: Partial<NilaiLembur>) => onChange({ ...nilai, ...p });
  const teks = pratinjau(nilai);

  return (
    <div className="space-y-3">
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-muted">Tanggal lembur *</span>
        <input
          type="date"
          className="input h-11"
          value={nilai.tanggal}
          max={hariIni}
          min={ymdMundur(hariIni, maksMundur)}
          onChange={(e) => set({ tanggal: e.target.value })}
        />
        <span className="block text-xs text-subtle">
          Hari ini atau paling lama {maksMundur} hari ke belakang.
        </span>
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-muted">Lamanya *</span>
        <div className="mb-2 grid grid-cols-2 gap-2">
          {(
            [
              { key: "jam", label: "Jam mulai–selesai" },
              { key: "menit", label: "Jumlah menit" },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => set({ mode: m.key })}
              className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                nilai.mode === m.key
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border-strong text-muted hover:bg-surface-2"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {nilai.mode === "jam" ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1.5 text-sm">
              <span className="text-xs text-subtle">Mulai</span>
              <input type="time" className="input h-11" value={nilai.mulai} onChange={(e) => set({ mulai: e.target.value })} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-xs text-subtle">Selesai</span>
              <input type="time" className="input h-11" value={nilai.selesai} onChange={(e) => set({ selesai: e.target.value })} />
            </label>
          </div>
        ) : (
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={960}
            className="input h-11"
            placeholder="Contoh: 90"
            value={nilai.menit}
            onChange={(e) => set({ menit: e.target.value })}
          />
        )}
        {teks && <p className="mt-1.5 text-xs text-muted">Durasi: <b className="text-fg">{teks}</b></p>}
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-muted">Alasan / pekerjaan *</span>
        <textarea
          className="input"
          rows={3}
          maxLength={1000}
          placeholder="Contoh: menyelesaikan pesanan banner untuk besok pagi."
          value={nilai.alasan}
          onChange={(e) => set({ alasan: e.target.value })}
        />
      </label>
    </div>
  );
}
