"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Search } from "lucide-react";
import { studentApi } from "@/lib/api";

const roleTabs = [
  { id: "mhs", label: "Mahasiswa", placeholder: "Cari nama atau NIM" },
  { id: "dosen", label: "Dosen PA", placeholder: "Cari nama, NUPTK, atau email" },
  { id: "admin", label: "Kemahasiswaan", placeholder: "Cari nama atau email" },
  { id: "akademik", label: "Akademik", placeholder: "Cari nama atau email" },
];

// Password satu akun: disembunyikan sampai tombol Lihat ditekan (dibuka per akun
// dan dicatat di log audit server).
function PasswordCell({ role, account }) {
  const [password, setPassword] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!account.tersedia) {
    return <span className="text-xs italic text-slate-400">Belum tersedia</span>;
  }

  async function toggle() {
    if (isVisible) {
      setIsVisible(false);
      return;
    }
    if (password !== null) {
      setIsVisible(true);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await studentApi(`/api/admin/data-password/${role}/${account.id}`);
      setPassword(result.password);
      setIsVisible(true);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <code className="min-w-0 break-all rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm text-slate-900">
          {isVisible ? password : "••••••••"}
        </code>
        <button
          type="button"
          onClick={toggle}
          disabled={isLoading}
          aria-label={isVisible ? `Sembunyikan password ${account.nama}` : `Lihat password ${account.nama}`}
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {isLoading ? "..." : isVisible ? "Tutup" : "Lihat"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}

// Menu Data Password (khusus Kemahasiswaan): hanya melihat, tanpa ubah atau hapus.
export default function AdminPasswordData() {
  const [role, setRole] = useState("mhs");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Tunda pencarian sampai berhenti mengetik.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ peran: role, halaman: String(page) });
    if (search) params.set("cari", search);
    studentApi(`/api/admin/data-password?${params}`)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError("");
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [role, search, page]);

  function selectRole(nextRole) {
    if (nextRole === role) return;
    setRole(nextRole);
    setSearchInput("");
    setSearch("");
    setPage(1);
    setIsLoading(true);
  }

  function goToPage(nextPage) {
    setPage(nextPage);
    setIsLoading(true);
  }

  const activeTab = roleTabs.find((tab) => tab.id === role);
  const accounts = data?.akun ?? [];

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
      <div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Data Password Pengguna</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            Untuk membantu pengguna yang lupa password. Pengguna dapat mengganti password sendiri lewat menu Ubah Kata Sandi di halaman login.
          </p>
        </div>
      </div>

      {data && !data.kunciAktif && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Kunci PASSWORD_VAULT_KEY belum diatur di server, sehingga password belum dapat disimpan untuk ditampilkan.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {roleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectRole(tab.id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              role === tab.id ? "bg-red-800 text-white shadow" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={activeTab.placeholder}
          className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-800"
        />
      </label>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {isLoading ? (
        <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Memuat data akun...</p>
      ) : accounts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Tidak ada akun yang cocok.
        </p>
      ) : (
        <>
          {/* HP: kartu per akun. */}
          <ul className="space-y-2 md:hidden">
            {accounts.map((account) => (
              <li key={account.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5">
                <p className="truncate text-sm font-bold text-slate-900">{account.nama}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {account.identitas}
                  {account.keterangan ? ` · ${account.keterangan}` : ""}
                </p>
                <div className="mt-2.5">
                  <PasswordCell key={`${role}-${account.id}`} role={role} account={account} />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Identitas</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{account.nama}</td>
                    <td className="px-4 py-3 text-slate-700">{account.identitas}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{account.keterangan || "-"}</td>
                    <td className="px-4 py-3">
                      <PasswordCell key={`${role}-${account.id}`} role={role} account={account} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data && data.jumlahHalaman > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-600">
            Halaman {data.halaman} dari {data.jumlahHalaman} · {data.total} akun
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isLoading}
              aria-label="Halaman sebelumnya"
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= data.jumlahHalaman || isLoading}
              aria-label="Halaman berikutnya"
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
