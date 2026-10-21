"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCopy,
  FileText,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { jsonRequest, studentApi } from "./api";

const pillars = [
  { value: "WAKTU", label: "Disiplin Waktu" },
  { value: "AKADEMIK", label: "Disiplin Akademik" },
  { value: "TATA_TERTIB", label: "Disiplin Tata Tertib dan Etika" },
  { value: "PROSEDUR_K3", label: "Disiplin Prosedur dan Keselamatan (K3)" },
  { value: "LINGKUNGAN", label: "Disiplin Lingkungan" },
];

const severities = [
  { value: "RINGAN", label: "Ringan" },
  { value: "SEDANG", label: "Sedang" },
  { value: "BERAT", label: "Berat" },
  { value: "SANGAT_BERAT", label: "Sangat Berat" },
];

const reportSteps = [
  { status: "DITERIMA", label: "Diterima" },
  { status: "DIVERIFIKASI", label: "Diverifikasi" },
  { status: "DITINDAKLANJUTI", label: "Ditindaklanjuti" },
];

const initialForm = {
  jenis: "TEMUAN",
  pillar: "",
  aturanId: "",
  severityUsulan: "",
  terlaporNim: "",
  terlaporKeterangan: "",
  lokasi: "",
  tanggalKejadian: "",
  deskripsi: "",
  pernyataanBenar: false,
};

function statusLabel(status) {
  if (status === "DITOLAK") return "Ditolak";
  return reportSteps.find((step) => step.status === status)?.label ?? status;
}

export default function LaporSatgas() {
  const [aturan, setAturan] = useState([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [rulesError, setRulesError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [reportStatus, setReportStatus] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    let mounted = true;
    studentApi("/api/aturan")
      .then((data) => {
        if (mounted) setAturan(data.aturan ?? []);
      })
      .catch((error) => {
        if (mounted) setRulesError(error.message);
      })
      .finally(() => {
        if (mounted) setIsLoadingRules(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const selectedRules = useMemo(
    () => aturan.filter((rule) => rule.pillar === form.pillar),
    [aturan, form.pillar],
  );

  function updateField(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "pillar" ? { aturanId: "" } : {}),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== "" && value !== false) body.append(key, String(value));
      });
      if (form.pernyataanBenar) body.set("pernyataanBenar", "true");
      if (photo) body.append("bukti", photo);

      const result = await studentApi("/api/laporan", {
        method: "POST",
        body,
      });
      setTrackingCode(result.kodePelacakan);
      setForm(initialForm);
      setPhoto(null);
    } catch (error) {
      setSubmitError(
        error.message.includes("Batas laporan harian") || error.message.includes("429")
          ? "Batas laporan harian tercapai. Silakan coba kembali setelah 24 jam."
          : error.message,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCheckStatus(event) {
    event.preventDefault();
    setIsCheckingStatus(true);
    setStatusError("");
    setReportStatus(null);
    try {
      const result = await studentApi(
        `/api/laporan/status?kode=${encodeURIComponent(lookupCode.trim())}`,
      );
      setReportStatus(result);
    } catch (error) {
      setStatusError(error.message);
    } finally {
      setIsCheckingStatus(false);
    }
  }

  async function copyTrackingCode() {
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopyStatus("Kode berhasil disalin.");
    } catch {
      setCopyStatus("Gagal menyalin kode. Silakan salin kode secara manual.");
    }
  }

  return (
    <section data-scroll-reveal className="space-y-5">
      <article className="rounded-2xl border border-amber-200 bg-amber-50/95 p-5 shadow-lg sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-amber-950">Lapor Satgas</h2>
            <p className="mt-1 text-sm leading-relaxed text-amber-900">
              Semua civitas kampus dapat menjadi satgas. Identitas pelapor dirahasiakan dan tidak disimpan. Laporan diverifikasi sebelum berdampak pada poin siapa pun. Laporan palsu dapat merugikan orang lain.
            </p>
          </div>
        </div>
      </article>

      {trackingCode ? (
        <article className="rounded-2xl border border-emerald-200 bg-white/95 p-6 shadow-lg">
          <CheckCircle2 className="h-8 w-8 text-emerald-700" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">Laporan berhasil diterima</h2>
          <p className="mt-1 text-sm text-slate-600">Kode pelacakan Anda hanya ditampilkan sekali.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-lg font-bold tracking-wider text-slate-900">
              {trackingCode}
            </code>
            <button
              type="button"
              onClick={copyTrackingCode}
              className="inline-flex items-center gap-2 rounded-xl bg-red-800 px-4 py-3 text-sm font-bold text-white hover:bg-red-900"
            >
              <ClipboardCopy className="h-4 w-4" /> Salin kode
            </button>
          </div>
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Simpan kode ini. Kami tidak dapat memulihkannya.
          </p>
          {copyStatus && <p className="mt-2 text-xs text-slate-600" role="status">{copyStatus}</p>}
          <button
            type="button"
            onClick={() => {
              setTrackingCode("");
              setCopyStatus("");
            }}
            className="mt-4 text-sm font-bold text-red-800 hover:underline"
          >
            Kembali ke formulir
          </button>
        </article>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Formulir Laporan</h2>
            <p className="mt-1 text-sm text-slate-500">Isi informasi kejadian dengan jujur dan jelas.</p>
          </div>

          {submitError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{submitError}</p>
          )}
          {rulesError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{rulesError}</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Jenis laporan
              <select name="jenis" value={form.jenis} onChange={updateField} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="TEMUAN">Temuan ketidaksesuaian</option>
                <option value="APRESIASI">Apresiasi perilaku positif</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Pilar
              <select required name="pillar" value={form.pillar} onChange={updateField} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="">Pilih pilar</option>
                {pillars.map((pillar) => <option key={pillar.value} value={pillar.value}>{pillar.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Kategori aturan (opsional)
              <select name="aturanId" value={form.aturanId} onChange={updateField} disabled={!form.pillar || isLoadingRules} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100">
                <option value="">{isLoadingRules ? "Memuat aturan..." : "Pilih kategori bila sesuai"}</option>
                {selectedRules.map((rule) => (
                  <option key={rule.id} value={rule.id}>{rule.nama} · {rule.severity}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Tingkat menurut pelapor (opsional)
              <select name="severityUsulan" value={form.severityUsulan} onChange={updateField} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="">Tidak menentukan</option>
                {severities.map((severity) => <option key={severity.value} value={severity.value}>{severity.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              NIM terlapor (opsional)
              <input name="terlaporNim" value={form.terlaporNim} onChange={updateField} inputMode="numeric" maxLength={32} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Isi NIM bila diketahui" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Keterangan terlapor / kasus umum
              <input name="terlaporKeterangan" value={form.terlaporKeterangan} onChange={updateField} maxLength={500} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Contoh: lingkungan kotor di Lab X" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Lokasi kejadian
              <input required name="lokasi" value={form.lokasi} onChange={updateField} maxLength={300} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Tanggal kejadian
              <input required type="date" name="tanggalKejadian" value={form.tanggalKejadian} onChange={updateField} max={new Date().toISOString().slice(0, 10)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            Deskripsi kejadian
            <textarea required minLength={20} maxLength={1000} name="deskripsi" value={form.deskripsi} onChange={updateField} rows={5} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Jelaskan kejadian secara faktual (minimal 20 karakter)." />
            <span className="mt-1 block text-xs font-normal text-slate-500">{form.deskripsi.length}/1000 karakter</span>
          </label>

          <div>
            <label htmlFor="report-photo" className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
              <Upload className="h-4 w-4 text-red-800" /> Foto bukti (opsional, JPEG/PNG maks. 2 MB)
            </label>
            <input
              id="report-photo"
              type="file"
              accept="image/jpeg,image/png"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              className="mt-2 w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-red-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-red-800"
            />
            {photoPreview && (
              <div className="mt-3 flex items-start gap-3">
                {/* Preview is local only; the server strips image metadata before storage. */}
                <img src={photoPreview} alt="Pratinjau foto bukti" className="h-24 w-24 rounded-xl border border-slate-200 object-cover" />
                <button type="button" onClick={() => setPhoto(null)} className="text-xs font-bold text-red-800 hover:underline">Hapus foto</button>
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <input required type="checkbox" name="pernyataanBenar" checked={form.pernyataanBenar} onChange={updateField} className="mt-0.5 h-4 w-4 accent-red-800" />
            <span>Saya menyatakan laporan ini disampaikan dengan itikad baik dan berdasarkan informasi yang benar.</span>
          </label>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-red-800 px-5 py-3 text-sm font-bold text-white shadow hover:bg-red-900 disabled:cursor-wait disabled:opacity-60">
            <FileText className="h-4 w-4" /> {isSubmitting ? "Mengirim laporan..." : "Kirim Laporan Anonim"}
          </button>
        </form>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-red-800"><AlertCircle className="h-5 w-5" /></div>
          <div>
            <h2 className="font-bold text-slate-900">Cek Status Laporan</h2>
            <p className="mt-0.5 text-xs text-slate-500">Masukkan kode pelacakan yang Anda simpan.</p>
          </div>
        </div>
        <form onSubmit={handleCheckStatus} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input required value={lookupCode} onChange={(event) => setLookupCode(event.target.value.toUpperCase())} minLength={32} maxLength={32} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm uppercase" placeholder="KODE PELACAKAN" />
          <button type="submit" disabled={isCheckingStatus} className="rounded-xl bg-red-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-900 disabled:opacity-60">{isCheckingStatus ? "Memeriksa..." : "Periksa Status"}</button>
        </form>
        {statusError && <p className="mt-3 text-sm text-red-700" role="alert">{statusError}</p>}
        {reportStatus && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {reportSteps.map((step, index) => {
                const currentIndex = reportSteps.findIndex((item) => item.status === reportStatus.status);
                const complete = reportStatus.status === "DITOLAK"
                  ? index < 1
                  : currentIndex >= index;
                return (
                  <div key={step.status} className={`rounded-xl border p-3 text-sm font-semibold ${complete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500"}`}>
                    <span className="mr-2 text-xs">{index + 1}.</span>{step.label}
                  </div>
                );
              })}
              {reportStatus.status === "DITOLAK" && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">Ditolak</div>}
            </div>
            <p className="mt-3 text-xs text-slate-500">Tanggal laporan: {new Date(`${reportStatus.tanggalLapor}T00:00:00`).toLocaleDateString("id-ID")}</p>
            {reportStatus.catatanUntukPelapor && <p className="mt-2 text-sm text-slate-700">{reportStatus.catatanUntukPelapor}</p>}
          </div>
        )}
      </section>
    </section>
  );
}
