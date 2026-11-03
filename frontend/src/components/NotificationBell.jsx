'use client';

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { studentApi } from '@/lib/api';

// Dipancarkan panel pemberitahuan setelah ada yang ditandai dibaca,
// agar angka di lonceng langsung ikut berkurang.
export const NOTIFICATION_CHANGED_EVENT = 'sigma:pemberitahuan-berubah';
export const NOTIFICATION_SECTION_ID = 'pemberitahuan';

const REFRESH_INTERVAL_MS = 15000;

export function announceNotificationChange() {
  window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
}

// Lonceng di samping judul halaman awal; klik untuk menggulir ke panel pemberitahuan.
export default function NotificationBell({ endpoint }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const load = () =>
      studentApi(endpoint)
        .then((data) => {
          if (isMounted) {
            setUnreadCount((data.pemberitahuan ?? []).filter((item) => !item.dibaca).length);
          }
        })
        .catch(() => {
          // Lonceng hanya penanda; galat sudah ditampilkan oleh panel pemberitahuan.
        });

    load();
    const timer = window.setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_INTERVAL_MS);
    window.addEventListener(NOTIFICATION_CHANGED_EVENT, load);
    return () => {
      isMounted = false;
      window.clearInterval(timer);
      window.removeEventListener(NOTIFICATION_CHANGED_EVENT, load);
    };
  }, [endpoint]);

  const scrollToNotifications = () => {
    document
      .getElementById(NOTIFICATION_SECTION_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <button
      type="button"
      onClick={scrollToNotifications}
      title="Lihat pemberitahuan"
      aria-label={
        unreadCount > 0 ? `Lihat pemberitahuan, ${unreadCount} belum dibuka` : 'Lihat pemberitahuan'
      }
      className="relative inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-amber-300 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
    >
      <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
      {unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-[#7f1d1d]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
