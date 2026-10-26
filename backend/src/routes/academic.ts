import { Router, type NextFunction, type Request, type Response } from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";
import {
  saveAcademicUpload,
  listAcademicUploads,
  getAcademicUploadPreview,
  getAcademicUploadFilePath,
} from "../academic-files";
import {
  AcademicImportValidationError,
  parseAcademicAttendanceFile,
  parseNewLecturerImportFile,
  parseNewStudentImportFile,
  parseAdvisorAssignmentFile,
} from "../academic-import";
import { calculatePointChangeForDelta, type ViolationSeverity } from "../points";
import { sendPointDeductionEmail } from "../mailer";
import { hashImportedPasswords } from "../password";
import { currentSession, database, requireRole } from "../auth";

// Route khusus akun Akademik: impor data dan riwayat file. Dipasang di /api/auth.
export const academicRouter = Router();

const academicUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!/\.(csv|xls|xlsx)$/i.test(file.originalname)) {
      callback(new Error("Format file harus CSV atau Excel (.xls, .xlsx)."));
      return;
    }
    callback(null, true);
  },
});


function academicUploadFile(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  academicUpload.single("file")(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Ukuran file maksimal 10 MB."
            : "File upload tidak valid.",
      });
      return;
    }
    response.status(400).json({
      message:
        error instanceof Error ? error.message : "File upload tidak valid.",
    });
  });
}

const requireAcademicUploadSession = requireRole(
  ["akademik"],
  "Fitur ini hanya tersedia untuk akun Akademik.",
);

academicRouter.post(
  "/academic/students/import",
  requireAcademicUploadSession,
  academicUploadFile,
  async (request, response) => {
    if (!request.file) {
      response.status(400).json({ message: "Pilih file data mahasiswa Excel (.xls atau .xlsx)." });
      return;
    }

    try {
      const rows = parseNewStudentImportFile(
        request.file.buffer,
        request.file.originalname,
      );
      const existingStudents = await database.mahasiswa.findMany({
        where: { nim: { in: rows.map((row) => row.nim) } },
        select: { nim: true },
      });
      const existingNims = new Set(existingStudents.map((student) => student.nim));
      const newRows = rows.filter((row) => !existingNims.has(row.nim));
      const hashedRows = await hashImportedPasswords(newRows);
      const result = await database.$transaction((transaction) =>
        transaction.mahasiswa.createMany({
          data: hashedRows.map((row) => ({
            nim: row.nim,
            nama: row.nama,
            jurusan: row.jurusan,
            password: row.password,
            email: row.email,
            noHandphone: row.noHandphone,
            angkatan: row.angkatan,
            namaSmta: row.namaSmta,
          })),
          skipDuplicates: true,
        }),
      );

      response.json({
        imported: result.count,
        skipped: rows.length - result.count,
        totalRows: rows.length,
      });
    } catch (error) {
      if (error instanceof AcademicImportValidationError) {
        response.status(400).json({ message: error.message });
        return;
      }
      console.error("Gagal mengimpor data mahasiswa baru:", error);
      response.status(500).json({ message: "Data mahasiswa gagal diimpor." });
    }
  },
);

academicRouter.post(
  "/academic/lecturers/import",
  requireAcademicUploadSession,
  academicUploadFile,
  async (request, response) => {
    if (!request.file) {
      response.status(400).json({ message: "Pilih file data dosen Excel (.xls atau .xlsx)." });
      return;
    }

    try {
      const rows = parseNewLecturerImportFile(
        request.file.buffer,
        request.file.originalname,
      );
      const [existingIdentities, matchingEmails] = await Promise.all([
        database.dosen.findMany({
          where: {
            OR: [
              { nuptk: { in: rows.map((row) => row.nuptk) } },
            ],
          },
          select: { nuptk: true },
        }),
        database.dosen.findMany({
          where: {
            email: {
              in: rows.map((row) => row.email),
              mode: "insensitive",
            },
          },
          select: { email: true },
        }),
      ]);
      const existingNuptks = new Set(
        existingIdentities.map((lecturer) => lecturer.nuptk.toString()),
      );
      const existingEmails = new Set(
        matchingEmails.map((lecturer) => lecturer.email?.toLowerCase()),
      );
      const newRows = rows.filter(
        (row) =>
          !existingNuptks.has(row.nuptk.toString()) &&
          !existingEmails.has(row.email.toLowerCase()),
      );
      const hashedRows = await hashImportedPasswords(newRows);
      const result = await database.$transaction((transaction) =>
        transaction.dosen.createMany({
          data: hashedRows,
          skipDuplicates: true,
        }),
      );

      response.json({
        imported: result.count,
        skipped: rows.length - result.count,
        totalRows: rows.length,
      });
    } catch (error) {
      if (error instanceof AcademicImportValidationError) {
        response.status(400).json({ message: error.message });
        return;
      }
      console.error("Gagal mengimpor data dosen baru:", error);
      response.status(500).json({ message: "Data dosen gagal diimpor." });
    }
  },
);

academicRouter.post(
  "/academic/attendance/import",
  requireAcademicUploadSession,
  academicUploadFile,
  async (request, response) => {
    if (!request.file) {
      response.status(400).json({ message: "Pilih file absensi CSV atau Excel (.xls, .xlsx)." });
      return;
    }

    try {
      const rows = parseAcademicAttendanceFile(
        request.file.buffer,
        request.file.originalname,
      );
      const nims = [...new Set(rows.map((row) => row.nim))];
      const students = await database.mahasiswa.findMany({
        where: { nim: { in: nims } },
        select: { id: true, nim: true, pointScore: true, nama: true, email: true, jurusan: true },
      });
      const studentMap = new Map(students.map((student) => [student.nim, student]));
      const unknownNims = nims.filter((nim) => !studentMap.has(nim));
      if (unknownNims.length > 0) {
        const displayNims = unknownNims.slice(0, 20).join(", ");
        const remaining =
          unknownNims.length > 20
            ? ` dan ${unknownNims.length - 20} NIM lainnya`
            : "";
        response.status(400).json({
          message: `Mahasiswa dengan NIM berikut tidak ditemukan: ${displayNims}${remaining}. Tidak ada data yang diimpor.`,
        });
        return;
      }

      const { imported, deductionCount, totalPointsDeducted, deductedStudents } = await database.$transaction(async (transaction) => {
        let insertedCount = 0;
        for (let index = 0; index < rows.length; index += 5_000) {
          const chunk = rows.slice(index, index + 5_000);
          const inserted = await transaction.$queryRaw<
            Array<{ inserted_id: number }>
          >`
            INSERT INTO "PresensiAkademik"
              ("Mata_Kuliah", "Kelas", "NIM", "Nama_Mahasiswa", "Jumlah_Kehadiran")
            VALUES ${Prisma.join(
              chunk.map((row) => Prisma.sql`(
                ${row.mataKuliah},
                ${row.kelas},
                ${row.nim},
                ${row.namaMahasiswa},
                ${row.jumlahKehadiran}
              )`),
            )}
            ON CONFLICT ("Mata_Kuliah", "Kelas", "NIM") 
            DO UPDATE SET 
              "Jumlah_Kehadiran" = EXCLUDED."Jumlah_Kehadiran",
              "Nama_Mahasiswa" = EXCLUDED."Nama_Mahasiswa",
              "Timestamp" = NOW()
            RETURNING "ID" AS inserted_id
          `;
          insertedCount += inserted.length;
        }

        const rowsWithAlpa = rows.filter((row) => row.alpa > 0);
        let deductionCount = 0;
        let totalPointsDeducted = 0;
        const deductedStudents: Array<{
          nim: number;
          nama: string;
          email: string | null;
          prodi: string;
          mataKuliah: string;
          alpa: number;
          delta: number;
          scoreAfter: number;
          severity: ViolationSeverity;
          reason: string;
        }> = [];

        // Kunci baris mahasiswa terkait dan baca skor terbaru di dalam transaksi.
        const studentIds = students.map((student) => student.id);
        const lockedScores = studentIds.length === 0
          ? []
          : await transaction.$queryRaw<Array<{ id: number; poin: number }>>`
              SELECT "ID" AS id, "Poin" AS poin FROM "Mahasiswa"
              WHERE "ID" IN (${Prisma.join(studentIds)})
              FOR UPDATE`;
        const currentStudentScores = new Map(
          lockedScores.map((row) => [row.id, row.poin]),
        );

        // Ambil semua potongan absensi lama sekali jalan (bukan per baris).
        const existingDeductions = await transaction.pointChange.findMany({
          where: {
            studentId: { in: studentIds },
            type: "UNEXCUSED_ABSENCE",
          },
          select: { studentId: true, reason: true },
        });
        const existingReasonsByStudent = new Map<number, string[]>();
        for (const deduction of existingDeductions) {
          const reasons = existingReasonsByStudent.get(deduction.studentId) ?? [];
          reasons.push(deduction.reason);
          existingReasonsByStudent.set(deduction.studentId, reasons);
        }

        const pointChangeRows: Prisma.PointChangeCreateManyInput[] = [];
        const notificationRows: Prisma.PemberitahuanCreateManyInput[] = [];

        for (const row of rowsWithAlpa) {
          const student = studentMap.get(row.nim);
          if (!student) continue;

          const reasonIdentifier = `(${row.mataKuliah} - ${row.kelas})`;
          const studentReasons = existingReasonsByStudent.get(student.id) ?? [];
          if (studentReasons.some((reason) => reason.includes(reasonIdentifier))) {
            continue;
          }

          let delta: number;
          let severity: ViolationSeverity;
          let reasonText: string;
          if (row.alpa === 1) {
            delta = -10;
            severity = "SEDANG";
            reasonText = `Tidak hadir tanpa izin ${reasonIdentifier}: 1 Alpa`;
          } else if (row.alpa === 2) {
            delta = -15;
            severity = "BERAT";
            reasonText = `Alpa berulang ${reasonIdentifier}: 2 Alpa`;
          } else {
            const extra = Math.min(10, (row.alpa - 2) * 5);
            delta = -15 - extra;
            severity = "BERAT";
            reasonText = `Alpa berulang ${reasonIdentifier}: ${row.alpa} Alpa (dikenai sanksi tambahan)`;
          }

          const currentScore = currentStudentScores.get(student.id) ?? student.pointScore;
          const { score: newScore, delta: actualDelta } = calculatePointChangeForDelta(currentScore, delta);
          currentStudentScores.set(student.id, newScore);
          // Cegah potongan ganda bila baris yang sama muncul dua kali di file.
          studentReasons.push(reasonText);
          existingReasonsByStudent.set(student.id, studentReasons);

          pointChangeRows.push({
            studentId: student.id,
            type: "UNEXCUSED_ABSENCE",
            pillar: "WAKTU",
            severity,
            delta: actualDelta,
            scoreAfter: newScore,
            reason: reasonText,
            recordedByIdentity: "Sistem Akademik (Upload Presensi)",
          });
          notificationRows.push({
            studentId: student.id,
            judul: "Pengurangan Poin Disiplin Waktu (Ketidakhadiran)",
            isi: `Poin Anda berkurang ${Math.abs(actualDelta)} poin karena ketidakhadiran (${row.alpa} Alpa) pada mata kuliah ${row.mataKuliah} (${row.kelas}). Saldo poin Anda: ${newScore}.`,
            tautanTab: "dashboard",
            dibaca: false,
          });

          deductionCount++;
          totalPointsDeducted += Math.abs(actualDelta);
          deductedStudents.push({
            nim: student.nim,
            nama: student.nama,
            email: student.email,
            prodi: student.jurusan,
            mataKuliah: row.mataKuliah,
            alpa: row.alpa,
            delta: actualDelta,
            scoreAfter: newScore,
            severity,
            reason: reasonText,
          });
        }

        if (pointChangeRows.length > 0) {
          const changedScores = [
            ...new Set(pointChangeRows.map((change) => change.studentId)),
          ].map((id) => Prisma.sql`(${id}::int, ${currentStudentScores.get(id)!}::int)`);
          await transaction.$executeRaw`
            UPDATE "Mahasiswa" AS m SET "Poin" = v.poin
            FROM (VALUES ${Prisma.join(changedScores)}) AS v(id, poin)
            WHERE m."ID" = v.id`;
          await transaction.pointChange.createMany({ data: pointChangeRows });
          await transaction.pemberitahuan.createMany({ data: notificationRows });
        }

        return {
          imported: insertedCount,
          deductionCount,
          totalPointsDeducted,
          deductedStudents,
        };
      }, { timeout: 60_000, maxWait: 10_000 });

      // Kirim notifikasi email secara asynchronous (hanya kepada mahasiswa terkait)
      for (const item of deductedStudents) {
        if (item.email) {
          sendPointDeductionEmail({
            toEmail: item.email,
            studentName: item.nama,
            studentNim: item.nim,
            prodi: item.prodi,
            pillarName: "Disiplin Waktu",
            severityName: item.severity === "BERAT" ? "Berat" : "Sedang",
            delta: item.delta,
            scoreAfter: item.scoreAfter,
            reason: item.reason,
            category: "Ketidakhadiran (Absensi)",
          }).catch((err) => {
            console.error(`[Mailer] Error saat mengirim email ke ${item.email}:`, err);
          });
        }
      }

      let savedUploadRecord = null;
      try {
        const summaryText = deductionCount > 0
          ? `${imported} baris presensi disimpan. ${deductionCount} pengurangan poin otomatis diterapkan (${totalPointsDeducted} total poin dipotong).`
          : `${imported} baris absensi disimpan (${rows.length - imported} baris dilewati)`;

        savedUploadRecord = await saveAcademicUpload({
          category: "attendance",
          fileName: request.file.originalname,
          buffer: request.file.buffer,
          uploadedBy: currentSession(response).profile.name || currentSession(response).profile.identity,
          rowCount: imported,
          summary: summaryText,
        });
      } catch (err) {
        console.error("Gagal mencatat riwayat file absensi:", err);
      }

      response.json({
        imported,
        skipped: rows.length - imported,
        totalRows: rows.length,
        deductions: {
          totalDeductions: deductionCount,
          totalPointsDeducted,
          students: deductedStudents,
        },
        fileRecord: savedUploadRecord,
      });
    } catch (error) {
      if (error instanceof AcademicImportValidationError) {
        response.status(400).json({ message: error.message });
        return;
      }
      console.error("Gagal mengimpor absensi Akademik:", error);
      response.status(500).json({ message: "Data absensi gagal diimpor." });
    }
  },
);

academicRouter.post(
  "/academic/advisor-assignments/import",
  requireAcademicUploadSession,
  academicUploadFile,
  async (request, response) => {
    if (!request.file) {
      response.status(400).json({ message: "Pilih file pembagian CSV atau Excel (.xls, .xlsx)." });
      return;
    }

    try {
      const rows = parseAdvisorAssignmentFile(
        request.file.buffer,
        request.file.originalname,
      );
      function normalizeProgramStudi(programStudi: string): string {
        return programStudi
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      }

      function cleanLecturerName(name: string): string {
        return String(name || "")
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/\b(ir|dr|dra|drs|prof)\.?\b/gi, " ")
          .replace(/\b(s\.?t|m\.?t|s\.?tr|m\.?sc|m\.?si|csca|cplm|s\.?mn|m\.?m|m\.?eng|s\.?kom|m\.?kom|s\.?si|apt|s\.?st)\.?\b/gi, " ")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      }

      const nims = rows.map((row) => row.nim);
      const [students, allAdvisors, totalStudents] = await Promise.all([
        database.mahasiswa.findMany({
          where: { nim: { in: nims } },
          select: { id: true, nim: true, jurusan: true },
        }),
        database.dosen.findMany({
          select: { id: true, nama: true, nuptk: true },
        }),
        database.mahasiswa.count(),
      ]);

      const studentByNim = new Map(
        students.map((student) => [student.nim, student]),
      );

      const advisorByNuptk = new Map(
        allAdvisors
          .map((advisor) => [String(advisor.nuptk), advisor]),
      );

      const advisorByName = allAdvisors.map((advisor) => ({
        advisor,
        clean: cleanLecturerName(advisor.nama),
        rawLower: advisor.nama.toLowerCase().trim(),
      }));

      function resolveAdvisorForRow(row: typeof rows[number]) {
        if (row.nuptk && advisorByNuptk.has(row.nuptk)) {
          return advisorByNuptk.get(row.nuptk)!;
        }
        if (row.dpa) {
          const rawLower = row.dpa.toLowerCase().trim();
          const exact = advisorByName.find((a) => a.rawLower === rawLower);
          if (exact) return exact.advisor;

          const cleanDpa = cleanLecturerName(row.dpa);
          if (cleanDpa) {
            const match = advisorByName.find(
              (a) =>
                a.clean === cleanDpa ||
                (cleanDpa.length >= 4 && a.clean.includes(cleanDpa)) ||
                (a.clean.length >= 4 && cleanDpa.includes(a.clean)),
            );
            if (match) return match.advisor;
          }
        }
        return null;
      }

      const missingNims = nims.filter((nim) => !studentByNim.has(nim));
      const mismatchedPrograms = rows.filter((row) => {
        const student = studentByNim.get(row.nim);
        return (
          student !== undefined &&
          normalizeProgramStudi(student.jurusan) !==
            normalizeProgramStudi(row.programStudi)
        );
      });
      const unresolvableRows = rows.filter((row) => !resolveAdvisorForRow(row));

      if (
        missingNims.length > 0 ||
        mismatchedPrograms.length > 0 ||
        unresolvableRows.length > 0
      ) {
        const missingDpas = [
          ...new Set(unresolvableRows.map((r) => r.dpa || r.nuptk || String(r.nim))),
        ];
        const details = [
          missingNims.length > 0
            ? `NIM tidak ditemukan: ${missingNims.slice(0, 20).join(", ")}`
            : "",
          mismatchedPrograms.length > 0
            ? `Program Studi tidak sesuai untuk NIM: ${mismatchedPrograms
                .slice(0, 20)
                .map((row) => row.nim)
                .join(", ")}`
            : "",
          missingDpas.length > 0
            ? `Dosen PA tidak ditemukan: ${missingDpas.slice(0, 20).join(", ")}`
            : "",
        ].filter(Boolean);
        response.status(400).json({
          message: `${details.join(". ")}. Periksa NIM dan Program Studi; tidak ada pembagian yang diubah.`,
        });
        return;
      }

      const resolvedAssignments = rows.map((row) => {
        const student = studentByNim.get(row.nim);
        const advisor = resolveAdvisorForRow(row);
        if (!student || !advisor) {
          throw new Error("Data mahasiswa atau dosen berubah selama proses impor.");
        }
        return { studentId: student.id, dosenId: advisor.id };
      });

      const now = new Date();
      await database.$transaction(async (transaction) => {
        const assignmentsByAdvisor = new Map<number, number[]>();
        for (const assignment of resolvedAssignments) {
          const assignedStudentIds =
            assignmentsByAdvisor.get(assignment.dosenId) ?? [];
          assignedStudentIds.push(assignment.studentId);
          assignmentsByAdvisor.set(assignment.dosenId, assignedStudentIds);
        }

        const assignedStudentIds = resolvedAssignments.map(
          (assignment) => assignment.studentId,
        );
        const existingRequests = await transaction.advisorRequest.findMany({
          where: { studentId: { in: assignedStudentIds } },
          select: { studentId: true },
        });
        const existingRequestIds = new Set(
          existingRequests.map((request) => request.studentId),
        );

        for (const [advisorId, studentIds] of assignmentsByAdvisor) {
          await transaction.mahasiswa.updateMany({
            where: { id: { in: studentIds } },
            data: { dosenPaId: advisorId },
          });
          await transaction.advisorRequest.updateMany({
            where: { studentId: { in: studentIds } },
            data: { dosenId: advisorId, status: "APPROVED", reviewedAt: now },
          });
        }

        const newRequests = resolvedAssignments
          .filter(
            (assignment) => !existingRequestIds.has(assignment.studentId),
          )
          .map((assignment) => ({
            studentId: assignment.studentId,
            dosenId: assignment.dosenId,
            status: "APPROVED" as const,
            reviewedAt: now,
          }));
        if (newRequests.length > 0) {
          await transaction.advisorRequest.createMany({ data: newRequests });
        }
      });

      let savedUploadRecord = null;
      try {
        savedUploadRecord = await saveAcademicUpload({
          category: "advisors",
          fileName: request.file.originalname,
          buffer: request.file.buffer,
          uploadedBy: currentSession(response).profile.name || currentSession(response).profile.identity,
          rowCount: rows.length,
          summary: `${rows.length} mahasiswa dibagikan DPA`,
        });
      } catch (err) {
        console.error("Gagal mencatat riwayat file pembagian DPA:", err);
      }

      response.json({
        assigned: rows.length,
        totalUpdated: rows.length,
        totalStudents,
        fileRecord: savedUploadRecord,
      });
    } catch (error) {
      if (error instanceof AcademicImportValidationError) {
        response.status(400).json({ message: error.message });
        return;
      }
      console.error("Gagal mengimpor pembagian mahasiswa bimbingan:", error);
      response.status(500).json({
        message: "Pembagian mahasiswa bimbingan gagal disimpan.",
      });
    }
  },
);

academicRouter.get(
  "/academic/files",
  requireAcademicUploadSession,
  async (request, response) => {
    try {
      const category = request.query.category as
        | "attendance"
        | "advisors"
        | undefined;
      const files = await listAcademicUploads(category);
      response.json({ files });
    } catch (error) {
      console.error("Gagal memuat riwayat file akademik:", error);
      response.status(500).json({ message: "Gagal memuat riwayat file." });
    }
  },
);

academicRouter.get(
  "/academic/files/:id/preview",
  requireAcademicUploadSession,
  async (request, response) => {
    try {
      const preview = await getAcademicUploadPreview(String(request.params.id));
      if (!preview) {
        response.status(404).json({ message: "File upload tidak ditemukan." });
        return;
      }
      response.json(preview);
    } catch (error) {
      console.error("Gagal memuat preview file akademik:", error);
      response.status(500).json({ message: "Gagal memuat preview file." });
    }
  },
);

academicRouter.get(
  "/academic/files/:id/download",
  requireAcademicUploadSession,
  async (request, response) => {
    try {
      const fileInfo = await getAcademicUploadFilePath(String(request.params.id));
      if (!fileInfo) {
        response.status(404).json({ message: "File upload tidak ditemukan." });
        return;
      }
      response.download(fileInfo.absolutePath, fileInfo.record.fileName);
    } catch (error) {
      console.error("Gagal mengunduh file akademik:", error);
      response.status(500).json({ message: "Gagal mengunduh file." });
    }
  },
);
