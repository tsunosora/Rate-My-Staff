import { z } from "zod";

export const employeeCreateSchema = z.object({
  fullName: z.string().min(1).max(150),
  nickname: z.string().max(50).optional().nullable(),
  machinePin: z.string().max(50).optional().nullable(),
  departmentId: z.coerce.number().int().positive().optional().nullable(),
  positionId: z.coerce.number().int().positive().optional().nullable(),
  workScheduleId: z.coerce.number().int().positive().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  salary: z.coerce.number().nonnegative().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
});

export const employeeUpdateSchema = employeeCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
