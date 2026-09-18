import { randomInt } from "node:crypto";

/** Panjang PIN portal karyawan yang diizinkan. */
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 8;

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

/**
 * Periksa PIN yang dipilih karyawan. Mengembalikan pesan kesalahan (Bahasa Indonesia)
 * atau null bila PIN boleh dipakai.
 */
export function validatePin(raw: string): string | null {
  const pin = normalizePin(raw);
  if (!/^\d+$/.test(pin)) return "PIN hanya boleh berisi angka.";
  if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) {
    return `PIN harus ${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} angka.`;
  }
  if (allSameDigit(pin)) return "PIN terlalu mudah ditebak (angka sama semua).";
  if (isSequential(pin)) return "PIN terlalu mudah ditebak (angka berurutan).";
  return null;
}

/** PIN acak 6 angka yang lolos validatePin — dipakai admin saat reset PIN. */
export function randomPin(): string {
  for (;;) {
    let pin = "";
    for (let i = 0; i < 6; i++) pin += String(randomInt(0, 10));
    if (validatePin(pin) === null) return pin;
  }
}
