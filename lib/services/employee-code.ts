import type { PrismaClient } from "@prisma/client";

const PREFIX = "EMP-";
const MAX_LEN = 20;
const SEQ_LEN = 3;

/** Normalisasi nama jadi base kode: uppercase, hanya A-Z0-9, dipotong agar muat. */
export function normalizeBase(name: string): string {
  const cleaned = (name ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const base = cleaned.length > 0 ? cleaned : "EMP";
  // EMP-(4) + base + -(1) + seq(3) <= 20  =>  base <= 12
  const maxBase = MAX_LEN - PREFIX.length - 1 - SEQ_LEN;
  return base.slice(0, maxBase);
}

/**
 * Fungsi murni: hasilkan kode karyawan unik berikutnya dari daftar kode existing.
 * Format: EMP-{BASE}-{NNN}. Tidak menyentuh DB (mudah diuji).
 */
export function generateEmployeeCode(name: string, existingCodes: string[]): string {
  const base = normalizeBase(name);
  const groupPrefix = `${PREFIX}${base}-`;

  let maxSeq = 0;
  for (const code of existingCodes) {
    if (!code.startsWith(groupPrefix)) continue;
    const seq = Number.parseInt(code.slice(groupPrefix.length), 10);
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
  }

  const next = String(maxSeq + 1).padStart(SEQ_LEN, "0");
  return `${groupPrefix}${next}`;
}

/** Wrapper DB: ambil kode existing yang sebaris lalu hasilkan kode unik. */
export async function nextEmployeeCode(
  prisma: PrismaClient,
  name: string
): Promise<string> {
  const base = normalizeBase(name);
  const rows = await prisma.employee.findMany({
    where: { employeeCode: { startsWith: `${PREFIX}${base}-` } },
    select: { employeeCode: true },
  });
  return generateEmployeeCode(
    name,
    rows.map((r) => r.employeeCode)
  );
}
