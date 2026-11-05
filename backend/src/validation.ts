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

export const changePasswordSchema = loginSchema.extend({
  newPassword: z.string().min(8).max(128),
});

export const impersonateSchema = z.object({
  role: z.enum(["mhs", "dosen"]),
  accountId: z.number().int().positive().max(2_147_483_647).optional(),
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

export const activityClaimSchema = z.object({
  jenis: z.enum(["LOMBA", "KEGIATAN_NON_AKADEMIK"]),
  namaKegiatan: z.string().trim().min(3).max(200),
  penyelenggara: z.string().trim().min(2).max(200),
  tingkat: z.enum(["KAMPUS", "KABUPATEN_KOTA", "PROVINSI", "NASIONAL", "INTERNASIONAL"]),
  capaian: z.string().trim().min(2).max(100),
  tanggalKegiatan: dateOnlySchema,
  deskripsi: z.string().trim().max(1000).nullish().transform((value) => value ?? ""),
});

export const activityClaimDecisionSchema = z.discriminatedUnion("keputusan", [
  z.object({
    keputusan: z.literal("DISETUJUI"),
    poin: z.coerce.number().int().min(1).max(50),
    catatanPemeriksa: z.string().trim().max(1000).nullish().transform((value) => value ?? ""),
  }),
  z.object({
    keputusan: z.literal("DITOLAK"),
    catatanPemeriksa: z.string().trim().min(5).max(1000),
  }),
]);

const disciplinePillarSchema = z.enum(["WAKTU", "AKADEMIK", "TATA_TERTIB", "PROSEDUR_K3", "LINGKUNGAN"]);
// Sangat Berat tidak dipakai kebijakan kampus.
const policySeveritySchema = z.enum(["RINGAN", "SEDANG", "BERAT"]);
// Bobot pengurangan ditulis sebagai angka negatif, mis. -25.
const deductionWeightSchema = z.coerce.number().int().min(-100).max(-1);
const changeReasonSchema = z.string().trim().min(5).max(1000);

export const violationRuleCreateSchema = z.object({
  pillar: disciplinePillarSchema,
  nama: z.string().trim().min(3).max(200),
  severity: policySeveritySchema,
  bobotPoin: deductionWeightSchema,
  alasan: changeReasonSchema,
});

export const violationRuleUpdateSchema = z
  .object({
    nama: z.string().trim().min(3).max(200).optional(),
    severity: policySeveritySchema.optional(),
    bobotPoin: deductionWeightSchema.optional(),
    aktif: z.boolean().optional(),
    alasan: changeReasonSchema,
  })
  .refine(
    ({ nama, severity, bobotPoin, aktif }) =>
      [nama, severity, bobotPoin, aktif].some((value) => value !== undefined),
  );

export const violationLevelUpdateSchema = z
  .object({
    bobotPoin: deductionWeightSchema.optional(),
    aktif: z.boolean().optional(),
    alasan: changeReasonSchema,
  })
  .refine(({ bobotPoin, aktif }) => bobotPoin !== undefined || aktif !== undefined);

export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
): z.infer<T> | null {
  const result = schema.safeParse(body ?? {});
  return result.success ? result.data : null;
}
