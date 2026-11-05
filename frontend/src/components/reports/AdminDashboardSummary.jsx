"use client";

import { useEffect, useState } from "react";
import {
  Award,
  Gavel,
  GraduationCap,
  Inbox,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { studentApi } from "@/lib/api";
import {
  NotificationPanel,
  REFRESH_INTERVAL_MS,
  SummaryCard,
  daysSince,
  sum,
} from "./DashboardSummaryParts";

// Beberapa pemberitahuan memakai nama tab lama; arahkan ke menu Kemahasiswaan.
const notificationTabAliases = { laporan: "laporan-kemahasiswaan" };

function buildCards(summary, students, lecturers) {
  const laporan = summary?.laporan ?? {};
  const klaim = summary?.klaim ?? {};
  const punishment = summary?.punishment ?? {};
  const aturan = summary?.aturan ?? {};
  // Dosen PA yang masih punya laporan belum dikonfirmasi, tunggakan terbanyak dulu.
  const lecturersWaiting = lecturers
    .map((lecturer) => ({ lecturer, pending: lecturer.laporanBelumDikonfirmasi ?? [] }))
    .filter(({ pending }) => pending.length > 0)
    .sort((left, right) => right.pending.length - left.pending.length);
  const reportsWaitingDpa = sum(lecturersWaiting.map(({ pending }) => pending.length));
  // Merah (≤ 50) dan kuning (51–99), skor terendah dulu.
  const studentsAtRisk = students
    .filter((student) => student.pointScore < 100)
    .sort((left, right) => left.pointScore - right.pointScore);
  const undisciplined = studentsAtRisk.filter((student) => student.pointScore <= 50).length;

  return [
    {
      tab: "laporan-kemahasiswaan",
      title: "Antrean Laporan",
      description: "Laporan satgas yang masuk dan alur penerusannya.",
      icon: Inbox,
      tone: "red",
      source: "server",
      headline: { label: "laporan perlu tindakan", value: laporan.PERLU_TINDAKAN },
      segments: [
        { label: "Perlu tindakan", value: laporan.PERLU_TINDAKAN, color: "red" },
        { label: "Menunggu Dosen PA", value: laporan.MENUNGGU_DPA, color: "amber" },
        { label: "Selesai", value: laporan.SELESAI, color: "emerald" },
        { label: "Ditolak", value: laporan.DITOLAK, color: "slate" },
      ],
      attention: laporan.PERLU_TINDAKAN,
      attentionText: (count) => `${count} laporan belum teridentifikasi dan perlu ditelusuri.`,
      okText: "Tidak ada laporan yang menunggu tindakan Anda.",
    },
    {
      tab: "klaim-kemahasiswaan",
      title: "Klaim Kegiatan",
      description: "Klaim poin lomba dan kegiatan non-akademik.",
      icon: Award,
      tone: "amber",
      source: "server",
      headline: { label: "klaim menunggu verifikasi", value: klaim.DIAJUKAN ?? 0 },
      segments: [
        { label: "Diajukan", value: klaim.DIAJUKAN ?? 0, color: "amber" },
        { label: "Disetujui", value: klaim.DISETUJUI ?? 0, color: "emerald" },
        { label: "Ditolak", value: klaim.DITOLAK ?? 0, color: "slate" },
      ],
      attention: klaim.DIAJUKAN ?? 0,
      attentionText: (count) => `${count} klaim menunggu verifikasi Anda.`,
      okText: "Semua klaim sudah diverifikasi.",
    },
    {
      tab: "punishment",
      title: "Punishment",
      description: "Tindak lanjut edukatif atas pelanggaran yang terkonfirmasi.",
      icon: Gavel,
      tone: "purple",
      source: "server",
      headline: { label: "pelanggaran belum ditetapkan punishment", value: punishment.menunggu },
      segments: [
        { label: "Sedang berjalan", value: punishment.berjalan, color: "blue" },
        { label: "Bukti diperiksa Dosen PA", value: punishment.diperiksa, color: "amber" },
        { label: "Selesai", value: punishment.selesai, color: "emerald" },
      ],
      extra: { label: "Terlambat", value: punishment.terlambat },
      attention: (punishment.menunggu ?? 0) + (punishment.terlambat ?? 0),
      attentionText: () =>
        `${punishment.menunggu ?? 0} pelanggaran menunggu penetapan · ${punishment.terlambat ?? 0} punishment terlambat.`,
      okText: "Semua punishment berjalan sesuai jadwal.",
    },
    {
      tab: "pengaturan-poin",
      title: "Pengaturan Poin",
      description: "Aturan dan bobot poin pelanggaran.",
      icon: SlidersHorizontal,
      tone: "blue",
      source: "server",
      headline: { label: "aturan pelanggaran aktif", value: aturan.aktif },
      segments: [
        { label: "Aktif", value: aturan.aktif, color: "blue" },
        { label: "Nonaktif", value: aturan.nonaktif, color: "slate" },
      ],
      okText: "Aturan aktif dipakai untuk laporan dan potongan absensi.",
    },
    {
      tab: "data-poin",
      title: "Monitoring Mahasiswa",
      description: "Sebaran kategori skor kedisiplinan mahasiswa.",
      icon: GraduationCap,
      tone: "emerald",
      source: "monitoring",
      headline: { label: "mahasiswa perlu dipantau", value: studentsAtRisk.length },
      segments: [
        { label: "Tidak disiplin", value: undisciplined, color: "red" },
        { label: "Kurang disiplin", value: studentsAtRisk.length - undisciplined, color: "amber" },
      ],
      items: studentsAtRisk.map((student) => ({
        key: student.id,
        color: student.pointScore <= 50 ? "red" : "amber",
        title: student.nama,
        subtitle: `NIM ${student.nim} · ${student.jurusan}${student.dosenPa ? ` · DPA ${student.dosenPa.nama}` : ""}`,
        value: student.pointScore,
        valueLabel: "poin",
      })),
      emptyText: "Semua mahasiswa berstatus disiplin.",
    },
    {
      tab: "monitoring-dpa",
      title: "Monitoring DPA",
      description: "Keaktifan Dosen PA menindaklanjuti laporan.",
      icon: Users,
      tone: "slate",
      source: "monitoring",
      headline: { label: "Dosen PA belum mengonfirmasi laporan", value: lecturersWaiting.length },
      segments: [
        { label: "Laporan tertunda", value: reportsWaitingDpa, color: "amber" },
      ],
      items: lecturersWaiting.map(({ lecturer, pending }) => {
        const oldestWait = Math.max(...pending.map((report) => daysSince(report.tanggalLapor)));
        return {
          key: lecturer.id,
          color: "amber",
          title: lecturer.nama,
          subtitle: `Laporan tertua menunggu ${oldestWait} hari`,
          value: pending.length,
          valueLabel: "laporan",
        };
      }),
      emptyText: "Semua laporan sudah dikonfirmasi Dosen PA.",
    },
  ];
}

export default function AdminDashboardSummary({
  students,
  lecturers,
  isLoadingMonitoring,
  monitoringError,
  onOpen,
}) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const load = () =>
      studentApi("/api/admin/ringkasan")
        .then((data) => {
          if (!isMounted) return;
          setSummary(data);
          setError("");
        })
        .catch((loadError) => {
          if (isMounted) setError(loadError.message);
        });

    load();
    const timer = window.setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_INTERVAL_MS);
    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const cards = buildCards(summary, students, lecturers);
  // Monitoring tampil paling atas, sebelum pemberitahuan.
  const monitoringTabs = ["data-poin", "monitoring-dpa"];
  const renderCards = (list) => (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {list.map((card, index) => {
        const fromServer = card.source === "server";
        return (
          <SummaryCard
            key={card.tab}
            card={card}
            delay={(index % 2) * 80}
            isReady={fromServer ? Boolean(summary) : !isLoadingMonitoring && !monitoringError}
            isFailed={fromServer ? !summary && Boolean(error) : Boolean(monitoringError)}
            onOpen={onOpen}
          />
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {renderCards(cards.filter((card) => monitoringTabs.includes(card.tab)))}

      <NotificationPanel
        endpoint="/api/admin/pemberitahuan"
        tabAliases={notificationTabAliases}
        onOpen={onOpen}
      />

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {renderCards(cards.filter((card) => !monitoringTabs.includes(card.tab)))}
    </div>
  );
}
