// Logika murni penilaian PIN — TANPA impor Node, supaya bisa dipakai juga di
// komponen klien (meter kekuatan PIN saat karyawan mengetik).
/** Panjang PIN portal karyawan yang diizinkan. */
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 8;

export type PinStrength = "lemah" | "sedang" | "kuat";

export type PinCheck = {
  /** Boleh dipakai? Hanya format yang menggagalkan — PIN lemah TETAP boleh. */
  valid: boolean;
  /** Alasan ditolak (format salah). */
  error: string | null;
  strength: PinStrength;
  /** Kenapa dinilai lemah — ditampilkan sebagai peringatan, bukan penghalang. */
  reasons: string[];
};

/** Buang spasi/karakter pemisah yang biasa ikut ter-paste dari WhatsApp. */
export function normalizePin(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

function allSameDigit(pin: string): boolean {
  return new Set(pin).size === 1;
}

function isSequential(pin: string): boolean {
  let asc = true;
  let desc = true;
  for (let i = 1; i < pin.length; i++) {
    const diff = pin.charCodeAt(i) - pin.charCodeAt(i - 1);
    if (diff !== 1) asc = false;
    if (diff !== -1) desc = false;
  }
  return asc || desc;
}

/** Pola berulang seperti 1212, 123123, 1122. */
function isRepeatingPattern(pin: string): boolean {
  for (let size = 1; size <= pin.length / 2; size++) {
    if (pin.length % size !== 0) continue;
    const unit = pin.slice(0, size);
    if (pin === unit.repeat(pin.length / size)) return true;
  }
  return false;
}

/** Mirip tahun (1900–2099) — sering dipakai dan mudah ditebak dari data karyawan. */
function looksLikeYear(pin: string): boolean {
  return pin.length === 4 && /^(19|20)\d{2}$/.test(pin);
}

/**
 * Periksa PIN. Format salah -> ditolak. Pola mudah ditebak -> TETAP DITERIMA,
 * tapi ditandai lemah supaya karyawan sadar risikonya.
 */
export function checkPin(raw: string): PinCheck {
  const pin = normalizePin(raw);

  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: "PIN hanya boleh berisi angka.", strength: "lemah", reasons: [] };
  }
  if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) {
    return {
      valid: false,
      error: `PIN harus ${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} angka.`,
      strength: "lemah",
      reasons: [],
    };
  }

  const reasons: string[] = [];
  if (allSameDigit(pin)) reasons.push("semua angkanya sama");
  else if (isSequential(pin)) reasons.push("angkanya berurutan");
  else if (isRepeatingPattern(pin)) reasons.push("polanya berulang");
  if (looksLikeYear(pin)) reasons.push("mirip tahun lahir");
  if (new Set(pin).size <= 2 && reasons.length === 0) reasons.push("hanya memakai dua angka berbeda");

  const strength: PinStrength =
    reasons.length > 0 ? "lemah" : pin.length >= 6 ? "kuat" : "sedang";

  return { valid: true, error: null, strength, reasons };
}

/** Kalimat peringatan siap tampil; null bila PIN tidak lemah. */
export function pinWarning(check: PinCheck): string | null {
  if (check.strength !== "lemah" || check.reasons.length === 0) return null;
  return `PIN ini lemah (${check.reasons.join(", ")}) dan mudah ditebak orang lain. Tetap bisa dipakai, tapi sebaiknya diganti.`;
}
