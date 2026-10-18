import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { relabelDeviceScans } from "@/lib/services/fingerspot/sync";
import { recomputeStoredStatus } from "@/lib/services/attendance/recompute";
import { jenisGambar, type Keputusan, type KeputusanLuar, type Lokasi } from "./aturan";

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

/**
 * Simpan PENGAJUAN absen di luar lokasi: bukti berstatus "menunggu", TANPA baris Attendance —
 * jadi laporan apa pun (semuanya membaca Attendance) tidak menghitungnya sampai owner setuju.
 * HP pertama tetap dikunci di sini, sama seperti absen biasa: pengajuan juga absen dari HP itu.
 */
export async function catatPengajuanLuar(a: {
  employeeId: number;
  keputusan: Extract<KeputusanLuar, { ok: true }>;
  lat: number;
  lng: number;
  akurasiM: number;
  fotoPath: string;
  ip: string | null;
}): Promise<{ id: number; waktu: Date }> {
  const k = a.keputusan;
  return prisma.$transaction(async (tx) => {
    const b = await tx.absenHpBukti.create({
      data: {
        employeeId: a.employeeId,
        lokasiId: k.lokasi?.id ?? null,
        lat: a.lat,
        lng: a.lng,
        akurasiM: Math.round(a.akurasiM),
        // -1 = belum ada lokasi absen sama sekali saat diajukan (kolomnya wajib angka).
        jarakM: k.jarakM ?? -1,
        fotoPath: a.fotoPath,
        perangkat: k.sidik,
        qr: false,
        ip: a.ip,
        status: "menunggu",
        alasan: k.alasan,
      },
    });
    if (k.kunciPerangkat) {
      await tx.employee.updateMany({
        where: { id: a.employeeId, absenHpPerangkat: null },
        data: { absenHpPerangkat: k.sidik, absenHpPerangkatAt: b.createdAt },
      });
    }
    return { id: b.id, waktu: b.createdAt };
  });
}

/**
 * Setujui pengajuan: baris Attendance dengan waktu = saat DIAJUKAN (bukan saat disetujui) —
 * owner yang menyetujui sore hari tidak boleh membuat absen masuk pagi tercatat jam 17.00.
 * Status diubah bersyarat ("menunggu" → "diterima") di dalam transaksi supaya dua klik
 * serentak tidak membuat dua baris absensi.
 */
export async function setujuiPengajuanLuar(id: number, olehUserId: number | null, catatan: string | null): Promise<{ attendanceId: number } | null> {
  const hasil = await prisma.$transaction(async (tx) => {
    const b = await tx.absenHpBukti.findUnique({ where: { id }, select: { employeeId: true, createdAt: true } });
    if (!b) return null;
    const kunci = await tx.absenHpBukti.updateMany({
      where: { id, status: "menunggu", attendanceId: null },
      data: { status: "diterima", decidedById: olehUserId, decidedAt: new Date(), catatanKeputusan: catatan },
    });
    if (kunci.count === 0) return null;
    const att = await tx.attendance.create({
      data: {
        employeeId: b.employeeId,
        scanDate: b.createdAt,
        scanType: b.createdAt.getHours() < 12 ? "in" : "out", // sementara; ditetapkan relabel
        status: "on_time",
        machineName: "hp",
      },
    });
    await tx.absenHpBukti.update({ where: { id }, data: { attendanceId: att.id } });
    return { attendanceId: att.id, employeeId: b.employeeId, waktu: b.createdAt };
  });
  if (!hasil) return null;
  await relabelDeviceScans();
  const awal = new Date(hasil.waktu);
  awal.setHours(0, 0, 0, 0);
  await recomputeStoredStatus(prisma, { employeeIds: [hasil.employeeId], from: awal });
  return { attendanceId: hasil.attendanceId };
}

export async function tolakPengajuanLuar(id: number, olehUserId: number | null, catatan: string | null): Promise<boolean> {
  const r = await prisma.absenHpBukti.updateMany({
    where: { id, status: "menunggu", attendanceId: null },
    data: { status: "ditolak", decidedById: olehUserId, decidedAt: new Date(), catatanKeputusan: catatan },
  });
  return r.count > 0;
}
