import type { PrismaClient } from "@prisma/client";
import { aggregateAttendance } from "./aggregate";
import { buildReceipt, type ReceiptData, type OvertimeRounding } from "./receipt";
import {
  resolveReceiptRates,
  resolveOvertimeRounding,
  resolveMealAllowance,
  resolveReceiptLabels,
  type ReceiptLabelSet,
} from "./receipt-rates";
import { getAllSettings } from "@/lib/settings";
import type { ReceiptPeriod } from "./period";

async function loadConfig(prisma: PrismaClient): Promise<{
  rates: ReturnType<typeof resolveReceiptRates>;
  rounding: OvertimeRounding;
  mealAllowance: number;
  labels: ReceiptLabelSet;
}> {
  const [cats, settings] = await Promise.all([prisma.overtimeCategory.findMany(), getAllSettings()]);
  return {
    rates: resolveReceiptRates(cats.map((c) => ({ name: c.name, rate: c.rate })), settings),
    rounding: resolveOvertimeRounding(settings),
    mealAllowance: resolveMealAllowance(settings),
    labels: resolveReceiptLabels(settings),
  };
}

/** Struk 1 karyawan untuk satu periode (bulanan/mingguan). */
export async function buildEmployeeReceipt(
  prisma: PrismaClient,
  employeeId: number,
  period: ReceiptPeriod
): Promise<ReceiptData | null> {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { department: true, workSchedule: true },
  });
  if (!emp) return null;
  const [{ rows }, { rates, rounding, mealAllowance, labels }] = await Promise.all([
    aggregateAttendance(prisma, { startStr: period.startStr, endStr: period.endStr, employeeId: String(employeeId) }),
    loadConfig(prisma),
  ]);
  const flexible = Boolean(emp.workSchedule?.flexibleHours);
  const flexRatePerHour = emp.workSchedule ? Number(emp.workSchedule.overtimeWagePerHour) : 0;
  return buildReceipt({
    employeeId: emp.id,
    employeeName: emp.fullName,
    employeeCode: emp.employeeCode,
    department: emp.department?.name ?? null,
    year: period.year,
    month: period.month,
    periodLabel: period.label,
    rates,
    rounding,
    flexible,
    flexRatePerHour,
    mealAllowance,
    labels,
    rows: rows.map((r) => ({
      date: r.date,
      shift: r.shift,
      isHoliday: r.isHoliday,
      clockIn: r.clockIn,
      clockOut: r.clockOut,
      lateMinutes: r.lateMinutes,
      overtimeMinutes: r.overtimeMinutes,
      mealEligible: r.mealEligible,
      undertimeMinutes: r.undertimeMinutes,
      status: r.status,
    })),
  });
}

/**
 * Struk semua karyawan aktif (opsional filter departemen) untuk satu periode.
 * TODO(perf): memanggil aggregateAttendance per karyawan agar showAllDates aktif;
 * cukup untuk skala toko (<~50 karyawan). Refactor bila kelak lambat.
 */
export async function buildAllReceipts(
  prisma: PrismaClient,
  period: ReceiptPeriod,
  departmentId?: number | null
): Promise<ReceiptData[]> {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, isActive: true, ...(departmentId ? { departmentId } : {}) },
    orderBy: { fullName: "asc" },
    select: { id: true },
  });
  const out: ReceiptData[] = [];
  for (const e of employees) {
    const r = await buildEmployeeReceipt(prisma, e.id, period);
    if (r) out.push(r);
  }
  return out;
}
