"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  FileText,
  MapPin,
  MessageSquareText,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { studentApi } from "@/lib/api";

const pillarLabels = {
  WAKTU: "Disiplin Waktu",
  AKADEMIK: "Disiplin Akademik",
  TATA_TERTIB: "Disiplin Tata Tertib dan Etika",
  PROSEDUR_K3: "Disiplin Prosedur dan Keselamatan (K3)",
  LINGKUNGAN: "Disiplin Lingkungan",
};

const statusInfo = {
  DITERIMA: { label: "Diterima", style: "bg-slate-100 text-slate-700 border-slate-200" },
  DIVERIFIKASI: { label: "Diverifikasi", style: "bg-blue-100 text-blue-800 border-blue-200" },
  DITINDAKLANJUTI: { label: "Ditindaklanjuti", style: "bg-amber-100 text-amber-800 border-amber-200" },
  SELESAI: { label: "Selesai", style: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  DITOLAK: { label: "Ditolak", style: "bg-red-100 text-red-800 border-red-200" },
};

const statusSteps = ["DITERIMA", "DIVERIFIKASI", "DITINDAKLANJUTI", "SELESAI"];

function formatDate(value) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ReportCard({ report }) {
  const status = statusInfo[report.status] ?? { label: report.status, style: "bg-slate-100 text-slate-700 border-slate-200" };
  const currentStep = statusSteps.indexOf(report.status);
  const terlapor = [report.terlaporNama, report.terlaporNim].filter(Boolean).join(" • ")
    || report.terlaporKeterangan
    || "Identitas tidak diketahui";

  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-800">
            {pillarLabels[report.pillar] ?? report.pillar}
          </p>
          <p className="mt-1 text-sm text-slate-500">Dilaporkan {formatDate(report.tanggalLapor)}</p>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${status.style}`}>
          {status.label}
        </span>
      </div>

      {report.status !== "DITOLAK" && (
        <ol className="grid grid-cols-4 gap-2">
          {statusSteps.map((step, index) => {
            const done = index <= currentStep;
            return (
              <li key={step} className="space-y-1.5">
                <div className={`h-1.5 rounded-full ${done ? "bg-red-800" : "bg-slate-200"}`} />
                <p className={`text-[11px] font-semibold ${done ? "text-red-800" : "text-slate-400"}`}>
                  {statusInfo[step].label}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-sm leading-relaxed text-slate-700">{report.deskripsi}</p>

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="flex items-start gap-2">
          <UserRound className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-500">Terlapor</dt>
            <dd className="font-semibold text-slate-900">{terlapor}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-500">Lokasi</dt>
            <dd className="font-semibold text-slate-900">{report.lokasi}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-500">Tanggal kejadian</dt>
            <dd className="font-semibold text-slate-900">{formatDate(report.tanggalKejadian)}</dd>
          </div>
        </div>
      </dl>

      {report.catatanUntukPelapor && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <MessageSquareText className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p><span className="font-semibold">Catatan petugas:</span> {report.catatanUntukPelapor}</p>
        </div>
      )}
    </article>
  );
}

export default function CekLaporan() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await studentApi("/api/laporan/saya");
      setReports(data.laporan ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return (
    <section className="w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-lg">
        <div>
          <h2 className="font-bold text-slate-900">Laporan Saya</h2>
          <p className="text-sm text-slate-500">
            {isLoading ? "Memuat laporan..." : `${reports.length} laporan telah Anda kirim.`}
          </p>
        </div>
        <button
          type="button"
          onClick={loadReports}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Muat ulang
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && reports.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-800">
            <FileText className="h-6 w-6" />
          </div>
          <p className="mt-3 font-semibold text-slate-800">Belum ada laporan</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">Laporan yang Anda kirim melalui menu Lapor Satgas akan tampil di sini.</p>
        </div>
      )}

      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </section>
  );
}
