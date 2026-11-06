"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, FileText, Paperclip, Upload } from "lucide-react";
import { studentApi } from "@/lib/api";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { DrcActivityDetails, drcTypeLabels, DrcSection } from "@/lib/drc";

const maxFileSize = 5 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "application/pdf"];

function formatClock(value) {
  return new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" });
}

// Status jendela unggah dihitung ulang di browser agar tombol terbuka/tertutup tepat waktu.
function evidenceStatus(activity, now) {
  const range = activity.unggahBukti;
  if (!range) return activity.statusUnggahBukti ?? "DITUTUP";
  if (now < new Date(range.dibuka).getTime()) return "BELUM_DIBUKA";
  return now <= new Date(range.ditutup).getTime() ? "DIBUKA" : "DITUTUP";
}

function formatUploadTime(value) {
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

// Bukti kehadiran: dibuka saat kegiatan mulai, ditutup 30 menit setelah selesai.
// Unggah ulang menggantikan bukti lama.
function DrcEvidence({ activity, now, onUploaded }) {
  const evidence = activity.buktiSaya;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [catatan, setCatatan] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const status = evidenceStatus(activity, now);
  const closesAt = activity.unggahBukti ? formatClock(activity.unggahBukti.ditutup) : "";

  if (status === "BELUM_DIBUKA") {
    return (
      <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Unggah foto atau sertifikat kehadiran di sini saat kegiatan berlangsung, mulai pukul {activity.jamMulai} hingga {closesAt} WITA (30 menit setelah kegiatan selesai).
      </p>
    );
  }

  if (status === "DITUTUP" && !evidence) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
        Waktu unggah bukti sudah ditutup pukul {closesAt} WITA. Anda tidak mengunggah bukti kehadiran untuk kegiatan ini.
      </p>
    );
  }

  const isOpen = status === "DIBUKA";

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
            {isOpen && !isFormOpen && (
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

      {isOpen && (
        <p className="text-xs font-semibold text-amber-700">
          Batas unggah bukti: pukul {closesAt} WITA.
        </p>
      )}

      {isOpen && isFormOpen && (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            Foto atau sertifikat kehadiran
            <span className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-xs font-normal text-slate-600 hover:bg-slate-50">
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

function DrcCard({ activity, now, onUploaded }) {
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
      <DrcEvidence activity={activity} now={now} onUploaded={onUploaded} />
    </article>
  );
}

// Jadwal DLS untuk mahasiswa beserta unggah bukti kehadiran; dibuka juga dari pemberitahuan DLS.
export default function DrcMahasiswa() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // Jam berjalan agar jendela unggah bukti terbuka/tertutup tanpa muat ulang.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  // Penyegaran otomatis tanpa indikator "Memuat...".
  useAutoRefresh(() =>
    studentApi("/api/drc")
      .then((result) => setActivities(result.kegiatan ?? []))
      .catch(() => {}),
  );

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
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <DrcSection title="Jadwal Akan Datang" description="Kegiatan DLS yang wajib Anda ikuti. Unggah bukti kehadiran saat kegiatan berlangsung.">
        {isLoading ? (
          <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">Memuat jadwal DLS...</p>
        ) : upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <CalendarCheck className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm text-slate-600">Belum ada jadwal DLS. Anda akan mendapat pemberitahuan dan email saat jadwal diumumkan.</p>
          </div>
        ) : (
          upcoming.map((activity) => <DrcCard key={activity.id} activity={activity} now={now} onUploaded={handleUploaded} />)
        )}
      </DrcSection>


      {past.length > 0 && (
        <DrcSection title="Riwayat Kegiatan" description="Kegiatan DLS yang sudah selesai.">
          {past.map((activity) => <DrcCard key={activity.id} activity={activity} now={now} onUploaded={handleUploaded} />)}
        </DrcSection>
      )}
    </div>
  );
}
