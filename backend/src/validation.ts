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
  role: z.enum(["mhs", "dosen", "akademik"]),
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

const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const drcActivityFields = z.object({
  judul: z.string().trim().min(3).max(200),
  jenis: z.enum(["SEMINAR", "KEGIATAN_LAIN"]),
  semester: z.string().trim().min(3).max(50),
  tanggal: dateOnlySchema,
  jamMulai: clockTimeSchema,
  jamSelesai: clockTimeSchema,
  lokasi: z.string().trim().min(3).max(200),
  tema: z
    .array(z.enum(["WAKTU", "AKADEMIK", "TATA_TERTIB", "PROSEDUR_K3", "LINGKUNGAN"]))
    .min(1)
    .max(5)
    .transform((values) => [...new Set(values)]),
  deskripsi: z.string().trim().max(2000).optional().transform((value) => value || null),
  // Kosong = semua prodi / semua angkatan.
  targetProdi: z
    .array(z.string().trim().min(1).max(200))
    .max(50)
    .default([])
    .transform((values) => [...new Set(values)]),
  targetAngkatan: z
    .array(z.number().int().min(2000).max(2100))
    .max(20)
    .default([])
    .transform((values) => [...new Set(values)].sort((a, b) => a - b)),
});

// Format HH:MM sama panjang, jadi perbandingan string = perbandingan waktu.
export const drcActivitySchema = drcActivityFields.refine(
  ({ jamMulai, jamSelesai }) => jamMulai < jamSelesai,
);

export const drcEvidenceSchema = z.object({
  catatan: z.string().trim().max(500).optional().transform((value) => value || null),
});

export const drcActivityUpdateSchema = drcActivityFields
  .extend({ beritahuMahasiswa: z.boolean().default(true) })
  .refine(({ jamMulai, jamSelesai }) => jamMulai < jamSelesai);

export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
): z.infer<T> | null {
  const result = schema.safeParse(body ?? {});
  return result.success ? result.data : null;
}
