"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileText, Search, ShieldCheck } from "lucide-react";
import { jsonRequest, studentApi, safeHref } from "@/lib/api";

const statusLabels = {
  DITERIMA: "Menunggu peninjauan",
  DIVERIFIKASI: "Dikonfirmasi Dosen PA",
  DITINDAKLANJUTI: "Tindak lanjut berjalan",
  SELESAI: "Selesai",
  DITOLAK: "Tidak dikonfirmasi",
};

const pillarLabels = {
  WAKTU: "Disiplin Waktu",
  AKADEMIK: "Disiplin Akademik",
  TATA_TERTIB: "Disiplin Tata Tertib dan Etika",
  PROSEDUR_K3: "Disiplin Prosedur dan Keselamatan (K3)",
  LINGKUNGAN: "Disiplin Lingkungan",
};

function formatDate(value) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID");
}

function AdminReportCard({ report, onChanged }) {
  const [nim, setNim] = useState("");
  const [taskType, setTaskType] = useState("TUGAS_EDUKATIF");
  const [instruction, setInstruction] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const training = report.perubahanPoin?.pembinaans?.[0];
  const needsRouting =
    report.status === "DITERIMA" && report.jalur !== "TERIDENTIFIKASI";

  async function submitAction(event, path, body, successMessage) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      await studentApi(path, jsonRequest("PATCH", body));
      setNotice(successMessage);
      await onChanged();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function rejectReport() {
    if (!window.confirm("Tolak laporan ini? Keputusan ini akan dicatat pada riwayat laporan.")) {
      return;
    }
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      await studentApi(
        `/api/admin/laporan/${report.id}/verifikasi`,
        jsonRequest("PATCH", { keputusan: "DITOLAK" }),
      );
      setNotice("Laporan ditolak.");
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
            Laporan #{report.id} · {report.jenis === "TEMUAN" ? "Temuan" : "Apresiasi"}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {pillarLabels[report.pillar] ?? report.pillar}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Tanggal kejadian: {formatDate(report.tanggalKejadian)} · Dikirim: {formatDate(report.tanggalLapor)}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900">
          {statusLabels[report.status] ?? report.status}
        </span>
      </div>

      <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-slate-500">Terlapor</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {report.terlapor?.nama ?? report.terlaporNama ?? report.terlaporKeterangan ?? "Belum teridentifikasi"}
          </dd>
          {(report.terlapor?.nim ?? report.terlaporNim) && (
            <dd className="text-xs text-slate-600">NIM {report.terlapor?.nim ?? report.terlaporNim}</dd>
          )}
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Identifikasi</dt>
          <dd className="mt-1 text-slate-800">
            {report.jalur === "TERIDENTIFIKASI"
              ? "Cocok dengan data mahasiswa"
              : report.jalur === "TIDAK_TERDAFTAR"
                ? "Nama/NIM tidak cocok dengan data mahasiswa"
                : "Identitas terlapor belum diketahui"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold text-slate-500">Deskripsi kejadian</dt>
          <dd className="mt-1 whitespace-pre-wrap text-slate-800">{report.deskripsi}</dd>
          <p className="mt-1 text-xs text-slate-500">Lokasi: {report.lokasi}</p>
        </div>
      </dl>

      {report.buktiPath && (
        <a
          href={safeHref(report.buktiPath)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-red-800 hover:underline"
        >
          <FileText className="h-4 w-4" /> Lihat bukti laporan
        </a>
      )}

      {needsRouting && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">
            Laporan yang tidak cocok atau belum diketahui hanya masuk ke Kemahasiswaan. Jika berhasil ditelusuri, masukkan NIM untuk meneruskannya kepada mahasiswa dan Dosen PA; poin belum berubah.
          </p>
          <form
            onSubmit={(event) =>
              submitAction(
                event,
                `/api/admin/laporan/${report.id}/rute`,
                { nim },
                "Laporan diteruskan untuk konfirmasi Dosen PA.",
              )
            }
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input
              required
              inputMode="numeric"
              pattern="\d{1,10}"
              value={nim}
              onChange={(event) => setNim(event.target.value.replace(/\D/g, ""))}
              placeholder="NIM mahasiswa hasil penelusuran"
              className="min-w-0 flex-1 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-amber-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              Teruskan ke DPA
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={rejectReport}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-800 disabled:opacity-60"
            >
              Tolak laporan
            </button>
          </form>
        </div>
      )}

      {report.status === "DITERIMA" &&
        report.jalur === "TERIDENTIFIKASI" &&
        report.jenis === "TEMUAN" && (
          <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Menunggu konfirmasi Dosen PA
            {report.terlapor?.nama ? ` untuk ${report.terlapor.nama}` : ""}. Poin belum dikurangi.
          </p>
        )}

      {report.status === "DITERIMA" &&
        report.jenis === "APRESIASI" &&
        report.jalur === "TERIDENTIFIKASI" && (
          <button
            type="button"
            disabled={isSaving}
            onClick={async () => {
              setIsSaving(true);
              setError("");
              try {
                await studentApi(
                  `/api/admin/laporan/${report.id}/verifikasi`,
                  jsonRequest("PATCH", {
                    keputusan: "DIVERIFIKASI",
                    nim: String(report.terlapor?.nim ?? report.terlaporNim ?? ""),
                  }),
                );
                setNotice("Laporan apresiasi diverifikasi.");
                await onChanged();
              } catch (actionError) {
                setError(actionError.message);
              } finally {
                setIsSaving(false);
              }
            }}
            className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Verifikasi apresiasi
          </button>
        )}

      {report.jenis === "TEMUAN" && report.status === "DIVERIFIKASI" && (
        <form
          onSubmit={(event) =>
            submitAction(
              event,
              `/api/admin/laporan/${report.id}/tindak-lanjut`,
              { jenis: taskType, instruksi: instruction },
              "Tindak lanjut edukatif sudah ditetapkan dan dikirim kepada mahasiswa.",
            )
          }
          className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4"
        >
          <div>
            <h4 className="font-bold text-emerald-950">Tetapkan tindak lanjut edukatif</h4>
            <p className="mt-1 text-xs text-emerald-900">
              Poin sudah dikurangi setelah konfirmasi DPA. Mahasiswa harus mengirim bukti penyelesaian, lalu DPA menyetujuinya untuk memulihkan poin.
            </p>
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            Bentuk tindak lanjut
            <select
              value={taskType}
              onChange={(event) => setTaskType(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              <option value="TUGAS_EDUKATIF">Tugas edukatif</option>
              <option value="REFLEKSI_TERTULIS">Refleksi tertulis</option>
              <option value="KONSELING">Coaching / konseling</option>
            </select>
          </label>
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
          <button
            type="submit"
            disabled={isSaving || instruction.trim().length < 10}
            className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Tetapkan tindak lanjut
          </button>
        </form>
      )}

      {training && (
        <div className="rounded-xl border border-slate-200 p-4 text-sm">
          <p className="font-bold text-slate-900">Tindak lanjut: {training.instruksi}</p>
          <p className="mt-1 text-slate-600">Status bukti: {training.status}</p>
          {training.buktiUrl && (
            <a href={safeHref(training.buktiUrl)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-red-800 hover:underline">
              Lihat bukti penyelesaian
            </a>
          )}
          {training.isiRefleksi && <p className="mt-2 whitespace-pre-wrap text-slate-700">{training.isiRefleksi}</p>}
          {training.catatanPemeriksa && <p className="mt-2 text-slate-600">Catatan DPA: {training.catatanPemeriksa}</p>}
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
      {isSaving && <p className="text-xs text-slate-500">Menyimpan perubahan...</p>}
    </article>
  );
}

export default function AdminReportQueue() {
  const [reports, setReports] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");

  async function loadReports(showLoading = true) {
    if (showLoading) setIsLoading(true);
    setError("");
    try {
      const result = await studentApi("/api/admin/laporan");
      setReports(result.laporan ?? []);
      setPendingCount(result.pendingCount ?? 0);
      setNextCursor(result.nextCursor ?? null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }

  async function loadMoreReports() {
    if (!nextCursor) return;
    setIsLoadingMore(true);
    setError("");
    try {
      const result = await studentApi(`/api/admin/laporan?cursor=${nextCursor}`);
      setReports((current) => [...current, ...(result.laporan ?? [])]);
      setPendingCount(result.pendingCount ?? 0);
      setNextCursor(result.nextCursor ?? null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    let active = true;
    studentApi("/api/admin/laporan")
      .then((result) => {
        if (!active) return;
        setReports(result.laporan ?? []);
        setPendingCount(result.pendingCount ?? 0);
        setNextCursor(result.nextCursor ?? null);
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-6 py-8">
      <header className="rounded-3xl bg-gradient-to-r from-[#450a0a] via-[#7f1d1d] to-[#991b1b] p-6 text-white shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Kemahasiswaan</p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Antrean Laporan Anonim</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-red-100">
          Laporan teridentifikasi menunggu konfirmasi Dosen PA sebelum poin dikurangi. Laporan yang tidak cocok dengan data mahasiswa masuk ke sini untuk ditelusuri. Setelah konfirmasi DPA, tetapkan tindak lanjut edukatif.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold">
          <Clock3 className="h-4 w-4" /> {pendingCount} laporan menunggu tindakan
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {isLoading ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Memuat antrean laporan...</p>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/95 p-10 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-700" />
          <p className="mt-3 font-semibold text-slate-800">Belum ada laporan.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <AdminReportCard key={report.id} report={report} onChanged={() => loadReports(false)} />
          ))}
          {nextCursor && (
            <button
              type="button"
              onClick={loadMoreReports}
              disabled={isLoadingMore}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {isLoadingMore ? "Memuat..." : "Muat laporan lainnya"}
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => loadReports()}
        className="self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
      >
        <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Muat ulang antrean</span>
      </button>
      <p className="text-xs text-slate-500">
        <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
        Identitas pelapor tidak disimpan maupun ditampilkan.
      </p>
    </section>
  );
}
