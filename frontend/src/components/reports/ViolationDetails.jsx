"use client";

import { formatDeadline, punishmentTypeLabels } from "@/components/reports/AdminPunishment";

// Rincian pelanggaran per mahasiswa (dipindahkan dari Monitoring Mahasiswa).
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

export default function ViolationDetails({ violations }) {
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
