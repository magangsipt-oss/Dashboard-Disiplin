'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Clock, Download, Eye, FileText, Trash2 } from 'lucide-react';

export default function AcademicFileHistory({ files, isLoading, title, description, emptyText, onPreview, onDeleted }) {
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const selectAllRef = useRef(null);

  // Abaikan pilihan untuk file yang sudah tidak ada di daftar.
  const selectedIds = new Set(files.filter((file) => checkedIds.has(file.id)).map((file) => file.id));

  const allSelected = files.length > 0 && selectedIds.size === files.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleOne = (id) => {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setCheckedIds(allSelected ? new Set() : new Set(files.map((file) => file.id)));
  };

  const deleteFiles = async (ids) => {
    if (ids.length === 0) return;
    const message = ids.length === 1
      ? 'Hapus file ini dari riwayat? Data yang sudah diimpor tidak ikut terhapus.'
      : `Hapus ${ids.length} file dari riwayat? Data yang sudah diimpor tidak ikut terhapus.`;
    if (!window.confirm(message)) return;

    setIsDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch('/api/auth/academic/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Gagal menghapus file.');
      }
      setCheckedIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      onDeleted(ids);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Gagal menghapus file.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <FileText className="h-5 w-5 text-red-800" />
            {title}
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => deleteFiles([...selectedIds])}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-800 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-900 transition disabled:cursor-wait disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isDeleting ? 'Menghapus…' : `Hapus ${selectedIds.size} File Terpilih`}
            </button>
          )}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {files.length} File Terlampir
          </span>
        </div>
      </div>

      {deleteError && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {deleteError}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
          <Clock className="mr-2 h-4 w-4 animate-spin text-red-800" /> Memuat daftar file...
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center text-sm text-slate-500">
          <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          {emptyText}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={isDeleting}
                    aria-label="Pilih semua file"
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-red-800"
                  />
                </th>
                <th className="px-4 py-3">Nama File</th>
                <th className="px-4 py-3">Waktu Upload</th>
                <th className="px-4 py-3">Ukuran</th>
                <th className="px-4 py-3">Pengunggah</th>
                <th className="px-4 py-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {files.map((file) => {
                const isSelected = selectedIds.has(file.id);
                return (
                  <tr
                    key={file.id}
                    onClick={() => onPreview(file.id)}
                    className={`cursor-pointer transition hover:bg-red-50/60 ${isSelected ? 'bg-red-50/40' : ''}`}
                  >
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(file.id)}
                        disabled={isDeleting}
                        aria-label={`Pilih ${file.fileName}`}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-red-800"
                      />
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-emerald-100 px-2 py-1 text-emerald-800 font-mono text-[10px] font-extrabold uppercase">
                          {file.fileName.split('.').pop() || 'FILE'}
                        </span>
                        <span className="hover:underline">{file.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {new Date(file.uploadedAt).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {(file.fileSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {file.uploadedBy || 'Akademik'}
                    </td>
                    <td className="px-4 py-3.5 text-left whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onPreview(file.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-red-100 px-3 py-1.5 text-xs font-bold text-red-900 hover:bg-red-200 transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </button>
                        <a
                          href={`/api/auth/academic/files/${file.id}/download`}
                          download={file.fileName}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Unduh
                        </a>
                        <button
                          type="button"
                          onClick={() => deleteFiles([file.id])}
                          disabled={isDeleting}
                          aria-label={`Hapus ${file.fileName}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition disabled:cursor-wait disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
