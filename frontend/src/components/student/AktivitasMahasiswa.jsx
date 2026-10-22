"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, ClipboardCheck, Clock3 } from "lucide-react";
import { studentApi } from "./api";

const stages = [
  { label: "Laporan dan bukti", description: "Pelanggaran dilaporkan dengan bukti pendukung." },
  { label: "Verifikasi dan konfirmasi", description: "Prodi memverifikasi laporan; DPA mengonfirmasi kepada mahasiswa." },
  { label: "Pembinaan edukatif", description: "Jika pelanggaran terbukti, Kemahasiswaan menetapkan pembinaan." },
  { label: "Penyelesaian dan monitoring", description: "Mahasiswa menyelesaikan tugas dan statusnya dipantau." },
];

export default function AktivitasMahasiswa({ onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [training, setTraining] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      studentApi("/api/mahasiswa/pemberitahuan"),
      studentApi("/api/mahasiswa/pembinaan"),
    ])
      .then(([notificationData, trainingData]) => {
        if (!mounted) return;
        setNotifications(notificationData.pemberitahuan ?? []);
        setTraining(trainingData.pembinaan ?? []);
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activeTraining = training.find((item) =>
    ["DIMINTA", "DIKIRIM", "DITOLAK"].includes(item.status),
  );
  const currentTraining = activeTraining ?? training[0] ?? null;
  const currentStage = !currentTraining
    ? "Tidak ada tugas pembinaan aktif"
    : currentTraining.status === "DIMINTA"
      ? "Pembinaan edukatif"
      : currentTraining.status === "DIKIRIM"
        ? "Monitoring penyelesaian"
        : currentTraining.status === "DITOLAK"
          ? "Perlu perbaikan"
          : "Pembinaan selesai";
  const activeStageIndex = !currentTraining
    ? -1
    : currentTraining.status === "DIKIRIM"
      ? 3
      : currentTraining.status === "DISETUJUI"
        ? stages.length
        : 2;

  async function openNotification(notification) {
    if (!notification.dibaca) {
      setUpdatingId(notification.id);
      try {
        await studentApi(
          `/api/mahasiswa/pemberitahuan/${notification.id}/dibaca`,
          { method: "PATCH" },
        );
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, dibaca: true } : item,
          ),
        );
      } catch (updateError) {
        setError(updateError.message);
        setUpdatingId(null);
        return;
      }
      setUpdatingId(null);
    }
    onNavigate(notification.tautanTab || "dashboard");
  }

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-800"><Bell className="h-5 w-5" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Pemberitahuan</h3>
            <p className="mt-0.5 text-xs text-slate-500">Pemberitahuan terbaru untuk akun Anda.</p>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
        {isLoading ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Memuat pemberitahuan...</p>
        ) : notifications.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Belum ada pemberitahuan.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                onClick={() => openNotification(notification)}
                disabled={updatingId === notification.id}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  notification.dibaca
                    ? "border-slate-200 bg-white hover:bg-slate-50"
                    : "border-amber-200 bg-amber-50/80 hover:bg-amber-100"
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-bold text-slate-900">{notification.judul}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-600">{notification.isi}</span>
                    <span className="mt-1.5 block text-[10px] text-slate-500">{new Date(notification.createdAt).toLocaleString("id-ID")}</span>
                  </span>
                  {!notification.dibaca && <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-700" aria-label="Belum dibaca" />}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ClipboardCheck className="h-5 w-5" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Alur Penanganan Pelanggaran</h3>
            <p className="mt-0.5 text-xs text-slate-500">Tahapan sesuai skema budaya disiplin kampus.</p>
          </div>
        </div>
        {isLoading ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Memuat tahapan...</p>
        ) : error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>
        ) : (
          <>
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Posisi Anda saat ini: <strong>{currentStage}</strong>
            </p>
            <ol className="mt-4 grid gap-2 sm:grid-cols-2">
              {stages.map((stage, index) => {
                const active = activeStageIndex === index;
                const complete = activeStageIndex > index;
                return (
                  <li key={stage.label} className={`rounded-xl border p-3 ${active ? "border-red-200 bg-rose-50" : complete ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center gap-2">
                      {complete ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : active ? <Clock3 className="h-4 w-4 text-red-800" /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}
                      <span className="text-sm font-bold text-slate-800">{index + 1}. {stage.label}</span>
                    </div>
                    <p className="mt-1 pl-6 text-xs leading-relaxed text-slate-600">{stage.description}</p>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Skema menetapkan tugas pembinaan selesai maksimal 14 hari. Jika ada tugas aktif, tenggatnya mengikuti instruksi pembinaan.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
