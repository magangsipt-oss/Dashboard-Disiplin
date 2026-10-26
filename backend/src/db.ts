import { resolve } from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: resolve(__dirname, "../.env") });

export const database = new PrismaClient();
