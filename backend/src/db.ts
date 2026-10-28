import { resolve } from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { withNotificationEmails } from "./notification-email";

dotenv.config({ path: resolve(__dirname, "../.env") });

export const database = withNotificationEmails(new PrismaClient());
