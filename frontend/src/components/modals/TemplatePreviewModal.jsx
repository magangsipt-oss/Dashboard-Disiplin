"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Clock, Download, FileText, X } from "lucide-react";

// Pratinjau template upload Akademik sebelum diunduh.
export default function TemplatePreviewModal({ category, onClose }) {
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    fetch(`/api/auth/academic/templates/${category}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Template gagal dimuat.");
        if (active) setTemplate(data.template);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Template gagal dimuat.");
      });
    return () => {
      active = false;
    };
  }, [category]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-modal-title"
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-800 p-2.5 text-white shadow-sm">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h3 id="template-modal-title" className="text-lg font-extrabold text-slate-900">
                {template?.title || "Preview Template"}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {template ? `${template.fileName} • Sheet "${template.sheetName}"` : "Memuat template..."}
              </p>
            </div>
          </div>
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

        <div className="flex flex-1 flex-col overflow-hidden p-6">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-600" />
              <p className="font-bold">Gagal membuka preview template</p>
              <p className="mt-1 text-xs">{error}</p>
            </div>
          ) : !template ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-slate-500">
              <Clock className="h-8 w-8 animate-spin text-red-800" />
              <p className="text-sm font-semibold">Memuat template...</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-xs text-slate-600">
                Kolom bertanda <span className="font-bold text-red-800">*</span> wajib diisi. Judul kolom harus di baris pertama; urutan kolom boleh berbeda. Baris di bawah judul hanya contoh, ganti dengan data asli sebelum diunggah.
              </p>
              <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 shadow-inner max-h-[55vh]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 font-bold uppercase tracking-wider text-slate-700 shadow-sm">
                    <tr>
                      {template.headers.map((header) => (
                        <th key={header} className="px-4 py-2.5 whitespace-nowrap">
                          {header}
                          {template.requiredHeaders.includes(header) && <span className="ml-0.5 text-red-800">*</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-mono text-[11px]">
                    {template.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-slate-50 transition">
                        {template.headers.map((header, columnIndex) => (
                          <td key={header} className="px-4 py-2 text-slate-800 whitespace-nowrap">
                            {row[columnIndex] || "-"}
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

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={() => onClose()}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            Tutup
          </button>
          {template && (
            <a
              href={`/api/auth/academic/templates/${category}/download`}
              download={template.fileName}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-800 px-5 py-2 text-xs font-bold text-white shadow hover:bg-red-900 transition"
            >
              <Download className="h-4 w-4" />
              Unduh Template
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
