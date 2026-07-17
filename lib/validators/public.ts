import { z } from "zod";

export const publicRateSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  raterName: z.string().max(100).optional().nullable(),
  feedback: z.string().max(1000).optional().nullable(),
});

export const publicAbsenceSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  date: z.string().min(1), // YYYY-MM-DD
  status: z.enum(["Izin", "Sakit", "Cuti"]),
  reason: z.string().min(1).max(1000),
});
