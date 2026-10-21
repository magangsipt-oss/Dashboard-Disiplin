import { PrismaClient } from "@prisma/client";
import { getPointChangeMetadata } from "../src/points";

const database = new PrismaClient();

async function backfillPillarAndSeverity() {
  const changes = await database.pointChange.findMany({
    where: {
      type: { in: ["LATE", "UNEXCUSED_ABSENCE", "DISCIPLINE_VIOLATION"] },
      OR: [{ pillar: null }, { severity: null }],
    },
    select: { id: true, type: true, pillar: true, severity: true },
  });

  let updatedCount = 0;
  for (const change of changes) {
    const metadata = getPointChangeMetadata(change.type);
    const data = {
      ...(change.pillar === null && metadata.pillar
        ? { pillar: metadata.pillar }
        : {}),
      ...(change.severity === null && metadata.severity
        ? { severity: metadata.severity }
        : {}),
    };
    if (Object.keys(data).length > 0) {
      const result = await database.pointChange.updateMany({
        where: {
          id: change.id,
          pillar: change.pillar,
          severity: change.severity,
        },
        data,
      });
      updatedCount += result.count;
    }
  }

  console.info(`Backfill metadata pilar/tingkat selesai: ${updatedCount} perubahan diperbarui.`);
}

backfillPillarAndSeverity()
  .catch((error: unknown) => {
    console.error("Backfill metadata pilar/tingkat gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.$disconnect();
  });
