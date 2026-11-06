// DRC = Disiplin Refresh Competency: kegiatan wajib mahasiswa setiap awal semester.
// Garis besar 5 tema mengikuti materi Seminar Refreshment Kedisiplinan Mahasiswa.
export const drcThemes = [
  {
    kode: 'WAKTU',
    tema: 'Waktu',
    materi: 'Ketepatan hadir, manajemen waktu, dan tanggung jawab terhadap jadwal.',
    aktivitas: 'Simulasi keterlambatan & jadwal harian',
    indikator: 'Presensi tepat waktu; tren keterlambatan',
  },
  {
    kode: 'AKADEMIK',
    tema: 'Akademik',
    materi: 'Kehadiran kuliah, tugas tepat waktu, kejujuran dan tanggung jawab belajar.',
    aktivitas: 'Studi kasus & kuis akademik',
    indikator: 'Kehadiran; tugas tepat waktu; pelanggaran',
  },
  {
    kode: 'TATA_TERTIB',
    tema: 'Tata Tertib dan Etika',
    materi: 'Etika komunikasi, sikap, seragam, penampilan dan aturan kampus.',
    aktivitas: 'Roleplay situasi di kampus',
    indikator: 'Kepatuhan aturan; catatan pelanggaran',
  },
  {
    kode: 'PROSEDUR_K3',
    tema: 'Prosedur & Keselamatan',
    materi: 'SOP, budaya K3, APD, serta aman saat praktikum dan di area kerja.',
    aktivitas: 'Praktik APD & identifikasi bahaya',
    indikator: 'Kepatuhan SOP/APD; temuan keselamatan',
  },
  {
    kode: 'LINGKUNGAN',
    tema: 'Lingkungan',
    materi: 'Kebersihan, pemilahan sampah, serta menjaga fasilitas kampus.',
    aktivitas: 'Aksi bersih & inspeksi kelas',
    indikator: 'Skor kebersihan; partisipasi mahasiswa',
  },
];

export const drcThemeLabels = Object.fromEntries(drcThemes.map((item) => [item.kode, item.tema]));

export const drcTypeLabels = {
  SEMINAR: 'Seminar',
  KEGIATAN_LAIN: 'Kegiatan Lain',
};

// Target kosong berarti semua prodi / semua angkatan.
export function describeDrcTarget({ targetProdi = [], targetAngkatan = [] }) {
  const prodi = targetProdi.length > 0 ? targetProdi.join(', ') : 'Semua prodi';
  const angkatan =
    targetAngkatan.length > 0
      ? `Angkatan ${[...targetAngkatan].sort((a, b) => a - b).join(', ')}`
      : 'Semua angkatan';
  return `${prodi} · ${angkatan}`;
}

// Tanggal dari API berformat YYYY-MM-DD (tanpa jam), jadi dibaca sebagai UTC.
export function formatDrcDate(value) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function DrcActivityDetails({ activity }) {
  return (
    <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-xs font-semibold text-slate-500">Tanggal</dt>
        <dd className="mt-1 text-slate-800">{formatDrcDate(activity.tanggal)}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-slate-500">Waktu</dt>
        <dd className="mt-1 text-slate-800">{activity.jamMulai}–{activity.jamSelesai} WITA</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-slate-500">Lokasi</dt>
        <dd className="mt-1 text-slate-800">{activity.lokasi}</dd>
      </div>
      <div className="sm:col-span-3">
        <dt className="text-xs font-semibold text-slate-500">Peserta wajib</dt>
        <dd className="mt-1 font-semibold text-slate-800">{describeDrcTarget(activity)}</dd>
      </div>
      <div className="sm:col-span-3">
        <dt className="text-xs font-semibold text-slate-500">Tema</dt>
        <dd className="mt-1 flex flex-wrap gap-1.5">
          {activity.tema.map((kode) => (
            <span key={kode} className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">
              {drcThemeLabels[kode] ?? kode}
            </span>
          ))}
        </dd>
      </div>
      {activity.deskripsi && (
        <div className="sm:col-span-3">
          <dt className="text-xs font-semibold text-slate-500">Keterangan</dt>
          <dd className="mt-1 whitespace-pre-wrap text-slate-800">{activity.deskripsi}</dd>
        </div>
      )}
    </dl>
  );
}

// Bagian halaman DRC: kartu putih dengan judul dan keterangan di dalamnya,
// sama seperti kartu formulir "Tambah Kegiatan DRC".
export function DrcSection({ title, description, children }) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {children}
    </section>
  );
}
