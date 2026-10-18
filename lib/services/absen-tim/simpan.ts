import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { recomputeStoredStatus } from "@/lib/services/attendance/recompute";
import { jenisGambar } from "@/lib/services/absen-hp/aturan";
import { awalHari } from "./aturan";

/** machineName baris Attendance dari absen tim yang disetujui. */
export const MESIN_TIM = "tim";

/** Foto absen tim = data pribadi: DI LUAR public/, cuma tersaji lewat rute ber-login. */
export function folderFotoTim(): string {
  return process.env.ABSEN_TIM_DIR || path.join(process.cwd(), "storage", "absen-tim");
}

export const FOTO_MAKS_BITA = 6 * 1024 * 1024;

/** Simpan foto; nama berkas dirakit server (acak), tidak pernah dari kiriman. */
export async function simpanFotoTim(bita: Uint8Array): Promise<string> {
  const jenis = jenisGambar(bita);
  if (!jenis) throw new Error("bukan_gambar");
  const bulan = new Date().toISOString().slice(0, 7);
  const relatif = path.posix.join(bulan, `${randomUUID()}.${jenis}`);
  const tujuan = path.join(folderFotoTim(), relatif);
  await mkdir(path.dirname(tujuan), { recursive: true });
  await writeFile(tujuan, bita, { mode: 0o600 });
  return relatif;
}

/** Baca foto; jalurnya dari basis data, tapi tetap dikurung di folder foto tim. */
export async function bacaFotoTim(relatif: string): Promise<{ bita: Buffer; tipe: string } | null> {
  const akar = path.resolve(folderFotoTim());
  const penuh = path.resolve(akar, relatif);
  if (!penuh.startsWith(akar + path.sep)) return null;
  try {
    const bita = await readFile(penuh);
    const jenis = jenisGambar(bita);
    if (!jenis) return null;
    return { bita, tipe: jenis === "jpg" ? "image/jpeg" : `image/${jenis}` };
  } catch {
    return null;
  }
}

/**
 * Setujui baris-baris MENUNGGU (satu baris, atau semua di satu sesi). Tiap baris dikunci dengan
 * updateMany bersyarat ("menunggu" + attendanceId null → "diterima") di dalam transaksi, jadi dua
 * klik serentak — termasuk "setujui semua" berbarengan dengan "setujui" satu baris — tidak pernah
 * membuat dua baris Attendance.
 *
 * Attendance memakai waktu baris (saat PIC mencatat), BUKAN saat disetujui, dan jenis masuk/
 * pulang yang dipilih PIC apa adanya. Sengaja TIDAK lewat relabelDeviceScans(): fungsi itu
 * menetapkan ulang label dari URUTAN waktu (pertama = masuk) — PIC yang hanya mencatat "Pulang"
 * untuk tukang yang masuknya lewat mesin akan diubah jadi "Masuk". "tim" karena itu tidak ada di
 * DEVICE_MACHINES; status telat/lembur tetap dihitung ulang lewat recomputeStoredStatus().
 */
export async function setujuiBaris(
  where: { id: number } | { sesiId: number },
  olehUserId: number | null,
  catatan: string | null,
): Promise<{ disetujui: number }> {
  const calon = await prisma.absenTimBaris.findMany({
    where: { ...where, status: "menunggu", attendanceId: null },
    select: { id: true, employeeId: true, waktu: true, jenis: true },
    orderBy: { waktu: "asc" },
  });
  if (calon.length === 0) return { disetujui: 0 };

  const jadi = await prisma.$transaction(async (tx) => {
    const ok: { employeeId: number; waktu: Date }[] = [];
    const sekarang = new Date();
    for (const b of calon) {
      const kunci = await tx.absenTimBaris.updateMany({
        where: { id: b.id, status: "menunggu", attendanceId: null },
        data: { status: "diterima", decidedById: olehUserId, decidedAt: sekarang, catatanKeputusan: catatan },
      });
      if (kunci.count === 0) continue;
      const att = await tx.attendance.create({
        data: {
          employeeId: b.employeeId,
          scanDate: b.waktu,
          scanType: b.jenis === "out" ? "out" : "in",
          status: "on_time",
          machineName: MESIN_TIM,
        },
      });
      await tx.absenTimBaris.update({ where: { id: b.id }, data: { attendanceId: att.id } });
      ok.push({ employeeId: b.employeeId, waktu: b.waktu });
    }
    return ok;
  });

  if (jadi.length > 0) {
    const dari = awalHari(new Date(Math.min(...jadi.map((j) => j.waktu.getTime()))));
    await recomputeStoredStatus(prisma, { employeeIds: [...new Set(jadi.map((j) => j.employeeId))], from: dari });
  }
  return { disetujui: jadi.length };
}

export async function tolakBaris(id: number, olehUserId: number | null, catatan: string | null): Promise<boolean> {
  const r = await prisma.absenTimBaris.updateMany({
    where: { id, status: "menunggu", attendanceId: null },
    data: { status: "ditolak", decidedById: olehUserId, decidedAt: new Date(), catatanKeputusan: catatan },
  });
  return r.count > 0;
}

/** Id User dasbor dari sesi login (untuk kolom decidedBy). */
export async function idPengguna(email: string | null | undefined): Promise<number | null> {
  if (!email) return null;
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}
