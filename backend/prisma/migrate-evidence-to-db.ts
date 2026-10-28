import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { database } from "../src/db";

// Pindahkan foto bukti lama dari uploads/evidence ke tabel BuktiFoto.
// Aman dijalankan berulang kali dan dari komputer mana pun yang punya fotonya.
async function main() {
  const directory = resolve(__dirname, "..", "uploads", "evidence");
  const fileNames = (await readdir(directory).catch(() => [] as string[]))
    .filter((name) => /^[a-f0-9]{36}\.(jpg|png)$/.test(name));

  let moved = 0;
  let skipped = 0;
  for (const fileName of fileNames) {
    const [existing, report] = await Promise.all([
      database.buktiFoto.findUnique({ where: { fileName }, select: { fileName: true } }),
      database.laporan.findFirst({ where: { buktiPath: `/uploads/evidence/${fileName}` }, select: { id: true } }),
    ]);
    if (existing || !report) {
      skipped++;
      continue;
    }
    await database.buktiFoto.create({
      data: {
        fileName,
        mimeType: fileName.endsWith(".png") ? "image/png" : "image/jpeg",
        data: await readFile(resolve(directory, fileName)),
      },
    });
    moved++;
  }
  console.log(`Foto dipindah: ${moved}, dilewati (sudah ada / tanpa laporan): ${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => database.$disconnect());
