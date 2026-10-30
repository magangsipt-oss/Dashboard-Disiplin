"use client";

import { useEffect, useState } from "react";
import { Award, FileText, Paperclip, Upload } from "lucide-react";
import { studentApi } from "@/lib/api";

export const claimTypeLabels = {
  LOMBA: "Lomba",
  KEGIATAN_NON_AKADEMIK: "Kegiatan non-akademik",
};

export const activityLevelLabels = {
  KAMPUS: "Kampus",
  KABUPATEN_KOTA: "Kabupaten/Kota",
  PROVINSI: "Provinsi",
  NASIONAL: "Nasional",
  INTERNASIONAL: "Internasional",
};

export const claimStatus = {
  DIAJUKAN: { label: "Menunggu verifikasi", badge: "bg-amber-100 text-amber-900" },
  DISETUJUI: { label: "Disetujui", badge: "bg-emerald-100 text-emerald-800" },
  DITOLAK: { label: "Ditolak", badge: "bg-rose-100 text-rose-800" },
};

const maxFileSize = 5 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "application/pdf"];
const emptyForm = {
  jenis: "LOMBA",
  namaKegiatan: "",
  penyelenggara: "",
  tingkat: "KAMPUS",
  capaian: "",
  tanggalKegiatan: "",
  deskripsi: "",
};

export function formatClaimDate(value) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID");
}

export default function KlaimKegiatan() {
  const [claims, setClaims] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const today = new Date().toLocaleDateString("en-CA");

  async function loadClaims() {
    setIsLoading(true);
    setError("");
    try {
      const data = await studentApi("/api/mahasiswa/klaim-kegiatan");
      setClaims(data.klaim ?? []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    studentApi("/api/mahasiswa/klaim-kegiatan")
      .then((data) => active && setClaims(data.klaim ?? []))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function selectFile(event) {
    const selected = event.target.files?.[0] ?? null;
    setSubmitError("");
    if (selected && !acceptedTypes.includes(selected.type)) {
      setSubmitError("File bukti harus berupa JPEG, PNG, atau PDF.");
      event.target.value = "";
      setFile(null);
      return;
    }
    if (selected && selected.size > maxFileSize) {
      setSubmitError("Ukuran file bukti maksimal 5 MB.");
      event.target.value = "";
      setFile(null);
      return;
    }
    setFile(selected);
  }

  function openModal() {
    setForm(emptyForm);
    setFile(null);
    setSubmitError("");
    setIsModalOpen(true);
  }

  async function submitClaim(event) {
    event.preventDefault();
    if (!file) {
      setSubmitError("Lampirkan sertifikat atau dokumentasi kegiatan.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitStatus("");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append("bukti", file);
    try {
      await studentApi("/api/klaim-kegiatan", { method: "POST", body });
      setSubmitStatus("Klaim berhasil dikirim. Kemahasiswaan akan memverifikasi bukti Anda.");
      setIsModalOpen(false);
      await loadClaims();
    } catch (submitFailure) {
      setSubmitError(submitFailure.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const pendingCount = claims.filter((claim) => claim.status === "DIAJUKAN").length;
  const approvedPoints = claims.reduce((total, claim) => total + (claim.poinDisetujui ?? 0), 0);
  const isFormValid =
    form.namaKegiatan.trim().length >= 3 &&
    form.penyelenggara.trim().length >= 2 &&
    form.capaian.trim().length >= 2 &&
    form.tanggalKegiatan &&
    file;

  return (
    <section data-scroll-reveal className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Klaim Poin Kegiatan Non-Akademik</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ikut lomba atau kegiatan non-akademik? Lampirkan sertifikat atau dokumentasi. Kemahasiswaan akan memverifikasi dan menetapkan poin tambahan.
            </p>
          </div>
          <button type="button" onClick={openModal} className="inline-flex items-center gap-2 rounded-xl bg-red-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-900">
            <Upload className="h-4 w-4" /> Ajukan Klaim
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">Total klaim</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{isLoading ? "…" : error ? "--" : claims.length}</p>
          </div>
          <div className="rounded-xl bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold text-amber-800">Menunggu verifikasi</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-900">{isLoading ? "…" : error ? "--" : pendingCount}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-800">Poin dari kegiatan</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-900">{isLoading ? "…" : error ? "--" : `+${approvedPoints}`}</p>
          </div>
        </div>

        {submitStatus && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{submitStatus}</p>}
        <div className="mt-5">
          <div className="mb-3">
            <h3 className="font-bold text-slate-900">Riwayat klaim kegiatan</h3>
            <p className="mt-1 text-xs text-slate-500">Pantau status verifikasi, poin yang disetujui, dan catatan pemeriksa.</p>
          </div>
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              <p>{error}</p>
              <button type="button" onClick={loadClaims} className="mt-2 font-semibold underline hover:no-underline">Coba lagi</button>
            </div>
          ) : isLoading ? (
            <p className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Memuat klaim kegiatan...</p>
          ) : claims.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <Award className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 font-semibold text-slate-700">Belum ada klaim kegiatan</p>
              <p className="mt-1 text-xs text-slate-500">Ajukan klaim setelah mengikuti lomba atau kegiatan non-akademik.</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3">Kegiatan</th>
                  <th className="px-3 py-3">Tingkat / Capaian</th>
                  <th className="px-3 py-3">Tanggal</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Poin</th>
                  <th className="px-3 py-3">Catatan pemeriksa</th>
                  <th className="px-3 py-3 text-right">Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-800">{claim.namaKegiatan}</p>
                      <p className="text-xs text-slate-500">{claimTypeLabels[claim.jenis] ?? claim.jenis} · {claim.penyelenggara}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {activityLevelLabels[claim.tingkat] ?? claim.tingkat}
                      <br />
                      {claim.capaian}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{formatClaimDate(claim.tanggalKegiatan)}</td>
                    <td className="px-3 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${claimStatus[claim.status]?.badge ?? "bg-slate-100 text-slate-700"}`}>
                        {claimStatus[claim.status]?.label ?? claim.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold text-emerald-700">{claim.poinDisetujui !== null && claim.poinDisetujui !== undefined ? `+${claim.poinDisetujui}` : "-"}</td>
                    <td className="max-w-xs px-3 py-3 text-xs text-slate-600">{claim.catatanPemeriksa ?? "-"}</td>
                    <td className="px-3 py-3 text-right">
                      <a href={`/api/klaim-kegiatan/${claim.id}/bukti`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-red-800 hover:underline">
                        <FileText className="h-3.5 w-3.5" /> Lihat
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form onSubmit={submitClaim} className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Formulir Klaim Kegiatan</h2>
              <p className="mt-1 text-sm text-slate-500">Isi data sesuai sertifikat. Poin ditetapkan Kemahasiswaan setelah verifikasi.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Jenis kegiatan
                <select value={form.jenis} onChange={updateField("jenis")} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                  {Object.entries(claimTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Tingkat
                <select value={form.tingkat} onChange={updateField("tingkat")} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                  {Object.entries(activityLevelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                Nama kegiatan
                <input required minLength={3} maxLength={200} value={form.namaKegiatan} onChange={updateField("namaKegiatan")} placeholder="Contoh: Lomba Karya Tulis Ilmiah K3" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Penyelenggara
                <input required minLength={2} maxLength={200} value={form.penyelenggara} onChange={updateField("penyelenggara")} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Capaian / peran
                <input required minLength={2} maxLength={100} value={form.capaian} onChange={updateField("capaian")} placeholder="Juara 1, Finalis, Peserta, Panitia" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Tanggal kegiatan
                <input required type="date" max={today} value={form.tanggalKegiatan} onChange={updateField("tanggalKegiatan")} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Sertifikat / dokumentasi
                <span className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-600 hover:bg-slate-50">
                  <Paperclip className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{file ? file.name : "Pilih file JPEG, PNG, atau PDF (maks. 5 MB)"}</span>
                </span>
                <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={selectFile} className="sr-only" />
              </label>
              <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                Keterangan tambahan (opsional)
                <textarea maxLength={1000} rows={3} value={form.deskripsi} onChange={updateField("deskripsi")} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </label>
            </div>
            {submitError && <p className="text-sm text-red-700" role="alert">{submitError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">Batal</button>
              <button type="submit" disabled={isSubmitting || !isFormValid} className="rounded-xl bg-red-800 px-4 py-2 text-sm font-bold text-white hover:bg-red-900 disabled:opacity-60">{isSubmitting ? "Mengirim..." : "Kirim Klaim"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
