"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { studentApi } from "@/lib/api";
import ViolationDetails from "@/components/reports/ViolationDetails";

// Status dan batasnya dihitung backend (src/point-ledger.ts).
const statusStyles = {
  SANGAT_BAIK: { badge: "bg-emerald-100 text-emerald-900", card: "border-emerald-200", dot: "bg-emerald-500" },
  BAIK: { badge: "bg-blue-100 text-blue-900", card: "border-blue-200", dot: "bg-blue-500" },
  PERLU_PEMBINAAN: { badge: "bg-amber-100 text-amber-900", card: "border-amber-200", dot: "bg-amber-400" },
  TINDAK_LANJUT_KHUSUS: { badge: "bg-red-100 text-red-800", card: "border-red-200", dot: "bg-red-600" },
};

const clearanceStyles = {
  CLEAR: { label: "CLEAR", badge: "bg-emerald-100 text-emerald-900" },
  PENDING: { label: "PENDING", badge: "bg-amber-100 text-amber-900" },
  BELUM_CLEAR: { label: "BELUM CLEAR", badge: "bg-red-100 text-red-800" },
};

const sortOptions = [
  { value: "poin_asc", label: "Poin terendah" },
  { value: "poin_desc", label: "Poin tertinggi" },
  { value: "nama", label: "Nama (A-Z)" },
  { value: "nim", label: "NIM" },
];

const violationOptions = [
  { value: "", label: "Semua mahasiswa" },
  { value: "UNRESOLVED", label: "Ada pelanggaran belum selesai" },
  { value: "HAS_VIOLATION", label: "Pernah melanggar" },
  { value: "NONE", label: "Tanpa pelanggaran" },
];

const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal";

export default function AdminPointData() {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({ q: "", prodi: "", angkatan: "", status: "", pelanggaran: "", urut: "poin_asc", per: "20", halaman: 1 });
  const [expandedId, setExpandedId] = useState(null);
  // Hasil terakhir beserta query-nya; memuat = query aktif belum selesai dimuat.
  const [loaded, setLoaded] = useState({ key: null, data: null, error: "" });
  const requestKey = new URLSearchParams(
    Object.entries(query).filter(([, value]) => value !== "").map(([key, value]) => [key, String(value)]),
  ).toString();
  const data = loaded.data;
  const error = loaded.key === requestKey ? loaded.error : "";
  const isLoading = loaded.key !== requestKey;

  // Pencarian dikirim setelah pengguna berhenti mengetik sebentar.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery((current) => (current.q === searchInput.trim() ? current : { ...current, q: searchInput.trim(), halaman: 1 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    studentApi(`/api/admin/poin/mahasiswa?${requestKey}`)
      .then((result) => active && setLoaded({ key: requestKey, data: result, error: "" }))
      .catch((loadError) => active && setLoaded((current) => ({ ...current, key: requestKey, error: loadError.message })));
    return () => {
      active = false;
    };
  }, [requestKey]);

  function updateFilter(key, value) {
    setQuery((current) => ({ ...current, [key]: value, halaman: 1 }));
  }

  function goToPage(page) {
    setQuery((current) => ({ ...current, halaman: page }));
  }

  const thresholds = data?.batasStatus ?? [];
  const students = data?.mahasiswa ?? [];
  const firstRow = data && data.total > 0 ? (data.halaman - 1) * data.per + 1 : 0;
  const lastRow = data ? Math.min(data.total, data.halaman * data.per) : 0;

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-6 py-8">
      <header className="rounded-3xl bg-gradient-to-r from-[#450a0a] via-[#7f1d1d] to-[#991b1b] p-6 text-white shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Kemahasiswaan</p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Monitoring Mahasiswa</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-red-100">
          Setiap mahasiswa memulai dengan {data?.poinAwal ?? 100} poin. Poin hanya berkurang dari pelanggaran yang sudah dikonfirmasi Dosen PA, dan dapat bertambah dari klaim kegiatan yang disetujui. Klik Rincian untuk melihat pelanggaran yang sudah dan belum diselesaikan.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => updateFilter("status", "")}
          className={`rounded-2xl border bg-white/95 p-4 text-left shadow-lg transition hover:-translate-y-0.5 ${query.status === "" ? "border-red-800 ring-2 ring-red-800/20" : "border-slate-200"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total mahasiswa</span>
            <Users className="h-5 w-5 text-red-800" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{data?.ringkasan.total ?? "…"}</p>
          <p className="mt-1 text-xs text-slate-500">Semua status</p>
        </button>
        {thresholds.map((threshold) => {
          const style = statusStyles[threshold.kode];
          return (
            <button
              type="button"
              key={threshold.kode}
              onClick={() => updateFilter("status", query.status === threshold.kode ? "" : threshold.kode)}
              className={`rounded-2xl border bg-white/95 p-4 text-left shadow-lg transition hover:-translate-y-0.5 ${style.card} ${query.status === threshold.kode ? "ring-2 ring-red-800/30" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{threshold.label}</span>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{data?.ringkasan.perStatus[threshold.kode] ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500">
                {threshold.min === 0 ? `< ${threshold.max + 1}` : `${threshold.min}–${threshold.max}`} poin
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          Cari nama, NIM, atau DPA
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Contoh: Andi atau 2301001"
              className={`${inputClass} pl-9`}
            />
          </span>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Prodi
          <select value={query.prodi} onChange={(event) => updateFilter("prodi", event.target.value)} className={inputClass}>
            <option value="">Semua prodi</option>
            {(data?.filter.prodi ?? []).map((prodi) => (
              <option key={prodi} value={prodi}>{prodi}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Angkatan
          <select value={query.angkatan} onChange={(event) => updateFilter("angkatan", event.target.value)} className={inputClass}>
            <option value="">Semua angkatan</option>
            {(data?.filter.angkatan ?? []).map((angkatan) => (
              <option key={angkatan} value={angkatan}>{angkatan}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Status
          <select value={query.status} onChange={(event) => updateFilter("status", event.target.value)} className={inputClass}>
            <option value="">Semua status</option>
            {thresholds.map((threshold) => (
              <option key={threshold.kode} value={threshold.kode}>{threshold.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Pelanggaran
          <select value={query.pelanggaran} onChange={(event) => updateFilter("pelanggaran", event.target.value)} className={inputClass}>
            {violationOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Urutkan
          <select value={query.urut} onChange={(event) => updateFilter("urut", event.target.value)} className={inputClass}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">NIM</th>
                <th className="px-4 py-3">Nama / DPA</th>
                <th className="px-4 py-3">Prodi</th>
                <th className="px-4 py-3">Angkatan</th>
                <th className="px-4 py-3 text-right">Poin</th>
                <th className="px-4 py-3">Status poin</th>
                <th className="px-4 py-3 text-right">Pelanggaran</th>
                <th className="px-4 py-3 text-center">Belum selesai</th>
                <th className="px-4 py-3">Clearance</th>
                <th className="px-4 py-3"><span className="sr-only">Rincian</span></th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 ${isLoading ? "opacity-60" : ""}`}>
              {!isLoading && students.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">Tidak ada mahasiswa yang sesuai filter.</td>
                </tr>
              )}
              {isLoading && !data && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">Memuat data mahasiswa...</td>
                </tr>
              )}
              {students.map((student) => {
                const style = statusStyles[student.status.kode];
                const clearance = clearanceStyles[student.statusClearance];
                const isExpanded = expandedId === student.id;
                return (
                  <Fragment key={student.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700">{student.nim}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{student.nama}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {student.dosenPa ? `DPA: ${student.dosenPa.nama}` : "DPA belum ditetapkan"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{student.prodi}</td>
                    <td className="px-4 py-3 text-slate-700">{student.angkatan ?? "-"}</td>
                    <td className="px-4 py-3 text-right text-base font-extrabold text-slate-900">{student.poin}</td>
                    <td className="px-4 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${style?.badge ?? "bg-slate-100 text-slate-700"}`}>
                        {student.status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{student.jumlahPelanggaran}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        student.pelanggaranBelumSelesai > 0 ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {student.pelanggaranBelumSelesai}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {clearance ? (
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${clearance.badge}`}>{clearance.label}</span>
                      ) : (
                        <span className="whitespace-nowrap text-xs text-slate-400">Belum dihitung</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : student.id)}
                        aria-expanded={isExpanded}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Rincian
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={10} className="px-4 py-4">
                        <ViolationDetails violations={student.pelanggaran} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <p>
            {data ? `Menampilkan ${firstRow}–${lastRow} dari ${data.total} mahasiswa` : ""}
          </p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              Per halaman
              <select value={query.per} onChange={(event) => updateFilter("per", event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1">
                {["10", "20", "50", "100"].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => goToPage(data.halaman - 1)}
              disabled={!data || data.halaman <= 1}
              className="rounded-lg border border-slate-300 bg-white p-1.5 hover:bg-slate-50 disabled:opacity-40"
              title="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-slate-800">{data ? `${data.halaman} / ${data.totalHalaman}` : "-"}</span>
            <button
              type="button"
              onClick={() => goToPage(data.halaman + 1)}
              disabled={!data || data.halaman >= data.totalHalaman}
              className="rounded-lg border border-slate-300 bg-white p-1.5 hover:bg-slate-50 disabled:opacity-40"
              title="Halaman berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
