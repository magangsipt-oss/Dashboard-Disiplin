"use client";

import { useEffect, useState } from "react";
import { Award, CheckCircle2, Clock3, FileText, Search } from "lucide-react";
import { jsonRequest, studentApi } from "@/lib/api";
import {
  activityLevelLabels,
  claimStatus,
  claimTypeLabels,
  formatClaimDate,
} from "@/components/student/KlaimKegiatan";

// Usulan poin awal; Kemahasiswaan tetap dapat menyesuaikan (1–50).
const suggestedPoints = {
  LOMBA: { KAMPUS: 5, KABUPATEN_KOTA: 10, PROVINSI: 15, NASIONAL: 20, INTERNASIONAL: 25 },
  KEGIATAN_NON_AKADEMIK: { KAMPUS: 3, KABUPATEN_KOTA: 5, PROVINSI: 8, NASIONAL: 10, INTERNASIONAL: 12 },
};

const statusFilters = [
  { value: "DIAJUKAN", label: "Menunggu" },
  { value: "DISETUJUI", label: "Disetujui" },
  { value: "DITOLAK", label: "Ditolak" },
  { value: "", label: "Semua" },
];

function AdminClaimCard({ claim, onChanged }) {
  const [points, setPoints] = useState(String(suggestedPoints[claim.jenis]?.[claim.tingkat] ?? 5));
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const isPending = claim.status === "DIAJUKAN";

  async function decide(keputusan) {
    if (keputusan === "DITOLAK" && note.trim().length < 5) {
      setError("Isi alasan penolakan minimal 5 karakter.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await studentApi(
        `/api/admin/klaim-kegiatan/${claim.id}`,
        jsonRequest("PATCH", {
          keputusan,
          catatanPemeriksa: note,
          ...(keputusan === "DISETUJUI" ? { poin: Number(points) } : {}),
        }),
      );
      await onChanged();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Klaim #{claim.id} · {claimTypeLabels[claim.jenis] ?? claim.jenis}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{claim.namaKegiatan}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {claim.student.nama} · NIM {claim.student.nim} · {claim.student.jurusan}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${claimStatus[claim.status]?.badge ?? "bg-slate-100 text-slate-700"}`}>
          {claimStatus[claim.status]?.label ?? claim.status}
        </span>
      </div>

      <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold text-slate-500">Penyelenggara</dt>
          <dd className="mt-1 text-slate-800">{claim.penyelenggara}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Tingkat</dt>
          <dd className="mt-1 text-slate-800">{activityLevelLabels[claim.tingkat] ?? claim.tingkat}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Capaian / peran</dt>
          <dd className="mt-1 text-slate-800">{claim.capaian}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Tanggal kegiatan</dt>
          <dd className="mt-1 text-slate-800">{formatClaimDate(claim.tanggalKegiatan)}</dd>
        </div>
        {claim.deskripsi && (
          <div className="sm:col-span-4">
            <dt className="text-xs font-semibold text-slate-500">Keterangan mahasiswa</dt>
            <dd className="mt-1 whitespace-pre-wrap text-slate-800">{claim.deskripsi}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <a
          href={`/api/klaim-kegiatan/${claim.id}/bukti`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-semibold text-red-800 hover:underline"
        >
          <FileText className="h-4 w-4" /> Lihat sertifikat / dokumentasi
        </a>
        <span className="text-xs text-slate-500">
          Diajukan {new Date(claim.createdAt).toLocaleString("id-ID")} · Skor saat ini {claim.student.pointScore}
        </span>
      </div>

      {isPending ? (
        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <label className="block text-sm font-semibold text-slate-700">
              Poin tambahan
              <input
                type="number"
                min={1}
                max={50}
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Catatan pemeriksa (wajib bila ditolak)
              <input
                maxLength={1000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Usulan sistem: {suggestedPoints[claim.jenis]?.[claim.tingkat] ?? 5} poin untuk {claimTypeLabels[claim.jenis]?.toLowerCase()} tingkat {activityLevelLabels[claim.tingkat]?.toLowerCase()}. Skor maksimal 200 poin.
          </p>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => decide("DITOLAK")}
              className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 hover:bg-rose-50 disabled:opacity-60"
            >
              Tolak
            </button>
            <button
              type="button"
              disabled={isSaving || !(Number(points) >= 1 && Number(points) <= 50)}
              onClick={() => decide("DISETUJUI")}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {isSaving ? "Menyimpan..." : `Setujui +${points || 0} poin`}
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {claim.status === "DISETUJUI" ? `Disetujui dengan +${claim.poinDisetujui ?? 0} poin.` : "Klaim ditolak."}
          {claim.catatanPemeriksa && ` Catatan: ${claim.catatanPemeriksa}`}
        </p>
      )}
    </article>
  );
}

export default function AdminClaimQueue() {
  const [claims, setClaims] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [status, setStatus] = useState("DIAJUKAN");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadClaims(nextStatus = status) {
    setIsLoading(true);
    setError("");
    try {
      const query = nextStatus ? `?status=${nextStatus}` : "";
      const result = await studentApi(`/api/admin/klaim-kegiatan${query}`);
      setClaims(result.klaim ?? []);
      setPendingCount(result.pendingCount ?? 0);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    studentApi("/api/admin/klaim-kegiatan?status=DIAJUKAN")
      .then((result) => {
        if (!active) return;
        setClaims(result.klaim ?? []);
        setPendingCount(result.pendingCount ?? 0);
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function changeFilter(nextStatus) {
    setStatus(nextStatus);
    loadClaims(nextStatus);
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-6 py-8">
      <header className="rounded-3xl bg-gradient-to-r from-[#450a0a] via-[#7f1d1d] to-[#991b1b] p-6 text-white shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Kemahasiswaan</p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Verifikasi Klaim Kegiatan</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-red-100">
          Periksa sertifikat atau dokumentasi lomba dan kegiatan non-akademik dari mahasiswa. Poin tambahan langsung tercatat setelah klaim disetujui.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold">
          <Clock3 className="h-4 w-4" /> {pendingCount} klaim menunggu verifikasi
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.value || "all"}
            type="button"
            onClick={() => changeFilter(filter.value)}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              status === filter.value
                ? "bg-red-800 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {isLoading ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Memuat klaim kegiatan...</p>
      ) : claims.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/95 p-10 text-center">
          {status === "DIAJUKAN" ? (
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-700" />
          ) : (
            <Award className="mx-auto h-8 w-8 text-slate-400" />
          )}
          <p className="mt-3 font-semibold text-slate-800">
            {status === "DIAJUKAN" ? "Tidak ada klaim yang menunggu." : "Belum ada klaim."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <AdminClaimCard key={claim.id} claim={claim} onChanged={() => loadClaims()} />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => loadClaims()}
        className="self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
      >
        <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Muat ulang</span>
      </button>
    </section>
  );
}
