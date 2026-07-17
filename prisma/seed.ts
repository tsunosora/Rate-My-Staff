import { PrismaClient, Role, OvertimeType } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 10);

  const admin = await db.user.upsert({
    where: { email: "admin@ratemystaff.local" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@ratemystaff.local",
      password,
      role: Role.ADMIN,
    },
  });

  const dept = await db.department.upsert({
    where: { name: "Produksi" },
    update: {},
    create: { name: "Produksi" },
  });

  await db.position.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Operator", departmentId: dept.id },
  });

  await db.workSchedule.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Shift Pagi",
      startTime: "08:00",
      endTime: "17:00",
      lateToleranceMinutes: 15,
    },
  });

  await db.overtimeCategory.createMany({
    data: [
      { name: "Lembur Cetak", type: OvertimeType.hourly, rate: 15000, companyContext: "rate_my_staff_custom" },
      { name: "Lembur Libur", type: OvertimeType.flat, rate: 100000, companyContext: "rate_my_staff_custom" },
    ],
    skipDuplicates: true,
  });

  await db.setting.createMany({
    data: [
      { key: "overtime_engine_context", value: "default" },
      { key: "auto_sunday_holiday", value: "true" },
    ],
    skipDuplicates: true,
  });

  console.log(`Seed selesai. Admin: ${admin.email} / admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
