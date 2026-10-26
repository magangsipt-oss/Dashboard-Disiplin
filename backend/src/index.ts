import cors from "cors";
import express from "express";
import { authDatabases, authRouter, loadSession } from "./auth";
import multer from "multer";
import { evidenceRouter, reportRouter } from "./discipline";
import { academicRouter } from "./routes/academic";

const app = express();
const port = Number(process.env.PORT ?? 5000);

// Frontend memanggil API lewat proxy Next.js di mesin yang sama, jadi
// hanya proxy loopback yang dipercaya untuk X-Forwarded-For.
app.set("trust proxy", process.env.TRUST_PROXY ?? "loopback");
app.disable("x-powered-by");

app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; frame-ancestors 'none'");
  next();
});

// CORS mati secara default (akses lewat proxy same-origin). Isi CORS_ORIGIN
// dengan daftar origin dipisah koma bila frontend dihosting terpisah.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(loadSession);
app.use("/api/auth", authRouter);
app.use("/api/auth", academicRouter);
app.use("/api", reportRouter);
// Folder uploads tidak lagi publik; bukti dilayani lewat route ber-otorisasi.
app.use("/uploads/evidence", evidenceRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "Ukuran foto bukti maksimal 2 MB."
          : "Bukti foto tidak valid.",
    });
    return;
  }
  if (error instanceof Error && error.message === "Bukti hanya boleh berupa foto JPEG atau PNG.") {
    response.status(400).json({ message: error.message });
    return;
  }
  console.error("Permintaan API gagal diproses:", error);
  response.status(500).json({ message: "Permintaan gagal diproses." });
});

app.get("/api/health", async (_request, response) => {
  try {
    await Promise.all(
      authDatabases.map(({ client }) => client.$queryRaw`SELECT 1`),
    );
    response.json({
      status: "ok",
      database: "connected",
      message: "Backend SiDisiplin API Server Ready",
    });
  } catch (error) {
    console.error("Database health check gagal:", error);
    response.status(503).json({
      status: "error",
      database: "disconnected",
      message: "Backend aktif, tetapi PostgreSQL belum terhubung",
    });
  }
});

app.listen(port, async () => {
  try {
    await Promise.all(authDatabases.map(({ client }) => client.$connect()));
    console.log("Prisma terhubung ke database dashboard_disiplin");
  } catch (error) {
    console.error("Gagal terhubung ke satu atau lebih database:", error);
  }
  console.log(`Server Express berjalan di http://localhost:${port}`);
});

const shutdown = async () => {
  await Promise.all(authDatabases.map(({ client }) => client.$disconnect()));
  process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
