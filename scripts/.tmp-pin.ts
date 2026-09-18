import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
p.employee.upsert({
  where: { employeeCode: "ZZPIN" },
  update: { portalPin: null, portalPinSetAt: null, isActive: true, deletedAt: null },
  create: { employeeCode: "ZZPIN", fullName: "Uji PIN (hapus)", publicToken: "zz-pin-token" },
}).then((e) => console.log("siap:", e.publicToken)).finally(() => p.$disconnect());
