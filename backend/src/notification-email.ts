import { AsyncLocalStorage } from "node:async_hooks";
import { PeranPenerima, type PrismaClient } from "@prisma/client";
import { sendNotificationEmail } from "./mailer";

// Setiap baris Pemberitahuan / PemberitahuanStaf juga dikirim ke email
// penerima sesuai data di database. Email baru dikirim setelah transaksi
// commit, jadi notifikasi yang batal (rollback) tidak ikut terkirim.

type QueuedNotification =
  | { kind: "student"; studentId: number; judul: string; isi: string }
  | { kind: "staff"; peran: PeranPenerima; dosenId: number | null; judul: string; isi: string };

type TransactionStore = {
  queue: QueuedNotification[];
  skippedStudentIds: Set<number>;
};

const transactionStore = new AsyncLocalStorage<TransactionStore>();

// Dipakai bila mahasiswa sudah menerima email rinci (mis. pengurangan poin),
// agar email umum untuk notifikasi yang sama tidak terkirim dua kali.
export function skipNotificationEmailFor(studentId: number): void {
  transactionStore.getStore()?.skippedStudentIds.add(studentId);
}

type Row = Record<string, unknown>;

function toRows(data: unknown): Row[] {
  if (Array.isArray(data)) return data as Row[];
  return data && typeof data === "object" ? [data as Row] : [];
}

function connectedId(row: Row, relation: string): number | null {
  const connect = (row[relation] as { connect?: { id?: unknown } } | undefined)?.connect;
  return typeof connect?.id === "number" ? connect.id : null;
}

function studentNotification(row: Row): QueuedNotification | null {
  const studentId = typeof row.studentId === "number" ? row.studentId : connectedId(row, "student");
  if (studentId === null) return null;
  return { kind: "student", studentId, judul: String(row.judul), isi: String(row.isi) };
}

function staffNotification(row: Row): QueuedNotification | null {
  const peran = row.peran as PeranPenerima;
  if (!peran) return null;
  const dosenId = typeof row.dosenId === "number" ? row.dosenId : connectedId(row, "dosen");
  return { kind: "staff", peran, dosenId, judul: String(row.judul), isi: String(row.isi) };
}

function enqueue(client: PrismaClient, items: (QueuedNotification | null)[]): void {
  const notifications = items.filter((item): item is QueuedNotification => item !== null);
  if (notifications.length === 0) return;
  const store = transactionStore.getStore();
  if (store) {
    store.queue.push(...notifications);
    return;
  }
  void deliver(client, notifications, new Set());
}

type Recipient = { email: string; nama: string };

async function deliver(
  client: PrismaClient,
  notifications: QueuedNotification[],
  skippedStudentIds: Set<number>,
): Promise<void> {
  try {
    const studentIds = new Set<number>();
    const dosenIds = new Set<number>();
    let needsKemahasiswaan = false;
    for (const item of notifications) {
      if (item.kind === "student") {
        if (!skippedStudentIds.has(item.studentId)) studentIds.add(item.studentId);
      } else if (item.peran === PeranPenerima.DOSEN && item.dosenId !== null) {
        dosenIds.add(item.dosenId);
      } else if (item.peran === PeranPenerima.KEMAHASISWAAN) {
        needsKemahasiswaan = true;
      }
    }

    const emailFilter = { email: { not: null } };
    const [students, dosen, kemahasiswaan] = await Promise.all([
      studentIds.size
        ? client.mahasiswa.findMany({ where: { id: { in: [...studentIds] }, ...emailFilter }, select: { id: true, email: true, nama: true } })
        : [],
      dosenIds.size
        ? client.dosen.findMany({ where: { id: { in: [...dosenIds] }, ...emailFilter }, select: { id: true, email: true, nama: true } })
        : [],
      needsKemahasiswaan
        ? client.kemahasiswaan.findMany({ where: emailFilter, select: { email: true, nama: true } })
        : [],
    ]);
    const studentById = new Map(students.map((s) => [s.id, s as Recipient]));
    const dosenById = new Map(dosen.map((d) => [d.id, d as Recipient]));

    for (const item of notifications) {
      let recipients: Recipient[] = [];
      if (item.kind === "student") {
        if (skippedStudentIds.has(item.studentId)) continue;
        const student = studentById.get(item.studentId);
        if (!student) {
          console.warn(`[Mailer] Mahasiswa ID ${item.studentId} tidak memiliki email. Notifikasi "${item.judul}" hanya tersimpan di portal.`);
          continue;
        }
        recipients = [student];
      } else if (item.peran === PeranPenerima.DOSEN && item.dosenId !== null) {
        const lecturer = dosenById.get(item.dosenId);
        if (!lecturer) {
          console.warn(`[Mailer] Dosen ID ${item.dosenId} tidak memiliki email. Notifikasi "${item.judul}" hanya tersimpan di portal.`);
          continue;
        }
        recipients = [lecturer];
      } else if (item.peran === PeranPenerima.KEMAHASISWAAN) {
        recipients = kemahasiswaan as Recipient[];
      }

      // Kirim berurutan agar server SMTP tidak dibanjiri koneksi paralel.
      for (const recipient of recipients) {
        await sendNotificationEmail({
          toEmail: recipient.email,
          recipientName: recipient.nama,
          judul: item.judul,
          isi: item.isi,
        });
      }
    }
  } catch (error) {
    console.error("[Mailer] Gagal memproses email notifikasi:", error);
  }
}

export function withNotificationEmails(base: PrismaClient): PrismaClient {
  const extended = base.$extends({
    query: {
      pemberitahuan: {
        async create({ args, query }) {
          const result = await query(args);
          enqueue(base, [studentNotification(args.data as Row)]);
          return result;
        },
        async createMany({ args, query }) {
          const result = await query(args);
          enqueue(base, toRows(args.data).map(studentNotification));
          return result;
        },
      },
      pemberitahuanStaf: {
        async create({ args, query }) {
          const result = await query(args);
          enqueue(base, [staffNotification(args.data as Row)]);
          return result;
        },
        async createMany({ args, query }) {
          const result = await query(args);
          enqueue(base, toRows(args.data).map(staffNotification));
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;

  // Bungkus $transaction interaktif: kumpulkan notifikasi selama transaksi,
  // lalu kirim email hanya setelah commit berhasil.
  return new Proxy(extended, {
    get(target, property, receiver) {
      if (property !== "$transaction") return Reflect.get(target, property, receiver);
      return (arg: unknown, options?: unknown) => {
        const run = target.$transaction.bind(target) as (arg: unknown, options?: unknown) => Promise<unknown>;
        if (typeof arg !== "function" || transactionStore.getStore()) return run(arg, options);
        const store: TransactionStore = { queue: [], skippedStudentIds: new Set() };
        return transactionStore.run(store, async () => {
          const result = await run(arg, options);
          if (store.queue.length > 0) void deliver(base, store.queue, store.skippedStudentIds);
          return result;
        });
      };
    },
  });
}
