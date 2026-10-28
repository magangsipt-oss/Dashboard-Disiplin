"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, FileText, MapPin, Search, ShieldCheck } from "lucide-react";
import { findStoredReportByCode, normalizeTrackingCode } from "@/lib/reportTracking";

const statusStyles = {
  Diterima: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Diproses: "bg-amber-100 text-amber-800 border-amber-200",
  Diverifikasi: "bg-blue-100 text-blue-800 border-blue-200",
  Ditolak: "bg-red-100 text-red-800 border-red-200",
};

export default function CekLaporan() {
  const [trackingCode, setTrackingCode] = useState("");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const normalizedCode = normalizeTrackingCode(trackingCode);

    if (!normalizedCode) {
      setError("Masukkan kode pelacakan terlebih dahulu.");
      setReport(null);
      return;
    }

    const foundReport = findStoredReportByCode(normalizedCode);
    if (!foundReport) {
      setError("Kode pelacakan tidak ditemukan. Pastikan kode yang dimasukkan benar.");
      setReport(null);
      return;
    }

    setReport(foundReport);
    setError("");
  }

  return (
    <section className="w-full space-y-5">
      <article className="rounded-2xl border border-amber-200 bg-amber-50/95 p-5 shadow-lg sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-amber-950">Cek Laporan</h2>
            <p className="mt-1 text-sm leading-relaxed text-amber-900">
              Masukkan kode pelacakan yang diterima saat laporan berhasil dikirim. Sistem akan menampilkan status laporan Anda.
            </p>
          </div>
        </div>
      </article>

      <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Kode pelacakan
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                value={trackingCode}
                onChange={(event) => setTrackingCode(event.target.value)}
                placeholder="Contoh: SATGAS-ABC123"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-mono tracking-wider text-slate-900 outline-none transition focus:border-red-800 focus:ring-2 focus:ring-red-100"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-900"
              >
                <Search className="h-4 w-4" />
                Cek laporan
              </button>
            </div>
          </label>
        </form>

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {report && (
          <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Laporan ditemukan</p>
                  <p className="text-lg font-bold text-slate-900">{report.kodePelacakan}</p>
                </div>
              </div>

              <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] ${statusStyles[report.status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                {report.status}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FileText className="h-4 w-4" />
                  Detail laporan
                </div>
                <dl className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between gap-3"><dt>Jenis</dt><dd className="font-semibold text-slate-900">{report.jenis || "-"}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Pilar</dt><dd className="font-semibold text-slate-900">{report.pillar || "-"}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Lokasi</dt><dd className="font-semibold text-slate-900 text-right">{report.lokasi || "-"}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Waktu</dt><dd className="font-semibold text-slate-900 text-right">{report.createdAt ? new Date(report.createdAt).toLocaleString("id-ID") : "-"}</dd></div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MapPin className="h-4 w-4" />
                  Informasi terlapor
                </div>
                <dl className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between gap-3"><dt>Nama</dt><dd className="font-semibold text-slate-900">{report.terlaporNama || "-"}</dd></div>
                  <div className="flex justify-between gap-3"><dt>NIM</dt><dd className="font-semibold text-slate-900">{report.terlaporNim || "-"}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Keterangan</dt><dd className="font-semibold text-slate-900 text-right">{report.terlaporKeterangan || "-"}</dd></div>
                </dl>
              </div>
            </div>

            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Laporan Anda telah diterima dan akan diproses sesuai alur verifikasi. Simpan kode pelacakan ini untuk keperluan pengecekan atau pengajuan lanjutan.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
