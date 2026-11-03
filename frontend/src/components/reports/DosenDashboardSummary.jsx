"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, FileSearch, MessageSquare, UserCheck } from "lucide-react";
import { studentApi } from "@/lib/api";
import {
  NotificationPanel,
  REFRESH_INTERVAL_MS,
  SummaryCard,
  daysSince,
  sum,
} from "./DashboardSummaryParts";

// Pemberitahuan untuk Dosen PA kadang memakai nama tab lama.
const notificationTabAliases = { laporan: "laporan-dpa" };

// Status dan batasnya dihitung backend (src/point-ledger.ts).
const statusOrder = ["TINDAK_LANJUT_KHUSUS", "PERLU_PEMBINAAN", "BAIK", "SANGAT_BAIK"];
const statusColors = {
  TINDAK_LANJUT_KHUSUS: "red",
  PERLU_PEMBINAAN: "amber",
  BAIK: "blue",
  SANGAT_BAIK: "emerald",
};
const statusLabels = {
  TINDAK_LANJUT_KHUSUS: "Tindak Lanjut Khusus",
  PERLU_PEMBINAAN: "Perlu Pembinaan",
  BAIK: "Baik",
  SANGAT_BAIK: "Sangat Baik",
};

function countBy(items, key) {
  return items.reduce((counts, item) => {
    counts[item[key]] = (counts[item[key]] ?? 0) + 1;
    return counts;
  }, {});
}

function buildCards(data, students) {
  const pendingReports = data?.laporan ?? [];
  const evidenceToReview = data?.pembinaan ?? [];
  const history = data?.riwayat ?? [];
  const appeals = (data?.konseling ?? []).flatMap((student) => student.sanggahans ?? []);
  const appealCounts = countBy(appeals, "status");
  const myReportCounts = countBy(data?.laporanSaya ?? [], "status");
  const rejectedByMe = history.filter((report) => report.status === "DITOLAK").length;
  // Semua mahasiswa bimbingan: merah, kuning, biru, lalu hijau; skor terendah dulu.
  const sortedStudents = [...students].sort(
    (left, right) =>
      statusOrder.indexOf(left.status) - statusOrder.indexOf(right.status) ||
      left.pointScore - right.pointScore,
  );
  const statusCounts = countBy(students, "status");
  const myReportsInProgress = sum([
    myReportCounts.DITERIMA,
    myReportCounts.DIVERIFIKASI,
    myReportCounts.DITINDAKLANJUTI,
  ]);

  return [
    {
      tab: "bimbingan",
      title: "Mahasiswa Bimbingan",
      description: "Semua mahasiswa bimbingan, diurutkan dari status yang paling perlu perhatian.",
      icon: UserCheck,
      tone: "emerald",
      source: "students",
      hideLink: true,
      headline: { label: "mahasiswa bimbingan", value: students.length },
      segments: statusOrder.map((status) => ({
        label: statusLabels[status],
        value: statusCounts[status] ?? 0,
        color: statusColors[status],
      })),
      items: sortedStudents.map((student) => ({
        key: student.id,
        color: statusColors[student.status] ?? "emerald",
        title: student.nama,
        subtitle: `NIM ${student.nim}${student.jurusan ? ` · ${student.jurusan}` : ""} · ${student.statusLabel ?? statusLabels[student.status]}`,
        value: student.pointScore,
        valueLabel: "poin",
      })),
      emptyText: "Belum ada mahasiswa bimbingan.",
    },
    {
      tab: "laporan-dpa",
      title: "Konfirmasi Laporan",
      description: "Laporan pelanggaran mahasiswa bimbingan yang menunggu keputusan Anda.",
      icon: ClipboardCheck,
      tone: "red",
      source: "server",
      headline: { label: "laporan menunggu konfirmasi", value: pendingReports.length },
      segments: [
        { label: "Menunggu konfirmasi", value: pendingReports.length, color: "amber" },
        { label: "Bukti punishment diperiksa", value: evidenceToReview.length, color: "blue" },
        { label: "Sudah dikonfirmasi", value: history.length - rejectedByMe, color: "emerald" },
        { label: "Ditolak", value: rejectedByMe, color: "slate" },
      ],
      items: [
        ...pendingReports.map((report) => ({
          key: `laporan-${report.id}`,
          color: "amber",
          title: report.terlapor?.nama ?? report.terlaporNama ?? "-",
          subtitle: `Laporan #${report.id} · kejadian ${daysSince(report.tanggalKejadian)} hari lalu`,
          value: report.terlapor?.pointScore ?? "-",
          valueLabel: "poin",
        })),
        ...evidenceToReview.map((task) => ({
          key: `pembinaan-${task.id}`,
          color: "red",
          title: task.student?.nama ?? "-",
          subtitle: `Bukti punishment menunggu diperiksa · ${daysSince(task.updatedAt)} hari`,
          value: "Bukti",
          valueLabel: "periksa",
        })),
      ],
      emptyText: "Tidak ada laporan atau bukti punishment yang menunggu Anda.",
    },
    {
      tab: "konseling",
      title: "Catatan & Konseling",
      description: "Sanggahan mahasiswa bimbingan yang perlu ditinjau.",
      icon: MessageSquare,
      tone: "purple",
      source: "server",
      headline: { label: "sanggahan menunggu tinjauan", value: appealCounts.DIAJUKAN ?? 0 },
      segments: [
        { label: "Menunggu tinjauan", value: appealCounts.DIAJUKAN ?? 0, color: "amber" },
        { label: "Disetujui", value: appealCounts.DISETUJUI ?? 0, color: "emerald" },
        { label: "Ditolak", value: appealCounts.DITOLAK ?? 0, color: "slate" },
      ],
      attention: appealCounts.DIAJUKAN ?? 0,
      attentionText: (count) => `${count} sanggahan menunggu tinjauan Anda.`,
      okText: "Tidak ada sanggahan yang menunggu tinjauan.",
    },
    {
      tab: "cek-laporan",
      title: "Cek Laporan",
      description: "Laporan satgas yang Anda kirim sendiri.",
      icon: FileSearch,
      tone: "blue",
      source: "server",
      headline: {
        label: "laporan Anda",
        value: sum([myReportsInProgress, myReportCounts.SELESAI, myReportCounts.DITOLAK]),
      },
      segments: [
        { label: "Diproses", value: myReportsInProgress, color: "amber" },
        { label: "Selesai", value: myReportCounts.SELESAI ?? 0, color: "emerald" },
        { label: "Ditolak", value: myReportCounts.DITOLAK ?? 0, color: "slate" },
      ],
      okText: "Pantau status laporan yang Anda kirim di sini.",
    },
  ];
}

export default function DosenDashboardSummary({ students, isLoadingStudents, studentsError, onOpen }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const load = () =>
      Promise.all([
        studentApi("/api/dosen/laporan"),
        studentApi("/api/dosen/pembinaan"),
        studentApi("/api/dosen/laporan/riwayat"),
        studentApi("/api/auth/counseling"),
        studentApi("/api/laporan/saya"),
      ])
        .then(([laporan, pembinaan, riwayat, konseling, laporanSaya]) => {
          if (!isMounted) return;
          setData({
            laporan: laporan.laporan ?? [],
            pembinaan: pembinaan.pembinaan ?? [],
            riwayat: riwayat.riwayat ?? [],
            konseling: konseling.students ?? [],
            laporanSaya: laporanSaya.laporan ?? [],
          });
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

  const cards = buildCards(data, students);
  // Kartu berisi daftar tampil paling atas, sebelum pemberitahuan.
  const listTabs = ["bimbingan", "laporan-dpa"];
  const renderCards = (list) => (
    <div className="grid gap-5 lg:grid-cols-2">
      {list.map((card, index) => {
        const fromServer = card.source === "server";
        return (
          <SummaryCard
            key={card.tab}
            card={card}
            delay={(index % 2) * 80}
            isReady={fromServer ? Boolean(data) : !isLoadingStudents && !studentsError}
            isFailed={fromServer ? !data && Boolean(error) : Boolean(studentsError)}
            onOpen={onOpen}
          />
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {renderCards(cards.filter((card) => listTabs.includes(card.tab)))}

      <NotificationPanel
        endpoint="/api/dosen/pemberitahuan"
        tabAliases={notificationTabAliases}
        onOpen={onOpen}
      />

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {renderCards(cards.filter((card) => !listTabs.includes(card.tab)))}
    </div>
  );
}
