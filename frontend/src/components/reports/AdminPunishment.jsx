"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Gavel, Search } from "lucide-react";
import { jsonRequest, safeHref, studentApi } from "@/lib/api";

const pillarLabels = {
  WAKTU: "Disiplin Waktu",
  AKADEMIK: "Disiplin Akademik",
  TATA_TERTIB: "Disiplin Tata Tertib dan Etika",
  PROSEDUR_K3: "Disiplin Prosedur dan Keselamatan (K3)",
  LINGKUNGAN: "Disiplin Lingkungan",
};

const severityLabels = {
  RINGAN: "Ringan",
  SEDANG: "Sedang",
  BERAT: "Berat",
  SANGAT_BERAT: "Sangat Berat",
};

export const punishmentTypeLabels = {
  TUGAS_EDUKATIF: "Tugas edukatif",
  REFLEKSI_TERTULIS: "Refleksi tertulis",
  KONSELING: "Coaching / konseling",
};

const punishmentStatus = {
  DIMINTA: { label: "Belum dikerjakan", badge: "bg-amber-100 text-amber-900" },
  DIKIRIM: { label: "Bukti sedang diperiksa Dosen PA", badge: "bg-blue-100 text-blue-900" },
  DITOLAK: { label: "Bukti perlu perbaikan", badge: "bg-orange-100 text-orange-900" },
  DISETUJUI: { label: "Selesai · poin dipulihkan", badge: "bg-emerald-100 text-emerald-900" },
};

// Alur: Perlu punishment → Berjalan → (Terlambat) → Selesai.
const tabs = [
  { id: "menunggu", label: "Perlu punishment" },
  { id: "berjalan", label: "Berjalan" },
  { id: "terlambat", label: "Terlambat" },
  { id: "selesai", label: "Selesai" },
];

const maxDurationDays = 60;

export function formatDeadline(value) {
  return value
    ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";
}

function addDays(dateOnly, days) {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromDateOnly, toDateOnly) {
  return Math.round(
    (Date.parse(`${toDateOnly.slice(0, 10)}T00:00:00Z`) - Date.parse(`${fromDateOnly.slice(0, 10)}T00:00:00Z`)) /
      (24 * 60 * 60 * 1000),
  );
}

// Punishment yang buktinya sedang diperiksa DPA tetap di tab asalnya
// (Berjalan/Terlambat) sampai disetujui.
function groupPunishments(punishments) {
  const unfinished = punishments.filter((item) => item.status !== "DISETUJUI");
  return {
    berjalan: unfinished.filter((item) => !item.terlambat),
    terlambat: unfinished.filter((item) => item.terlambat),
    selesai: punishments.filter((item) => item.status === "DISETUJUI"),
  };
}

function AssignPunishmentCard({ report, today, onChanged }) {
  const [taskType, setTaskType] = useState("TUGAS_EDUKATIF");
  const [instruction, setInstruction] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const duration = Number(durationDays);
  const isDurationValid = Number.isInteger(duration) && duration >= 1 && duration <= maxDurationDays;
  const deadline = isDurationValid && today ? addDays(today, duration) : "";

  async function submit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await studentApi(
        `/api/admin/laporan/${report.id}/tindak-lanjut`,
        jsonRequest("PATCH", { jenis: taskType, instruksi: instruction, batasWaktu: deadline }),
      );
      await onChanged();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Laporan #{report.id} · {pillarLabels[report.pillar] ?? report.pillar}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{report.terlapor?.nama}</h3>
          <p className="mt-1 text-sm text-slate-600">
            NIM {report.terlapor?.nim} · {report.terlapor?.jurusan} · Skor saat ini {report.terlapor?.pointScore}
          </p>
        </div>
        <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800">
          Poin berkurang {Math.abs(report.perubahanPoin?.delta ?? 0)}
        </span>
      </div>

      <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold text-slate-500">Pelanggaran</dt>
          <dd className="mt-1 text-slate-800">
            {report.aturan?.nama ?? "-"}
            {report.aturan?.severity && ` (${severityLabels[report.aturan.severity] ?? report.aturan.severity})`}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Dikonfirmasi Dosen PA</dt>
          <dd className="mt-1 text-slate-800">
            {report.dikonfirmasiDosen?.nama ?? "-"}
            {report.tanggalKonfirmasiDosen && ` · ${new Date(report.tanggalKonfirmasiDosen).toLocaleDateString("id-ID")}`}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Tanggal kejadian</dt>
          <dd className="mt-1 text-slate-800">{formatDeadline(report.tanggalKejadian)}</dd>
        </div>
        <div className="sm:col-span-3">
          <dt className="text-xs font-semibold text-slate-500">Deskripsi laporan</dt>
          <dd className="mt-1 whitespace-pre-wrap text-slate-800">{report.deskripsi}</dd>
        </div>
        {report.catatanUntukPelapor && (
          <div className="sm:col-span-3">
            <dt className="text-xs font-semibold text-slate-500">Catatan Dosen PA</dt>
            <dd className="mt-1 whitespace-pre-wrap text-slate-800">{report.catatanUntukPelapor}</dd>
          </div>
        )}
      </dl>

      <form onSubmit={submit} className="space-y-3 rounded-xl border border-red-200 bg-red-50/60 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Bentuk punishment
            <select
              value={taskType}
              onChange={(event) => setTaskType(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              {Object.entries(punishmentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Jangka waktu penyelesaian (hari)
            <input
              type="number"
              required
              min={1}
              max={maxDurationDays}
              value={durationDays}
              onChange={(event) => setDurationDays(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            />
            <span className="mt-1 block text-xs font-normal text-slate-600">
              {isDurationValid
                ? `Batas waktu: ${formatDeadline(deadline)}`
                : `Isi 1–${maxDurationDays} hari.`}
            </span>
          </label>
        </div>
        <label className="block text-sm font-semibold text-slate-700">
          Instruksi kepada mahasiswa
          <textarea
            required
            minLength={10}
            maxLength={2000}
            rows={3}
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Contoh: buat video edukasi tentang ... dan kirim tautan unggah sebagai bukti."
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <p className="text-xs text-red-900">
          Poin {Math.abs(report.perubahanPoin?.delta ?? 0)} dikembalikan setelah bukti disetujui Dosen PA. Lewat batas waktu tanpa tindak lanjut, poin berkurang 2 setiap hari.
        </p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={isSaving || instruction.trim().length < 10 || !isDurationValid}
          className="rounded-xl bg-red-800 px-4 py-2 text-sm font-bold text-white hover:bg-red-900 disabled:opacity-60"
        >
          {isSaving ? "Menyimpan..." : "Tetapkan punishment"}
        </button>
      </form>
    </article>
  );
}

function PunishmentCard({ punishment, today }) {
  const status = punishmentStatus[punishment.status];
  const daysLeft = punishment.batasWaktu && today ? daysBetween(today, punishment.batasWaktu) : null;
  let progress = null;
  if (punishment.status === "DISETUJUI") {
    progress = punishment.terlambat
      ? { text: `Selesai terlambat ${punishment.hariDenda} hari`, tone: "bg-amber-50 text-amber-900" }
      : { text: "Selesai tepat waktu", tone: "bg-emerald-50 text-emerald-900" };
  } else if (punishment.terlambat) {
    progress = {
      text: ["DIMINTA", "DITOLAK"].includes(punishment.status)
        ? `Lewat batas waktu. Poin berkurang 2 setiap hari sampai bukti dikirim (sudah ${punishment.hariDenda} hari).`
        : `Bukti dikirim setelah terlambat ${punishment.hariDenda} hari; denda dijeda selama pemeriksaan DPA.`,
      tone: "bg-red-50 text-red-800",
    };
  } else if (punishment.status === "DIKIRIM") {
    progress = { text: "Bukti dikirim tepat waktu, menunggu persetujuan Dosen PA.", tone: "bg-blue-50 text-blue-900" };
  } else if (daysLeft !== null) {
    progress = {
      text: daysLeft === 0 ? "Hari ini batas terakhir penyelesaian." : `Sisa ${daysLeft} hari sebelum batas waktu.`,
      tone: "bg-slate-50 text-slate-700",
    };
  }
  return (
    <article className={`space-y-3 rounded-2xl border bg-white p-5 shadow-sm ${punishment.terlambat ? "border-red-300" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Laporan #{punishment.perubahanPoin?.laporan?.id} · {punishmentTypeLabels[punishment.jenis] ?? punishment.jenis}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{punishment.student.nama}</h3>
          <p className="mt-1 text-sm text-slate-600">
            NIM {punishment.student.nim} · {punishment.student.jurusan} · Skor saat ini {punishment.student.pointScore}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {punishment.terlambat && (
            <span className="rounded-full bg-red-700 px-3 py-1.5 text-xs font-bold text-white">Terlambat</span>
          )}
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${status?.badge ?? "bg-slate-100 text-slate-700"}`}>
            {status?.label ?? punishment.status}
          </span>
        </div>
      </div>

      <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{punishment.instruksi}</p>
      {progress && <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${progress.tone}`}>{progress.text}</p>}

      <dl className="grid gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold text-slate-500">Batas waktu</dt>
          <dd className="mt-1 font-semibold text-slate-800">{formatDeadline(punishment.batasWaktu)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Poin pelanggaran</dt>
          <dd className="mt-1 text-slate-800">-{Math.abs(punishment.perubahanPoin?.delta ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Hari terlambat</dt>
          <dd className="mt-1 text-slate-800">{punishment.hariDenda} hari</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Total sanksi keterlambatan</dt>
          <dd className={`mt-1 font-semibold ${punishment.totalDenda > 0 ? "text-red-800" : "text-slate-800"}`}>
            -{punishment.totalDenda} poin
          </dd>
        </div>
      </dl>

      {punishment.buktiUrl && (
        <a href={safeHref(punishment.buktiUrl)} target="_blank" rel="noopener noreferrer" className="inline-block break-all text-sm font-semibold text-red-800 hover:underline">
          Lihat bukti penyelesaian
        </a>
      )}
      {punishment.isiRefleksi && <p className="whitespace-pre-wrap text-sm text-slate-700">{punishment.isiRefleksi}</p>}
      {punishment.catatanPemeriksa && <p className="text-sm text-slate-600">Catatan Dosen PA: {punishment.catatanPemeriksa}</p>}
    </article>
  );
}

export default function AdminPunishment() {
  const [pending, setPending] = useState([]);
  const [punishments, setPunishments] = useState([]);
  const [today, setToday] = useState("");
  const [activeTab, setActiveTab] = useState("menunggu");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleAssigned() {
    await loadPunishments();
    setActiveTab("berjalan");
    setNotice("Punishment ditetapkan dan dikirim kepada mahasiswa. Punishment kini tampil di bagian Berjalan.");
  }

  function changeTab(tabId) {
    setActiveTab(tabId);
    setNotice("");
  }

  function applyResult(result) {
    setPending(result.menunggu ?? []);
    setPunishments(result.punishment ?? []);
    setToday(result.hariIni ?? new Date().toISOString().slice(0, 10));
  }

  async function loadPunishments() {
    setIsLoading(true);
    setError("");
    try {
      applyResult(await studentApi("/api/admin/punishment"));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    studentApi("/api/admin/punishment")
      .then((result) => active && applyResult(result))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const groups = groupPunishments(punishments);
  const counts = { menunggu: pending.length, ...Object.fromEntries(Object.entries(groups).map(([key, list]) => [key, list.length])) };
  const visible = activeTab === "menunggu" ? pending : groups[activeTab];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-6 py-8">
      <header className="rounded-3xl bg-gradient-to-r from-[#450a0a] via-[#7f1d1d] to-[#991b1b] p-6 text-white shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Kemahasiswaan</p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Punishment Mahasiswa</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-red-100">
          Tentukan bentuk dan jangka waktu punishment untuk pelanggaran yang sudah dikonfirmasi Dosen PA. Punishment berjalan sampai bukti penyelesaian disetujui Dosen PA, lalu poin pelanggaran dikembalikan. Bila jangka waktu lewat tanpa penyelesaian, punishment masuk bagian Terlambat dan poin mahasiswa berkurang 2 setiap hari.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
            <Clock3 className="h-4 w-4" /> {counts.menunggu} perlu punishment
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
            <AlertTriangle className="h-4 w-4" /> {counts.terlambat} terlambat
          </span>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => changeTab(tab.id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              activeTab === tab.id
                ? "bg-red-800 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.label} ({counts[tab.id] ?? 0})
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      {isLoading ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Memuat data punishment...</p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/95 p-10 text-center">
          {activeTab === "menunggu" ? (
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-700" />
          ) : (
            <Gavel className="mx-auto h-8 w-8 text-slate-400" />
          )}
          <p className="mt-3 font-semibold text-slate-800">
            {activeTab === "menunggu"
              ? "Tidak ada pelanggaran terkonfirmasi yang menunggu punishment."
              : "Belum ada punishment pada kategori ini."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === "menunggu"
            ? visible.map((report) => (
                <AssignPunishmentCard key={report.id} report={report} today={today} onChanged={handleAssigned} />
              ))
            : visible.map((punishment) => <PunishmentCard key={punishment.id} punishment={punishment} today={today} />)}
        </div>
      )}
      <button
        type="button"
        onClick={loadPunishments}
        className="self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
      >
        <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Muat ulang</span>
      </button>
    </section>
  );
}
