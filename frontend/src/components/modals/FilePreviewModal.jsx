"use client";

import { useEffect, useMemo } from "react";
import { AlertCircle, Clock, Download, FileText, Search, X } from "lucide-react";

// Pratinjau isi file Excel/CSV yang sudah diunggah Akademik.
export default function FilePreviewModal({
  data,
  isLoading,
  error,
  searchTerm,
  onSearchChange,
  onClose,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [data, searchTerm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-modal-title"
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-800 p-2.5 text-white shadow-sm">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="preview-modal-title" className="text-lg font-extrabold text-slate-900">
                  {data?.record?.fileName || 'Preview File Excel / CSV'}
                </h3>
                {data?.record && (
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold uppercase text-slate-800">
                    {data.record.category === 'advisors' ? 'Pembagian DPA' : 'Absensi'}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {data?.record
                  ? `Diunggah ${new Date(data.record.uploadedAt).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })} oleh ${data.record.uploadedBy} • ${(data.record.fileSize / 1024).toFixed(1)} KB`
                  : 'Memuat detail file...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {data?.record && (
              <a
                href={`/api/auth/academic/files/${data.record.id}/download`}
                download={data.record.fileName}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
              >
                <Download className="h-4 w-4" />
                Unduh File
              </a>
            )}
            <button
              type="button"
              autoFocus
              aria-label="Tutup pratinjau"
              onClick={() => onClose()}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 flex-col overflow-hidden p-6">
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-slate-500">
              <Clock className="h-8 w-8 animate-spin text-red-800" />
              <p className="text-sm font-semibold">Membaca dan memproses isi file Excel/CSV...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">
              <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" />
              <p className="font-bold">Gagal membuka preview file</p>
              <p className="mt-1 text-xs">{error}</p>
            </div>
          ) : !data || data.rows.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center text-sm text-slate-500">
              File ini tidak memiliki baris data.
            </div>
          ) : (
            <>
              {/* Search filter in preview */}
              <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari dalam file (NIM, Nama, DPA, dll)..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-red-800 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Total <strong>{data.totalRows} baris</strong> data
                  {searchTerm && (
                    <span>
                      {' '}• Menampilkan{' '}
                      <strong>
                        {filteredRows.length}
                      </strong>{' '}
                      baris cocok
                    </span>
                  )}
                </p>
              </div>

              {/* Preview Table Container */}
              <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 shadow-inner max-h-[55vh]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 font-bold uppercase tracking-wider text-slate-700 shadow-sm">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-12 bg-slate-200/80">#</th>
                      {data.headers.map((h, i) => (
                        <th key={i} className="px-4 py-2.5 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-mono text-[11px]">
                    {filteredRows.map((row, rowIdx) => (
                        <tr key={row._rowIndex ?? rowIdx} className="hover:bg-slate-50 transition">
                          <td className="px-3 py-2 text-center text-slate-400 bg-slate-50/50 font-sans text-xs">
                            {row._rowIndex || rowIdx + 1}
                          </td>
                          {data.headers.map((h, colIdx) => (
                            <td key={colIdx} className="px-4 py-2 text-slate-800 whitespace-nowrap">
                              {row[h] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <p className="text-xs text-slate-500">
            Data preview dibaca langsung dari file Excel/CSV yang tersimpan di server.
          </p>
          <button
            type="button"
            onClick={() => onClose()}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow hover:bg-slate-800 transition"
          >
            Tutup Preview
          </button>
        </div>
      </div>
    </div>
  );
}
