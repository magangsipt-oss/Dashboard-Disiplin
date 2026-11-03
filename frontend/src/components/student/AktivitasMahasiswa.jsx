"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { studentApi } from "@/lib/api";
import { NOTIFICATION_SECTION_ID, announceNotificationChange } from "@/components/NotificationBell";
import { REFRESH_INTERVAL_MS } from "@/components/reports/DashboardSummaryParts";

export default function AktivitasMahasiswa({ onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = () =>
      studentApi("/api/mahasiswa/pemberitahuan")
        .then((notificationData) => {
          if (!mounted) return;
          setNotifications(notificationData.pemberitahuan ?? []);
          setError("");
        })
        .catch((loadError) => {
          if (mounted) setError(loadError.message);
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });

    load();
    const timer = window.setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_INTERVAL_MS);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  // Hanya pemberitahuan yang belum dibuka; setelah dibuka langsung hilang dari daftar.
  const unread = notifications.filter((item) => !item.dibaca);
  const unreadCount = unread.length;

  async function openNotification(notification) {
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
    announceNotificationChange();
    onNavigate(notification.tautanTab || "dashboard");
  }

  return (
    <section id={NOTIFICATION_SECTION_ID} className="mt-5 scroll-mt-48 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-800">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-700 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Pemberitahuan</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {unreadCount > 0
              ? `${unreadCount} pemberitahuan belum dibuka.`
              : "Semua pemberitahuan sudah dibuka."}
          </p>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
      {isLoading ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Memuat pemberitahuan...</p>
      ) : unreadCount === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Tidak ada pemberitahuan yang belum dibuka.</p>
      ) : (
        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
          {unread.map((notification) => (
            <button
              type="button"
              key={notification.id}
              onClick={() => openNotification(notification)}
              disabled={updatingId === notification.id}
              className="w-full rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-left transition-colors hover:bg-amber-100"
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-sm font-bold text-slate-900">{notification.judul}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-600">{notification.isi}</span>
                  <span className="mt-1.5 block text-[10px] text-slate-500">{new Date(notification.createdAt).toLocaleString("id-ID")}</span>
                </span>
                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-700" aria-label="Belum dibuka" />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
