/**
 * Baris "absensi tidak komplit" yang dilengkapi manual di halaman Absensi.
 * Setiap baris butuh kunci UNIK agar nilai input jam tidak saling terkait — meski dua baris
 * kebetulan punya (employeeId, tanggal) sama (mis. hasil import dobel dari mesin). Kunci lama
 * `${employeeId}|${date}` bisa bentrok sehingga mengubah satu baris ikut mengubah baris lain.
 */
export type IncompleteRowKeyable = { employeeId: number; date: string };
export type KeyedIncompleteRow<T extends IncompleteRowKeyable> = T & { uid: string };

/** Beri `uid` unik & stabil per baris (posisi turut jadi bagian kunci → tahan duplikat). */
export function keyIncompleteRows<T extends IncompleteRowKeyable>(
  rows: T[]
): KeyedIncompleteRow<T>[] {
  return rows.map((r, i) => ({ ...r, uid: `${r.employeeId}|${r.date}|${i}` }));
}
