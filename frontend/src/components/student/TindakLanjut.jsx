"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, FileText, MessageSquareText } from "lucide-react";
import { jsonRequest, studentApi } from "./api";

const pillarLabels = {
  WAKTU: "Disiplin Waktu",
  AKADEMIK: "Disiplin Akademik",
  TATA_TERTIB: "Disiplin Tata Tertib dan Etika",
  PROSEDUR_K3: "Disiplin Prosedur dan Keselamatan (K3)",
  LINGKUNGAN: "Disiplin Lingkungan",
};

const severityLabels = {
  RINGAN: { label: "Ringan", badge: "bg-amber-100 text-amber-800" },
  SEDANG: { label: "Sedang", badge: "bg-orange-100 text-orange-800" },
  BERAT: { label: "Berat", badge: "bg-red-100 text-red-800" },
  SANGAT_BERAT: { label: "Sangat Berat", badge: "bg-red-800 text-white" },
};

const statusLabels = {
  DIMINTA: "Diminta",
  DIKIRIM: "Dikirim",
  DISETUJUI: "Disetujui",
  DITOLAK: "Perlu perbaikan",
};

export default function TindakLanjut({ onAppeal }) {
  const [reports, setReports] = useState([]);
  const [training, setTraining] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [reflection, setReflection] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");

  async function loadFollowUps() {
    setIsLoading(true);
    setError("");
    try {
      const [reportData, trainingData] = await Promise.all([
        studentApi("/api/mahasiswa/tindak-lanjut"),
        studentApi("/api/mahasiswa/pembinaan"),
      ]);
      setReports(reportData.tindakLanjut ?? []);
      setTraining(trainingData.pembinaan ?? []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFollowUps();
  }, []);

  async function submitReflection(event) {
    event.preventDefault();
    if (!selectedTraining) return;
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitStatus("");
    try {
      await studentApi(
        `/api/pembinaan/${selectedTraining.id}/refleksi`,
        jsonRequest("POST", { isiRefleksi: reflection }),
      );
      setSubmitStatus("Refleksi berhasil dikirim untuk ditinjau.");
      setSelectedTraining(null);
      setReflection("");
      await loadFollowUps();
    } catch (submitFailure) {
      setSubmitError(submitFailure.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section data-scroll-reveal className="space-y-5">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
      {submitStatus && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{submitStatus}</p>}

      <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-800"><FileText className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Laporan terverifikasi terhadap saya</h2>
            <p className="mt-0.5 text-sm text-slate-500">Informasi tindak lanjut yang telah diverifikasi, tanpa identitas pelapor.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Memuat tindak lanjut...</p>
        ) : reports.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
            Tidak ada laporan terverifikasi. Pertahankan kedisiplinan Anda.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {reports.map((report) => {
              const severity = severityLabels[report.severity];
              return (
                <article key={report.id} className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 sm:p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">{pillarLabels[report.pillar] ?? report.pillar}</h3>
                        {severity && <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${severity.badge}`}>{severity.label}</span>}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{report.reason}</p>
                      <p className="mt-1 text-xs text-slate-500">Tanggal kejadian: {new Date(`${report.tanggalKejadian}T00:00:00`).toLocaleDateString("id-ID")}</p>
                      <p className="mt-2 text-sm font-semibold text-red-800">Poin berkurang: {report.pointsDeducted}</p>
                      {report.followUp && <p className="mt-2 text-xs text-slate-600">{report.followUp}</p>}
                      {report.sanggahan && <p className="mt-2 text-xs text-slate-600">Status sanggahan: {statusLabels[report.sanggahan.status] ?? report.sanggahan.status}{report.sanggahan.catatanPemeriksa ? ` · ${report.sanggahan.catatanPemeriksa}` : ""}</p>}
                      {report.pembinaan && <p className="mt-1 text-xs text-slate-600">Status pembinaan: {statusLabels[report.pembinaan.status] ?? report.pembinaan.status}</p>}
                    </div>
                    {report.perubahanPoinId && (
                      <button
                        type="button"
                        onClick={() => onAppeal(report.perubahanPoinId)}
                        className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-50"
                      >
                        <FileText className="h-4 w-4" /> Ajukan Sanggahan
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800"><ClipboardCheck className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pembinaan</h2>
            <p className="mt-0.5 text-sm text-slate-500">Tugas refleksi dan tindak lanjut pembinaan Anda.</p>
          </div>
        </div>
        {isLoading ? (
          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Memuat tugas pembinaan...</p>
        ) : training.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">Belum ada tugas pembinaan.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {training.map((task) => (
              <article key={task.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900">{task.jenis === "REFLEKSI_TERTULIS" ? "Refleksi tertulis" : "Konseling"}</h3>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{statusLabels[task.status] ?? task.status}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{task.instruksi}</p>
                {task.catatanPemeriksa && <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Catatan pemeriksa: {task.catatanPemeriksa}</p>}
                {task.isiRefleksi && <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">Refleksi terkirim: {task.isiRefleksi}</p>}
                {task.status === "DIMINTA" && task.jenis === "REFLEKSI_TERTULIS" && (
                  <button type="button" onClick={() => { setSelectedTraining(task); setSubmitError(""); }} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-800 px-4 py-2 text-xs font-bold text-white hover:bg-red-900">
                    <MessageSquareText className="h-4 w-4" /> Kirim Refleksi Tertulis
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedTraining && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form onSubmit={submitReflection} className="w-full max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Kirim Refleksi Tertulis</h2>
              <p className="mt-1 text-sm text-slate-600">Refleksi minimal 100 karakter.</p>
            </div>
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{selectedTraining.instruksi}</p>
            <textarea required minLength={100} maxLength={5000} rows={7} value={reflection} onChange={(event) => setReflection(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-800" placeholder="Tuliskan refleksi dan rencana perbaikan Anda..." />
            <p className="text-xs text-slate-500">{reflection.trim().length}/5000 karakter (minimal 100)</p>
            {submitError && <p className="text-sm text-red-700" role="alert">{submitError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSelectedTraining(null)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">Batal</button>
              <button type="submit" disabled={isSubmitting || reflection.trim().length < 100} className="rounded-xl bg-red-800 px-4 py-2 text-sm font-bold text-white hover:bg-red-900 disabled:opacity-60">{isSubmitting ? "Mengirim..." : "Kirim Refleksi"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
