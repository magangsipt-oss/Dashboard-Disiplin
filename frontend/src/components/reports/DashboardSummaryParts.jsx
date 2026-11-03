"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Bell, CheckCircle2 } from "lucide-react";
import { studentApi } from "@/lib/api";
import { NOTIFICATION_SECTION_ID, announceNotificationChange } from "@/components/NotificationBell";

export const REFRESH_INTERVAL_MS = 15000;

// Kelas Tailwind ditulis utuh agar tidak terbuang saat build.
const iconTones = {
  red: "bg-red-50 text-red-800",
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  purple: "bg-purple-50 text-purple-700",
  slate: "bg-slate-100 text-slate-700",
};

const segmentColors = {
  red: "bg-red-600",
  amber: "bg-amber-400",
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  slate: "bg-slate-300",
};

export function sum(values) {
  return values.reduce((total, value) => total + (value ?? 0), 0);
}

const dayInMilliseconds = 24 * 60 * 60 * 1000;

export function daysSince(value) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / dayInMilliseconds));
}

const itemTones = {
  red: "border-red-200 bg-red-50/80",
  amber: "border-amber-200 bg-amber-50/80",
  blue: "border-blue-200 bg-blue-50/80",
  emerald: "border-emerald-200 bg-emerald-50/80",
};

const itemValueTones = {
  red: "text-red-700",
  amber: "text-amber-700",
  blue: "text-blue-700",
  emerald: "text-emerald-700",
};

export function SummaryCard({ card, isReady, isFailed, delay, onOpen }) {
  const Icon = card.icon;
  const show = (value) => (isFailed ? "--" : isReady ? (value ?? 0) : "…");
  const total = sum(card.segments.map((segment) => segment.value));
  const needsAttention = isReady && (card.attention ?? 0) > 0;

  return (
    <section
      data-scroll-reveal
      data-reveal-delay={delay}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl sm:p-6"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconTones[card.tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{card.description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-slate-900">{show(card.headline.value)}</span>
        <span className="text-xs font-semibold text-slate-400">{card.headline.label}</span>
      </div>

      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {isReady && total > 0 &&
          card.segments.map((segment) =>
            segment.value > 0 ? (
              <span
                key={segment.label}
                className={segmentColors[segment.color]}
                style={{ width: `${(segment.value / total) * 100}%` }}
                title={`${segment.label}: ${segment.value}`}
              />
            ) : null,
          )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        {[...card.segments, ...(card.extra ? [{ ...card.extra, color: "red" }] : [])].map((segment) => (
          <div key={segment.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span className={`h-2 w-2 flex-shrink-0 rounded-full ${segmentColors[segment.color]}`} />
              {segment.label}
            </dt>
            <dd className="mt-0.5 text-lg font-extrabold text-slate-900">{show(segment.value)}</dd>
          </div>
        ))}
      </dl>

      {card.items && isReady && (
        card.items.length === 0 ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{card.emptyText}</span>
          </p>
        ) : (
          <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
            {card.items.map((item) => (
              <li
                key={item.key}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${itemTones[item.color]}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-900">{item.title}</span>
                  <span className="block truncate text-[11px] text-slate-600">{item.subtitle}</span>
                </span>
                <span className="flex-shrink-0 text-right">
                  <span className={`block text-lg font-extrabold leading-none ${itemValueTones[item.color]}`}>
                    {item.value}
                  </span>
                  <span className="text-[10px] text-slate-500">{item.valueLabel}</span>
                </span>
              </li>
            ))}
          </ul>
        )
      )}

      <div className="flex-1" />

      {isReady && !card.items && (
        <p
          className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            needsAttention
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {needsAttention ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          )}
          <span>{needsAttention ? card.attentionText(card.attention) : card.okText}</span>
        </p>
      )}

      {/* Tanpa tombol bila kartu merangkum menu yang sedang dibuka. */}
      {!card.hideLink && (
        <button
          type="button"
          onClick={() => onOpen(card.tab)}
          className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-800 to-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-red-900/15 transition hover:from-red-900 hover:to-red-800"
        >
          Buka {card.title}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}

// Panel pemberitahuan yang belum dibuka. tabAliases memetakan tab lama ke menu peran ini.
export function NotificationPanel({ endpoint, tabAliases = {}, onOpen }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const load = () =>
      studentApi(endpoint)
        .then((data) => {
          if (!isMounted) return;
          setNotifications(data.pemberitahuan ?? []);
          setError("");
        })
        .catch((loadError) => {
          if (isMounted) setError(loadError.message);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

    load();
    const timer = window.setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_INTERVAL_MS);
    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [endpoint]);

  // Hanya pemberitahuan yang belum dibuka; setelah dibuka langsung hilang dari daftar.
  const unread = notifications.filter((item) => !item.dibaca);
  const unreadCount = unread.length;

  async function openNotification(notification) {
    setUpdatingId(notification.id);
    try {
      await studentApi(`${endpoint}/${notification.id}/dibaca`, { method: "PATCH" });
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, dibaca: true } : item)),
      );
    } catch (updateError) {
      setError(updateError.message);
      setUpdatingId(null);
      return;
    }
    setUpdatingId(null);
    announceNotificationChange();
    const tab = notification.tautanTab;
    onOpen(tabAliases[tab] ?? tab ?? "dashboard");
  }

  return (
    <section
      id={NOTIFICATION_SECTION_ID}
      data-scroll-reveal
      className="flex scroll-mt-48 flex-col rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg backdrop-blur-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
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
                ? `${unreadCount} aktivitas belum dibuka.`
                : "Semua aktivitas sudah dibuka."}
            </p>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
      {isLoading ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Memuat pemberitahuan...</p>
      ) : unreadCount === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Tidak ada aktivitas yang belum dibuka.
        </p>
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
                  <span className="mt-1.5 block text-[10px] text-slate-500">
                    {new Date(notification.createdAt).toLocaleString("id-ID")}
                  </span>
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
