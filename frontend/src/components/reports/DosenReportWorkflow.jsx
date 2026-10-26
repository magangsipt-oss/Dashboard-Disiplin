"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileCheck2, FileText, ShieldCheck } from "lucide-react";
import { jsonRequest, studentApi } from "../student/api";

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

export default function DosenReportWorkflow() {
  const [reports, setReports] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [rules, setRules] = useState([]);
  const [selectedRules, setSelectedRules] = useState({});
  const [notes, setNotes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadQueue(showLoading = true) {
    if (showLoading) setIsLoading(true);
    setError("");
    try {
      const [reportData, evidenceData, ruleData] = await Promise.all([
        studentApi("/api/dosen/laporan"),
        studentApi("/api/dosen/pembinaan"),
        studentApi("/api/aturan"),
      ]);
      setReports(reportData.laporan ?? []);
      setEvidence(evidenceData.pembinaan ?? []);
      setRules(ruleData.aturan ?? []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  async function decideReport(report, decision) {
    const selectedRule = selectedRules[report.id] ?? report.aturanId ?? "";
    if (decision === "KONFIRMASI" && !selectedRule) {
      setError(`Pilih aturan pelanggaran untuk laporan #${report.id}.`);
      return;
    }
    if (
      decision === "KONFIRMASI" &&
      !window.confirm("Konfirmasi pelanggaran ini? Poin mahasiswa akan langsung dikurangi.")
    ) {
      return;
    }
    if (
      decision === "DITOLAK" &&
      !window.confirm("Tolak konfirmasi pelanggaran untuk laporan ini?")
    ) {
      return;
    }

    setBusyId(`report-${report.id}`);
    setError("");
    setNotice("");
    try {
      await studentApi(
        `/api/dosen/laporan/${report.id}/konfirmasi`,
        jsonRequest("PATCH", {
          keputusan: decision,
          aturanId: decision === "KONFIRMASI" ? Number(selectedRule) : undefined,
          catatan: notes[`report-${report.id}`] ?? "",
        }),
      );
      setNotice(
        decision === "KONFIRMASI"
          ? "Pelanggaran dikonfirmasi. Poin dikurangi dan laporan diteruskan ke Kemahasiswaan."
          : "Laporan ditolak. Poin mahasiswa tidak berubah.",
      );
      await loadQueue(false);
    } catch (decisionError) {
      setError(decisionError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function decideEvidence(task, decision) {
    if (
      decision === "DISETUJUI" &&
      !window.confirm("Setujui bukti ini dan pulihkan poin mahasiswa?")
    ) {
      return;
    }
    setBusyId(`evidence-${task.id}`);
    setError("");
    setNotice("");
    try {
      await studentApi(
        `/api/dosen/pembinaan/${task.id}`,
        jsonRequest("PATCH", {
          keputusan: decision,
          catatanPemeriksa: notes[`evidence-${task.id}`] ?? "",
        }),
      );
      setNotice(
        decision === "DISETUJUI"
          ? "Bukti disetujui dan poin dipulihkan. Riwayat pelanggaran tetap tersimpan."
          : "Bukti ditolak dan mahasiswa diminta mengirim perbaikan.",
      );
      await loadQueue(false);
    } catch (decisionError) {
      setError(decisionError.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="rounded-3xl bg-gradient-to-r from-[#450a0a] via-[#7f1d1d] to-[#991b1b] p-6 text-white shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Dosen Pembimbing Akademik</p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Konfirmasi Laporan & Bukti Tindak Lanjut</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-red-100">
          Tinjau laporan mahasiswa bimbingan Anda. Poin baru dikurangi setelah pelanggaran dikonfirmasi. Setelah mahasiswa menyelesaikan tugas dari Kemahasiswaan, periksa buktinya untuk memulihkan poin.
        </p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-amber-700" />
          <h3 className="text-lg font-bold text-slate-900">Menunggu konfirmasi pelanggaran</h3>
        </div>
        {isLoading ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Memuat laporan...</p>
        ) : reports.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            Tidak ada laporan teridentifikasi yang menunggu konfirmasi Anda.
          </p>
        ) : reports.map((report) => {
          const matchingRules = rules.filter((rule) => rule.pillar === report.pillar);
          return (
            <article key={report.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Laporan #{report.id}</p>
                  <h4 className="mt-1 text-lg font-bold text-slate-900">{report.terlapor?.nama}</h4>
                  <p className="text-sm text-slate-600">NIM {report.terlapor?.nim} · {pillarLabels[report.pillar] ?? report.pillar}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Menunggu DPA</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{report.deskripsi}</p>
              <p className="text-xs text-slate-500">Lokasi: {report.lokasi} · Tanggal kejadian: {formatDate(report.tanggalKejadian)}</p>
              {report.buktiPath && (
                <a href={report.buktiPath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-red-800 hover:underline">
                  <FileText className="h-4 w-4" /> Lihat bukti laporan
                </a>
              )}
              <label className="block text-sm font-semibold text-slate-700">
                Aturan pelanggaran dan pengurangan poin
                <select
                  required
                  value={selectedRules[report.id] ?? report.aturanId ?? ""}
                  onChange={(event) => setSelectedRules((current) => ({ ...current, [report.id]: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                >
                  <option value="">Pilih aturan yang sesuai</option>
                  {matchingRules.map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.nama} · {rule.severity} · potong {rule.bobotPoin} poin
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Catatan Dosen PA (opsional)
                <textarea
                  maxLength={1000}
                  rows={2}
                  value={notes[`report-${report.id}`] ?? ""}
                  onChange={(event) => setNotes((current) => ({ ...current, [`report-${report.id}`]: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId !== null || matchingRules.length === 0}
                  onClick={() => decideReport(report, "KONFIRMASI")}
                  className="rounded-xl bg-red-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  Konfirmasi pelanggaran & kurangi poin
                </button>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => decideReport(report, "DITOLAK")}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-60"
                >
                  Tidak mengonfirmasi
                </button>
              </div>
              {busyId === `report-${report.id}` && <p className="text-xs text-slate-500">Menyimpan keputusan...</p>}
            </article>
          );
        })}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-emerald-700" />
          <h3 className="text-lg font-bold text-slate-900">Bukti tindak lanjut menunggu persetujuan</h3>
        </div>
        {isLoading ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Memuat bukti...</p>
        ) : evidence.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            Belum ada bukti penyelesaian yang perlu diperiksa.
          </p>
        ) : evidence.map((task) => (
          <article key={task.id} className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {task.student.nama} · NIM {task.student.nim} · Laporan #{task.perubahanPoin.laporan?.id}
              </p>
              <h4 className="mt-1 font-bold text-slate-900">{task.instruksi}</h4>
            </div>
            <a href={task.buktiUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 break-all text-sm font-semibold text-red-800 hover:underline">
              <FileText className="h-4 w-4 shrink-0" /> {task.buktiUrl}
            </a>
            {task.isiRefleksi && <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{task.isiRefleksi}</p>}
            <label className="block text-sm font-semibold text-slate-700">
              Catatan pemeriksaan (opsional)
              <textarea
                maxLength={1000}
                rows={2}
                value={notes[`evidence-${task.id}`] ?? ""}
                onChange={(event) => setNotes((current) => ({ ...current, [`evidence-${task.id}`]: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => decideEvidence(task, "DISETUJUI")}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" /> Setujui & pulihkan poin
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => decideEvidence(task, "DITOLAK")}
                className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-800 disabled:opacity-60"
              >
                Minta perbaikan bukti
              </button>
            </div>
            {busyId === `evidence-${task.id}` && <p className="text-xs text-slate-500">Menyimpan putusan...</p>}
          </article>
        ))}
      </section>

      <p className="text-xs text-slate-500">
        <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
        Identitas pelapor anonim tidak ditampilkan kepada Dosen PA maupun mahasiswa.
      </p>
      <button type="button" onClick={() => loadQueue()} className="self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
        Muat ulang antrean
      </button>
    </section>
  );
}
