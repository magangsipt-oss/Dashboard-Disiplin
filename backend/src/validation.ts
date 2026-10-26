import { z } from "zod";

// Tanggal format YYYY-MM-DD yang benar-benar ada di kalender.
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });

const httpUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    try {
      const { protocol } = new URL(value);
      return protocol === "https:" || protocol === "http:";
    } catch {
      return false;
    }
  });

export const loginSchema = z.object({
  role: z.enum(["mhs", "dosen", "admin", "akademik"]),
  identity: z.string().trim().min(1),
  password: z.string().min(1),
});

export const counselingSchema = z.object({
  studentId: z.number().int().positive().max(2_147_483_647),
  type: z.enum(["GUIDANCE_NOTE", "COUNSELING_CALL"]),
  note: z.string().trim().min(1).max(2000),
  counselingDate: dateOnlySchema,
});

export const appealSchema = z.object({
  perubahanPoinId: z.coerce.number().int().positive().max(2_147_483_647),
  alasan: z.string().trim().min(20).max(2000),
});

export const trainingEvidenceSchema = z.object({
  buktiUrl: httpUrlSchema,
  catatan: z.string().trim().max(5000).nullish().transform((value) => value ?? ""),
});

export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
): z.infer<T> | null {
  const result = schema.safeParse(body ?? {});
  return result.success ? result.data : null;
}
