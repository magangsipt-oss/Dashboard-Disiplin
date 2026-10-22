"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardCopy,
  FileText,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { studentApi } from "./api";

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
];

const initialForm = {
  jenis: "TEMUAN",
  pillar: "",
  severityUsulan: "",
  modeTerlapor: "DIKETAHUI",
  terlaporNama: "",
  terlaporNim: "",
  terlaporKeterangan: "",
  lokasi: "",
  tanggalKejadian: "",
  deskripsi: "",
  pernyataanBenar: false,
};

export default function LaporSatgas() {
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function updateField(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox"
        ? checked
        : name === "terlaporNim"
          ? value.replace(/\D/g, "")
          : value,
    }));
  }

  function changeTerlaporMode(mode) {
    setForm((current) => ({
      ...current,
      modeTerlapor: mode,
      terlaporNama: "",
      terlaporNim: "",
      terlaporKeterangan: "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    if (!photo) {
      setSubmitError("Unggah foto bukti sebelum mengirim laporan.");
      return;
    }
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
          <p className="mt-1 text-sm text-slate-600">Laporan Anda sudah diteruskan dan akan diproses sesuai alur yang berlaku. Kode pelacakan Anda hanya ditampilkan sekali.</p>
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
              Tingkat menurut pelapor (opsional)
              <select name="severityUsulan" value={form.severityUsulan} onChange={updateField} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="">Tidak menentukan</option>
                {severities.map((severity) => <option key={severity.value} value={severity.value}>{severity.label}</option>)}
              </select>
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-semibold text-slate-700">Data terlapor</legend>
              <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    value: "DIKETAHUI",
                    title: "Saya tahu nama dan NIM terlapor",
                    description: "Data dicek otomatis. Jika cocok, terlapor dan Dosen PA-nya diberi tahu. Jika tidak ditemukan, laporan diteruskan ke Kemahasiswaan.",
                  },
                  {
                    value: "TIDAK_DIKETAHUI",
                    title: "Saya tidak tahu nama atau NIM terlapor",
                    description: "Laporan langsung diteruskan ke Kemahasiswaan untuk ditelusuri.",
                  },
                ].map((mode) => (
                  <label
                    key={mode.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm ${
                      form.modeTerlapor === mode.value
                        ? "border-red-800 bg-red-50"
                        : "border-slate-300 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="modeTerlapor"
                      value={mode.value}
                      checked={form.modeTerlapor === mode.value}
                      onChange={() => changeTerlaporMode(mode.value)}
                      className="mt-0.5 h-4 w-4 accent-red-800"
                    />
                    <span>
                      <span className="block font-semibold text-slate-800">{mode.title}</span>
                      <span className="mt-1 block font-normal text-slate-600">{mode.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {form.modeTerlapor === "DIKETAHUI" ? (
              <>
                <label className="text-sm font-semibold text-slate-700">
                  Nama lengkap terlapor
                  <input required name="terlaporNama" value={form.terlaporNama} onChange={updateField} maxLength={200} autoComplete="off" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  NIM terlapor
                  <input required name="terlaporNim" value={form.terlaporNim} onChange={updateField} inputMode="numeric" pattern="\d{4,15}" maxLength={15} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                </label>
              </>
            ) : (
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Ciri-ciri terlapor / keterangan kasus
                <input required name="terlaporKeterangan" value={form.terlaporKeterangan} onChange={updateField} minLength={5} maxLength={500} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </label>
            )}
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
              <Upload className="h-4 w-4 text-red-800" /> Foto bukti (wajib, JPEG/PNG maks. 2 MB)
            </label>
            <input
              id="report-photo"
              type="file"
              required
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

    </section>
  );
}
