/**
 * Rate limiter in-memory sederhana (cocok untuk deploy single-instance / PM2).
 * Bukan untuk multi-instance — di sana pakai Redis/DB.
 */
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

const MAX = 5; // percobaan gagal
const WINDOW = 15 * 60 * 1000; // 15 menit

/** True jika masih boleh mencoba (belum melewati batas). */
export function canAttempt(key: string): boolean {
  const b = store.get(key);
  if (!b || Date.now() > b.resetAt) return true;
  return b.count < MAX;
}

/** Catat satu kegagalan untuk key ini. */
export function recordFailure(key: string): void {
  const now = Date.now();
  const b = store.get(key);
  if (!b || now > b.resetAt) store.set(key, { count: 1, resetAt: now + WINDOW });
  else b.count += 1;
}

/** Reset (dipanggil saat login berhasil). */
export function clearAttempts(key: string): void {
  store.delete(key);
}

// Bersihkan bucket kedaluwarsa sesekali agar map tidak tumbuh tanpa batas.
let lastSweep = 0;
export function sweep(): void {
  const now = Date.now();
  if (now - lastSweep < WINDOW) return;
  lastSweep = now;
  for (const [k, b] of store) if (now > b.resetAt) store.delete(k);
}
