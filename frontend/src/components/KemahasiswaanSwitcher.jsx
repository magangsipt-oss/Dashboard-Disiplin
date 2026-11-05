'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { studentApi, jsonRequest } from '@/lib/api';

const pageOptions = [
  { role: 'admin', label: 'Kemahasiswaan' },
  { role: 'mhs', label: 'Mahasiswa' },
  { role: 'dosen', label: 'Dosen PA' },
  { role: 'akademik', label: 'Akademik' },
];

const selectClassName =
  'rounded-lg border border-red-800/50 bg-[#581c1c]/90 px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-wait disabled:opacity-60';

// overflow-hidden agar scrollbar daftar tidak menembus sudut melengkung.
const popupClassName =
  'absolute z-40 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white text-xs text-slate-800 shadow-xl';

const MAX_SEARCH_RESULTS = 50;

// Kolom cari akun: hasil muncul saat mengetik, daftar lengkap muncul saat klik dua kali.
function AccountSearch({ profile, accounts, disabled, onSelect }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const keyword = query.trim().toLowerCase();
  const results = showAll && !keyword
    ? accounts
    : accounts
        .filter((account) =>
          `${account.name} ${account.identity}`.toLowerCase().includes(keyword),
        )
        .slice(0, MAX_SEARCH_RESULTS);
  const isListVisible = isOpen && (showAll || keyword.length > 0);

  const close = () => {
    setIsOpen(false);
    setShowAll(false);
    setQuery('');
  };

  const choose = (account) => {
    close();
    onSelect(account.id);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      close();
      event.currentTarget.blur();
    } else if (isListVisible && event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((index) => Math.min(index + 1, results.length - 1));
    } else if (isListVisible && event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (isListVisible && event.key === 'Enter' && results[highlighted]) {
      event.preventDefault();
      choose(results[highlighted]);
    }
  };

  return (
    <div className="relative min-w-0">
      <input
        type="search"
        role="combobox"
        aria-expanded={isListVisible}
        aria-controls="kemahasiswaan-account-list"
        aria-autocomplete="list"
        disabled={disabled}
        value={isOpen ? query : profile.name}
        placeholder={profile.role === 'mhs' ? 'Cari nama atau NIM...' : 'Cari nama atau email...'}
        title="Ketik untuk mencari, klik dua kali untuk melihat semua akun"
        onFocus={() => setIsOpen(true)}
        onBlur={close}
        onDoubleClick={() => {
          setIsOpen(true);
          setShowAll(true);
          setHighlighted(0);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          setHighlighted(0);
        }}
        onKeyDown={handleKeyDown}
        className={`${selectClassName} w-64 max-w-full placeholder:text-red-200/70`}
      />
      {isListVisible && (
        <div className={`${popupClassName} inset-x-0 min-w-56`}>
          <ul
            id="kemahasiswaan-account-list"
            role="listbox"
            className="max-h-72 overflow-y-auto py-1"
          >
            {results.length === 0 ? (
              <li className="px-3 py-2 text-slate-500">Akun tidak ditemukan.</li>
            ) : (
              results.map((account, index) => (
                <li
                  key={account.id}
                  role="option"
                  aria-selected={account.id === profile.id}
                  // mousedown agar terpilih sebelum input kehilangan fokus.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(account);
                  }}
                  onMouseEnter={() => setHighlighted(index)}
                  className={`cursor-pointer px-3 py-2 ${
                    index === highlighted ? 'bg-red-50' : ''
                  } ${account.id === profile.id ? 'font-bold text-red-800' : ''}`}
                >
                  <span className="block truncate">{account.name}</span>
                  <span className="block truncate text-[11px] text-slate-500">{account.identity}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function PageSelect({ value, disabled, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const current = pageOptions.find((option) => option.role === value);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
        }}
        className={`${selectClassName} flex w-36 items-center justify-between gap-1.5`}
      >
        {current?.label}
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      {isOpen && (
        <ul role="listbox" className={`${popupClassName} inset-x-0 py-1`}>
          {pageOptions.map((option) => (
            <li
              key={option.role}
              role="option"
              aria-selected={option.role === value}
              // mousedown agar terpilih sebelum tombol kehilangan fokus.
              onMouseDown={(event) => {
                event.preventDefault();
                setIsOpen(false);
                if (option.role !== value) onSelect(option.role);
              }}
              className={`cursor-pointer whitespace-nowrap px-3 py-2 hover:bg-red-50 ${
                option.role === value ? 'font-bold text-red-800' : ''
              }`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Pengalih halaman untuk akun Kemahasiswaan: masuk sebagai mahasiswa/dosen PA/akademik
// mana pun, lalu kembali ke halaman Kemahasiswaan.
export default function KemahasiswaanSwitcher({ profile }) {
  const [accounts, setAccounts] = useState([]);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState('');
  const isImpersonating = ['mhs', 'dosen', 'akademik'].includes(profile.role);

  useEffect(() => {
    if (!isImpersonating) return undefined;
    let isMounted = true;
    studentApi(`/api/auth/impersonation/accounts?role=${profile.role}`)
      .then((data) => {
        if (isMounted) setAccounts(data.accounts ?? []);
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError.message);
      });
    return () => {
      isMounted = false;
    };
  }, [isImpersonating, profile.role]);

  async function switchTo(request) {
    setError('');
    setIsSwitching(true);
    try {
      await studentApi('/api/auth/impersonation', request);
      // Muat ulang penuh agar seluruh state dashboard mengikuti akun baru.
      window.location.reload();
    } catch (switchError) {
      setError(switchError.message);
      setIsSwitching(false);
    }
  }

  const handlePageChange = (role) => {
    switchTo(role === 'admin' ? { method: 'DELETE' } : jsonRequest('POST', { role }));
  };

  const handleAccountChange = (accountId) => {
    if (accountId === profile.id) return;
    switchTo(jsonRequest('POST', { role: profile.role, accountId }));
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-red-800/50 bg-[#581c1c]/60 px-3 py-1.5 text-xs text-red-200 sm:w-auto lg:min-w-0 lg:flex-nowrap">
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="font-semibold">Role :</span>
        <PageSelect value={profile.role} disabled={isSwitching} onSelect={handlePageChange} />
      </div>

      {isImpersonating && (
        <label className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 font-semibold">Akun :</span>
          <AccountSearch
            profile={profile}
            accounts={accounts}
            disabled={isSwitching}
            onSelect={handleAccountChange}
          />
        </label>
      )}

      {error && (
        <span className="font-semibold text-amber-200" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
