"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Clock3, FileText, Search, ShieldCheck } from "lucide-react";
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

const queueCategories = [
  { id: "PERLU_TINDAKAN", label: "Perlu identifikasi" },
  { id: "MENUNGGU_DPA", label: "Menunggu konfirmasi DPA" },
  { id: "SELESAI", label: "Selesai" },
  { id: "DITOLAK", label: "Ditolak" },
];

const emptyCategoryMessages = {
  PERLU_TINDAKAN: "Tidak ada laporan yang menunggu identifikasi.",
  MENUNGGU_DPA: "Tidak ada laporan yang menunggu konfirmasi Dosen PA.",
  SELESAI: "Belum ada laporan yang selesai dikonfirmasi Dosen PA.",
  DITOLAK: "Belum ada laporan yang ditolak.",
};

function formatDate(value) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID");
}

function compareSubmittedReports(left, right) {
  const leftDate = Date.parse(left.tanggalLapor);
  const rightDate = Date.parse(right.tanggalLapor);
  const leftOrder = Number.isNaN(leftDate) ? Number.MAX_SAFE_INTEGER : leftDate;
  const rightOrder = Number.isNaN(rightDate) ? Number.MAX_SAFE_INTEGER : rightDate;
  return leftOrder - rightOrder || Number(left.id) - Number(right.id);
}

function AdminReportCard({ report, reportNumber, onChanged }) {
  const [terlaporNama, setTerlaporNama] = useState("");
  const [nim, setNim] = useState("");
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
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">
            Laporan {reportNumber}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-600">
            {pillarLabels[report.pillar] ?? report.pillar} · {formatDate(report.tanggalLapor)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-900">
          {statusLabels[report.status] ?? report.status}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>
      <article className="space-y-4 border-t border-slate-100 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Laporan #{report.id} · Pelanggaran
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
              ? report.ditelusuriPada
                ? "Identitas dilengkapi Kemahasiswaan"
                : "Identitas dicantumkan pelapor dan cocok dengan data mahasiswa"
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
            Tinjau deskripsi dan foto bukti, lalu lengkapi nama lengkap serta NIM terlapor. Laporan hanya diteruskan setelah kedua data cocok dengan data mahasiswa.
          </p>
          <form
            onSubmit={(event) =>
              submitAction(
                event,
                `/api/admin/laporan/${report.id}/rute`,
                { nama: terlaporNama, nim },
                "Nama dan NIM cocok. Laporan diteruskan ke Dosen PA untuk konfirmasi.",
              )
            }
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <input
              required
              maxLength={200}
              value={terlaporNama}
              onChange={(event) => setTerlaporNama(event.target.value)}
              placeholder="Nama lengkap hasil penelusuran"
              className="min-w-0 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm"
            />
            <input
              required
              inputMode="numeric"
              pattern="\d{4,15}"
              maxLength={15}
              value={nim}
              onChange={(event) => setNim(event.target.value.replace(/\D/g, ""))}
              placeholder="NIM hasil penelusuran"
              className="min-w-0 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-amber-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60 sm:col-span-2 lg:col-span-1"
            >
              Cocokkan & teruskan
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
        report.jalur === "TERIDENTIFIKASI" && (
          report.terlapor?.dosenPa ? (
            <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Menunggu konfirmasi Dosen PA ({report.terlapor.dosenPa.nama})
              {report.terlapor?.nama ? ` untuk ${report.terlapor.nama}` : ""}. Poin belum dikurangi.
            </p>
          ) : (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              {report.terlapor?.nama ?? "Mahasiswa ini"} belum memiliki Dosen PA, sehingga laporan belum dapat dikonfirmasi. Minta Akademik menetapkan Dosen PA melalui menu Pembagian Mahasiswa Bimbingan.
            </p>
          )
        )}

      {report.status === "DIVERIFIKASI" && !training && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Dikonfirmasi Dosen PA{report.dikonfirmasiDosen?.nama ? ` (${report.dikonfirmasiDosen.nama})` : ""}; poin sudah dikurangi {Math.abs(report.perubahanPoin?.delta ?? 0)}. Tetapkan punishment untuk mahasiswa ini di menu Punishment.
        </p>
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
    </details>
  );
}

export default function AdminReportQueue() {
  const [reports, setReports] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [category, setCategory] = useState("PERLU_TINDAKAN");
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");

  function applyResult(result) {
    setReports(result.laporan ?? []);
    setCategoryCounts(result.kategoriCount ?? {});
    setNextCursor(result.nextCursor ?? null);
  }

  async function loadReports(showLoading = true, nextCategory = category) {
    if (showLoading) setIsLoading(true);
    setError("");
    try {
      applyResult(await studentApi(`/api/admin/laporan?kategori=${nextCategory}`));
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
      const result = await studentApi(`/api/admin/laporan?kategori=${category}&cursor=${nextCursor}`);
      setReports((current) => [...current, ...(result.laporan ?? [])]);
      setCategoryCounts(result.kategoriCount ?? {});
      setNextCursor(result.nextCursor ?? null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    let active = true;
    studentApi("/api/admin/laporan?kategori=PERLU_TINDAKAN")
      .then((result) => active && applyResult(result))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const orderedReports = [...reports].sort(compareSubmittedReports);

  function changeCategory(nextCategory) {
    setCategory(nextCategory);
    setReports([]);
    setNextCursor(null);
    loadReports(true, nextCategory);
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-6 py-8">
      <header className="rounded-3xl bg-gradient-to-r from-[#450a0a] via-[#7f1d1d] to-[#991b1b] p-6 text-white shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Kemahasiswaan</p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Antrean Laporan</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-red-100">
          Laporan yang identitas terlapornya belum diketahui atau belum cocok masuk kategori Perlu identifikasi. Laporan beridentitas, baik dari pelapor maupun setelah dilengkapi Kemahasiswaan, langsung masuk kategori Menunggu konfirmasi DPA. Setelah Dosen PA mengonfirmasi, laporan masuk kategori Selesai dan mahasiswa terlapor masuk menu Punishment.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold">
          <Clock3 className="h-4 w-4" /> {categoryCounts.PERLU_TINDAKAN ?? 0} laporan belum teridentifikasi menunggu tindakan
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {queueCategories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => changeCategory(item.id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              category === item.id
                ? "bg-red-800 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.label} ({categoryCounts[item.id] ?? 0})
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {isLoading ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Memuat antrean laporan...</p>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/95 p-10 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-700" />
          <p className="mt-3 font-semibold text-slate-800">{emptyCategoryMessages[category]}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {orderedReports.map((report, index) => (
            <AdminReportCard
              key={report.id}
              report={report}
              reportNumber={index + 1}
              onChanged={() => loadReports(false)}
            />
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
