/** Pembantu periode di layar upah (klien). Aturan bawaan & batasnya tetap di server (lib/services/upah/aturan.ts). */

export function ymdLokal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dariYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Senin–Minggu yang memuat hari ini. */
export function mingguIni(): { dari: string; sampai: string } {
  const h = new Date();
  const senin = new Date(h.getFullYear(), h.getMonth(), h.getDate() - ((h.getDay() + 6) % 7));
  return { dari: ymdLokal(senin), sampai: ymdLokal(new Date(senin.getFullYear(), senin.getMonth(), senin.getDate() + 6)) };
}

/** Geser rentang sepanjang dirinya sendiri (seminggu → seminggu). */
export function geser(dari: string, sampai: string, arah: 1 | -1): { dari: string; sampai: string } {
  const a = dariYmd(dari);
  const b = dariYmd(sampai);
  const hari = Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86_400_000) + 1;
  const n = hari * arah;
  return {
    dari: ymdLokal(new Date(a.getFullYear(), a.getMonth(), a.getDate() + n)),
    sampai: ymdLokal(new Date(b.getFullYear(), b.getMonth(), b.getDate() + n)),
  };
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export function labelRentang(dari: string, sampai: string): string {
  const a = dariYmd(dari);
  const b = dariYmd(sampai);
  const kiri = `${a.getDate()} ${BULAN[a.getMonth()]}${a.getFullYear() !== b.getFullYear() ? ` ${a.getFullYear()}` : ""}`;
  return dari === sampai ? `${b.getDate()} ${BULAN[b.getMonth()]} ${b.getFullYear()}` : `${kiri} – ${b.getDate()} ${BULAN[b.getMonth()]} ${b.getFullYear()}`;
}
