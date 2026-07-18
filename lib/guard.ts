import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManage, canAdminUsers } from "@/lib/rbac";

/** Server guard: wajib role manajemen (ADMIN/OWNER/HR); jika tidak → /dashboard. */
export async function guardManager(): Promise<void> {
  const session = await auth();
  if (!canManage(session?.user?.role)) redirect("/dashboard");
}

/** Server guard: wajib role admin akun (ADMIN/OWNER); jika tidak → /dashboard. */
export async function guardAdmin(): Promise<void> {
  const session = await auth();
  if (!canAdminUsers(session?.user?.role)) redirect("/dashboard");
}
