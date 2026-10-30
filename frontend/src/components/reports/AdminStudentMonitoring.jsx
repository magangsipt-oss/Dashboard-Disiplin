"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { formatDeadline, punishmentTypeLabels } from "@/components/reports/AdminPunishment";

const PAGE_SIZE = 50;

const pillarLabels = {
  WAKTU: "Disiplin Waktu",
  AKADEMIK: "Disiplin Akademik",
  TATA_TERTIB: "Disiplin Tata Tertib dan Etika",
  PROSEDUR_K3: "Disiplin Prosedur dan Keselamatan (K3)",
  LINGKUNGAN: "Disiplin Lingkungan",
};

const severityLabels = {
  RINGAN: "Ringan",
  SEDANG: "Sedang",
  BERAT: "Berat",
  SANGAT_BERAT: "Sangat Berat",
};

const violationTypeLabels = {
  LATE: "Terlambat",
  UNEXCUSED_ABSENCE: "Tidak hadir tanpa keterangan",
  DISCIPLINE_VIOLATION: "Pelanggaran tata tertib",
  REPORTED_VIOLATION: "Pelanggaran dari laporan",
};

// Status penyelesaian dihitung backend (getViolationResolution).
const resolutionLabels = {
  BELUM_PUNISHMENT: { label: "Belum diberi punishment", badge: "bg-amber-100 text-amber-900", done: false },
  BERJALAN: { label: "Punishment berjalan", badge: "bg-orange-100 text-orange-900", done: false },
  TERLAMBAT: { label: "Punishment terlambat", badge: "bg-red-700 text-white", done: false },
  SELESAI: { label: "Selesai · poin dipulihkan", badge: "bg-emerald-100 text-emerald-900", done: true },
  DIBATALKAN: { label: "Dibatalkan (sanggahan disetujui)", badge: "bg-slate-100 text-slate-700", done: true },
  TANPA_PUNISHMENT: { label: "Tercatat · tanpa punishment", badge: "bg-slate-100 text-slate-700", done: true },
};

const isUnresolved = (violation) => resolutionLabels[violation.status]?.done === false;

function ViolationDetails({ violations }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <ViolationList
        title="Pelanggaran belum selesai"
        emptyText="Tidak ada pelanggaran yang belum selesai."
        violations={violations.filter(isUnresolved)}
      />
      <ViolationList
        title="Pelanggaran selesai"
        emptyText="Belum ada pelanggaran yang selesai."
        violations={violations.filter((violation) => !isUnresolved(violation))}
      />
    </div>
  );
}

function ViolationList({ title, emptyText, violations }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      {violations.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1">
          {violations.map((violation) => {
            const resolution = resolutionLabels[violation.status];
            const punishment = violation.punishment;
            return (
              <li key={violation.id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {violation.laporan?.aturan?.nama ?? violationTypeLabels[violation.type] ?? violation.type}
                      <span className="ml-2 font-bold text-red-800">−{Math.abs(violation.delta)} poin</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {violation.laporan ? `Laporan #${violation.laporan.id} · ` : ""}
                      {violation.pillar ? `${pillarLabels[violation.pillar] ?? violation.pillar} · ` : ""}
                      {violation.severity ? `${severityLabels[violation.severity] ?? violation.severity} · ` : ""}
                      Dicatat {new Date(violation.createdAt).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${resolution?.badge ?? "bg-slate-100 text-slate-700"}`}>
                    {resolution?.label ?? violation.status}
                  </span>
                </div>
                {punishment && (
                  <p className="mt-2 text-xs text-slate-600">
                    Punishment: {punishmentTypeLabels[punishment.jenis] ?? punishment.jenis} · batas waktu {formatDeadline(punishment.batasWaktu)}
                    {punishment.status === "DISETUJUI" && ` · selesai ${new Date(punishment.updatedAt).toLocaleDateString("id-ID")}`}
                    {punishment.hariDenda > 0 && ` · terlambat ${punishment.hariDenda} hari (−${punishment.totalDenda} poin sanksi)`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AdminStudentMonitoring({ students, isLoading }) {
  const [search, setSearch] = useState("");
  const [predicateFilter, setPredicateFilter] = useState("ALL");
  const [violationFilter, setViolationFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return students.filter((student) => {
      const violations = student.pelanggaran ?? [];
      const matchesSearch = !term || [
        student.nama,
        String(student.nim),
        student.jurusan,
        student.dosenPa?.nama,
        student.dosenPa?.nuptk,
      ].some((value) => String(value ?? "").toLowerCase().includes(term));
      const matchesPredicate = predicateFilter === "ALL" || student.predikat === predicateFilter;
      const matchesViolation =
        violationFilter === "ALL" ||
        (violationFilter === "UNRESOLVED" && violations.some(isUnresolved)) ||
        (violationFilter === "HAS_VIOLATION" && violations.length > 0) ||
        (violationFilter === "NONE" && violations.length === 0);
      return matchesSearch && matchesPredicate && matchesViolation;
    });
  }, [students, deferredSearch, predicateFilter, violationFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function updateFilter(setter) {
    return (event) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  return (
    <section data-scroll-reveal className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-lg">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Monitoring Mahasiswa</h3>
            <p className="mt-1 text-sm text-slate-500">
              Seluruh mahasiswa yang tercatat di sistem beserta poin, status kedisiplinan, dan semua pelanggarannya, baik yang sudah maupun belum diselesaikan.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="relative block">
              <span className="sr-only">Cari mahasiswa</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={updateFilter(setSearch)}
                placeholder="Cari nama, NIM, prodi, atau DPA"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </label>
            <label>
              <span className="sr-only">Filter status mahasiswa</span>
              <select
                value={predicateFilter}
                onChange={updateFilter(setPredicateFilter)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
              >
                <option value="ALL">Semua status</option>
                <option value="Disiplin">Disiplin</option>
                <option value="Kurang disiplin">Kurang disiplin</option>
                <option value="Tidak disiplin">Tidak disiplin</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Filter pelanggaran</span>
              <select
                value={violationFilter}
                onChange={updateFilter(setViolationFilter)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
              >
                <option value="ALL">Semua mahasiswa</option>
                <option value="UNRESOLVED">Ada pelanggaran belum selesai</option>
                <option value="HAS_VIOLATION">Pernah melanggar</option>
                <option value="NONE">Tanpa pelanggaran</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="px-6 py-10 text-center text-sm text-slate-500">Memuat data mahasiswa…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-bold">Mahasiswa</th>
                <th className="px-5 py-3 font-bold">DPA</th>
                <th className="px-5 py-3 font-bold">Poin</th>
                <th className="px-5 py-3 font-bold">Jumlah pelanggaran</th>
                <th className="px-5 py-3 font-bold">Pelanggaran belum selesai</th>
                <th className="px-5 py-3 font-bold">Pelanggaran selesai</th>
                <th className="px-5 py-3 font-bold"><span className="sr-only">Rincian</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map((student) => {
                const violations = student.pelanggaran ?? [];
                const unresolvedCount = violations.filter(isUnresolved).length;
                const isExpanded = expandedId === student.id;
                return (
                  <Fragment key={student.id}>
                    <tr className="align-top hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{student.nama}</p>
                        <p className="mt-1 text-xs text-slate-500">NIM {student.nim} · {student.jurusan}</p>
                      </td>
                      <td className="px-5 py-4">
                        {student.dosenPa ? (
                          <>
                            <p className="font-semibold text-slate-800">{student.dosenPa.nama}</p>
                            <p className="mt-1 text-xs text-slate-500">NUPTK {student.dosenPa.nuptk}</p>
                          </>
                        ) : <span className="text-slate-400">Belum ditetapkan</span>}
                      </td>
                      <td className="px-5 py-4 font-extrabold text-slate-900">{student.pointScore}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800">{violations.length}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          unresolvedCount > 0 ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"
                        }`}>
                          {unresolvedCount}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          {violations.length - unresolvedCount}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
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
                        <td colSpan={7} className="px-5 py-4">
                          <ViolationDetails violations={violations} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                    {students.length === 0 ? "Belum ada data mahasiswa." : "Tidak ada mahasiswa yang cocok dengan pencarian atau filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm">
              <span className="text-slate-500">
                Halaman {currentPage} dari {pageCount} · {filtered.length} mahasiswa
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= pageCount}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
