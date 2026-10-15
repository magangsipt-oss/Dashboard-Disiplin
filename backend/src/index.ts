import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT ?? 5000);

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
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
    await prisma.$connect();
    console.log("Prisma terhubung ke PostgreSQL");
  } catch (error) {
    console.error("Gagal terhubung ke PostgreSQL:", error);
  }
  console.log(`Server Express berjalan di http://localhost:${port}`);
});

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
