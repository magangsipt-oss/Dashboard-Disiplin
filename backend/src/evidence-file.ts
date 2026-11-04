import { randomBytes } from "node:crypto";
import type { RequestHandler, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { database } from "./db";

// File bukti (sertifikat/dokumentasi) mahasiswa: JPEG, PNG, atau PDF maks. 5 MB,
// disimpan di tabel BuktiFoto.
const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    callback(null, ["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype));
  },
});

// Membaca satu file di field `fieldName`; error multer dijawab 400.
export function receiveEvidenceFile(fieldName: string): RequestHandler {
  return (request, response, next) => {
    evidenceUpload.single(fieldName)(request, response, (error: unknown) => {
      if (error) {
        response.status(400).json({
          message:
            error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
              ? "Ukuran file bukti maksimal 5 MB."
              : "File bukti tidak valid.",
        });
        return;
      }
      next();
    });
  };
}

export type PreparedEvidenceFile = { fileName: string; mimeType: string; data: Buffer };

const MAX_PHOTO_SIDE = 1600;

// Foto ditulis ulang lewat sharp: membuang metadata dan diperkecil (sisi
// terpanjang maks. 1600 px) agar cepat dikirim ke database.
export function normalizePhoto(buffer: Buffer, isJpeg: boolean): Promise<Buffer> {
  const image = sharp(buffer)
    .rotate()
    .resize({ width: MAX_PHOTO_SIDE, height: MAX_PHOTO_SIDE, fit: "inside", withoutEnlargement: true });
  return (isJpeg ? image.jpeg({ quality: 80, mozjpeg: true }) : image.png({ compressionLevel: 9 })).toBuffer();
}

// PDF dicek header-nya. null = PDF tidak valid.
export async function prepareEvidenceFile(file: Express.Multer.File): Promise<PreparedEvidenceFile | null> {
  const { mimetype, buffer } = file;
  let data: Buffer;
  let extension: string;
  if (mimetype === "application/pdf") {
    if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") return null;
    data = buffer;
    extension = "pdf";
  } else {
    const isJpeg = mimetype === "image/jpeg";
    data = await normalizePhoto(buffer, isJpeg);
    extension = isJpeg ? "jpg" : "png";
  }
  return { fileName: `${randomBytes(18).toString("hex")}.${extension}`, mimeType: mimetype, data };
}

// File disimpan di luar transaksi: mengirim beberapa MB ke database bisa
// melewati batas waktu transaksi Prisma (5 detik) sehingga laporan gagal.
// Pemanggil wajib memanggil discardEvidenceFile bila transaksi gagal/batal.
export async function storeEvidenceFile(file: PreparedEvidenceFile): Promise<void> {
  await database.buktiFoto.create({ data: file });
}

export async function discardEvidenceFile(fileName: string | null | undefined): Promise<void> {
  if (!fileName) return;
  try {
    await database.buktiFoto.deleteMany({ where: { fileName } });
  } catch (error) {
    console.error("Gagal menghapus file bukti yang tidak terpakai:", error);
  }
}

export function sendEvidenceFile(
  response: Response,
  file: { mimeType: string; data: Uint8Array },
  storedFileName: string,
  downloadName: string,
) {
  response.setHeader("Cache-Control", "private, no-store");
  // Viewer PDF bawaan browser butuh object-src; skrip tetap diblokir.
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; img-src 'self'; object-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'",
  );
  response.setHeader("Content-Disposition", `inline; filename="${downloadName}.${storedFileName.split(".").pop()}"`);
  response.type(file.mimeType).send(Buffer.from(file.data));
}
