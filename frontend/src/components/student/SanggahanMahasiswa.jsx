"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { jsonRequest, studentApi } from "@/lib/api";

const appealStatus = {
  DIAJUKAN: "Diajukan",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
};

const changeLabels = {
  LATE: "Terlambat",
  UNEXCUSED_ABSENCE: "Tidak hadir tanpa keterangan",
  DISCIPLINE_VIOLATION: "Pelanggaran tata tertib",
  REPORTED_VIOLATION: "Pelanggaran terverifikasi",
  COMPETITION: "Mengikuti lomba",
  NON_ACADEMIC_ACTIVITY: "Kegiatan non-akademik",
  POINT_RESTORATION: "Pemulihan poin",
};

export default function SanggahanMahasiswa({
  changes,
  initialChangeId,
  onInitialChangeHandled,
}) {
  const [appeals, setAppeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [changeId, setChangeId] = useState(initialChangeId ? String(initialChangeId) : "");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");

  async function loadAppeals() {
    setIsLoading(true);
    setError("");
    try {
      const data = await studentApi("/api/mahasiswa/sanggahan");
      setAppeals(data.sanggahan ?? []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    studentApi("/api/mahasiswa/sanggahan")
      .then((data) => active && setAppeals(data.sanggahan ?? []))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Buka modal saat induk meminta sanggahan untuk perubahan poin tertentu.
  const [handledChangeId, setHandledChangeId] = useState(null);
  if (initialChangeId && initialChangeId !== handledChangeId) {
    setHandledChangeId(initialChangeId);
    setChangeId(String(initialChangeId));
    setIsModalOpen(true);
  } else if (!initialChangeId && handledChangeId !== null) {
    setHandledChangeId(null);
  }

  useEffect(() => {
    if (initialChangeId) onInitialChangeHandled();
  }, [initialChangeId, onInitialChangeHandled]);

  async function submitAppeal(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitStatus("");
    try {
      await studentApi(
        "/api/sanggahan",
        jsonRequest("POST", { perubahanPoinId: Number(changeId), alasan: reason }),
      );
      setSubmitStatus("Sanggahan berhasil diajukan.");
      setReason("");
      setIsModalOpen(false);
      await loadAppeals();
    } catch (submitFailure) {
      setSubmitError(submitFailure.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section data-scroll-reveal className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sanggah Pelanggaran</h2>
            <p className="mt-1 text-sm text-slate-500">Pilih perubahan poin negatif milik Anda dan jelaskan alasan sanggahan.</p>
          </div>
          <button type="button" onClick={() => { setChangeId(""); setSubmitError(""); setIsModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-red-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-900">
            <FileText className="h-4 w-4" /> Ajukan Sanggahan
          </button>
        </div>
        {submitStatus && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{submitStatus}</p>}
        {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
        {isLoading ? (
          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Memuat sanggahan...</p>
        ) : appeals.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Belum ada sanggahan yang diajukan.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr><th className="px-3 py-3">Tanggal</th><th className="px-3 py-3">Perubahan poin</th><th className="px-3 py-3">Alasan</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Catatan pemeriksa</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appeals.map((appeal) => (
                  <tr key={appeal.id}>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{new Date(appeal.createdAt).toLocaleDateString("id-ID")}</td>
                    <td className="px-3 py-3 text-slate-700">{changeLabels[appeal.perubahanPoin.type] ?? appeal.perubahanPoin.type} ({appeal.perubahanPoin.delta})</td>
                    <td className="max-w-xs px-3 py-3 text-xs text-slate-600">{appeal.alasan}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${appeal.status === "DISETUJUI" ? "bg-emerald-100 text-emerald-800" : appeal.status === "DITOLAK" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>{appealStatus[appeal.status] ?? appeal.status}</span></td>
                    <td className="px-3 py-3 text-xs text-slate-600">{appeal.catatanPemeriksa ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form onSubmit={submitAppeal} className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Formulir Sanggahan</h2>
              <p className="mt-1 text-sm text-slate-500">Sanggahan hanya dapat diajukan untuk perubahan poin negatif milik Anda.</p>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Catatan yang disanggah
              <select required value={changeId} onChange={(event) => setChangeId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="">Pilih perubahan poin</option>
                {initialChangeId &&
                  !(changes ?? []).some((change) => String(change.id) === String(initialChangeId)) && (
                    <option value={initialChangeId} key={`selected-${initialChangeId}`}>
                      Perubahan poin terverifikasi #{initialChangeId}
                    </option>
                  )}
                {(changes ?? []).filter((change) => change.delta < 0).map((change) => (
                  <option key={change.id} value={change.id}>
                    {new Date(change.createdAt).toLocaleDateString("id-ID")} · {changeLabels[change.type] ?? change.type} · {change.reason}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Alasan dan kronologi (minimal 20 karakter)
              <textarea required minLength={20} maxLength={2000} rows={5} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            {submitError && <p className="text-sm text-red-700" role="alert">{submitError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">Batal</button>
              <button type="submit" disabled={isSubmitting || !changeId || reason.trim().length < 20} className="rounded-xl bg-red-800 px-4 py-2 text-sm font-bold text-white hover:bg-red-900 disabled:opacity-60">{isSubmitting ? "Mengirim..." : "Kirim Sanggahan"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
