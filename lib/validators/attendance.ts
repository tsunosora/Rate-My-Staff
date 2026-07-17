import { z } from "zod";

export const manualAttendanceSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  date: z.string().min(1), // YYYY-MM-DD
  clockIn: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable().or(z.literal("")),
  clockOut: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable().or(z.literal("")),
});

export const editAttendanceSchema = z.object({
  clockIn: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable().or(z.literal("")),
  clockOut: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable().or(z.literal("")),
  lateMinutes: z.coerce.number().int().min(0).optional(),
  overtimeMinutes: z.coerce.number().int().min(0).optional(),
  approvedOvertimeMinutes: z.coerce.number().int().min(0).optional(),
  overtimeCategoryId: z.coerce.number().int().positive().optional().nullable(),
  overtimeReason: z.string().max(1000).optional().nullable(),
  status: z.string().max(20).optional(),
  absenceReason: z.string().max(1000).optional().nullable(),
});
