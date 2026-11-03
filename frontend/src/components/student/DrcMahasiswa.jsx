"use client";

import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { studentApi } from "@/lib/api";
import { DrcActivityDetails, DrcThemeTable, drcTypeLabels } from "@/lib/drc";

function DrcCard({ activity }) {
  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {drcTypeLabels[activity.jenis] ?? activity.jenis} · Semester {activity.semester}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{activity.judul}</h3>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${activity.sudahLewat ? "bg-slate-100 text-slate-700" : "bg-red-100 text-red-800"}`}>
          {activity.sudahLewat ? "Selesai" : "Wajib diikuti"}
        </span>
      </div>
      <DrcActivityDetails activity={activity} />
    </article>
  );
}

// Jadwal DRC untuk mahasiswa (baca saja); dibuka juga dari pemberitahuan DRC.
export default function DrcMahasiswa() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    studentApi("/api/drc")
      .then((result) => active && setActivities(result.kegiatan ?? []))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Kegiatan terdekat ditampilkan paling atas.
  const upcoming = activities.filter((activity) => !activity.sudahLewat).reverse();
  const past = activities.filter((activity) => activity.sudahLewat);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg">
        <h3 className="text-lg font-bold text-slate-900">DRC – Disiplin Refresh Competency</h3>
        <p className="mt-1 text-sm text-slate-600">
          Kegiatan wajib setiap awal semester untuk menyegarkan pemahaman 5 tema budaya disiplin kampus. Jadwal di bawah ini adalah kegiatan yang wajib Anda ikuti sesuai prodi dan angkatan Anda.
        </p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Jadwal Akan Datang</h3>
        {isLoading ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Memuat jadwal DRC...</p>
        ) : upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/95 p-8 text-center">
            <CalendarCheck className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm text-slate-600">Belum ada jadwal DRC. Anda akan mendapat pemberitahuan dan email saat jadwal diumumkan.</p>
          </div>
        ) : (
          upcoming.map((activity) => <DrcCard key={activity.id} activity={activity} />)
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-900">Garis Besar Materi DRC</h3>
        <DrcThemeTable />
      </div>

      {past.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Riwayat Kegiatan</h3>
          {past.map((activity) => <DrcCard key={activity.id} activity={activity} />)}
        </div>
      )}
    </div>
  );
}
