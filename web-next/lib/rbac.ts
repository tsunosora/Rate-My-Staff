import type { Role } from "@prisma/client";

/** Role yang boleh mengelola master data & konfigurasi (write-level). */
const MANAGER_ROLES: ReadonlySet<string> = new Set(["ADMIN", "OWNER", "HR"]);

/** True jika role boleh melakukan aksi manajemen (bukan sekadar evaluator). */
export function canManage(role?: Role | string | null): boolean {
  return role != null && MANAGER_ROLES.has(role);
}
