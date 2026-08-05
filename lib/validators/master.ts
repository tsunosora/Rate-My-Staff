import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().min(1).max(100),
});

export const positionSchema = z.object({
  name: z.string().min(1).max(100),
  departmentId: z.coerce.number().int().positive().optional().nullable(),
});

export const holidaySchema = z.object({
  date: z.string().min(1), // YYYY-MM-DD
  name: z.string().min(1).max(150),
});

const timeOrNull = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .optional()
  .nullable()
  .or(z.literal(""));

export const workScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  startTime: timeOrNull,
  endTime: timeOrNull,
  breakStartTime: timeOrNull,
  breakEndTime: timeOrNull,
  lateToleranceMinutes: z.coerce.number().int().min(0).default(15),
  dailyWage: z.coerce.number().min(0).default(0),
  weeklyWage: z.coerce.number().min(0).default(0),
  monthlyWage: z.coerce.number().min(0).default(0),
  holidayWage: z.coerce.number().min(0).default(0),
  overtimeWagePerHour: z.coerce.number().min(0).default(0),
  isHoliday: z.boolean().default(false),
  flexibleHours: z.boolean().default(false),
});

export const overtimeCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["flat", "hourly", "hybrid"]).default("hourly"),
  rate: z.coerce.number().min(0).default(0),
  companyContext: z.string().max(50).default("default"),
});
