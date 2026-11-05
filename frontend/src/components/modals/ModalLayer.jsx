'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Lapisan popup paling atas: dipasang langsung di <body> agar tidak tertutup
// header, dan seluruh halaman di bawahnya diburamkan.
export default function ModalLayer({ children, className = 'p-4' }) {
  useEffect(() => {
    // Kunci gulir halaman selama popup terbuka.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[1000] flex overflow-y-auto bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150 [&>*]:m-auto ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}
