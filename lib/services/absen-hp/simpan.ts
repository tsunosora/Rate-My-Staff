import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { relabelDeviceScans } from "@/lib/services/fingerspot/sync";
import { jenisGambar, type Keputusan, type Lokasi } from "./aturan";

/** Foto absen = data pribadi karyawan: DI LUAR public/, cuma tersaji lewat rute ber-login. */
export function folderFoto(): string {
  return process.env.ABSEN_HP_DIR || path.join(process.cwd(), "storage", "absen-hp");
}

export const FOTO_MAKS_BITA = 6 * 1024 * 1024;

/** Simpan foto; nama berkas dirakit server (acak), tidak pernah dari kiriman. */
export async function simpanFoto(bita: Uint8Array): Promise<string> {
  const jenis = jenisGambar(bita);
  if (!jenis) throw new Error("bukan_gambar");
  const bulan = new Date().toISOString().slice(0, 7);
  const relatif = path.posix.join(bulan, `${randomUUID()}.${jenis}`);
  const tujuan = path.join(folderFoto(), relatif);
  await mkdir(path.dirname(tujuan), { recursive: true });
  await writeFile(tujuan, bita, { mode: 0o600 });
  return relatif;
}

/** Baca foto bukti; jalurnya dari basis data, tapi tetap dikurung di folder foto. */
export async function bacaFoto(relatif: string): Promise<{ bita: Buffer; tipe: string } | null> {
  const akar = path.resolve(folderFoto());
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

export async function lokasiAktif(): Promise<Lokasi[]> {
  return prisma.absenLokasi.findMany({
    where: { aktif: true },
    select: { id: true, nama: true, lat: true, lng: true, radiusM: true, wajibQr: true, qrRahasia: true },
  });
}

/**
 * Catat absen yang sudah DIPUTUSKAN diterima: satu baris Attendance (bentuknya sama dengan scan
 * mesin, machineName "hp") + satu bukti. Label masuk/pulang ditetapkan ulang oleh
 * relabelDeviceScans() bersama scan mesin, supaya karyawan yang kadang scan mesin dan kadang
 * absen dari HP tetap dihitung sebagai satu hari.
 */
export async function catatAbsenHp(a: {
  employeeId: number;
  keputusan: Extract<Keputusan, { ok: true }>;
  lat: number;
  lng: number;
  akurasiM: number;
  fotoPath: string;
  ip: string | null;
}): Promise<{ attendanceId: number; scanType: string | null; waktu: Date }> {
  const waktu = new Date();
  const k = a.keputusan;
  const att = await prisma.$transaction(async (tx) => {
    const baris = await tx.attendance.create({
      data: {
        employeeId: a.employeeId,
        scanDate: waktu,
        scanType: waktu.getHours() < 12 ? "in" : "out", // sementara; ditetapkan relabel
        status: "on_time",
        machineName: "hp",
      },
    });
    await tx.absenHpBukti.create({
      data: {
        attendanceId: baris.id,
        employeeId: a.employeeId,
        lokasiId: k.lokasi.id,
        lat: a.lat,
        lng: a.lng,
        akurasiM: Math.round(a.akurasiM),
        jarakM: k.jarakM,
        fotoPath: a.fotoPath,
        perangkat: k.sidik,
        qr: k.qr,
        ip: a.ip,
      },
    });
    if (k.kunciPerangkat) {
      // Kunci HP pertama — `updateMany` bersyarat null supaya dua absen serentak dari dua HP
      // tidak saling menimpa: yang kalah tetap tercatat, tapi kuncinya milik yang pertama.
      await tx.employee.updateMany({
        where: { id: a.employeeId, absenHpPerangkat: null },
        data: { absenHpPerangkat: k.sidik, absenHpPerangkatAt: waktu },
      });
    }
    return baris;
  });
  await relabelDeviceScans();
  const akhir = await prisma.attendance.findUnique({ where: { id: att.id }, select: { scanType: true } });
  return { attendanceId: att.id, scanType: akhir?.scanType ?? null, waktu };
}
