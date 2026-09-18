import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sesi portal karyawan (/me/[token]) — cookie ber-tanda-tangan HMAC, tanpa tabel sesi.
 *
 * Isi cookie: `employeeId.fingerprint.exp.signature`
 * - `fingerprint` = sidik jari publicToken; sesi otomatis mati bila token karyawan diputar ulang.
 * - Ditandatangani AUTH_SECRET, jadi isi cookie tak bisa dipalsukan di sisi klien.
 */

export const PORTAL_COOKIE = "rms_portal";

/** Umur sesi portal: 8 jam (satu shift kerja). */
export const PORTAL_TTL_MS = 8 * 60 * 60 * 1000;

export type PortalSession = { employeeId: number; expiresAt: number };

function hmac(input: string, key: string): string {
  return createHmac("sha256", key).update(input).digest("base64url");
}

/** Sidik jari publicToken (12 char) — token asli tak pernah ikut masuk cookie. */
function fingerprint(publicToken: string, key: string): string {
  return hmac(`token:${publicToken}`, key).slice(0, 12);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Buat nilai cookie sesi untuk satu karyawan. */
export function createPortalToken(
  employeeId: number,
  publicToken: string,
  key: string,
  now: number = Date.now(),
  ttlMs: number = PORTAL_TTL_MS
): string {
  const exp = now + ttlMs;
  const payload = `${employeeId}.${fingerprint(publicToken, key)}.${exp}`;
  return `${payload}.${hmac(payload, key)}`;
}

/**
 * Verifikasi cookie sesi terhadap publicToken pada URL.
 * Mengembalikan null bila tanda tangan salah, kedaluwarsa, atau milik karyawan lain.
 */
export function verifyPortalToken(
  cookieValue: string | undefined | null,
  publicToken: string,
  key: string,
  now: number = Date.now()
): PortalSession | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 4) return null;
  const [idRaw, fp, expRaw, sig] = parts;

  const payload = `${idRaw}.${fp}.${expRaw}`;
  if (!safeEqual(sig, hmac(payload, key))) return null;

  const employeeId = Number(idRaw);
  const expiresAt = Number(expRaw);
  if (!Number.isInteger(employeeId) || employeeId <= 0) return null;
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;
  if (!safeEqual(fp, fingerprint(publicToken, key))) return null;

  return { employeeId, expiresAt };
}
