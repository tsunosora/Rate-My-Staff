import type { PrismaClient } from "@prisma/client";
import { makeCalculator } from "@/lib/services/overtime";
import { getSetting } from "@/lib/settings";

/**
 * Nominal lembur satu baris absensi dari kategori + menit yang disetujui, memakai engine sesuai
 * setting `overtime_engine_context`. Null = tidak ada kategori (nominal tidak dihitung ulang).
 *
 * Satu tempat untuk dua pemanggil: edit absensi manual (app/api/attendance/[id]) dan
 * persetujuan pengajuan lembur — supaya keduanya tidak pernah menghitung dengan cara berbeda.
 */
export async function hitungNominalLembur(
  prisma: PrismaClient,
  categoryId: number | null | undefined,
  approvedMinutes: number
): Promise<number | null> {
  if (!categoryId) return null;
  const category = await prisma.overtimeCategory.findUnique({ where: { id: categoryId } });
  if (!category) return null;
  const context = await getSetting("overtime_engine_context");
  const calc = makeCalculator(context);
  return calc.calculate({
    category: { name: category.name, type: category.type, rate: Number(category.rate) },
    approvedMinutes,
  });
}
