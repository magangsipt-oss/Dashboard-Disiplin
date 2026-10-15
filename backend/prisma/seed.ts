import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  {
    identity: "20260001",
    name: "Andi Pratama",
    password: "dummy-password-andi",
    role: Role.MAHASISWA,
  },
  {
    identity: "20260002",
    name: "Siti Rahma",
    password: "dummy-password-siti",
    role: Role.MAHASISWA,
  },
  {
    identity: "D001",
    name: "Dr. Budi Santoso",
    password: "dummy-password-budi",
    role: Role.DOSEN,
  },
  {
    identity: "admin",
    name: "Administrator SiDisiplin",
    password: "dummy-password-admin",
    role: Role.ADMIN,
  },
];

async function main() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { identity: user.identity },
      update: user,
      create: user,
    });
  }

  console.log(`Seed selesai: ${users.length} user dummy tersedia.`);
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
