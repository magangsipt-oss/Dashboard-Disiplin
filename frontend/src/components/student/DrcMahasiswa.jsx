"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, FileText, Paperclip, Upload } from "lucide-react";
import { studentApi } from "@/lib/api";
import { DrcActivityDetails, DrcThemeTable, drcTypeLabels } from "@/lib/drc";

const maxFileSize = 5 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "application/pdf"];

function formatUploadTime(value) {
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

// Bukti kehadiran: tersedia mulai hari pelaksanaan; unggah ulang menggantikan bukti lama.
function DrcEvidence({ activity, onUploaded }) {
  const evidence = activity.buktiSaya;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [catatan, setCatatan] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  if (!activity.bisaUnggahBukti) {
    return (
      <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Setelah mengikuti kegiatan, unggah foto atau sertifikat kehadiran di sini (mulai hari pelaksanaan).
      </p>
    );
  }

  function selectFile(event) {
    const selected = event.target.files?.[0] ?? null;
    setError("");
    if (selected && !acceptedTypes.includes(selected.type)) {
      setError("File bukti harus berupa JPEG, PNG, atau PDF.");
    } else if (selected && selected.size > maxFileSize) {
      setError("Ukuran file bukti maksimal 5 MB.");
    } else {
      setFile(selected);
      return;
    }
    event.target.value = "";
    setFile(null);
  }

  function openForm() {
    setFile(null);
    setCatatan(evidence?.catatan ?? "");
    setError("");
    setIsFormOpen(true);
  }

  async function submit(event) {
    event.preventDefault();
    if (!file) {
      setError("Lampirkan foto atau sertifikat kehadiran.");
      return;
    }
    const body = new FormData();
    body.append("bukti", file);
    body.append("catatan", catatan);
    setIsUploading(true);
    setError("");
    try {
      const result = await studentApi(`/api/drc/${activity.id}/bukti`, { method: "POST", body });
      setIsFormOpen(false);
      onUploaded(activity.id, result.bukti);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      {evidence ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800">Bukti kehadiran sudah diunggah</p>
              <p className="text-xs text-slate-500">
                {formatUploadTime(evidence.updatedAt)}
                {evidence.catatan ? ` · ${evidence.catatan}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/drc/bukti/${evidence.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <FileText className="h-3.5 w-3.5" /> Lihat
            </a>
            {!isFormOpen && (
              <button type="button" onClick={openForm} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" /> Ganti bukti
              </button>
            )}
          </div>
        </div>
      ) : (
        !isFormOpen && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-amber-800">Anda belum mengunggah bukti kehadiran.</p>
            <button type="button" onClick={openForm} className="inline-flex items-center gap-2 rounded-xl bg-red-800 px-4 py-2 text-sm font-bold text-white hover:bg-red-900">
              <Upload className="h-4 w-4" /> Unggah Bukti
            </button>
          </div>
        )
      )}

      {isFormOpen && (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            Foto atau sertifikat kehadiran
            <span className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-600 hover:bg-slate-50">
              <Paperclip className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{file ? file.name : "Pilih file JPEG, PNG, atau PDF (maks. 5 MB)"}</span>
            </span>
            <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={selectFile} className="sr-only" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Catatan (opsional)
            <input
              maxLength={500}
              value={catatan}
              onChange={(event) => setCatatan(event.target.value)}
              placeholder="Contoh: hadir sesi pagi"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={isUploading || !file} className="rounded-xl bg-red-800 px-4 py-2 text-sm font-bold text-white hover:bg-red-900 disabled:opacity-60">
              {isUploading ? "Mengunggah..." : "Kirim Bukti"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function DrcCard({ activity, onUploaded }) {
  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {drcTypeLabels[activity.jenis] ?? activity.jenis} · Semester {activity.semester}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{activity.judul}</h3>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${activity.sudahLewat ? "bg-slate-100 text-slate-700" : "bg-red-100 text-red-800"}`}>
          {activity.sudahLewat ? "Selesai" : "Wajib diikuti"}
        </span>
      </div>
      <DrcActivityDetails activity={activity} />
      <DrcEvidence activity={activity} onUploaded={onUploaded} />
    </article>
  );
}

// Jadwal DRC untuk mahasiswa beserta unggah bukti kehadiran; dibuka juga dari pemberitahuan DRC.
export default function DrcMahasiswa() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    studentApi("/api/drc")
      .then((result) => active && setActivities(result.kegiatan ?? []))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function handleUploaded(activityId, bukti) {
    setActivities((current) =>
      current.map((activity) => (activity.id === activityId ? { ...activity, buktiSaya: bukti } : activity)),
    );
  }

  // Kegiatan terdekat ditampilkan paling atas.
  const upcoming = activities.filter((activity) => !activity.sudahLewat).reverse();
  const past = activities.filter((activity) => activity.sudahLewat);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg">
        <h3 className="text-lg font-bold text-slate-900">DRC – Disiplin Refresh Competency</h3>
        <p className="mt-1 text-sm text-slate-600">
          Kegiatan wajib setiap awal semester untuk menyegarkan pemahaman 5 tema budaya disiplin kampus. Jadwal di bawah ini adalah kegiatan yang wajib Anda ikuti sesuai prodi dan angkatan Anda.
        </p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Jadwal Akan Datang</h3>
        {isLoading ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Memuat jadwal DRC...</p>
        ) : upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/95 p-8 text-center">
            <CalendarCheck className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm text-slate-600">Belum ada jadwal DRC. Anda akan mendapat pemberitahuan dan email saat jadwal diumumkan.</p>
          </div>
        ) : (
          upcoming.map((activity) => <DrcCard key={activity.id} activity={activity} onUploaded={handleUploaded} />)
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-900">Garis Besar Materi DRC</h3>
        <DrcThemeTable />
      </div>

      {past.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Riwayat Kegiatan</h3>
          {past.map((activity) => <DrcCard key={activity.id} activity={activity} onUploaded={handleUploaded} />)}
        </div>
      )}
    </div>
  );
}
