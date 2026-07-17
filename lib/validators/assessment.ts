import { z } from "zod";

export const templateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional().nullable(),
  departmentType: z.string().max(50).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const indicatorSchema = z.object({
  category: z.string().min(1).max(100),
  name: z.string().min(1).max(150),
  description: z.string().max(2000).optional().nullable(),
  weight: z.coerce.number().min(0).max(100),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const scoreItem = z.object({
  indicatorId: z.coerce.number().int().positive(),
  score: z.coerce.number().int().min(1).max(5),
  notes: z.string().max(1000).optional().nullable(),
});

export const singleAssessmentSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  templateId: z.coerce.number().int().positive(),
  assessmentDate: z.string().optional().nullable(),
  period: z.string().max(50).optional().nullable(),
  evaluatorNotes: z.string().max(2000).optional().nullable(),
  developmentPlan: z.string().max(2000).optional().nullable(),
  status: z.enum(["draft", "completed"]).default("draft"),
  scores: z.array(scoreItem).min(1),
});

export type SingleAssessmentInput = z.infer<typeof singleAssessmentSchema>;
