"use client";

import { useEffect, useRef } from "react";

// Jeda penyegaran otomatis data dashboard.
export const AUTO_REFRESH_MS = 15000;

// Memanggil refresh setiap AUTO_REFRESH_MS selama tab browser terlihat, dan
// langsung saat tab kembali dibuka. refresh sebaiknya memuat tanpa indikator
// "Memuat..." agar isian form yang sedang terbuka tidak hilang.
export function useAutoRefresh(refresh) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    const run = () => {
      if (!document.hidden) refreshRef.current();
    };
    const timer = window.setInterval(run, AUTO_REFRESH_MS);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
    };
  }, []);
}
