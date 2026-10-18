import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePortalOwner, type PortalEmployee } from "@/lib/services/portal/auth";
import { periksaPic } from "./aturan";

/** Header pembawa id acak HP (sama dengan `perangkat` di absen HP; server cuma memakai sidiknya). */
export const HEADER_PERANGKAT = "x-perangkat";

/**
 * Gerbang SEMUA rute absen tim di HP: sesi PIN karyawannya sendiri (owner yang membuka lewat
 * ?owner=1 ditolak — boleh melihat, tidak boleh bertindak), lalu periksaPic(): aktif, absen HP
 * menyala, ditandai PIC, dan HP ini HP yang terkunci untuknya.
 *
 * `kunci`: kunci HP pertama kalau belum ada (dipakai rute yang MENULIS). Bersyarat null, jadi
 * dua permintaan serentak dari dua HP tidak saling menimpa — sama dengan absen HP.
 */
export async function wajibPic(token: string, req: Request, kunci = false): Promise<PortalEmployee> {
  const pic = await requirePortalOwner(token, req);
  const cek = periksaPic(pic, req.headers.get(HEADER_PERANGKAT) ?? "");
  if (!cek.ok) throw NextResponse.json(cek, { status: 403 });
  if (kunci && cek.kunciPerangkat) {
    await prisma.employee.updateMany({
      where: { id: pic.id, absenHpPerangkat: null },
      data: { absenHpPerangkat: cek.sidik, absenHpPerangkatAt: new Date() },
    });
  }
  return pic;
}
