import { Router } from "express";
import { currentSession, database, requireRole, type Role } from "../auth";
import { decryptPassword, isPasswordVaultEnabled } from "../password-vault";

// Menu Data Password: hanya Kemahasiswaan, hanya melihat (tanpa ubah/hapus).
// Daftar tidak memuat password; password dibuka per akun dan dicatat di LogAudit.
export const passwordDataRouter = Router();
passwordDataRouter.use(
  "/admin/data-password",
  requireRole(["admin"], "Data password hanya dapat dilihat oleh Kemahasiswaan."),
);

const PAGE_SIZE = 50;
const roles: Role[] = ["mhs", "dosen", "admin", "akademik"];

type AccountRow = {
  id: number;
  nama: string;
  identitas: string;
  keterangan: string;
  tersedia: boolean;
};

function parseRole(value: unknown): Role | null {
  return typeof value === "string" && roles.includes(value as Role) ? (value as Role) : null;
}

function searchTerm(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

const contains = (term: string) => ({ contains: term, mode: "insensitive" as const });
const digitsOnly = (term: string) => /^\d+$/.test(term);

async function listAccounts(role: Role, term: string, skip: number) {
  if (role === "mhs") {
    const where = term
      ? {
          OR: [
            { nama: contains(term) },
            ...(digitsOnly(term) && term.length <= 9 ? [{ nim: Number(term) }] : []),
          ],
        }
      : {};
    const [total, rows] = await Promise.all([
      database.mahasiswa.count({ where }),
      database.mahasiswa.findMany({
        where,
        orderBy: { nim: "asc" },
        skip,
        take: PAGE_SIZE,
        select: { id: true, nim: true, nama: true, jurusan: true, angkatan: true, passwordTerenkripsi: true },
      }),
    ]);
    return {
      total,
      rows: rows.map<AccountRow>((row) => ({
        id: row.id,
        nama: row.nama,
        identitas: `NIM ${row.nim}`,
        keterangan: [row.jurusan, row.angkatan].filter(Boolean).join(" · "),
        tersedia: row.passwordTerenkripsi !== null,
      })),
    };
  }
  if (role === "dosen") {
    const where = term
      ? {
          OR: [
            { nama: contains(term) },
            { email: contains(term) },
            ...(digitsOnly(term) && term.length <= 18 ? [{ nuptk: BigInt(term) }] : []),
          ],
        }
      : {};
    const [total, rows] = await Promise.all([
      database.dosen.count({ where }),
      database.dosen.findMany({
        where,
        orderBy: { nama: "asc" },
        skip,
        take: PAGE_SIZE,
        select: { id: true, nama: true, nuptk: true, email: true, passwordTerenkripsi: true },
      }),
    ]);
    return {
      total,
      rows: rows.map<AccountRow>((row) => ({
        id: row.id,
        nama: row.nama,
        identitas: row.nuptk !== null ? `NUPTK ${row.nuptk}` : (row.email ?? "-"),
        keterangan: row.nuptk !== null && row.email ? row.email : "",
        tersedia: row.passwordTerenkripsi !== null,
      })),
    };
  }
  const where = term ? { OR: [{ nama: contains(term) }, { email: contains(term) }] } : {};
  const select = { id: true, nama: true, email: true, passwordTerenkripsi: true } as const;
  const [total, rows] =
    role === "admin"
      ? await Promise.all([
          database.kemahasiswaan.count({ where }),
          database.kemahasiswaan.findMany({ where, orderBy: { nama: "asc" }, skip, take: PAGE_SIZE, select }),
        ])
      : await Promise.all([
          database.akademik.count({ where }),
          database.akademik.findMany({ where, orderBy: { nama: "asc" }, skip, take: PAGE_SIZE, select }),
        ]);
  return {
    total,
    rows: rows.map<AccountRow>((row) => ({
      id: row.id,
      nama: row.nama,
      identitas: row.email ?? "-",
      keterangan: "",
      tersedia: row.passwordTerenkripsi !== null,
    })),
  };
}

async function findEncryptedPassword(role: Role, id: number) {
  const select = { nama: true, passwordTerenkripsi: true } as const;
  switch (role) {
    case "mhs":
      return database.mahasiswa.findUnique({ where: { id }, select });
    case "dosen":
      return database.dosen.findUnique({ where: { id }, select });
    case "admin":
      return database.kemahasiswaan.findUnique({ where: { id }, select });
    case "akademik":
      return database.akademik.findUnique({ where: { id }, select });
  }
}

passwordDataRouter.get("/admin/data-password", async (request, response) => {
  const role = parseRole(request.query.peran);
  if (!role) {
    response.status(400).json({ message: "Peran harus mhs, dosen, admin, atau akademik." });
    return;
  }
  const page = Math.max(1, Math.floor(Number(request.query.halaman)) || 1);
  try {
    const { total, rows } = await listAccounts(role, searchTerm(request.query.cari), (page - 1) * PAGE_SIZE);
    response.json({
      akun: rows,
      total,
      halaman: page,
      jumlahHalaman: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      kunciAktif: isPasswordVaultEnabled(),
    });
  } catch (error) {
    console.error("Gagal memuat data password:", error);
    response.status(500).json({ message: "Data akun gagal dimuat." });
  }
});

// Buka password satu akun. Setiap pembukaan dicatat di LogAudit.
passwordDataRouter.get("/admin/data-password/:peran/:id", async (request, response) => {
  const role = parseRole(request.params.peran);
  const id = Number(request.params.id);
  if (!role || !Number.isInteger(id) || id <= 0) {
    response.status(400).json({ message: "Akun tidak valid." });
    return;
  }
  const session = currentSession(response);
  try {
    const account = await findEncryptedPassword(role, id);
    if (!account) {
      response.status(404).json({ message: "Akun tidak ditemukan." });
      return;
    }
    const password = decryptPassword(account.passwordTerenkripsi);
    if (password === null) {
      response.status(404).json({
        message: "Password akun ini belum tersedia. Password tersedia setelah pengguna mengubah kata sandi atau akun diimpor ulang.",
      });
      return;
    }
    await database.logAudit.create({
      data: {
        aktorId: session.profile.id,
        aktorPeran: session.profile.role,
        aksi: "PASSWORD_DILIHAT",
        entitas: `Akun:${role}`,
        entitasId: id,
      },
    });
    response.setHeader("Cache-Control", "no-store");
    response.json({ password });
  } catch (error) {
    console.error("Gagal membuka password:", error);
    response.status(500).json({ message: "Password gagal dimuat." });
  }
});
