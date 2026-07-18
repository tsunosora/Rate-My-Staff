import type { Role } from "@prisma/client";

/** Role yang boleh mengelola master data & konfigurasi (write-level). */
const MANAGER_ROLES: ReadonlySet<string> = new Set(["ADMIN", "OWNER", "HR"]);

/** Role yang boleh mengelola akun pengguna & menetapkan peran. */
const ADMIN_ROLES: ReadonlySet<string> = new Set(["ADMIN", "OWNER"]);

/** True jika role boleh melakukan aksi manajemen (bukan sekadar evaluator). */
export function canManage(role?: Role | string | null): boolean {
  return role != null && MANAGER_ROLES.has(role);
}

/** True jika role boleh mengelola akun pengguna (tambah user, ubah peran, reset password). */
export function canAdminUsers(role?: Role | string | null): boolean {
  return role != null && ADMIN_ROLES.has(role);
}
