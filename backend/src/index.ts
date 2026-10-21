import cors from "cors";
import express from "express";
import { authDatabases, authRouter } from "./auth";
import { resolve } from "node:path";
import multer from "multer";
import { reportRouter } from "./discipline";

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api", reportRouter);
app.use("/uploads", express.static(resolve(process.cwd(), "uploads")));

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
