"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

const pillarLabels = {
  WAKTU: "Disiplin Waktu",
  AKADEMIK: "Disiplin Akademik",
  TATA_TERTIB: "Disiplin Tata Tertib dan Etika",
  PROSEDUR_K3: "Disiplin Prosedur dan Keselamatan (K3)",
  LINGKUNGAN: "Disiplin Lingkungan",
};

const counselingTypeLabels = {
  GUIDANCE_NOTE: "Catatan bimbingan",
  COUNSELING_CALL: "Panggilan konseling",
};

const dayInMilliseconds = 24 * 60 * 60 * 1000;

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("id-ID") : "-";
}

function daysWaiting(value) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / dayInMilliseconds));
}

function DetailList({ title, emptyText, items, renderItem }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
          {items.map(renderItem)}
        </ul>
      )}
    </div>
  );
}

function LecturerDetails({ lecturer }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <DetailList
        title="Laporan belum dikonfirmasi"
        emptyText="Tidak ada laporan yang menunggu."
        items={lecturer.laporanBelumDikonfirmasi}
        renderItem={(report) => (
          <li key={report.id} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <p className="font-semibold">{report.terlapor?.nama} · NIM {report.terlapor?.nim}</p>
            <p className="mt-0.5">
              Laporan #{report.id} · {pillarLabels[report.pillar] ?? report.pillar} · menunggu {daysWaiting(report.tanggalLapor)} hari
            </p>
          </li>
        )}
      />
      <DetailList
        title="Laporan sudah diputuskan"
        emptyText="Belum ada laporan yang diputuskan."
        items={[...lecturer.laporanDikonfirmasi, ...lecturer.laporanTidakDikonfirmasi].sort(
          (left, right) => new Date(right.tanggalKonfirmasiDosen ?? 0) - new Date(left.tanggalKonfirmasiDosen ?? 0),
        )}
        renderItem={(report) => (
          <li key={report.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-900">{report.terlapor?.nama ?? "-"} · NIM {report.terlapor?.nim ?? "-"}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${
                report.status === "DITOLAK" ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"
              }`}>
                {report.status === "DITOLAK" ? "Tidak dikonfirmasi" : "Dikonfirmasi"}
              </span>
            </div>
            <p className="mt-0.5">
              Laporan #{report.id} · {report.aturan?.nama ?? pillarLabels[report.pillar] ?? report.pillar} · {formatDate(report.tanggalKonfirmasiDosen)}
            </p>
          </li>
        )}
      />
      <DetailList
        title={`Catatan coaching terbaru${lecturer._count.counselingRecords > lecturer.counselingRecords.length ? ` (${lecturer.counselingRecords.length} dari ${lecturer._count.counselingRecords})` : ""}`}
        emptyText="Belum ada catatan coaching."
        items={lecturer.counselingRecords}
        renderItem={(record) => (
          <li key={record.id} className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-950">
            <p className="font-semibold">
              {record.student?.nama} · {counselingTypeLabels[record.type] ?? record.type} · {formatDate(record.counselingDate)}
            </p>
            <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap">{record.note}</p>
          </li>
        )}
      />
    </div>
  );
}

export default function AdminLecturerMonitoring({ lecturers, isLoading }) {
  const [search, setSearch] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return lecturers.filter(
      (lecturer) =>
        (!term || [lecturer.nama, String(lecturer.nuptk)].some((value) => value.toLowerCase().includes(term))) &&
        (!pendingOnly || lecturer.laporanBelumDikonfirmasi.length > 0),
    );
  }, [lecturers, deferredSearch, pendingOnly]);

  return (
    <section data-scroll-reveal className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-lg">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Monitoring DPA</h3>
            <p className="mt-1 text-sm text-slate-500">
              Seluruh Dosen PA beserta laporan yang belum dan sudah dikonfirmasi serta catatan coaching mahasiswa bimbingannya.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block sm:w-72">
              <span className="sr-only">Cari dosen PA</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama atau NUPTK"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={pendingOnly}
                onChange={(event) => setPendingOnly(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-red-800 focus:ring-red-700"
              />
              Hanya yang punya laporan menunggu
            </label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="px-6 py-10 text-center text-sm text-slate-500">Memuat data dosen PA…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-bold">Nama DPA</th>
                <th className="px-5 py-3 font-bold">NUPTK</th>
                <th className="px-5 py-3 font-bold">Laporan belum dikonfirmasi</th>
                <th className="px-5 py-3 font-bold">Laporan sudah dikonfirmasi</th>
                <th className="px-5 py-3 font-bold">Catatan coaching</th>
                <th className="px-5 py-3 font-bold"><span className="sr-only">Rincian</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((lecturer) => {
                const pending = lecturer.laporanBelumDikonfirmasi;
                const oldestWaiting = pending.length > 0 ? daysWaiting(pending[0].tanggalLapor) : null;
                const latestCoaching = lecturer.counselingRecords[0];
                const isExpanded = expandedId === lecturer.id;
                return (
                  <Fragment key={lecturer.id}>
                    <tr className="align-top hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{lecturer.nama}</p>
                        <p className="mt-1 text-xs text-slate-500">{lecturer._count.mahasiswaBimbingan} mahasiswa bimbingan</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{lecturer.nuptk}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          pending.length > 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {pending.length} laporan
                        </span>
                        {oldestWaiting !== null && (
                          <p className="mt-1 text-xs text-slate-500">Terlama menunggu {oldestWaiting} hari</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{lecturer.laporanDikonfirmasi.length} laporan</p>
                        {lecturer.laporanTidakDikonfirmasi.length > 0 && (
                          <p className="mt-1 text-xs text-slate-500">{lecturer.laporanTidakDikonfirmasi.length} tidak dikonfirmasi</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{lecturer._count.counselingRecords} catatan</p>
                        {latestCoaching && (
                          <p className="mt-1 text-xs text-slate-500">Terakhir {formatDate(latestCoaching.counselingDate)}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : lecturer.id)}
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
                        <td colSpan={6} className="px-5 py-4">
                          <LecturerDetails lecturer={lecturer} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                    {lecturers.length === 0 ? "Belum ada data dosen." : "Tidak ada dosen PA yang cocok dengan pencarian atau filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
