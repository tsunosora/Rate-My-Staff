import { z } from "zod";

export const publicRateSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  raterName: z.string().max(100).optional().nullable(),
  feedback: z.string().max(1000).optional().nullable(),
});

// Skema form ketidakhadiran pindah ke lib/validators/portal.ts (publicLeaveRequestSchema)
// sejak pengajuan izin melewati persetujuan owner.
