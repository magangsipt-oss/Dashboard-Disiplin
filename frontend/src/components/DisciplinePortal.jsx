'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import LaporSatgas from './student/LaporSatgas';
import CekLaporan from './student/CekLaporan';
import TindakLanjut from './student/TindakLanjut';
import SanggahanMahasiswa from './student/SanggahanMahasiswa';
import KlaimKegiatan from './student/KlaimKegiatan';
import AktivitasMahasiswa from './student/AktivitasMahasiswa';
import DrcMahasiswa from './student/DrcMahasiswa';
import AdminReportQueue from './reports/AdminReportQueue';
import AdminClaimQueue from './reports/AdminClaimQueue';
import AdminPunishment from './reports/AdminPunishment';
import AdminPointRules from './reports/AdminPointRules';
import AdminPointData from './reports/AdminPointData';
import AdminLecturerMonitoring from './reports/AdminLecturerMonitoring';
import AdminDrc from './reports/AdminDrc';
import AdminDashboardSummary from './reports/AdminDashboardSummary';
import DosenDashboardSummary from './reports/DosenDashboardSummary';
import DosenReportWorkflow from './reports/DosenReportWorkflow';
import FilePreviewModal from './modals/FilePreviewModal';
import KemahasiswaanSwitcher from './KemahasiswaanSwitcher';
import NotificationBell from './NotificationBell';
import TemplatePreviewModal from './modals/TemplatePreviewModal';
import AcademicFileHistory from './tables/AcademicFileHistory';
import { 
  ShieldCheck, 
  UserCheck, 
  GraduationCap,
  Award, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Bookmark, 
  LogOut, 
  Calendar,
  AlertCircle,
  FileText,
  BookOpen,
  ClipboardCheck,
  Leaf,
  Scale,
  ArrowRight,
  HelpCircle,
  MapPin,
  Mail,
  Phone,
  X,
  Users,
  Upload,
  LayoutDashboard,
  Megaphone,
  FileSearch,
  Inbox,
  Gavel,
  SlidersHorizontal,
  UserCog,
  Ellipsis,
  CalendarCheck,
  CalendarDays,
  CircleCheck,
} from 'lucide-react';

const disciplinePillars = [
  { pillar: 'WAKTU', label: 'Disiplin Waktu', Icon: Clock },
  { pillar: 'AKADEMIK', label: 'Disiplin Akademik', Icon: BookOpen },
  { pillar: 'TATA_TERTIB', label: 'Disiplin Tata Tertib dan Etika', Icon: Scale },
  { pillar: 'PROSEDUR_K3', label: 'Disiplin Prosedur dan Keselamatan (K3)', Icon: ClipboardCheck },
  { pillar: 'LINGKUNGAN', label: 'Disiplin Lingkungan', Icon: Leaf },
];

const violationSeverities = [
  { severity: 'RINGAN', label: 'Ringan', pointRange: '5–10', minimumPoints: 5, maximumPoints: 10, followUp: 'Pembinaan edukatif sesuai pilar pelanggaran', badge: 'bg-amber-100 text-amber-800' },
  { severity: 'SEDANG', label: 'Sedang', pointRange: '10–20', minimumPoints: 10, maximumPoints: 20, followUp: 'Pembinaan edukatif, termasuk refleksi sesuai pilar', badge: 'bg-orange-100 text-orange-800' },
  { severity: 'BERAT', label: 'Berat', pointRange: '15–30', minimumPoints: 15, maximumPoints: 30, followUp: 'Pembinaan edukatif ditetapkan Kemahasiswaan', badge: 'bg-red-100 text-red-800' },
];

const severityLegacyCount = {
  BERAT: 'SANGAT_BERAT',
};

const pointChangeTypeLabels = {
  LATE: 'Terlambat',
  UNEXCUSED_ABSENCE: 'Tidak hadir tanpa keterangan',
  DISCIPLINE_VIOLATION: 'Pelanggaran tata tertib',
  COMPETITION: 'Mengikuti lomba',
  NON_ACADEMIC_ACTIVITY: 'Kegiatan non-akademik',
  REPORTED_VIOLATION: 'Pelanggaran terverifikasi',
  POINT_RESTORATION: 'Pemulihan poin',
  PUNISHMENT_PENALTY: 'Sanksi punishment terlambat',
};

// Konstanta statis: dibuat sekali, bukan tiap render.
const officialLogoUrl = "/poltek-simas-berau.png";
const portalAccessBackground = "/portal-access-background.jpg";
const campusAddress =
  "Politeknik Sinar Mas Berau Coal, Jl. Raja Alam II, Kel. Rinding, Teluk Bayur, Kabupaten Berau, Kalimantan Timur 77315";
const campusMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(campusAddress)}`;
const campusMapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(campusAddress)}&output=embed`;
const heroImages = [
  '/campus-team.png',
  '/header-student-team.png',
  '/header-vocational-training.png',
];
function StudentIcon({ className }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2H5Z" />
    </svg>
  );
}
// Kartu sambutan Mahasiswa/Dosen PA. HP: lonceng sebaris badge, profil di bawah.
// Laptop: lonceng di tengah vertikal, tepat di kiri kotak profil.
const welcomeCardClassName =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 [grid-template-areas:'badge_bell'_'heading_heading'_'identity_identity'_'profile_profile'] md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-6 md:[grid-template-areas:'badge_side'_'heading_side'_'identity_side']";

// Badge semester satu baris di semua halaman; terpotong "…" bila layar terlalu sempit.
function SemesterBadge() {
  return (
    <div className="inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full border border-red-500/30 bg-red-900/40 px-3 py-1 text-xs font-semibold text-amber-300">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">Semester Genap 2026/2027</span>
    </div>
  );
}
// Urutan kartu pilihan login (juga urutan slide di HP).
const accessCards = [
  {
    role: 'mhs',
    title: 'Mahasiswa',
    description: 'Cek rekam jejak kedisiplinan dan presensi yang diunggah tim akademik, ajukan sanggah, serta klaim poin kegiatan non-akademik.',
    action: 'Masuk via NIM',
    icon: StudentIcon,
    reveal: 'left',
    delay: '80',
  },
  {
    role: 'dosen',
    title: 'Dosen PA',
    description: 'Monitoring statistik kedisiplinan mahasiswa bimbingan, verifikasi jadwal konseling, dan berikan catatan bimbingan.',
    action: 'Masuk via Email',
    icon: GraduationCap,
    reveal: 'zoom',
    delay: '160',
  },
  {
    role: 'akademik',
    title: 'Akademik',
    description: 'Masuk ke portal Akademik menggunakan email dan kata sandi akun Akademik.',
    action: 'Masuk via Email',
    icon: BookOpen,
    reveal: 'right',
    delay: '240',
  },
  {
    role: 'admin',
    title: 'Kemahasiswaan',
    description: 'Masuk menggunakan email untuk memverifikasi klaim sertifikat, kegiatan non-akademik, dan sanggahan presensi.',
    action: 'Masuk via Email',
    icon: ShieldCheck,
    reveal: 'right',
    delay: '320',
  },
];
const navigationByRole = {
  mhs: [
    { id: 'dashboard', label: 'Ringkasan', short: 'Ringkasan', icon: LayoutDashboard, description: 'Ringkasan skor kedisiplinan, presensi, dan riwayat perubahan poin Anda.' },
    { id: 'sanggah', label: 'Sanggah Pelanggaran', short: 'Sanggah', icon: Scale, description: 'Ajukan keberatan atas pengurangan poin yang menurut Anda tidak sesuai, lengkap dengan alasan dan bukti.' },
    { id: 'lapor', label: 'Lapor Satgas', short: 'Lapor', icon: Megaphone, description: 'Laporkan pelanggaran disiplin yang Anda temui di lingkungan kampus. Identitas pelapor dirahasiakan.' },
    { id: 'cek-laporan', label: 'Cek Laporan', short: 'Cek Laporan', icon: FileSearch, description: 'Lihat semua laporan yang sudah Anda kirim beserta status prosesnya.' },
    { id: 'tindak-lanjut', label: 'Tindak Lanjut', short: 'Tindak Lanjut', icon: ClipboardCheck, description: 'Lihat tugas pembinaan dari pelanggaran yang dikonfirmasi dan unggah bukti penyelesaian untuk memulihkan poin.' },
    { id: 'klaim', label: 'Klaim Kegiatan', short: 'Klaim', icon: Award, description: 'Ajukan klaim poin tambahan dari lomba, sertifikasi, atau kegiatan non-akademik untuk diverifikasi.' },
    { id: 'drc', label: 'DRC', short: 'DRC', icon: CalendarDays, description: 'Lihat jadwal Disiplin Refresh Competency (DRC) yang wajib diikuti setiap awal semester.' },
  ],
  dosen: [
    { id: 'bimbingan', label: 'Ringkasan', short: 'Ringkasan', icon: LayoutDashboard, description: 'Daftar mahasiswa bimbingan beserta skor dan status kedisiplinannya.' },
    { id: 'laporan-dpa', label: 'Konfirmasi Laporan', short: 'Konfirmasi', icon: CircleCheck, description: 'Tinjau laporan pelanggaran mahasiswa bimbingan Anda, lalu konfirmasi atau tolak.' },
    { id: 'konseling', label: 'Catatan & Konseling', short: 'Konseling', icon: MessageSquare, description: 'Catat pembinaan dan jadwalkan panggilan konseling untuk mahasiswa bimbingan.' },
    { id: 'lapor', label: 'Lapor Satgas', short: 'Lapor', icon: Megaphone, description: 'Laporkan pelanggaran disiplin yang Anda temui di lingkungan kampus. Identitas pelapor dirahasiakan.' },
    { id: 'cek-laporan', label: 'Cek Laporan', short: 'Cek Laporan', icon: FileSearch, description: 'Lihat semua laporan yang sudah Anda kirim beserta status prosesnya.' },
  ],
  admin: [
    { id: 'dashboard', label: 'Ringkasan', short: 'Ringkasan', icon: LayoutDashboard, description: 'Ringkasan pemantauan kedisiplinan seluruh mahasiswa.' },
    { id: 'laporan-kemahasiswaan', label: 'Antrean Laporan', short: 'Antrean', icon: Inbox, description: 'Telusuri laporan satgas yang masuk dan teruskan ke Dosen PA untuk dikonfirmasi.' },
    { id: 'klaim-kemahasiswaan', label: 'Klaim Kegiatan', short: 'Klaim', icon: Award, description: 'Verifikasi klaim poin kegiatan yang diajukan mahasiswa.' },
    { id: 'punishment', label: 'Punishment', short: 'Punishment', icon: Gavel, description: 'Tetapkan tindak lanjut edukatif untuk pelanggaran yang sudah dikonfirmasi.' },
    { id: 'pengaturan-poin', label: 'Pengaturan Poin', short: 'Atur Poin', icon: SlidersHorizontal, description: 'Atur aturan poin kedisiplinan mahasiswa.' },
    { id: 'data-poin', label: 'Monitoring Mahasiswa', short: 'Mahasiswa', icon: Users, description: 'Pantau skor dan riwayat kedisiplinan setiap mahasiswa.' },
    { id: 'monitoring-dpa', label: 'Monitoring DPA', short: 'Monitor DPA', icon: UserCheck, description: 'Pantau keaktifan Dosen PA dalam menindaklanjuti laporan dan pembinaan.' },
    { id: 'drc', label: 'DRC', short: 'DRC', icon: CalendarDays, description: 'Umumkan seminar atau kegiatan Disiplin Refresh Competency (DRC) yang wajib diikuti mahasiswa setiap awal semester.' },
  ],
  akademik: [
    { id: 'upload-absensi', label: 'Upload Absensi', short: 'Absensi', icon: CalendarCheck, description: 'Unggah file presensi Excel/CSV untuk diproses menjadi catatan kedisiplinan.' },
    { id: 'upload-mahasiswa', label: 'Upload Data Mahasiswa', short: 'Data Mhs', icon: Users, description: 'Unggah data mahasiswa agar akun dan profil tersinkron dengan sistem.' },
    { id: 'upload-dosen', label: 'Upload Data Dosen', short: 'Data Dosen', icon: GraduationCap, description: 'Unggah data dosen agar akun dan profil tersinkron dengan sistem.' },
    { id: 'pembagian-bimbingan', label: 'Pembagian Mahasiswa Bimbingan', short: 'Bimbingan', icon: UserCog, description: 'Tetapkan dosen pembimbing akademik untuk setiap mahasiswa.' },
    { id: 'lapor', label: 'Lapor Satgas', short: 'Lapor', icon: Megaphone, description: 'Laporkan pelanggaran disiplin yang Anda temui di lingkungan kampus. Identitas pelapor dirahasiakan.' },
    { id: 'cek-laporan', label: 'Cek Laporan', short: 'Cek Laporan', icon: FileSearch, description: 'Lihat semua laporan yang sudah Anda kirim beserta status prosesnya.' },
  ],
};

// Bar navigasi bawah khusus HP. Maksimal 5 slot: bila menu lebih dari 5,
// 4 menu pertama tampil dan sisanya masuk lembar "Lainnya".
// Penanda asal pembukaan dashboard (dibaca sekali setelah reload/login) untuk menyusun riwayat back.
const HISTORY_ENTRY_KEY = 'sigma-history-entry';
function markHistoryEntry(value) {
  try {
    window.sessionStorage.setItem(HISTORY_ENTRY_KEY, value);
  } catch {
    // Penyimpanan diblokir: riwayat memakai susunan bawaan.
  }
}
function readHistoryEntry() {
  try {
    const value = window.sessionStorage.getItem(HISTORY_ENTRY_KEY);
    window.sessionStorage.removeItem(HISTORY_ENTRY_KEY);
    return value;
  } catch {
    return null;
  }
}

function MobileBottomNav({ items, activeTab, onSelect }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const hasMore = items.length > 5;
  const mainItems = hasMore ? items.slice(0, 4) : items;
  const moreItems = hasMore ? items.slice(4) : [];
  const isMoreActive = moreItems.some((item) => item.id === activeTab);

  const select = (id) => {
    onSelect(id);
    setIsMoreOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const slotClassName = (isActive) =>
    `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold transition-colors ${
      isActive ? 'text-amber-300' : 'text-red-100/70 active:text-white'
    }`;
  const iconWrapClassName = (isActive) =>
    `flex h-8 w-12 items-center justify-center rounded-full transition-all ${
      isActive ? 'bg-red-700 text-white shadow-md shadow-red-950/50' : ''
    }`;

  return (
    <div className="sm:hidden">
      {isMoreOpen && (
        <button
          type="button"
          aria-label="Tutup menu lainnya"
          onClick={() => setIsMoreOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]"
        />
      )}
      {isMoreOpen && (
        <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-red-800/60 bg-[#450a0a]/95 p-2 shadow-2xl backdrop-blur-md">
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-red-200">Menu lainnya</p>
          {moreItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => select(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors ${
                activeTab === item.id ? 'bg-red-700 text-white' : 'text-slate-100 active:bg-red-900/60'
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      )}

      <nav
        aria-label="Menu utama"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-red-800/60 bg-[#450a0a]/95 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md"
      >
        <div className="flex items-stretch gap-1">
          {mainItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => select(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={slotClassName(isActive)}
              >
                <span className={iconWrapClassName(isActive)}>
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="max-w-full truncate">{item.short}</span>
              </button>
            );
          })}
          {hasMore && (
            <button
              type="button"
              onClick={() => setIsMoreOpen((open) => !open)}
              aria-expanded={isMoreOpen}
              className={slotClassName(isMoreActive || isMoreOpen)}
            >
              <span className={iconWrapClassName(isMoreActive || isMoreOpen)}>
                {isMoreOpen ? <X className="h-5 w-5" /> : <Ellipsis className="h-5 w-5" />}
              </span>
              <span>Lainnya</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

function WelcomeHeading({ name, className = '' }) {
  return (
    <h2 className={`min-w-0 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl ${className}`}>
      <span className="block">Selamat Datang,</span>
      <span className="block">{name}</span>
    </h2>
  );
}

function MenuHeader({ item, roleLabel }) {
  if (!item) return null;
  return (
    <section data-scroll-reveal className="rounded-3xl border border-red-600/30 bg-gradient-to-r from-[#450a0a]/95 via-[#7f1d1d]/95 to-[#991b1b]/95 p-6 text-white shadow-2xl sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-300">{roleLabel}</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{item.label}</h2>
      {item.description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-red-100">{item.description}</p>
      )}
    </section>
  );
}

const getLatestViolation = (student) => student.pointChanges?.[0];
const hasViolation = (student) => Boolean(getLatestViolation(student));
const hasCoachingForLatestViolation = (student) => {
  const latestViolation = getLatestViolation(student);
  const latestCoaching = student.counselingRecords?.[0];
  if (!latestViolation?.createdAt || !latestCoaching?.createdAt) {
    return false;
  }
  return new Date(latestCoaching.createdAt) >= new Date(latestViolation.createdAt);
};

// Polling yang berhenti saat tab browser tersembunyi, lalu langsung
// menyegarkan data ketika tab kembali terlihat.
const POLL_INTERVAL_MS = 15000;
function startPolling(refresh) {
  const timer = window.setInterval(() => {
    if (!document.hidden) refresh();
  }, POLL_INTERVAL_MS);
  const handleVisibility = () => {
    if (!document.hidden) refresh();
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}

export default function App({ hasSessionCookie = false }) {
  const router = useRouter();
  // Jika cookie sesi ada, tahan render sampai sesi diperiksa agar landing tidak berkedip.
  const [activePage, setActivePage] = useState(hasSessionCookie ? 'checking' : 'landing');
  const [activeTab, setActiveTabState] = useState('dashboard');
  const activeTabRef = useRef(activeTab);
  const authenticatedUserRef = useRef(null);
  // Setiap pindah menu dicatat ke riwayat browser agar tombol back HP kembali ke menu sebelumnya.
  const setActiveTab = useCallback((tab, { replace = false } = {}) => {
    if (!replace && tab === activeTabRef.current) return;
    activeTabRef.current = tab;
    const state = { ...window.history.state, sigmaTab: tab, sigmaPage: undefined };
    if (replace) {
      window.history.replaceState(state, '');
    } else {
      window.history.pushState(state, '');
    }
    setActiveTabState(tab);
  }, []);

  // Susun riwayat saat dashboard dibuka. Urutan back yang dituju:
  // menu → Ringkasan → (Kemahasiswaan, bila sedang masuk sebagai akun lain) → halaman utama → keluar.
  const initDashboardHistory = useCallback((homeTab, profile) => {
    const entry = readHistoryEntry();
    const base = window.history.state;
    if (profile.impersonator) {
      window.history.replaceState({ ...base, sigmaTab: undefined, sigmaPage: 'kemahasiswaan' }, '');
      window.history.pushState({ ...base, sigmaTab: homeTab, sigmaPage: undefined }, '');
    } else if (entry === 'from-landing' || entry === 'return-kemahasiswaan') {
      // Entri sebelumnya sudah halaman utama, cukup ganti entri ini menjadi Ringkasan.
      window.history.replaceState({ ...base, sigmaTab: homeTab, sigmaPage: undefined }, '');
    } else {
      window.history.replaceState({ ...base, sigmaTab: undefined, sigmaPage: 'landing' }, '');
      window.history.pushState({ ...base, sigmaTab: homeTab, sigmaPage: undefined }, '');
    }
    activeTabRef.current = homeTab;
    setActiveTabState(homeTab);
  }, []);

  useEffect(() => {
    const handlePopState = (event) => {
      const user = authenticatedUserRef.current;
      const tab = event.state?.sigmaTab;
      const isKnownTab = user && (navigationByRole[user.role] ?? []).some((item) => item.id === tab);
      if (isKnownTab) {
        activeTabRef.current = tab;
        setActiveTabState(tab);
        setActivePage('dashboard');
        window.scrollTo({ top: 0 });
        return;
      }
      if (event.state?.sigmaPage === 'kemahasiswaan' && user?.impersonator) {
        // Kembali ke halaman Kemahasiswaan: akhiri mode masuk sebagai akun lain.
        markHistoryEntry('return-kemahasiswaan');
        fetch('/api/auth/impersonation', { method: 'DELETE' }).finally(() => window.location.reload());
        return;
      }
      // Entri lain (halaman utama atau riwayat sebelum dashboard): tampilkan halaman utama.
      setActivePage((current) => (current === 'dashboard' ? 'landing' : current));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [activeHeroImage, setActiveHeroImage] = useState(0);
  const [activeAccessSlide, setActiveAccessSlide] = useState(0);

  const [selectedAppealChangeId, setSelectedAppealChangeId] = useState(null);

  const [loginError, setLoginError] = useState('');
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [studentPoints, setStudentPoints] = useState(null);
  const [isLoadingStudentPoints, setIsLoadingStudentPoints] = useState(false);
  const [studentPointsError, setStudentPointsError] = useState('');
  const [advisor, setAdvisor] = useState(null);
  const [advisorError, setAdvisorError] = useState('');
  const [advisorStudents, setAdvisorStudents] = useState([]);
  const [isLoadingAdvisorStudents, setIsLoadingAdvisorStudents] = useState(false);
  const [advisorStudentsError, setAdvisorStudentsError] = useState('');
  const [isLoadingCounseling, setIsLoadingCounseling] = useState(false);
  const [counselingStudents, setCounselingStudents] = useState([]);
  const [counselingStudentsError, setCounselingStudentsError] = useState('');
  const [selectedCounselingStudentId, setSelectedCounselingStudentId] = useState('');
  const [counselingForm, setCounselingForm] = useState({
    type: 'GUIDANCE_NOTE',
    note: '',
    counselingDate: '',
  });
  const [isSavingCounseling, setIsSavingCounseling] = useState(false);
  const [counselingStatus, setCounselingStatus] = useState('');
  const [appealNotes, setAppealNotes] = useState({});
  const [decidingAppealId, setDecidingAppealId] = useState(null);
  const [adminMonitoring, setAdminMonitoring] = useState({ students: [], lecturers: [] });
  const [isLoadingAdminMonitoring, setIsLoadingAdminMonitoring] = useState(false);
  const [adminMonitoringError, setAdminMonitoringError] = useState('');
  const [academicAttendanceFile, setAcademicAttendanceFile] = useState(null);
  const [academicAttendanceResult, setAcademicAttendanceResult] = useState(null);
  const [academicAttendanceError, setAcademicAttendanceError] = useState('');
  const [isImportingAcademicAttendance, setIsImportingAcademicAttendance] = useState(false);
  const [newStudentFile, setNewStudentFile] = useState(null);
  const [newStudentImportResult, setNewStudentImportResult] = useState(null);
  const [newStudentImportError, setNewStudentImportError] = useState('');
  const [isImportingNewStudents, setIsImportingNewStudents] = useState(false);
  const [newLecturerFile, setNewLecturerFile] = useState(null);
  const [newLecturerImportResult, setNewLecturerImportResult] = useState(null);
  const [newLecturerImportError, setNewLecturerImportError] = useState('');
  const [isImportingNewLecturers, setIsImportingNewLecturers] = useState(false);
  const [advisorAssignmentFile, setAdvisorAssignmentFile] = useState(null);
  const [advisorAssignmentResult, setAdvisorAssignmentResult] = useState(null);
  const [advisorAssignmentError, setAdvisorAssignmentError] = useState('');
  const [isImportingAdvisorAssignments, setIsImportingAdvisorAssignments] = useState(false);
  const [academicFiles, setAcademicFiles] = useState([]);
  const [isLoadingAcademicFiles, setIsLoadingAcademicFiles] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewSearchTerm, setPreviewSearchTerm] = useState('');
  const [templatePreviewCategory, setTemplatePreviewCategory] = useState(null);
  const closeTemplatePreview = useCallback(() => setTemplatePreviewCategory(null), []);

  const dashboardNavigation =
    navigationByRole[authenticatedUser?.role] ?? navigationByRole.mhs;
  const hasRoleSwitcher = authenticatedUser?.role === 'admin' || Boolean(authenticatedUser?.impersonator);
  const homeTab = dashboardNavigation[0].id;
  const activeMenu = dashboardNavigation.find((item) => item.id === activeTab);
  // Menu konseling dosen hanya menampilkan mahasiswa yang pernah mengajukan sanggahan.
  const appealingStudents = counselingStudents.filter(
    (student) => (student.sanggahans ?? []).length > 0,
  );
  const selectedCounselingStudent = appealingStudents.find(
    (student) => String(student.id) === selectedCounselingStudentId,
  );

  useEffect(() => {
    let isMounted = true;

    fetch('/api/auth/me')
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return response.json();
      })
      .then((data) => {
        if (isMounted && data?.profile) {
          setAuthenticatedUser(data.profile);
          authenticatedUserRef.current = data.profile;
          initDashboardHistory(
            (navigationByRole[data.profile.role] ?? navigationByRole.mhs)[0].id,
            data.profile,
          );
          setActivePage('dashboard');
          if (data.profile.role === 'mhs') {
            setIsLoadingStudentPoints(true);
            fetch('/api/auth/points')
              .then(async (response) => {
                const points = await response.json();
                if (!response.ok) {
                  throw new Error(points.message || 'Data poin mahasiswa gagal dimuat.');
                }
                return points;
              })
              .then((points) => {
                if (isMounted) {
                  setStudentPoints(points);
                  setStudentPointsError('');
                }
              })
              .catch((error) => {
                if (isMounted) {
                  setStudentPointsError(
                    error instanceof Error
                      ? error.message
                      : 'Data poin mahasiswa gagal dimuat.',
                  );
                }
              })
              .finally(() => {
                if (isMounted) {
                  setIsLoadingStudentPoints(false);
                }
              });

            fetch('/api/auth/advisor')
              .then(async (response) => {
                const data = await response.json();
                if (!response.ok) {
                  throw new Error(data.message || 'Status dosen PA gagal dimuat.');
                }
                return data.advisor ?? null;
              })
              .then((assignedAdvisor) => {
                if (isMounted) setAdvisor(assignedAdvisor);
              })
              .catch((error) => {
                if (isMounted) {
                  setAdvisorError(
                    error instanceof Error
                      ? error.message
                      : 'Status dosen PA gagal dimuat.',
                  );
                }
              });
          }
        } else if (isMounted) {
          setActivePage((current) => (current === 'checking' ? 'landing' : current));
        }
      })
      .catch((error) => {
        if (isMounted) {
          console.error('Tidak dapat memeriksa sesi login:', error);
          setActivePage((current) => (current === 'checking' ? 'landing' : current));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initDashboardHistory]);

  useEffect(() => {
    const revealElements = document.querySelectorAll('[data-scroll-reveal]');
    const showAll = () => {
      revealElements.forEach((element) => element.classList.add('is-visible'));
    };

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      showAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [activePage, activeTab]);

  useEffect(() => {
    if (authenticatedUser?.role !== 'dosen' || activePage !== 'dashboard') {
      return undefined;
    }

    let isMounted = true;
    const loadAdvisorStudents = async (showLoading) => {
      if (showLoading) {
        setIsLoadingAdvisorStudents(true);
      }
      try {
        const response = await fetch('/api/auth/advisor/students');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Daftar mahasiswa bimbingan gagal dimuat.');
        }
        if (isMounted) {
          setAdvisorStudents(data.students ?? []);
          setAdvisorStudentsError('');
        }
      } catch (error) {
        if (isMounted) {
          setAdvisorStudentsError(
            error instanceof Error
              ? error.message
              : 'Daftar mahasiswa bimbingan gagal dimuat.',
          );
        }
      } finally {
        if (isMounted && showLoading) {
          setIsLoadingAdvisorStudents(false);
        }
      }
    };

    loadAdvisorStudents(true);
    const stopPolling = startPolling(() => loadAdvisorStudents(false));
    return () => {
      isMounted = false;
      stopPolling();
    };
  }, [authenticatedUser?.role, activePage]);

  useEffect(() => {
    const role = authenticatedUser?.role;
    const isAdvisorCounseling =
      role === 'dosen' && ['bimbingan', 'konseling'].includes(activeTab);
    if (activePage !== 'dashboard' || !isAdvisorCounseling) {
      return undefined;
    }

    let isMounted = true;
    const loadCounseling = async (showLoading) => {
      if (showLoading) {
        setIsLoadingCounseling(true);
      }
      setCounselingStudentsError('');

      try {
        const response = await fetch('/api/auth/counseling');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Data konseling gagal dimuat.');
        }
        if (isMounted) {
          setCounselingStudents(data.students ?? []);
        }
      } catch (error) {
        if (isMounted) {
          setCounselingStudentsError(error instanceof Error
            ? error.message
            : 'Data konseling gagal dimuat.');
        }
      } finally {
        if (isMounted && showLoading) {
          setIsLoadingCounseling(false);
        }
      }
    };

    loadCounseling(true);
    const stopPolling = startPolling(() => loadCounseling(false));
    return () => {
      isMounted = false;
      stopPolling();
    };
  }, [authenticatedUser?.role, activePage, activeTab]);

  useEffect(() => {
    if (
      authenticatedUser?.role !== 'admin' ||
      activePage !== 'dashboard' ||
      !['dashboard', 'monitoring-dpa'].includes(activeTab)
    ) {
      return undefined;
    }

    let isMounted = true;
    const loadAdminMonitoring = async (showLoading) => {
      if (showLoading) {
        setIsLoadingAdminMonitoring(true);
      }
      try {
        const response = await fetch('/api/auth/admin/monitoring');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Data monitoring gagal dimuat.');
        }
        if (isMounted) {
          setAdminMonitoring({
            students: data.students ?? [],
            lecturers: data.lecturers ?? [],
          });
          setAdminMonitoringError('');
        }
      } catch (error) {
        if (isMounted) {
          setAdminMonitoringError(
            error instanceof Error ? error.message : 'Data monitoring gagal dimuat.',
          );
        }
      } finally {
        if (isMounted && showLoading) {
          setIsLoadingAdminMonitoring(false);
        }
      }
    };

    loadAdminMonitoring(true);
    const stopPolling = startPolling(() => loadAdminMonitoring(false));
    return () => {
      isMounted = false;
      stopPolling();
    };
  }, [authenticatedUser?.role, activePage, activeTab]);

  useEffect(() => {
    if (
      authenticatedUser?.role !== 'akademik' ||
      activePage !== 'dashboard' ||
      !['upload-absensi', 'pembagian-bimbingan'].includes(activeTab)
    ) {
      return undefined;
    }

    let isMounted = true;
    const loadFiles = async () => {
      try {
        setIsLoadingAcademicFiles(true);
        const res = await fetch('/api/auth/academic/files');
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted) {
          setAcademicFiles(data.files || []);
        }
      } catch (err) {
        console.error('Gagal memuat daftar file akademik:', err);
      } finally {
        if (isMounted) {
          setIsLoadingAcademicFiles(false);
        }
      }
    };

    loadFiles();
    return () => {
      isMounted = false;
    };
  }, [authenticatedUser?.role, activePage, activeTab]);

  const handleOpenFilePreview = async (fileId) => {
    setPreviewModalOpen(true);
    setIsLoadingPreview(true);
    setPreviewError('');
    setPreviewData(null);
    setPreviewSearchTerm('');

    try {
      const res = await fetch(`/api/auth/academic/files/${fileId}/preview`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memuat preview file.');
      }
      setPreviewData(data);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Gagal memuat preview file.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleAcademicFilesDeleted = (ids) => {
    const deletedIds = new Set(ids);
    setAcademicFiles((current) => current.filter((file) => !deletedIds.has(file.id)));
  };

  useEffect(() => {
    if (activePage !== 'landing' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const heroTimer = window.setInterval(() => {
      setActiveHeroImage((currentImage) => (currentImage + 1) % heroImages.length);
    }, 6500);

    return () => window.clearInterval(heroTimer);
  }, [activePage]);

  const handleSelectRole = (role) => {
    markHistoryEntry('from-landing');
    router.push(`/login?role=${role}`);
  };

  async function submitAcademicImport(event, file, endpoint, setLoading, setError, setResult) {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!file) {
      setError('Pilih file CSV atau Excel (.xls, .xlsx) terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'File gagal diproses.');
      }
      setResult(data);
      fetch('/api/auth/academic/files')
        .then((res) => (res.ok ? res.json() : null))
        .then((filesData) => {
          if (filesData?.files) {
            setAcademicFiles(filesData.files);
          }
        })
        .catch(() => {});
    } catch (error) {
      setError(error instanceof Error ? error.message : 'File gagal diproses.');
    } finally {
      setLoading(false);
    }
  }

  function handleAcademicAttendanceImport(event) {
    return submitAcademicImport(
      event,
      academicAttendanceFile,
      '/api/auth/academic/attendance/import',
      setIsImportingAcademicAttendance,
      setAcademicAttendanceError,
      setAcademicAttendanceResult,
    );
  }

  function handleNewStudentImport(event) {
    return submitAcademicImport(
      event,
      newStudentFile,
      '/api/auth/academic/students/import',
      setIsImportingNewStudents,
      setNewStudentImportError,
      setNewStudentImportResult,
    );
  }

  function handleNewLecturerImport(event) {
    return submitAcademicImport(
      event,
      newLecturerFile,
      '/api/auth/academic/lecturers/import',
      setIsImportingNewLecturers,
      setNewLecturerImportError,
      setNewLecturerImportResult,
    );
  }

  function handleAdvisorAssignmentImport(event) {
    event.preventDefault();
    if (
      !window.confirm(
        'Data DPA untuk mahasiswa yang tercantum di dalam file akan diperbarui. Mahasiswa lain yang tidak ada di dalam file akan tetap mempertahankan DPA mereka. Lanjutkan?',
      )
    ) {
      return;
    }
    return submitAcademicImport(
      event,
      advisorAssignmentFile,
      '/api/auth/academic/advisor-assignments/import',
      setIsImportingAdvisorAssignments,
      setAdvisorAssignmentError,
      setAdvisorAssignmentResult,
    );
  }

  // Langsung kembali ke tampilan awal; sesi di backend diakhiri di latar belakang.
  const handleLogout = async () => {
    setLoginError('');
    setAuthenticatedUser(null);
    setStudentPoints(null);
    setAdvisor(null);
    setAdvisorError('');
    authenticatedUserRef.current = null;
    activeTabRef.current = 'dashboard';
    setActiveTabState('dashboard');
    window.history.replaceState({ ...window.history.state, sigmaTab: undefined, sigmaPage: 'landing' }, '');
    setActivePage('landing');
    window.scrollTo({ top: 0, behavior: 'auto' });
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }
    } catch (error) {
      console.error('Tidak dapat mengakhiri sesi di backend:', error);
      setLoginError('Koneksi logout gagal. Muat ulang halaman untuk memeriksa sesi.');
    }
  };

  const handleCounselingSubmit = async (event) => {
    event.preventDefault();
    setCounselingStudentsError('');
    setCounselingStatus('');
    setIsSavingCounseling(true);

    try {
      const response = await fetch('/api/auth/counseling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: Number(selectedCounselingStudentId),
          ...counselingForm,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Catatan konseling gagal disimpan.');
      }

      setCounselingStudents((current) => current.map((student) => (
        student.id === Number(selectedCounselingStudentId)
          ? { ...student, counselingRecords: [data.record, ...student.counselingRecords] }
          : student
      )));
      setCounselingStatus('Catatan tersimpan dan akan tampil di dashboard mahasiswa.');
      setCounselingForm((current) => ({ ...current, note: '' }));
    } catch (error) {
      setCounselingStudentsError(
        error instanceof Error ? error.message : 'Catatan konseling gagal disimpan.',
      );
    } finally {
      setIsSavingCounseling(false);
    }
  };

  const handleAppealDecision = async (appealId, keputusan) => {
    setCounselingStudentsError('');
    setCounselingStatus('');
    setDecidingAppealId(appealId);

    try {
      const response = await fetch(`/api/dosen/sanggahan/${appealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keputusan, catatanPemeriksa: appealNotes[appealId] ?? '' }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Putusan sanggahan gagal disimpan.');
      }

      // Muat ulang agar skor dan riwayat poin ikut berubah saat sanggahan disetujui.
      const refreshed = await fetch('/api/auth/counseling');
      const refreshedData = await refreshed.json();
      if (refreshed.ok) {
        setCounselingStudents(refreshedData.students ?? []);
      }
      setCounselingStatus(keputusan === 'DISETUJUI'
        ? 'Sanggahan disetujui. Poin mahasiswa telah dipulihkan.'
        : 'Sanggahan ditolak. Mahasiswa akan menerima pemberitahuan.');
    } catch (error) {
      setCounselingStudentsError(
        error instanceof Error ? error.message : 'Putusan sanggahan gagal disimpan.',
      );
    } finally {
      setDecidingAppealId(null);
    }
  };

  return (
    <div className="min-h-screen font-sans text-slate-800 bg-slate-100">
      {activePage === 'checking' && (
        <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-slate-500">Memeriksa sesi login...</p>
        </div>
      )}
      {activePage === 'landing' && (
        <div className="min-h-screen flex flex-col">
          <header className="bg-white border-b border-slate-200 px-6 py-3.5 relative z-20 shadow-sm">
            <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-auto flex items-center justify-center p-1 bg-white rounded-xl shadow-sm border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element -- logo kecil dengan fallback onError */}
                  <img 
                    src={officialLogoUrl} 
                    alt="Logo Poltek Simas Berau" 
                    className="h-10 w-auto object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.parentNode.innerHTML = '<div class="w-10 h-10 bg-red-800 rounded-xl flex items-center justify-center text-white font-black text-lg">PSB</div>';
                    }}
                  />
                </div>
                <div>
                  <h1 className="font-extrabold text-slate-900 text-lg leading-none tracking-tight">SIGMA</h1>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Politeknik Sinar Mas Berau Coal</p>
                </div>
              </div>

              {/* HP: satu kartu bertumpuk selebar layar. Layar lebar: kartu terpisah sejajar. */}
              <div className="flex w-full flex-col divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 text-xs sm:w-auto sm:flex-row sm:gap-4 sm:divide-y-0 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent">
                <a href="tel:+628115443118" className="flex min-w-0 items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 sm:rounded-xl sm:border sm:border-slate-200/80 sm:bg-slate-50 sm:py-2">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-red-100 text-red-800 flex items-center justify-center font-bold">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">0811-5443-118</p>
                    <p className="text-[11px] text-slate-500">Senin - Jumat (08:00 - 16:00 WITA)</p>
                  </div>
                </a>

                <a href="mailto:kemahasiswaan@polteksimasberau.ac.id" className="flex min-w-0 items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 sm:rounded-xl sm:border sm:border-slate-200/80 sm:bg-slate-50 sm:py-2">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">Humas & Layanan</p>
                    <p className="truncate text-[11px] text-slate-500">kemahasiswaan@polteksimasberau.ac.id</p>
                  </div>
                </a>
              </div>
            </div>
          </header>

          <nav className="bg-gradient-to-r from-red-950 via-red-900 to-rose-950 text-white px-6 py-2.5 shadow-md relative z-20 border-t border-red-800/40">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-7 text-xs font-semibold">
                <a href="#" className="hover:text-amber-200 transition-colors py-1 border-b-2 border-amber-300 font-bold">Beranda</a>
                <a href="#tentang-website" className="hover:text-amber-200 transition-colors py-1 text-slate-200">Tentang Website</a>
                <a href="#regulasi-poin" className="hover:text-amber-200 transition-colors py-1 text-slate-200">Regulasi Poin SKPI</a>
              </div>

            </div>
          </nav>

          {loginError && (
            <p className="bg-amber-50 px-6 py-3 text-center text-sm text-amber-900" role="alert">
              {loginError}
            </p>
          )}

          <div 
            data-scroll-reveal
            data-reveal="zoom"
            className="relative z-20 isolate overflow-hidden rounded-b-3xl bg-slate-900 px-6 py-12 text-white"
          >
            {heroImages.map((image, index) => (
              <div
                key={image}
                aria-hidden="true"
                className={`hero-image-layer absolute inset-0 -z-20 bg-cover bg-center blur-[2px] ${
                  activeHeroImage === index ? 'is-active' : ''
                }`}
                style={{ backgroundImage: `url(${image})` }}
              />
            ))}
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-gradient-to-r from-red-950/90 via-red-900/75 to-rose-900/65"
            />
            <div className="max-w-7xl mx-auto relative z-10">
              <span data-scroll-reveal data-reveal="text" className="bg-amber-400 text-red-950 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider shadow-sm">
                Budaya Disiplin · Siap Industri
              </span>
              <h2 data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="text-3xl sm:text-4xl font-extrabold mt-3 leading-tight">
                Disiplin Hari Ini, Profesional di Dunia Industri
              </h2>
              <p data-scroll-reveal data-reveal="text" data-reveal-delay="160" className="mt-2 text-slate-100 max-w-2xl text-sm sm:text-base leading-relaxed">
                SIGMA adalah sistem pemantauan kedisiplinan dan rekam jejak karakter mahasiswa Politeknik Sinar Mas Berau Coal. Dibangun atas lima nilai budaya disiplin, SIGMA membantu mahasiswa tumbuh menjadi tenaga vokasi yang tepat waktu, patuh K3, dan bertanggung jawab.
              </p>
            </div>
          </div>

          <main data-scroll-reveal className="relative z-0 -mt-7 flex min-h-[520px] w-full flex-1 items-center justify-center overflow-hidden bg-cover bg-center px-6 py-16"
                style={{ backgroundImage: `url(${portalAccessBackground})` }}>
            <div className="absolute inset-0 z-0 bg-slate-950/55 backdrop-blur-[2px]"></div>

            <div className="max-w-7xl mx-auto w-full relative z-10">
              <div className="mx-auto mb-6 max-w-sm text-center sm:mb-10 sm:max-w-none">
                <h3 data-scroll-reveal data-reveal="text" className="text-2xl font-extrabold leading-tight tracking-tight text-balance text-white drop-shadow-md sm:text-3xl">Pilih Akses Masuk Portal</h3>
                <span aria-hidden="true" className="mx-auto mt-3 block h-1 w-12 rounded-full bg-amber-300" />
                <p data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="mt-3 text-sm font-medium leading-relaxed text-balance text-slate-100 drop-shadow-sm">Silakan pilih peran Anda untuk melanjutkan ke halaman login</p>
              </div>

              {/* HP: slide satu kartu penuh per geser. Layar lebar: grid. gap-12 = 2× padding agar kartu sebelah tidak mengintip. */}
              <div
                id="access-slides"
                onScroll={(event) => {
                  const { scrollLeft, clientWidth } = event.currentTarget;
                  setActiveAccessSlide(Math.round(scrollLeft / clientWidth));
                }}
                className="-mx-6 flex snap-x snap-mandatory gap-12 overflow-x-auto px-6 pt-2 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-8 sm:overflow-visible sm:p-0 xl:grid-cols-4"
              >
                {/* Warna seragam mengikuti kartu Mahasiswa. HP: tampil berwarna terus. Layar lebar: berwarna saat hover. */}
                {accessCards.map((card) => (
                  <button
                    key={card.role}
                    type="button"
                    data-scroll-reveal
                    data-reveal={card.reveal}
                    data-reveal-delay={card.delay}
                    onClick={() => handleSelectRole(card.role)}
                    className="w-full shrink-0 snap-center snap-always appearance-none text-left font-sans bg-white/95 backdrop-blur-md rounded-2xl p-7 border border-white/80 shadow-2xl hover:shadow-red-500/25 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
                  >
                    <div>
                      <div className="w-14 h-14 bg-red-800 text-white sm:bg-red-50 sm:text-red-800 sm:group-hover:bg-red-800 sm:group-hover:text-white rounded-2xl flex items-center justify-center mb-5 transition-all shadow-sm">
                        <card.icon className="w-8 h-8" />
                      </div>
                      <h4 data-scroll-reveal data-reveal="text" className="text-2xl font-bold text-red-800 sm:text-slate-900 sm:group-hover:text-red-800 transition-colors">{card.title}</h4>
                      <p data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="text-slate-600 text-sm mt-3 leading-relaxed font-normal">
                        {card.description}
                      </p>
                    </div>
                    <span className="mt-8 w-full py-3 bg-red-800 text-white sm:bg-slate-100 sm:text-slate-800 sm:group-hover:bg-red-800 sm:group-hover:text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2">
                      {card.action}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-1 flex justify-center gap-2 sm:hidden">
                {accessCards.map(({ title: label }, index) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={`Tampilkan ${label}`}
                    onClick={() => {
                      const slides = document.getElementById('access-slides');
                      slides?.scrollTo({ left: index * slides.clientWidth, behavior: 'smooth' });
                    }}
                    className={`h-2 rounded-full transition-all ${
                      activeAccessSlide === index ? 'w-6 bg-amber-300' : 'w-2 bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </div>
          </main>

          <section id="tentang-website" data-scroll-reveal className="scroll-mt-6 bg-white px-6 py-14">
            <div className="max-w-5xl mx-auto">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-800">
                  <HelpCircle className="h-4 w-4" /> Tentang SIGMA
                </span>
                <h2 data-scroll-reveal data-reveal="text" className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Apa itu SIGMA?
                </h2>
                <p data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                  SIGMA adalah portal informasi kedisiplinan Politeknik Sinar Mas Berau Coal. Website ini dirancang untuk membantu mahasiswa, dosen pembimbing akademik, dan pihak kemahasiswaan mengakses informasi presensi, catatan kedisiplinan, kegiatan non-akademik, serta bimbingan dalam satu tempat.
                </p>
              </div>

              <div data-scroll-reveal className="mt-8 rounded-3xl bg-gradient-to-br from-red-950 via-red-900 to-rose-800 p-6 text-white shadow-xl sm:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Cara kerja portal</p>
                    <h3 data-scroll-reveal data-reveal="text" className="mt-1 text-lg font-extrabold sm:text-xl">Informasi kedisiplinan dalam satu alur</h3>
                  </div>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-red-100">
                    Ringkasan use case SIGMA
                  </span>
                </div>
                <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
                  <div data-scroll-reveal data-reveal="left" className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-800">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p data-scroll-reveal data-reveal="text" className="mt-3 text-sm font-bold">Impor data presensi</p>
                    <p data-scroll-reveal data-reveal-delay="80" className="mt-1 text-xs leading-relaxed text-red-100">Tim akademik mengunggah file Excel/CSV melalui Akses Akademik</p>
                  </div>
                  <ArrowRight className="mx-auto hidden h-5 w-5 text-amber-300 md:block" />
                  <div data-scroll-reveal data-reveal="left" data-reveal-delay="80" className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-800">
                      <Award className="h-5 w-5" />
                    </div>
                    <p data-scroll-reveal data-reveal="text" className="mt-3 text-sm font-bold">Kegiatan & poin</p>
                    <p data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="mt-1 text-xs leading-relaxed text-red-100">Klaim aktivitas melalui proses verifikasi</p>
                  </div>
                  <ArrowRight className="mx-auto hidden h-5 w-5 text-amber-300 md:block" />
                  <div data-scroll-reveal data-reveal="right" data-reveal-delay="160" className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-800">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <p data-scroll-reveal data-reveal="text" className="mt-3 text-sm font-bold">Pemantauan & bimbingan</p>
                    <p data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="mt-1 text-xs leading-relaxed text-red-100">Dosen PA meninjau perkembangan mahasiswa</p>
                  </div>
                  <ArrowRight className="mx-auto hidden h-5 w-5 text-amber-300 md:block" />
                  <div data-scroll-reveal data-reveal="right" data-reveal-delay="240" className="rounded-2xl border border-amber-300/40 bg-amber-300/15 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300 text-red-950">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <p data-scroll-reveal data-reveal="text" className="mt-3 text-sm font-bold">Rekam jejak</p>
                    <p data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="mt-1 text-xs leading-relaxed text-red-100">Informasi untuk tindak lanjut dan kelulusan</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div data-scroll-reveal data-reveal="left" data-reveal-delay="80" className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">Pantau presensi</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Mahasiswa dapat melihat presensi yang diunggah tim akademik melalui Akses Akademik dan mengajukan sanggahan jika ada catatan yang perlu ditinjau.
                  </p>
                </div>
                <div data-scroll-reveal data-reveal="zoom" data-reveal-delay="160" className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <Award className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">Rekam kegiatan</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Kegiatan, sertifikasi, dan prestasi non-akademik dapat diajukan untuk verifikasi dan pencatatan poin SKPI.
                  </p>
                </div>
                <div data-scroll-reveal data-reveal="right" data-reveal-delay="240" className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">Dukung bimbingan</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Portal menyediakan informasi bimbingan akademik dan hubungan mahasiswa dengan dosen pembimbing akademik.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="regulasi-poin" data-scroll-reveal className="scroll-mt-6 bg-slate-50 px-6 pt-14 pb-8">
            <div className="max-w-5xl mx-auto">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
                  <Award className="h-4 w-4" /> Ketentuan Poin Mahasiswa
                </span>
                <h2 data-scroll-reveal data-reveal="text" className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Hal yang memengaruhi poin kedisiplinan
                </h2>
                <p data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                  Poin mencerminkan catatan kedisiplinan dan partisipasi mahasiswa. Perubahan poin dicatat berdasarkan aktivitas yang terekam atau pengajuan yang sudah diverifikasi.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div data-scroll-reveal data-reveal="left" data-reveal-delay="80" className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-extrabold text-emerald-800">
                        <TrendingUp className="h-5 w-5" /> Poin dapat bertambah
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">Kontribusi positif yang tercatat atau diverifikasi</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <ArrowRight className="h-5 w-5 -rotate-45" />
                    </span>
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="flex gap-3 rounded-xl bg-emerald-50/80 p-3">
                      <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <p className="text-sm leading-relaxed text-slate-700"><strong>Presensi tepat waktu</strong><br />Kehadiran kuliah atau praktikum dari file presensi Excel/CSV yang diunggah tim akademik dan diproses sesuai aturan kampus.</p>
                    </div>
                    <div className="flex gap-3 rounded-xl bg-emerald-50/80 p-3">
                      <Award className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <p className="text-sm leading-relaxed text-slate-700"><strong>Sertifikasi dan prestasi</strong><br />Sertifikat keahlian, lomba, atau kompetisi yang diajukan dengan bukti dan telah diverifikasi.</p>
                    </div>
                    <div className="flex gap-3 rounded-xl bg-emerald-50/80 p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <p className="text-sm leading-relaxed text-slate-700"><strong>Partisipasi kegiatan</strong><br />Organisasi, seminar, workshop, atau kegiatan non-akademik yang diakui dan disetujui.</p>
                    </div>
                  </div>
                </div>

                <div data-scroll-reveal data-reveal="right" data-reveal-delay="180" className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-extrabold text-red-800">
                        <AlertCircle className="h-5 w-5" /> Poin dapat berkurang
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">Catatan yang ditinjau sesuai aturan kampus</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                      <ArrowRight className="h-5 w-5 rotate-45" />
                    </span>
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="flex gap-3 rounded-xl bg-red-50/80 p-3">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                      <p className="text-sm leading-relaxed text-slate-700"><strong>Terlambat</strong><br />Presensi tercatat melewati batas waktu yang ditetapkan.</p>
                    </div>
                    <div className="flex gap-3 rounded-xl bg-red-50/80 p-3">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                      <p className="text-sm leading-relaxed text-slate-700"><strong>Tidak hadir</strong><br />Ketidakhadiran tanpa keterangan yang disetujui.</p>
                    </div>
                    <div className="flex gap-3 rounded-xl bg-red-50/80 p-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                      <p className="text-sm leading-relaxed text-slate-700"><strong>Pelanggaran tata tertib</strong><br />Pelanggaran kedisiplinan yang dicatat dan ditindaklanjuti sesuai ketentuan kampus.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div data-scroll-reveal className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">Alur pembaruan skor</p>
                  <p className="mt-1 text-sm text-slate-600">Catatan presensi dari file Excel/CSV yang diunggah tim akademik dan poin kegiatan yang disetujui menjadi bahan perhitungan rekam jejak kedisiplinan.</p>
                </div>
                <div className="flex items-center gap-2 self-start rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 sm:self-auto">
                  <span>Catatan</span><ArrowRight className="h-4 w-4" /><span>Verifikasi</span><ArrowRight className="h-4 w-4" /><span>Skor</span>
                </div>
              </div>

            </div>
          </section>

          <section id="lokasi-kampus" data-scroll-reveal className="scroll-mt-6 border-t border-red-100 bg-slate-50 px-6 pt-6 pb-10 sm:pt-8 sm:pb-12">
            <div className="mx-auto max-w-5xl">
              <div className="mb-5 text-center">
                <h2 data-scroll-reveal data-reveal="text" className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                  Temukan Kampus Kami
                </h2>
              </div>

              <div className="grid overflow-hidden rounded-2xl border border-red-900/10 bg-gradient-to-br from-[#450a0a] via-[#7f1d1d] to-[#991b1b] shadow-xl md:grid-cols-[minmax(0,1fr)_360px]">
                <div className="flex flex-col items-start justify-center p-6 text-white sm:p-8">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200/30 bg-amber-300/15 text-amber-300">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold sm:text-xl">
                    Politeknik Sinar Mas Berau Coal
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-red-100">
                    Jl. Raja Alam II, Kel. Rinding, Kec. Teluk Bayur, Kabupaten Berau, Kalimantan Timur 77315
                  </p>
                  <a
                    href={campusMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-extrabold text-red-950 shadow transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-100"
                  >
                    Buka Google Maps <ArrowRight className="h-4 w-4" />
                  </a>
                </div>

                <a
                  href={campusMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Buka lokasi Politeknik Sinar Mas Berau Coal di Google Maps"
                  className="group relative m-4 mt-0 block overflow-hidden rounded-xl border border-white/20 bg-slate-200 shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 md:my-4 md:ml-0"
                >
                  <iframe
                    title="Peta lokasi Politeknik Sinar Mas Berau Coal"
                    src={campusMapEmbedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="pointer-events-none h-48 w-full sm:h-52 md:h-full md:min-h-[220px]"
                  />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-slate-950/80 to-transparent px-3 pb-3 pt-8 text-xs font-bold text-white opacity-90 transition group-hover:opacity-100">
                    <span>Klik peta untuk membuka</span>
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </a>
              </div>
            </div>
          </section>

          <footer className="bg-slate-950 text-slate-400 py-6 text-center text-xs border-t border-slate-800 relative z-20">
            © 2026 Sentra Inovasi dan Penelitian Terapan (SIPT)
          </footer>
        </div>
      )}

      {activePage === 'dashboard' && (
        <div 
          className="min-h-screen bg-cover bg-center bg-fixed relative"
          style={{ backgroundImage: `url(${portalAccessBackground})` }}
        >
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"></div>

          <div className="relative z-10 min-h-screen flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0">
            <MobileBottomNav items={dashboardNavigation} activeTab={activeTab} onSelect={setActiveTab} />
            <header className="bg-[#450a0a]/95 backdrop-blur-sm text-white border-b border-red-950 sticky top-0 z-30 shadow-md">
              <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4 flex flex-col items-start gap-3 sm:gap-4">
                <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-white p-0.5 rounded-xl flex items-center justify-center shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element -- logo kecil dengan fallback onError */}
                    <img 
                      src={officialLogoUrl} 
                      alt="Logo Poltek Simas Berau" 
                      className="h-11 w-11 object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML = '<div class="w-8 h-8 bg-red-800 text-white font-black rounded-lg flex items-center justify-center text-xs">PSB</div>';
                      }}
                    />
                  </div>
                  <div>
                    <h1 className="font-bold text-lg leading-tight tracking-tight">SIGMA</h1>
                    <p className="text-xs text-red-200">Politeknik Sinar Mas Berau Coal</p>
                  </div>
                </div>
                {/* HP: logout selalu di pojok kanan atas untuk semua role. */}
                <button
                  onClick={handleLogout}
                  className="shrink-0 rounded-lg p-2 text-slate-200 transition-colors hover:bg-red-900/40 hover:text-red-200 sm:hidden"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
                </div>

                {/* HP: menu pindah ke bar navigasi bawah; baris ini hanya tampil untuk pengalih Kemahasiswaan. */}
                <div className={`w-full flex-wrap items-stretch gap-3 lg:flex-nowrap ${hasRoleSwitcher ? 'flex' : 'hidden sm:flex'}`}>
                  <div className="hidden w-fit max-w-full flex-wrap items-center justify-start gap-1 rounded-xl border border-red-800/50 bg-[#581c1c]/90 p-1 sm:flex lg:shrink-0 lg:flex-nowrap">
                    {dashboardNavigation.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                          activeTab === item.id
                            ? 'bg-red-700 text-white shadow-md'
                            : 'text-slate-200 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Pengalih Role hanya untuk Kemahasiswaan; role lain cukup tombol logout di samping menu. */}
                  {hasRoleSwitcher ? (
                  <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-start lg:min-w-0 lg:flex-nowrap">
                    <KemahasiswaanSwitcher profile={authenticatedUser} />

                    <button
                      onClick={handleLogout}
                      className="hidden shrink-0 p-2 sm:block text-slate-200 hover:text-red-200 hover:bg-red-900/40 rounded-lg transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                  ) : (
                  <div className="flex shrink-0 items-center">
                    <button
                      onClick={handleLogout}
                      className="shrink-0 rounded-lg p-2 text-slate-200 transition-colors hover:bg-red-900/40 hover:text-red-200"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                  )}
                </div>
              </div>
            </header>

            {activeTab === 'lapor' && ['mhs', 'dosen', 'admin', 'akademik'].includes(authenticatedUser?.role) && (
              <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
                <MenuHeader item={activeMenu} roleLabel={authenticatedUser?.roleLabel} />
                <LaporSatgas onCheckReports={() => setActiveTab('cek-laporan')} />
              </main>
            )}

            {activeTab === 'cek-laporan' && ['mhs', 'dosen', 'akademik'].includes(authenticatedUser?.role) && (
              <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
                <MenuHeader item={activeMenu} roleLabel={authenticatedUser?.roleLabel} />
                <CekLaporan />
              </main>
            )}

            {authenticatedUser?.role === 'dosen' && activeTab === 'laporan-dpa' && (
              <DosenReportWorkflow />
            )}

            {authenticatedUser?.role === 'admin' && activeTab === 'laporan-kemahasiswaan' && (
              <AdminReportQueue />
            )}

            {authenticatedUser?.role === 'admin' && activeTab === 'klaim-kemahasiswaan' && (
              <AdminClaimQueue />
            )}

            {authenticatedUser?.role === 'admin' && activeTab === 'punishment' && (
              <AdminPunishment />
            )}

            {authenticatedUser?.role === 'admin' && activeTab === 'pengaturan-poin' && (
              <AdminPointRules />
            )}

            {authenticatedUser?.role === 'admin' && activeTab === 'data-poin' && (
              <AdminPointData />
            )}

            {authenticatedUser?.role === 'admin' && activeTab === 'drc' && (
              <AdminDrc />
            )}

            {authenticatedUser?.role === 'mhs' && !['lapor', 'cek-laporan'].includes(activeTab) && (
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 flex-1 w-full">
              {activeTab === homeTab ? (
              <div data-scroll-reveal className={`${welcomeCardClassName} bg-gradient-to-r from-[#450a0a]/95 via-[#7f1d1d]/95 to-[#991b1b]/95 backdrop-blur-sm text-white rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden border border-red-600/30`}>
                <div className="[grid-area:badge] min-w-0"><SemesterBadge /></div>
                <WelcomeHeading name={authenticatedUser?.name || 'Pengguna'} className="[grid-area:heading]" />
                <p className="[grid-area:identity] truncate text-red-100 text-xs sm:text-sm" data-testid="database-profile">
                  {authenticatedUser?.identity}
                  {authenticatedUser?.details?.map((detail) => ` • ${detail.value}`)}
                </p>

                <div className="contents md:flex md:items-center md:gap-6 md:self-center md:[grid-area:side]">
                  <div className="[grid-area:bell] self-center"><NotificationBell endpoint="/api/mahasiswa/pemberitahuan" className="md:h-24 md:w-24 md:rounded-2xl" iconClassName="h-5 w-5 md:h-10 md:w-10" badgeClassName="-right-1.5 -top-1.5 h-5 min-w-5 px-1 text-[10px] md:-right-2 md:-top-2 md:h-7 md:min-w-7 md:px-1.5 md:text-sm" /></div>
                  <div className="[grid-area:profile] mt-4 md:mt-0 md:h-24 bg-[#581c1c]/95 backdrop-blur-sm border border-red-800/60 rounded-2xl p-4 sm:p-5 flex items-center gap-4 md:min-w-[280px]">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
                    <UserCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-[10px] text-red-200 uppercase tracking-wider font-bold">Profil akun</p>
                    <p className="text-white font-extrabold text-base leading-snug">
                      {authenticatedUser?.roleLabel}
                    </p>
                    <p className="text-xs text-red-200 mt-0.5">
                      Terdaftar: {authenticatedUser?.createdAt
                        ? new Date(authenticatedUser.createdAt).toLocaleDateString('id-ID')
                        : '-'}
                    </p>
                  </div>
                </div>
                </div>
              </div>
              ) : (
                <MenuHeader item={activeMenu} roleLabel={authenticatedUser?.roleLabel} />
              )}

              {activeTab === 'dashboard' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div data-scroll-reveal data-reveal-delay="80" className="sm:col-span-2 lg:col-span-1 bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Skor Kedisiplinan</span>
                    <Bookmark className="w-5 h-5 text-red-800" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {isLoadingStudentPoints ? '…' : studentPointsError ? '--' : studentPoints?.score ?? '--'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Poin</span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Kategori</span>
                      <span className={`font-semibold ${
                        studentPoints?.score >= 90
                          ? 'text-emerald-700'
                          : studentPoints?.score > 50
                            ? 'text-amber-700'
                            : studentPoints
                              ? 'text-red-700'
                              : 'text-slate-700'
                      }`}>
                        {isLoadingStudentPoints
                          ? 'Memuat data…'
                          : studentPointsError
                            ? 'Gagal dimuat'
                            : studentPoints?.predicate ?? 'Belum tersedia'}
                      </span>
                    </div>
                    {studentPoints && !studentPointsError && (
                      <dl className="space-y-1 border-t border-slate-100 pt-2 text-xs">
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Poin awal</dt>
                          <dd className="font-semibold text-slate-700">100</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Poin berkurang karena pelanggaran</dt>
                          <dd className="font-semibold text-red-700">−{studentPoints.pointsDeducted ?? 0}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-500">
                            Poin bertambah
                            {studentPoints.verifiedActivityCount > 0 && ` (dari ${studentPoints.verifiedActivityCount} lomba/kegiatan)`}
                          </dt>
                          <dd className="font-semibold text-emerald-700">+{studentPoints.pointsAdded ?? 0}</dd>
                        </div>
                      </dl>
                    )}
                    <p className="text-[10px] leading-relaxed text-slate-500">
                      Kategori: Disiplin 90–200 · Kurang Disiplin 51–89 · Tidak Disiplin 0–50
                    </p>
                    {studentPointsError && (
                      <p className="text-xs text-red-700" role="alert">{studentPointsError}</p>
                    )}
                  </div>
                </div>

                <div data-scroll-reveal data-reveal-delay="160" className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tingkat Kehadiran</span>
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">--</span>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Dihitung dari data presensi yang diunggah bagian akademik</span>
                    </div>
                  </div>
                </div>

                <div data-scroll-reveal data-reveal-delay="80" className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dosen Pembimbing Akademik</span>
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-slate-900 leading-snug block">
                      {advisor?.nama ?? 'Belum ditentukan'}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      {advisor
                        ? 'Hubungi Dosen PA Anda jika memerlukan bimbingan.'
                        : 'Nama Dosen PA akan muncul setelah ditentukan oleh bagian akademik.'}
                    </p>
                    {advisorError && (
                      <p className="mt-2 text-xs text-red-700" role="alert">{advisorError}</p>
                    )}
                  </div>
                </div>
                  </div>

                  <section data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900">Rincian per Pilar Disiplin</h3>
                      <p className="mt-1 text-sm text-slate-500">Jumlah pelanggaran dan poin yang berkurang di setiap pilar.</p>
                    </div>
                    {isLoadingStudentPoints ? (
                      <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Memuat profil disiplin...</p>
                    ) : studentPointsError ? (
                      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{studentPointsError}</p>
                    ) : !Array.isArray(studentPoints?.pillars) || studentPoints.pillars.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Data profil disiplin belum tersedia.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {studentPoints.pillars.map((pillar) => {
                          const presentation = disciplinePillars.find((item) => item.pillar === pillar.pillar);
                          const Icon = presentation?.Icon ?? ShieldCheck;
                          const hasNoViolations = pillar.violationCount === 0;
                          return (
                            <article
                              key={pillar.pillar}
                              className={`rounded-2xl border p-4 shadow-sm ${
                                hasNoViolations
                                  ? 'border-emerald-200 bg-emerald-50/70'
                                  : 'border-rose-200 bg-rose-50/70'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                                  hasNoViolations ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-bold leading-snug text-slate-800">{pillar.label ?? presentation?.label ?? pillar.pillar}</p>
                              </div>
                              <dl className="mt-4 space-y-2 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <dt className="text-slate-600">Jumlah pelanggaran</dt>
                                  <dd className="font-bold text-slate-900">{pillar.violationCount}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2">
                                  <dt className="text-slate-600">Poin berkurang</dt>
                                  <dd className="font-bold text-slate-900">{pillar.pointsDeducted}</dd>
                                </div>
                              </dl>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900">Tingkat Pelanggaran Anda</h3>
                      <p className="mt-1 text-sm text-slate-500">Jumlah dan tindak lanjut sesuai tingkat pelanggaran.</p>
                    </div>
                    {isLoadingStudentPoints ? (
                      <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Memuat tingkat pelanggaran...</p>
                    ) : studentPointsError ? (
                      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{studentPointsError}</p>
                    ) : !studentPoints?.severityCounts ? (
                      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Data tingkat pelanggaran belum tersedia.</p>
                    ) : (
                      <div className="space-y-3">
                        {violationSeverities.map(({ severity, label, pointRange, followUp, badge }) => (
                          <div key={severity} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badge}`}>{label}</span>
                              <span className="text-sm font-semibold text-slate-800">
                                {(studentPoints.severityCounts[severity] ?? 0) + (severityLegacyCount[severity] ? (studentPoints.severityCounts[severityLegacyCount[severity]] ?? 0) : 0)} pelanggaran
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">
                              Potongan {pointRange} poin, tergantung pilar · {followUp}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <AktivitasMahasiswa onNavigate={(tab) => setActiveTab(tab)} />
                </>
              )}

              {activeTab === 'tindak-lanjut' && (
                <TindakLanjut
                  onAppeal={(changeId) => {
                    setSelectedAppealChangeId(changeId);
                    setActiveTab('sanggah');
                  }}
                />
              )}

              {activeTab === 'sanggah' && authenticatedUser?.role === 'mhs' && (
                <SanggahanMahasiswa
                  changes={studentPoints?.changes ?? []}
                  initialChangeId={selectedAppealChangeId}
                  onInitialChangeHandled={() => setSelectedAppealChangeId(null)}
                />
              )}

              {activeTab === 'klaim' && authenticatedUser?.role === 'mhs' && <KlaimKegiatan />}

              {activeTab === 'drc' && authenticatedUser?.role === 'mhs' && <DrcMahasiswa />}

              {activeTab !== 'konseling' &&
                activeTab !== 'lapor' &&
                activeTab !== 'tindak-lanjut' &&
                activeTab !== 'klaim' &&
                activeTab !== 'drc' &&
                !(activeTab === 'sanggah' && authenticatedUser?.role === 'mhs') && (
                <>
              <div data-scroll-reveal className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-6">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {activeTab === 'dashboard' && 'Ringkasan Aktivitas & Poin'}
                      {activeTab === 'sanggah' && (authenticatedUser?.role === 'mhs' ? 'Pengajuan Sanggah Pelanggaran' : 'Pengajuan Sanggah Presensi')}
                      {activeTab === 'konseling' && 'Pengawasan & Bimbingan Konseling PA'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeTab === 'dashboard'
                        ? 'Riwayat perubahan skor dari pelanggaran dan kegiatan yang telah diverifikasi.'
                        : 'Sumber presensi: file Excel/CSV yang akan diunggah tim akademik melalui Akses Akademik.'}
                    </p>
                  </div>

                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      {activeTab === 'dashboard' ? (
                        <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                          <th className="py-3 px-4">Waktu</th>
                          <th className="py-3 px-4">Jenis perubahan</th>
                          <th className="py-3 px-4">Pilar</th>
                          <th className="py-3 px-4">Tingkat</th>
                          <th className="py-3 px-4">Catatan</th>
                          <th className="py-3 px-4">Perubahan</th>
                          <th className="py-3 px-4">Total poin</th>
                        </tr>
                      ) : (
                        <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                          <th className="py-3 px-4">Mata Kuliah / Kegiatan</th>
                          <th className="py-3 px-4">Waktu Presensi</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Poin Impact</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {activeTab === 'dashboard' && isLoadingStudentPoints && (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Memuat riwayat poin…</td></tr>
                      )}
                      {activeTab === 'dashboard' && studentPointsError && (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-red-700" role="alert">{studentPointsError}</td></tr>
                      )}
                      {activeTab === 'dashboard' && !isLoadingStudentPoints && !studentPointsError && studentPoints?.changes?.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center">
                            <p className="font-semibold text-slate-700">Belum ada perubahan poin</p>
                            <p className="mt-1 text-xs text-slate-500">Skor awal Anda adalah 100 poin.</p>
                          </td>
                        </tr>
                      )}
                      {activeTab === 'dashboard' && studentPoints?.changes?.map((change) => (
                        <tr key={change.id}>
                          <td className="px-4 py-3 text-xs text-slate-600">{new Date(change.createdAt).toLocaleString('id-ID')}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {pointChangeTypeLabels[change.type] ?? change.type}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {disciplinePillars.find((item) => item.pillar === change.pillar)?.label ?? '-'}
                          </td>
                          <td className="px-4 py-3">
                            {change.severity ? (
                              <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                violationSeverities.find((item) => item.severity === change.severity)?.badge ?? 'bg-slate-100 text-slate-700'
                              }`}>
                                {violationSeverities.find((item) => item.severity === change.severity)?.label ?? change.severity}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <p>{change.reason}</p>
                            {change.followUp && <p className="mt-1 text-xs text-slate-500">{change.followUp}</p>}
                          </td>
                          <td className={`px-4 py-3 font-bold ${change.delta > 0 ? 'text-emerald-700' : change.delta < 0 ? 'text-red-700' : 'text-slate-500'}`}>
                            {change.delta > 0 ? '+' : ''}{change.delta}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{change.scoreAfter}</td>
                        </tr>
                      ))}
                      {activeTab !== 'dashboard' && (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center">
                            <p className="font-semibold text-slate-700">Belum ada rekam jejak untuk ditampilkan</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Presensi akan tersedia setelah tim akademik mengunggah file Excel/CSV melalui Akses Akademik.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

                </>
              )}
            </main>
            )}

            {authenticatedUser?.role === 'akademik' && !['lapor', 'cek-laporan'].includes(activeTab) && (
              <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
                {activeTab === homeTab ? (
                <section className="rounded-3xl border border-red-600/30 bg-gradient-to-r from-[#450a0a]/95 via-[#7f1d1d]/95 to-[#991b1b]/95 p-6 text-white shadow-2xl sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Portal Akademik
                  </p>
                  <WelcomeHeading name={authenticatedUser.name || 'Pengguna'} className="mt-2" />
                  <p className="mt-2 text-sm text-red-100">
                    Login Akademik berhasil. Akun Anda terhubung sebagai petugas Akademik.
                  </p>
                </section>
                ) : (
                  <MenuHeader item={activeMenu} roleLabel={authenticatedUser?.roleLabel} />
                )}

                {activeTab === 'dashboard' && (
                  <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg">
                    <h3 className="text-lg font-bold text-slate-900">Profil Akun</h3>
                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-slate-500">Nama</dt>
                        <dd className="mt-1 text-slate-900">{authenticatedUser.name}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Email</dt>
                        <dd className="mt-1 text-slate-900">{authenticatedUser.identity}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Peran</dt>
                        <dd className="mt-1 text-slate-900">{authenticatedUser.roleLabel}</dd>
                      </div>
                    </dl>
                  </section>
                )}

                {activeTab === 'upload-absensi' && (
                  <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg sm:p-8">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Upload Absensi</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Menu ini digunakan untuk mencatat kehadiran mahasiswa agar presensi dan poin kedisiplinan dapat diperbarui.
                      </p>
                      <button
                        type="button"
                        onClick={() => setTemplatePreviewCategory('attendance')}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-100"
                      >
                        <FileText className="h-4 w-4" />
                        Lihat template absensi
                      </button>
                    </div>
                    <form onSubmit={handleAcademicAttendanceImport} className="space-y-4">
                      <label htmlFor="academic-attendance-file" className="block text-sm font-semibold text-slate-700">
                        File absensi
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                          id="academic-attendance-file"
                          type="file"
                          accept=".csv,.xls,.xlsx"
                          required
                          onChange={(event) => {
                            setAcademicAttendanceFile(event.target.files?.[0] ?? null);
                            setAcademicAttendanceResult(null);
                            setAcademicAttendanceError('');
                          }}
                          className="block w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-red-800 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-red-900 cursor-pointer"
                        />
                        <button
                          type="submit"
                          disabled={isImportingAcademicAttendance || !academicAttendanceFile}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-red-800 px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-red-900 disabled:cursor-wait disabled:opacity-60 shrink-0"
                        >
                          <Upload className="h-4 w-4" />
                          {isImportingAcademicAttendance ? 'Mengunggah absensi…' : 'Upload Absensi'}
                        </button>
                      </div>
                    </form>
                    {academicAttendanceError && (
                      <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {academicAttendanceError}
                      </p>
                    )}
                    {academicAttendanceResult && (
                      <div aria-live="polite" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 space-y-2">
                        <p className="font-semibold">
                          ✓ Berhasil menyimpan {academicAttendanceResult.imported} baris presensi dari total {academicAttendanceResult.totalRows} baris.
                        </p>
                        {academicAttendanceResult.deductions?.totalDeductions > 0 ? (
                          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                            <p className="font-bold text-amber-950 flex items-center gap-1.5">
                              <span>⚠️</span> Pengurangan Poin Otomatis Diterapkan:
                            </p>
                            <p className="mt-1">
                              Sebanyak <strong>{academicAttendanceResult.deductions.totalDeductions} catatan ketidakhadiran (Alpa)</strong> diproses dengan total pengurangan <strong>-{academicAttendanceResult.deductions.totalPointsDeducted} poin</strong> pada mahasiswa terkait.
                            </p>
                            {academicAttendanceResult.deductions.students?.length > 0 && (
                              <ul className="mt-2 list-disc list-inside space-y-0.5 text-slate-700 max-h-36 overflow-y-auto">
                                {academicAttendanceResult.deductions.students.slice(0, 10).map((item, idx) => (
                                  <li key={idx}>
                                    <strong>{item.nama}</strong> ({item.nim}) — {item.mataKuliah}: {item.alpa} Alpa ({item.delta} poin, sisa {item.scoreAfter} poin)
                                  </li>
                                ))}
                                {academicAttendanceResult.deductions.students.length > 10 && (
                                  <li className="font-semibold text-slate-500">
                                    ...dan {academicAttendanceResult.deductions.students.length - 10} mahasiswa lainnya.
                                  </li>
                                )}
                              </ul>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-700">
                            Seluruh mahasiswa memiliki kehadiran penuh / tidak ada catatan Alpa baru yang memotong poin.
                          </p>
                        )}
                      </div>
                    )}

                    <AcademicFileHistory
                      files={academicFiles.filter((f) => f.category === 'attendance')}
                      isLoading={isLoadingAcademicFiles}
                      title="Lampiran File Absensi yang Pernah Diunggah"
                      description="Klik nama file atau tombol preview untuk melihat isi data file secara langsung."
                      emptyText="Belum ada file absensi yang diunggah."
                      onPreview={handleOpenFilePreview}
                      onDeleted={handleAcademicFilesDeleted}
                    />
                  </section>
                )}

                {activeTab === 'upload-mahasiswa' && (
                  <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg sm:p-8">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Upload Data Mahasiswa Baru</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Menu ini digunakan untuk menambahkan data dan akun mahasiswa baru ke dalam sistem.
                      </p>
                      <button
                        type="button"
                        onClick={() => setTemplatePreviewCategory('students')}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-100"
                      >
                        <FileText className="h-4 w-4" />
                        Lihat template data mahasiswa
                      </button>
                    </div>
                    <form onSubmit={handleNewStudentImport} className="space-y-4">
                      <label htmlFor="new-student-file" className="block text-sm font-semibold text-slate-700">
                        File data mahasiswa
                      </label>
                      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <input
                          id="new-student-file"
                          type="file"
                          accept=".xls,.xlsx,.csv"
                          required
                          onChange={(event) => {
                            setNewStudentFile(event.target.files?.[0] ?? null);
                            setNewStudentImportResult(null);
                            setNewStudentImportError('');
                          }}
                          className="block w-full flex-1 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-red-800 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-red-900"
                        />
                        <button
                          type="submit"
                          disabled={isImportingNewStudents || !newStudentFile}
                          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-red-800 px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-red-900 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                        >
                          <Upload className="h-4 w-4" />
                          {isImportingNewStudents ? 'Mengimpor mahasiswa…' : 'Upload Mahasiswa'}
                        </button>
                      </div>
                    </form>
                    {newStudentImportError && (
                      <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {newStudentImportError}
                      </p>
                    )}
                    {newStudentImportResult && (
                      <p aria-live="polite" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        Berhasil menambahkan {newStudentImportResult.imported} mahasiswa baru. {newStudentImportResult.skipped} baris dilewati karena NIM sudah terdaftar.
                      </p>
                    )}
                  </section>
                )}

                {activeTab === 'upload-dosen' && (
                  <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg sm:p-8">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Upload Data Dosen Baru</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Menu ini digunakan untuk menambahkan data dan akun dosen agar dapat menggunakan layanan dosen di sistem.
                      </p>
                      <button
                        type="button"
                        onClick={() => setTemplatePreviewCategory('lecturers')}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-100"
                      >
                        <FileText className="h-4 w-4" />
                        Lihat template data dosen
                      </button>
                    </div>
                    <form onSubmit={handleNewLecturerImport} className="space-y-4">
                      <label htmlFor="new-lecturer-file" className="block text-sm font-semibold text-slate-700">
                        File data dosen
                      </label>
                      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <input
                          id="new-lecturer-file"
                          type="file"
                          accept=".xls,.xlsx,.csv"
                          required
                          onChange={(event) => {
                            setNewLecturerFile(event.target.files?.[0] ?? null);
                            setNewLecturerImportResult(null);
                            setNewLecturerImportError('');
                          }}
                          className="block w-full flex-1 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-red-800 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-red-900"
                        />
                        <button
                          type="submit"
                          disabled={isImportingNewLecturers || !newLecturerFile}
                          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-red-800 px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-red-900 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                        >
                          <Upload className="h-4 w-4" />
                          {isImportingNewLecturers ? 'Mengimpor dosen…' : 'Upload Dosen'}
                        </button>
                      </div>
                    </form>
                    {newLecturerImportError && (
                      <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {newLecturerImportError}
                      </p>
                    )}
                    {newLecturerImportResult && (
                      <p aria-live="polite" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        Berhasil menambahkan {newLecturerImportResult.imported} dosen baru. {newLecturerImportResult.skipped} baris dilewati karena NUPTK atau Email sudah terdaftar.
                      </p>
                    )}
                  </section>
                )}

                {activeTab === 'pembagian-bimbingan' && (
                  <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg sm:p-8">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Pembagian Mahasiswa Bimbingan</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Menu ini digunakan untuk menetapkan dosen pembimbing akademik bagi mahasiswa agar data bimbingan dan pemantauan mahasiswa tersinkronisasi.
                      </p>
                      <button
                        type="button"
                        onClick={() => setTemplatePreviewCategory('advisor-assignments')}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-100"
                      >
                        <FileText className="h-4 w-4" />
                        Lihat template pembagian DPA
                      </button>
                    </div>
                    <form onSubmit={handleAdvisorAssignmentImport} className="space-y-4">
                      <label htmlFor="advisor-assignment-file" className="block text-sm font-semibold text-slate-700">
                        File pembagian dosen PA
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                          id="advisor-assignment-file"
                          type="file"
                          accept=".csv,.xls,.xlsx"
                          required
                          onChange={(event) => {
                            setAdvisorAssignmentFile(event.target.files?.[0] ?? null);
                            setAdvisorAssignmentResult(null);
                            setAdvisorAssignmentError('');
                          }}
                          className="block w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-red-800 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-red-900 cursor-pointer"
                        />
                        <button
                          type="submit"
                          disabled={isImportingAdvisorAssignments || !advisorAssignmentFile}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-red-800 px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-red-900 disabled:cursor-wait disabled:opacity-60 shrink-0"
                        >
                          <Upload className="h-4 w-4" />
                          {isImportingAdvisorAssignments ? 'Menyimpan pembagian…' : 'Upload Pembagian'}
                        </button>
                      </div>
                    </form>
                    {advisorAssignmentError && (
                      <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {advisorAssignmentError}
                      </p>
                    )}
                    {advisorAssignmentResult && (
                      <p aria-live="polite" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        Pembagian DPA berhasil diperbarui untuk {advisorAssignmentResult.assigned} mahasiswa. Data mahasiswa lainnya tetap dipertahankan.
                      </p>
                    )}

                    <AcademicFileHistory
                      files={academicFiles.filter((f) => f.category === 'advisors')}
                      isLoading={isLoadingAcademicFiles}
                      title="Lampiran File Pembagian DPA yang Pernah Diunggah"
                      description="Klik nama file atau tombol preview untuk melihat isi pembagian DPA di dalam file."
                      emptyText="Belum ada file pembagian DPA yang diunggah."
                      onPreview={handleOpenFilePreview}
                      onDeleted={handleAcademicFilesDeleted}
                    />
                  </section>
                )}
              </main>
            )}

            {authenticatedUser?.role === 'dosen' && !['lapor', 'cek-laporan', 'laporan-dpa'].includes(activeTab) && (
              <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
                {activeTab === homeTab ? (
                <section data-scroll-reveal className={`${welcomeCardClassName} relative overflow-hidden rounded-3xl border border-red-600/30 bg-gradient-to-r from-[#450a0a]/95 via-[#7f1d1d]/95 to-[#991b1b]/95 p-5 text-white shadow-2xl sm:p-8`}>
                  <div className="[grid-area:badge] min-w-0"><SemesterBadge /></div>
                  <WelcomeHeading name={authenticatedUser?.name || 'Dosen'} className="[grid-area:heading]" />
                  <p className="[grid-area:identity] truncate text-xs text-red-100 sm:text-sm" data-testid="database-profile">
                    {authenticatedUser?.details
                      ?.filter((detail) => detail.label === 'NUPTK')
                      .map((detail) => `${detail.label}: ${detail.value}`)
                      .join(' • ')}
                  </p>

                  <div className="contents md:flex md:items-center md:gap-6 md:self-center md:[grid-area:side]">
                    <div className="[grid-area:bell] self-center"><NotificationBell endpoint="/api/dosen/pemberitahuan" className="md:h-24 md:w-24 md:rounded-2xl" iconClassName="h-5 w-5 md:h-10 md:w-10" badgeClassName="-right-1.5 -top-1.5 h-5 min-w-5 px-1 text-[10px] md:-right-2 md:-top-2 md:h-7 md:min-w-7 md:px-1.5 md:text-sm" /></div>
                    <div className="[grid-area:profile] mt-4 flex items-center gap-4 rounded-2xl border border-red-800/60 bg-[#581c1c]/95 p-4 backdrop-blur-sm sm:p-5 md:mt-0 md:h-24 md:min-w-[280px]">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      <GraduationCap className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-200">Profil akun</p>
                      <p className="text-base font-extrabold leading-snug text-white">
                        {authenticatedUser?.roleLabel}
                      </p>
                      <p className="mt-0.5 text-xs text-red-200">
                        Terdaftar: {authenticatedUser?.createdAt
                          ? new Date(authenticatedUser.createdAt).toLocaleDateString('id-ID')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  </div>
                </section>
                ) : (
                  <MenuHeader item={activeMenu} roleLabel={authenticatedUser?.roleLabel} />
                )}

                <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  {[
                    { label: 'Mahasiswa bimbingan', icon: UserCheck, value: advisorStudents.length },
                    { label: 'Kurang Disiplin', icon: AlertCircle, value: advisorStudents.filter((student) => student.pointScore > 50 && student.pointScore < 100).length },
                    { label: 'Tidak Disiplin', icon: MessageSquare, value: advisorStudents.filter((student) => student.pointScore <= 50).length },
                  ].map(({ label, icon: Icon, value }) => (
                    <div key={label} data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                        <Icon className="h-5 w-5 text-red-800" />
                      </div>
                      <p className="mt-3 text-3xl font-extrabold text-slate-900">
                        {isLoadingAdvisorStudents ? '…' : value}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Data mahasiswa bimbingan Anda</p>
                    </div>
                  ))}
                </section>

                {activeTab === homeTab && (
                  <DosenDashboardSummary
                    students={advisorStudents}
                    isLoadingStudents={isLoadingAdvisorStudents}
                    studentsError={advisorStudentsError}
                    onOpen={setActiveTab}
                  />
                )}

                {activeTab === 'konseling' ? (
                  <section data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg sm:p-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">Monitoring & Konseling Kedisiplinan</h3>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500">
                          Daftar mahasiswa bimbingan yang mengajukan sanggahan. Pilih nama untuk meninjau sanggahan, riwayat poin, dan catatan konseling.
                        </p>
                      </div>
                    </div>

                    {counselingStudentsError && (
                      <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                        {counselingStudentsError}
                      </p>
                    )}
                    {counselingStatus && (
                      <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                        {counselingStatus}
                      </p>
                    )}

                    {isLoadingCounseling ? (
                      <p className="mt-5 rounded-xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">Memuat mahasiswa bimbingan...</p>
                    ) : appealingStudents.length === 0 ? (
                      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                        <p className="font-semibold text-slate-700">Belum ada sanggahan</p>
                        <p className="mt-1 text-sm text-slate-500">Mahasiswa bimbingan yang mengajukan sanggahan pelanggaran akan muncul di sini.</p>
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.5fr)]">
                        <div className="space-y-2">
                          {appealingStudents.map((student) => {
                            const zone = student.pointScore <= 50
                              ? 'Tidak Disiplin'
                              : student.pointScore < 100
                                ? 'Kurang Disiplin'
                                : 'Disiplin';
                            const zoneClass = zone === 'Tidak Disiplin'
                              ? 'bg-red-100 text-red-800'
                              : zone === 'Kurang Disiplin'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800';
                            const pendingAppeals = (student.sanggahans ?? []).filter((appeal) => appeal.status === 'DIAJUKAN').length;
                            return (
                              <button
                                key={student.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCounselingStudentId(String(student.id));
                                  setCounselingStatus('');
                                }}
                                className={`w-full rounded-xl border p-4 text-left transition ${
                                  selectedCounselingStudentId === String(student.id)
                                    ? 'border-red-700 bg-red-50'
                                    : 'border-slate-200 bg-white hover:border-red-300'
                                }`}
                              >
                                <span className="flex items-start justify-between gap-2">
                                  <span>
                                    <span className="block font-bold text-slate-900">{student.nama}</span>
                                    <span className="mt-1 block text-xs text-slate-500">NIM {student.nim} · {student.jurusan}</span>
                                  </span>
                                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${zoneClass}`}>{zone}</span>
                                </span>
                                <span className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                                  <span>Skor kedisiplinan: {student.pointScore}</span>
                                  {pendingAppeals > 0 && (
                                    <span className="rounded-full bg-red-700 px-2.5 py-1 text-[10px] font-bold text-white">
                                      {pendingAppeals} sanggahan baru
                                    </span>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {selectedCounselingStudent ? (
                          <div className="space-y-5">
                            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <h4 className="font-bold text-slate-900">{selectedCounselingStudent.nama}</h4>
                              <p className="mt-1 text-sm text-slate-600">
                                NIM {selectedCounselingStudent.nim} · {selectedCounselingStudent.jurusan} · Skor {selectedCounselingStudent.pointScore}
                              </p>
                              <h5 className="mt-4 text-sm font-bold text-slate-800">Riwayat perubahan poin</h5>
                              {selectedCounselingStudent.pointChanges.length === 0 ? (
                                <p className="mt-2 text-sm text-slate-500">Belum ada perubahan poin.</p>
                              ) : (
                                <ul className="mt-2 space-y-2">
                                  {selectedCounselingStudent.pointChanges.map((change) => (
                                    <li key={change.id} className="flex flex-wrap justify-between gap-2 text-xs text-slate-600">
                                      <span>{change.reason} · skor {change.scoreAfter} ({change.delta > 0 ? '+' : ''}{change.delta})</span>
                                      <span>{new Date(change.createdAt).toLocaleDateString('id-ID')}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </article>

                            <div>
                              <h4 className="font-bold text-slate-900">Sanggahan pelanggaran</h4>
                              {(selectedCounselingStudent.sanggahans ?? []).length === 0 ? (
                                <p className="mt-2 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Belum ada sanggahan dari mahasiswa ini.</p>
                              ) : (
                                <div className="mt-3 space-y-3">
                                  {selectedCounselingStudent.sanggahans.map((appeal) => {
                                    const statusClass = appeal.status === 'DIAJUKAN'
                                      ? 'bg-amber-100 text-amber-900'
                                      : appeal.status === 'DISETUJUI'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-red-100 text-red-800';
                                    const statusLabel = appeal.status === 'DIAJUKAN'
                                      ? 'Menunggu putusan'
                                      : appeal.status === 'DISETUJUI'
                                        ? 'Disetujui'
                                        : 'Ditolak';
                                    return (
                                      <article key={appeal.id} className="rounded-xl border border-slate-200 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                          <p className="text-xs font-bold text-slate-700">
                                            {appeal.perubahanPoin?.reason} ({appeal.perubahanPoin?.delta})
                                            {' · '}
                                            {new Date(appeal.createdAt).toLocaleDateString('id-ID')}
                                          </p>
                                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass}`}>{statusLabel}</span>
                                        </div>
                                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{appeal.alasan}</p>
                                        {appeal.buktiFileName && (
                                          <a
                                            href={`/api/sanggahan/${appeal.id}/bukti`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-red-800 hover:underline"
                                          >
                                            <FileText className="h-4 w-4" /> Lihat bukti tambahan
                                          </a>
                                        )}
                                        {appeal.status === 'DIAJUKAN' ? (
                                          <div className="mt-3 space-y-2">
                                            <textarea
                                              maxLength={1000}
                                              rows={2}
                                              value={appealNotes[appeal.id] ?? ''}
                                              onChange={(event) => setAppealNotes((current) => ({ ...current, [appeal.id]: event.target.value }))}
                                              placeholder="Catatan untuk mahasiswa (opsional)"
                                              aria-label="Catatan pemeriksa sanggahan"
                                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                            />
                                            <div className="flex flex-wrap gap-2">
                                              <button
                                                type="button"
                                                disabled={decidingAppealId !== null}
                                                onClick={() => handleAppealDecision(appeal.id, 'DISETUJUI')}
                                                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                {decidingAppealId === appeal.id ? 'Menyimpan...' : 'Setujui & pulihkan poin'}
                                              </button>
                                              <button
                                                type="button"
                                                disabled={decidingAppealId !== null}
                                                onClick={() => handleAppealDecision(appeal.id, 'DITOLAK')}
                                                className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                Tolak
                                              </button>
                                            </div>
                                          </div>
                                        ) : appeal.catatanPemeriksa && (
                                          <p className="mt-2 text-xs text-slate-500">Catatan pemeriksa: {appeal.catatanPemeriksa}</p>
                                        )}
                                      </article>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div>
                              <h4 className="font-bold text-slate-900">Riwayat catatan pembinaan</h4>
                              {selectedCounselingStudent.counselingRecords.length === 0 ? (
                                <p className="mt-2 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Belum ada catatan untuk mahasiswa ini.</p>
                              ) : (
                                <div className="mt-3 space-y-3">
                                  {selectedCounselingStudent.counselingRecords.map((record) => (
                                    <article key={record.id} className="rounded-xl border border-slate-200 p-4">
                                      <p className="text-xs font-bold text-slate-700">
                                        {record.type === 'COUNSELING_CALL' ? 'Panggilan konseling' : 'Catatan pembinaan'}
                                        {' · '}
                                        {new Date(record.counselingDate).toLocaleDateString('id-ID', { timeZone: 'UTC' })}
                                      </p>
                                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{record.note}</p>
                                    </article>
                                  ))}
                                </div>
                              )}
                            </div>

                            <form onSubmit={handleCounselingSubmit} className="space-y-4 rounded-xl border border-red-100 bg-red-50/60 p-4">
                              <h4 className="font-bold text-slate-900">Beri catatan / panggilan konseling</h4>
                              <div>
                                <label htmlFor="counseling-type" className="mb-1 block text-xs font-bold text-slate-700">Jenis tindak lanjut</label>
                                <select
                                  id="counseling-type"
                                  value={counselingForm.type}
                                  onChange={(event) => setCounselingForm((current) => ({ ...current, type: event.target.value }))}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                                >
                                  <option value="GUIDANCE_NOTE">Catatan pembinaan</option>
                                  <option value="COUNSELING_CALL">Panggilan konseling</option>
                                </select>
                              </div>
                              <div>
                                <label htmlFor="counseling-date" className="mb-1 block text-xs font-bold text-slate-700">Tanggal konseling / tindak lanjut</label>
                                <input
                                  id="counseling-date"
                                  type="date"
                                  required
                                  value={counselingForm.counselingDate}
                                  onChange={(event) => setCounselingForm((current) => ({ ...current, counselingDate: event.target.value }))}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                                />
                              </div>
                              <div>
                                <label htmlFor="counseling-note" className="mb-1 block text-xs font-bold text-slate-700">Catatan pembinaan</label>
                                <textarea
                                  id="counseling-note"
                                  required
                                  maxLength={2000}
                                  rows={4}
                                  value={counselingForm.note}
                                  onChange={(event) => setCounselingForm((current) => ({ ...current, note: event.target.value }))}
                                  placeholder="Tulis ringkasan pembinaan atau informasi panggilan konseling untuk mahasiswa."
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={isSavingCounseling}
                                className="rounded-lg bg-red-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isSavingCounseling ? 'Menyimpan...' : 'Simpan & kirim catatan'}
                              </button>
                            </form>
                          </div>
                        ) : (
                          <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                            Pilih nama mahasiswa untuk melihat detail dan menambahkan catatan konseling.
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                ) : null}
              </main>
            )}

            {authenticatedUser?.role === 'admin' && !['lapor', 'cek-laporan', 'laporan-kemahasiswaan', 'klaim-kemahasiswaan', 'punishment', 'pengaturan-poin', 'data-poin', 'drc'].includes(activeTab) && (
              <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
                {activeTab === homeTab ? (
                <section data-scroll-reveal className={`${welcomeCardClassName} rounded-3xl border border-red-600/30 bg-gradient-to-r from-[#450a0a]/95 via-[#7f1d1d]/95 to-[#991b1b]/95 p-5 text-white shadow-2xl sm:p-8`}>
                  <div className="[grid-area:badge] min-w-0"><SemesterBadge /></div>
                  <div className="[grid-area:bell] self-center md:[grid-area:side]">
                    <NotificationBell endpoint="/api/admin/pemberitahuan" className="md:h-24 md:w-24 md:rounded-2xl" iconClassName="h-5 w-5 md:h-10 md:w-10" badgeClassName="-right-1.5 -top-1.5 h-5 min-w-5 px-1 text-[10px] md:-right-2 md:-top-2 md:h-7 md:min-w-7 md:px-1.5 md:text-sm" />
                  </div>
                  <WelcomeHeading name="Tim Kedisiplinan Mahasiswa" className="[grid-area:heading]" />
                  <p className="[grid-area:identity] max-w-2xl text-sm leading-relaxed text-red-100">
                    Pantau data mahasiswa dan dosen PA, telusuri laporan anonim, dan tetapkan tindak lanjut edukatif setelah laporan dikonfirmasi Dosen PA.
                  </p>
                </section>
                ) : (
                  <MenuHeader item={activeMenu} roleLabel={authenticatedUser?.roleLabel} />
                )}

                <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow">
                  Poin berkurang setelah Dosen PA mengonfirmasi pelanggaran. Kemahasiswaan menetapkan tindak lanjut; poin dipulihkan oleh sistem setelah bukti mahasiswa disetujui Dosen PA.
                </p>

                <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: 'Total mahasiswa',
                      value: adminMonitoring.students.length,
                      icon: GraduationCap,
                      tab: 'data-poin',
                    },
                    {
                      label: 'Total dosen PA',
                      value: adminMonitoring.lecturers.length,
                      icon: Users,
                      tab: 'monitoring-dpa',
                    },
                    {
                      label: 'Pelanggaran sudah di-coaching',
                      value: adminMonitoring.students.filter((student) => hasViolation(student) && hasCoachingForLatestViolation(student)).length,
                      icon: CheckCircle2,
                      tab: 'data-poin',
                    },
                    {
                      label: 'Perlu dipantau',
                      value: adminMonitoring.students.filter((student) => student.dosenPa && hasViolation(student) && !hasCoachingForLatestViolation(student)).length,
                      icon: Clock,
                      tab: 'data-poin',
                    },
                  ].map(({ label, value, icon: Icon, tab }) => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => setActiveTab(tab)}
                      data-scroll-reveal
                      className="rounded-2xl border border-slate-200 bg-white/95 p-5 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                        <Icon className="h-5 w-5 text-red-800" />
                      </div>
                      <p className="mt-3 text-3xl font-extrabold text-slate-900">
                        {isLoadingAdminMonitoring ? '…' : adminMonitoringError ? '--' : value}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Data SIGMA • perbarui otomatis</p>
                    </button>
                  ))}
                </section>

                {adminMonitoringError && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {adminMonitoringError}
                  </p>
                )}

                {activeTab === homeTab && (
                  <AdminDashboardSummary
                    students={adminMonitoring.students}
                    lecturers={adminMonitoring.lecturers}
                    isLoadingMonitoring={isLoadingAdminMonitoring}
                    monitoringError={adminMonitoringError}
                    onOpen={setActiveTab}
                  />
                )}

                {activeTab === 'monitoring-dpa' && (
                  <AdminLecturerMonitoring
                    lecturers={adminMonitoring.lecturers}
                    isLoading={isLoadingAdminMonitoring}
                  />
                )}
              </main>
            )}
          </div>
        </div>
      )}


      {previewModalOpen && (
        <FilePreviewModal
          data={previewData}
          isLoading={isLoadingPreview}
          error={previewError}
          searchTerm={previewSearchTerm}
          onSearchChange={setPreviewSearchTerm}
          onClose={() => setPreviewModalOpen(false)}
        />
      )}

      {templatePreviewCategory && (
        <TemplatePreviewModal category={templatePreviewCategory} onClose={closeTemplatePreview} />
      )}

    </div>
  );
}
