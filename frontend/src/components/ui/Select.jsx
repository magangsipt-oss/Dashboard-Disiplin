'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { splitClassName } from '@/lib/splitClassName';

// Pengganti <select> bawaan browser dengan tampilan seragam seperti pilihan
// Role: panel putih, opsi terpilih merah tebal, sorot merah muda.
// Dipakai sama seperti <select>: anak berupa <option>, onChange menerima
// event dengan target.value (dan target.name).
function readOptions(children) {
  return React.Children.toArray(children)
    .filter((child) => React.isValidElement(child) && child.type === 'option')
    .map((child) => ({
      value: String(child.props.value ?? child.props.children ?? ''),
      label: child.props.children,
      disabled: Boolean(child.props.disabled),
    }));
}

export default function Select({
  value,
  onChange,
  children,
  className = '',
  disabled = false,
  required = false,
  name,
  id,
  'aria-label': ariaLabel,
  title,
  // "top" membuka daftar ke atas (mis. di dasar kartu yang memotong isi).
  placement = 'bottom',
}) {
  const options = readOptions(children);
  const { layout, visual } = splitClassName(className);
  const current = String(value ?? '');
  const selected = options.find((option) => option.value === current) ?? options[0];
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  // Tutup saat klik di luar.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
    };
  }, [isOpen]);

  // Gulir agar opsi yang disorot tetap terlihat.
  useEffect(() => {
    if (isOpen && highlighted >= 0) {
      listRef.current?.children[highlighted]?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, highlighted]);

  function open() {
    setHighlighted(Math.max(0, options.findIndex((option) => option.value === current)));
    setIsOpen(true);
  }

  function choose(option) {
    setIsOpen(false);
    if (option.disabled || option.value === current) return;
    onChange?.({ target: { value: option.value, name }, currentTarget: { value: option.value, name } });
  }

  function move(step) {
    if (options.length === 0) return;
    let next = highlighted;
    for (let tries = 0; tries < options.length; tries += 1) {
      next = (next + step + options.length) % options.length;
      if (!options[next].disabled) break;
    }
    setHighlighted(next);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) open();
      else move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!isOpen) open();
      else if (options[highlighted]) choose(options[highlighted]);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      setIsOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${layout}`}>
      <button
        type="button"
        id={id}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        className={`${visual} flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`truncate ${selected && selected.value === '' ? 'text-slate-400' : ''}`}>
          {selected?.label ?? ''}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 flex-shrink-0 opacity-70 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Nilai untuk validasi "required" dan FormData. */}
      <input
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        value={current}
        required={required}
        onChange={() => {}}
        className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
      />

      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className={`absolute inset-x-0 z-50 ${placement === 'top' ? 'bottom-full mb-1' : 'mt-1'} max-h-60 min-w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 text-sm text-slate-800 shadow-xl`}
        >
          {options.map((option, index) => {
            const isSelected = option.value === current;
            return (
              <li
                key={`${option.value}-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                // mousedown agar terpilih sebelum tombol kehilangan fokus.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setHighlighted(index)}
                className={`cursor-pointer px-3 py-2 ${
                  option.disabled ? 'cursor-not-allowed text-slate-400' : ''
                } ${index === highlighted ? 'bg-red-50' : ''} ${
                  isSelected ? 'font-bold text-red-800' : ''
                }`}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
