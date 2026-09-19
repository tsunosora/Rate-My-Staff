import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/rbac";
import { PORTAL_COOKIE, PORTAL_TTL_MS, createPortalToken, verifyPortalToken } from "./session";

/** Kunci tanda tangan sesi portal — memakai AUTH_SECRET yang sama dengan Auth.js. */
export function portalSecret(): string {
  const key = process.env.AUTH_SECRET;
  if (!key) throw new Error("AUTH_SECRET belum diisi — sesi portal tidak bisa ditandatangani.");
  return key;
}

/** Karyawan pemilik publicToken (aktif & belum dihapus), lengkap dengan relasi tampilan. */
export async function loadEmployeeByToken(token: string) {
  return prisma.employee.findFirst({
    where: { publicToken: token, deletedAt: null, isActive: true },
    include: { department: true, position: true, workSchedule: true },
  });
}

export type PortalEmployee = NonNullable<Awaited<ReturnType<typeof loadEmployeeByToken>>>;

/** Lempar 404 bila token tak dikenal. */
export async function requireEmployeeByToken(token: string): Promise<PortalEmployee> {
  const employee = await loadEmployeeByToken(token);
  if (!employee) {
    throw NextResponse.json({ message: "Tautan tidak valid atau sudah dinonaktifkan." }, { status: 404 });
  }
  return employee;
}

/**
 * Apakah pengunjung adalah manajemen (OWNER/ADMIN/HR) yang sedang login di dashboard?
 *
 * Owner sudah bisa melihat absensi, penilaian, dan struk karyawan lewat Direktori &
 * Laporan, jadi PIN di halaman karyawan hanya penghalang tanpa menambah keamanan.
 */
export async function viewerIsManager(): Promise<boolean> {
  try {
    const session = await auth();
    return canManage(session?.user?.role);
  } catch {
    return false; // sesi dashboard tak terbaca -> perlakukan sebagai pengunjung biasa
  }
}

export type PortalAccess = {
  employee: PortalEmployee;
  /** true bila dibuka oleh manajemen, bukan karyawannya sendiri. */
  asManager: boolean;
};

/**
 * Wajib sudah "masuk PIN" untuk token ini — ATAU sedang login sebagai manajemen.
 * Lempar 401 dengan kode PIN_REQUIRED supaya halaman portal bisa menampilkan layar
 * PIN, bukan pesan error mentah.
 */
export async function requirePortalAccess(token: string): Promise<PortalAccess> {
  const employee = await requireEmployeeByToken(token);
  const store = await cookies();
  const session = verifyPortalToken(store.get(PORTAL_COOKIE)?.value, token, portalSecret());
  if (session && session.employeeId === employee.id) {
    return { employee, asManager: false };
  }
  if (await viewerIsManager()) return { employee, asManager: true };

  throw NextResponse.json(
    { message: "Masukkan PIN untuk membuka halaman ini.", code: "PIN_REQUIRED" },
    { status: 401 }
  );
}

/** Seperti requirePortalAccess, tapi hanya mengembalikan karyawannya. */
export async function requirePortalSession(token: string): Promise<PortalEmployee> {
  return (await requirePortalAccess(token)).employee;
}

/**
 * Untuk aksi yang MENGUBAH data atas nama karyawan (ajukan izin, tukar poin).
 * Manajemen boleh melihat, tapi tidak boleh bertindak seolah-olah dia karyawannya.
 */
export async function requirePortalOwner(token: string): Promise<PortalEmployee> {
  const { employee, asManager } = await requirePortalAccess(token);
  if (asManager) {
    throw NextResponse.json(
      { message: "Anda sedang melihat sebagai owner — aksi ini hanya bisa dilakukan karyawannya sendiri." },
      { status: 403 }
    );
  }
  return employee;
}

/** Pasang cookie sesi portal (httpOnly, umur 8 jam). */
export async function setPortalCookie(employeeId: number, token: string): Promise<void> {
  const store = await cookies();
  store.set(PORTAL_COOKIE, createPortalToken(employeeId, token, portalSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(PORTAL_TTL_MS / 1000),
  });
}

/** Hapus cookie sesi portal (tombol keluar). */
export async function clearPortalCookie(): Promise<void> {
  const store = await cookies();
  store.delete(PORTAL_COOKIE);
}
