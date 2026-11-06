'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TEXT_FIELD =
  'textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]):not([aria-hidden="true"])';

// Lapisan popup paling atas: dipasang langsung di <body> agar tidak tertutup
// header, dan seluruh halaman di bawahnya diburamkan.
//
// Di HP, keyboard menutupi bagian bawah layar. Bila kolom yang sedang diisi
// tertutup keyboard, Chrome Android menutup keyboard lagi. Karena itu lapisan
// ini menambah ruang setinggi keyboard dan menggeser kolom aktif ke atasnya.
export default function ModalLayer({ children, className = 'p-4' }) {
  const layerRef = useRef(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    // Kunci gulir halaman selama popup terbuka.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const revealFocusedField = () => {
      const field = document.activeElement;
      const layer = layerRef.current;
      if (!layer || !field || !layer.contains(field) || !field.matches(TEXT_FIELD)) return;
      const visibleBottom = viewport.offsetTop + viewport.height - 16;
      const rect = field.getBoundingClientRect();
      if (rect.bottom > visibleBottom) {
        layer.scrollTop += rect.bottom - visibleBottom;
      } else if (rect.top < viewport.offsetTop + 16) {
        layer.scrollTop -= viewport.offsetTop + 16 - rect.top;
      }
    };

    const handleResize = () => {
      setKeyboardInset(Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop)));
      // Tunggu ruang tambahan terpasang sebelum menggeser kolom.
      window.requestAnimationFrame(revealFocusedField);
    };

    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, []);

  function handleFocus(event) {
    if (!event.target.matches?.(TEXT_FIELD)) return;
    const field = event.target;
    // Keyboard butuh sesaat untuk muncul; pastikan kolom tetap terlihat.
    window.setTimeout(() => {
      const viewport = window.visualViewport;
      const layer = layerRef.current;
      if (!viewport || !layer || document.activeElement !== field) return;
      const visibleBottom = viewport.offsetTop + viewport.height - 16;
      const rect = field.getBoundingClientRect();
      if (rect.bottom > visibleBottom) layer.scrollTop += rect.bottom - visibleBottom;
    }, 350);
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={layerRef}
      onFocusCapture={handleFocus}
      style={keyboardInset > 0 ? { paddingBottom: keyboardInset + 16 } : undefined}
      className={`fixed inset-0 z-[1000] flex overflow-y-auto overscroll-contain bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150 [&>*]:m-auto ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}
