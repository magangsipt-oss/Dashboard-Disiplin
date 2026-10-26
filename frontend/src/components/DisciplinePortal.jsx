'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LaporSatgas from './student/LaporSatgas';
import TindakLanjut from './student/TindakLanjut';
import SanggahanMahasiswa from './student/SanggahanMahasiswa';
import AktivitasMahasiswa from './student/AktivitasMahasiswa';
import AdminReportQueue from './reports/AdminReportQueue';
import DosenReportWorkflow from './reports/DosenReportWorkflow';
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
  Plus,
  BookOpen,
  ClipboardCheck,
  Leaf,
  Scale,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  MapPin,
  Mail,
  Phone,
  X,
  Search,
  Users,
  Eye,
  Download,
  Upload,
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

const severityPointDeductions = {
  RINGAN: ['5', '10', '5', '10', '5'],
  SEDANG: ['10', '15', '10', '20', '10'],
  BERAT: ['15', '25', '15', '30', '15'],
};

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
};

export default function App() {
  const router = useRouter();
  const [activePage, setActivePage] = useState('landing');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeHeroImage, setActiveHeroImage] = useState(0);

  const [showSKPIModal, setShowSKPIModal] = useState(false);
  const [showSanggahModal, setShowSanggahModal] = useState(false);
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
  const [studentRiskFilter, setStudentRiskFilter] = useState('ALL');
  const [selectedCounselingStudentId, setSelectedCounselingStudentId] = useState('');
  const [counselingForm, setCounselingForm] = useState({
    type: 'GUIDANCE_NOTE',
    note: '',
    counselingDate: '',
  });
  const [isSavingCounseling, setIsSavingCounseling] = useState(false);
  const [counselingStatus, setCounselingStatus] = useState('');
  const [adminMonitoring, setAdminMonitoring] = useState({ students: [], lecturers: [] });
  const [isLoadingAdminMonitoring, setIsLoadingAdminMonitoring] = useState(false);
  const [adminMonitoringError, setAdminMonitoringError] = useState('');
  const [adminMonitoringSearch, setAdminMonitoringSearch] = useState('');
  const [adminCoachingFilter, setAdminCoachingFilter] = useState('ALL');
  const [academicAttendanceFile, setAcademicAttendanceFile] = useState(null);
  const [academicAttendanceResult, setAcademicAttendanceResult] = useState(null);
  const [academicAttendanceError, setAcademicAttendanceError] = useState('');
  const [isImportingAcademicAttendance, setIsImportingAcademicAttendance] = useState(false);
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

  const officialLogoUrl = "/poltek-simas-berau.png";
  const bgCampusImage = "/portal-access-background.jpg";
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
  const navigationByRole = {
    mhs: [
      { id: 'dashboard', label: 'Aktivitas' },
      { id: 'sanggah', label: 'Sanggah Pelanggaran' },
      { id: 'lapor', label: 'Lapor Satgas' },
      { id: 'tindak-lanjut', label: 'Tindak Lanjut' },
      { id: 'klaim', label: 'Klaim Kegiatan' },
    ],
    dosen: [
      { id: 'bimbingan', label: 'Mahasiswa Bimbingan' },
      { id: 'laporan-dpa', label: 'Konfirmasi Laporan' },
      { id: 'konseling', label: 'Catatan & Konseling' },
      { id: 'lapor', label: 'Lapor Satgas' },
    ],
    admin: [
      { id: 'dashboard', label: 'Dashboard Kemahasiswaan' },
      { id: 'laporan-kemahasiswaan', label: 'Antrean Laporan' },
      { id: 'monitoring', label: 'Monitoring Mahasiswa & Dosen PA' },
      { id: 'pengurangan-poin', label: 'Pengurangan Poin' },
    ],
    akademik: [
      { id: 'dashboard', label: 'Dashboard Akademik' },
      { id: 'lapor', label: 'Lapor Satgas' },
      { id: 'upload-absensi', label: 'Upload Absensi' },
      { id: 'pembagian-bimbingan', label: 'Pembagian Mahasiswa Bimbingan' },
    ],
  };
  const dashboardNavigation =
    navigationByRole[authenticatedUser?.role] ?? navigationByRole.mhs;
  const filteredAdvisorStudents = advisorStudents.filter((student) => {
    if (studentRiskFilter === 'UNDISCIPLINED') {
      return student.pointScore <= 50;
    }
    if (studentRiskFilter === 'LESS_DISCIPLINED') {
      return student.pointScore > 50 && student.pointScore < 100;
    }
    if (studentRiskFilter === 'DISCIPLINED') {
      return student.pointScore >= 100;
    }
    return true;
  });
  const selectedCounselingStudent = counselingStudents.find(
    (student) => String(student.id) === selectedCounselingStudentId,
  );
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
  const filteredAdminMonitoringStudents = adminMonitoring.students.filter((student) => {
    const search = adminMonitoringSearch.trim().toLowerCase();
    const matchesSearch = !search || [
      student.nama,
      String(student.nim),
      student.jurusan,
      student.dosenPa?.nama,
      student.dosenPa?.nip,
    ].some((value) => String(value ?? '').toLowerCase().includes(search));
    const matchesFilter =
      adminCoachingFilter === 'ALL' ||
      (adminCoachingFilter === 'COACHED' && hasViolation(student) && hasCoachingForLatestViolation(student)) ||
      (adminCoachingFilter === 'NEEDS_COACHING' && student.dosenPa && hasViolation(student) && !hasCoachingForLatestViolation(student)) ||
      (adminCoachingFilter === 'NO_ADVISOR' && !student.dosenPa);
    return matchesSearch && matchesFilter;
  });

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
          setActiveTab(
            data.profile.role === 'dosen' ? 'bimbingan' : 'dashboard',
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
        }
      })
      .catch((error) => {
        if (isMounted) {
          console.error('Tidak dapat memeriksa sesi login:', error);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
    const refreshTimer = window.setInterval(() => loadAdvisorStudents(false), 15000);
    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
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
    const refreshTimer = window.setInterval(() => loadCounseling(false), 15000);
    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [authenticatedUser?.role, activePage, activeTab]);

  useEffect(() => {
    if (
      authenticatedUser?.role !== 'admin' ||
      activePage !== 'dashboard' ||
      !['dashboard', 'monitoring'].includes(activeTab)
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
    const refreshTimer = window.setInterval(() => loadAdminMonitoring(false), 15000);
    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
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

  useEffect(() => {
    if (activePage !== 'landing' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const heroTimer = window.setInterval(() => {
      setActiveHeroImage((currentImage) => (currentImage + 1) % heroImages.length);
    }, 6500);

    return () => window.clearInterval(heroTimer);
  }, [activePage, heroImages.length]);

  const handleSelectRole = (role) => {
    router.push(`/login?role=${role}`);
  };

  async function submitAcademicImport(event, file, endpoint, setLoading, setError, setResult) {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!file) {
      setError('Pilih file CSV atau Excel (.xlsx) terlebih dahulu.');
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

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }
      setLoginError('');
    } catch (error) {
      console.error('Tidak dapat mengakhiri sesi di backend:', error);
      setLoginError('Koneksi logout gagal. Muat ulang halaman untuk memeriksa sesi.');
    } finally {
      setAuthenticatedUser(null);
      setStudentPoints(null);
      setAdvisor(null);
      setAdvisorError('');
      setActiveTab('dashboard');
      setActivePage('landing');
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

  return (
    <div className="min-h-screen font-sans text-slate-800 bg-slate-100">
      
      {}
      {activePage === 'landing' && (
        <div className="min-h-screen flex flex-col">
          <header className="bg-white border-b border-slate-200 px-6 py-3.5 relative z-20 shadow-sm">
            <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-auto flex items-center justify-center p-1 bg-white rounded-xl shadow-sm border border-slate-200">
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
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Politeknik Sinar Mas Berau Coal — Tanjung Redeb, Berau</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center font-bold">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">0811-5443-118</p>
                    <p className="text-[11px] text-slate-500">Senin - Jumat (08:00 - 16:00 WITA)</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Humas & Layanan</p>
                    <p className="text-[11px] text-slate-500">humas@polteksimasberau.ac.id</p>
                  </div>
                </div>
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
                Sistem Poin Kedisiplinan & Track Record Vokasi
              </span>
              <h2 data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="text-3xl sm:text-4xl font-extrabold mt-3 leading-tight">
                Portal Kedisiplinan & Integrasi SKPI Mahasiswa
              </h2>
              <p data-scroll-reveal data-reveal="text" data-reveal-delay="160" className="mt-2 text-slate-100 max-w-2xl text-sm sm:text-base leading-relaxed">
                Selamat datang di portal pemantauan kedisiplinan Politeknik Sinar Mas Berau Coal. Sistem ini menyajikan rekam jejak presensi yang diunggah tim akademik melalui file Excel/CSV serta poin kegiatan non-akademik.
              </p>
            </div>
          </div>

          <main data-scroll-reveal className="relative z-0 -mt-7 flex min-h-[520px] w-full flex-1 items-center justify-center overflow-hidden bg-cover bg-center px-6 py-16"
                style={{ backgroundImage: `url(${portalAccessBackground})` }}>
            <div className="absolute inset-0 z-0 bg-slate-950/55 backdrop-blur-[2px]"></div>

            <div className="max-w-7xl mx-auto w-full relative z-10">
              <div className="text-center mb-10">
                <h3 data-scroll-reveal data-reveal="text" className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">Pilih Akses Masuk Portal</h3>
                <p data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="text-slate-100 text-sm mt-2 font-medium drop-shadow-sm">Silakan pilih peran Anda untuk melanjutkan ke halaman login</p>
              </div>

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  data-scroll-reveal
                  data-reveal="left"
                  data-reveal-delay="80"
                  onClick={() => handleSelectRole('mhs')}
                  className="w-full appearance-none text-left font-sans bg-white/95 backdrop-blur-md rounded-2xl p-7 border border-white/80 shadow-2xl hover:shadow-red-500/25 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
                >
                  <div>
                    <div className="w-14 h-14 bg-red-50 text-red-800 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-red-800 group-hover:text-white transition-all shadow-sm">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-8 h-8"
                      >
                        <circle cx="12" cy="7" r="4" />
                        <path d="M5 21v-2a7 7 0 0 1 14 0v2H5Z" />
                      </svg>
                    </div>
                    <h4 data-scroll-reveal data-reveal="text" className="text-2xl font-bold text-slate-900 group-hover:text-red-800 transition-colors">Akses Mahasiswa</h4>
                    <p data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="text-slate-600 text-sm mt-3 leading-relaxed font-normal">
                      Cek rekam jejak kedisiplinan dan presensi yang diunggah tim akademik, ajukan sanggah, serta klaim poin kegiatan non-akademik.
                    </p>
                  </div>
                  <span className="mt-8 w-full py-3 bg-slate-100 group-hover:bg-red-800 group-hover:text-white text-slate-800 font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2">
                    Masuk via NIM
                  </span>
                </button>

                <button
                  type="button"
                  data-scroll-reveal
                  data-reveal="zoom"
                  data-reveal-delay="160"
                  onClick={() => handleSelectRole('dosen')}
                  className="w-full appearance-none text-left font-sans bg-white/95 backdrop-blur-md rounded-2xl p-7 border border-white/80 shadow-2xl hover:shadow-rose-500/25 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
                >
                  <div>
                    <div className="w-14 h-14 bg-rose-50 text-rose-800 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-rose-800 group-hover:text-white transition-all shadow-sm">
                      <GraduationCap className="w-8 h-8" />
                    </div>
                    <h4 data-scroll-reveal data-reveal="text" className="text-2xl font-bold text-slate-900 group-hover:text-rose-800 transition-colors">Akses Dosen PA</h4>
                    <p data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="text-slate-600 text-sm mt-3 leading-relaxed font-normal">
                      Monitoring statistik kedisiplinan mahasiswa bimbingan, verifikasi jadwal konseling, dan berikan catatan bimbingan.
                    </p>
                  </div>
                  <span className="mt-8 w-full py-3 bg-slate-100 group-hover:bg-rose-800 group-hover:text-white text-slate-800 font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2">
                    Masuk via Email
                  </span>
                </button>

                <button
                  type="button"
                  data-scroll-reveal
                  data-reveal="right"
                  data-reveal-delay="240"
                  onClick={() => handleSelectRole('admin')}
                  className="w-full appearance-none text-left font-sans bg-white/95 backdrop-blur-md rounded-2xl p-7 border border-white/80 shadow-2xl hover:shadow-red-600/25 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
                >
                  <div>
                    <div className="w-14 h-14 bg-red-50 text-red-900 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-red-900 group-hover:text-white transition-all shadow-sm">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h4 data-scroll-reveal data-reveal="text" className="text-2xl font-bold text-slate-900 group-hover:text-red-900 transition-colors">Akses Kemahasiswaan</h4>
                    <p data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="text-slate-600 text-sm mt-3 leading-relaxed font-normal">
                      Masuk menggunakan email untuk memverifikasi klaim sertifikat, kegiatan non-akademik, dan sanggahan presensi.
                    </p>
                  </div>
                  <span className="mt-8 w-full py-3 bg-slate-100 group-hover:bg-red-900 group-hover:text-white text-slate-800 font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2">
                    Masuk via Email
                  </span>
                </button>

                <button
                  type="button"
                  data-scroll-reveal
                  data-reveal="right"
                  data-reveal-delay="320"
                  onClick={() => handleSelectRole('akademik')}
                  className="w-full appearance-none text-left font-sans bg-white/95 backdrop-blur-md rounded-2xl p-7 border border-white/80 shadow-2xl hover:shadow-red-600/25 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
                >
                  <div>
                    <div className="w-14 h-14 bg-red-50 text-red-800 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-red-800 group-hover:text-white transition-all shadow-sm">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <h4 className="text-2xl font-bold text-slate-900 group-hover:text-red-800 transition-colors">Akses Akademik</h4>
                    <p className="text-slate-600 text-sm mt-3 leading-relaxed font-normal">
                      Masuk ke portal Akademik menggunakan email dan kata sandi akun Akademik.
                    </p>
                  </div>
                  <span className="mt-8 w-full py-3 bg-slate-100 group-hover:bg-red-800 group-hover:text-white text-slate-800 font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2">
                    Masuk via Email
                  </span>
                </button>
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
            © 2026 Politeknik Sinar Mas Berau Coal — SIGMA
          </footer>
        </div>
      )}

      {}
      {activePage === 'dashboard' && (
        <div 
          className="min-h-screen bg-cover bg-center bg-fixed relative"
          style={{ backgroundImage: `url(${bgCampusImage})` }}
        >
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"></div>

          <div className="relative z-10 min-h-screen flex flex-col">
            <header className="bg-[#450a0a]/95 backdrop-blur-sm text-white border-b border-red-950 sticky top-0 z-30 shadow-md">
              <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-white p-0.5 rounded-xl flex items-center justify-center shadow-lg">
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

                <div className="flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-red-800/50 bg-[#581c1c]/90 p-1">
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

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-lg border border-red-800/50 bg-[#581c1c]/90 px-3 py-1.5 text-xs text-red-200">
                    <span className="font-semibold">Role :</span>
                    <span className="font-bold">
                      {authenticatedUser?.role === 'admin'
                        ? 'Kemahasiswaan'
                        : (authenticatedUser?.roleLabel ?? 'Belum login')}
                    </span>
                  </div>

                  <button 
                    onClick={handleLogout}
                    className="p-2 text-slate-200 hover:text-red-200 hover:bg-red-900/40 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </header>

            {activeTab === 'lapor' && ['mhs', 'dosen', 'admin', 'akademik'].includes(authenticatedUser?.role) && (
              <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8">
                <LaporSatgas />
              </main>
            )}

            {authenticatedUser?.role === 'dosen' && activeTab === 'laporan-dpa' && (
              <DosenReportWorkflow />
            )}

            {authenticatedUser?.role === 'admin' && activeTab === 'laporan-kemahasiswaan' && (
              <AdminReportQueue />
            )}

            {authenticatedUser?.role === 'mhs' && activeTab !== 'lapor' && (
            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6 flex-1 w-full">
              <div data-scroll-reveal className="bg-gradient-to-r from-[#450a0a]/95 via-[#7f1d1d]/95 to-[#991b1b]/95 backdrop-blur-sm text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-red-600/30">
                <div className="space-y-2 z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-900/40 rounded-full text-amber-300 text-xs font-semibold border border-red-500/30">
                    <Clock className="w-3.5 h-3.5" /> Semester Genap 2026/2027 • Poltek Simas Berau
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Selamat Datang, {authenticatedUser?.name || 'Pengguna'}
                  </h2>
                  <p className="text-red-100 text-sm" data-testid="database-profile">
                    {authenticatedUser?.identityLabel}: {authenticatedUser?.identity}
                    {authenticatedUser?.details?.map((detail) => ` • ${detail.label}: ${detail.value}`)}
                  </p>
                </div>

                <div className="bg-[#581c1c]/95 backdrop-blur-sm border border-red-800/60 rounded-2xl p-4 sm:p-5 flex items-center gap-4 min-w-[280px]">
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

              {activeTab === 'dashboard' && (
                <>
                  <p className="rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow">
                    Skor kedisiplinan dimulai dari 100 poin dan dipengaruhi oleh 5 pilar: Disiplin Waktu, Disiplin Akademik, Disiplin Tata Tertib dan Etika, Disiplin Prosedur dan Keselamatan (K3), serta Disiplin Lingkungan. Poin juga dapat bertambah dari lomba atau kegiatan non-akademik yang telah diverifikasi, dengan skor maksimal 200 poin.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div data-scroll-reveal data-reveal-delay="80" className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-lg hover:shadow-xl transition-all">
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
                      <span className="text-slate-500">Predikat</span>
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
                    <p className="text-[10px] leading-relaxed text-slate-500">
                      Disiplin 90–200 · Kurang disiplin 51–89 · Tidak disiplin 0–50
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
                      <span>Sumber data: unggahan Excel/CSV tim akademik</span>
                    </div>
                  </div>
                </div>

                <div data-scroll-reveal data-reveal-delay="240" className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Poin Lomba / Kegiatan</span>
                    <TrendingUp className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {isLoadingStudentPoints ? '…' : studentPointsError ? '--' : studentPoints?.activityPoints ?? '--'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Poin</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                    <span>Lomba/kegiatan terverifikasi</span>
                    <span className="font-semibold">{studentPointsError ? '--' : studentPoints?.verifiedActivityCount ?? '--'}</span>
                  </div>
                </div>

                <div data-scroll-reveal data-reveal-delay="80" className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Bimbingan PA</span>
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-slate-900 leading-snug block">
                      {advisor?.nama ?? 'Belum ditetapkan oleh bagian akademik'}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      {advisor
                        ? 'Dosen pembimbing akademik Anda.'
                        : 'Nama Dosen PA akan tampil setelah ditetapkan oleh bagian akademik.'}
                    </p>
                    {advisorError && (
                      <p className="mt-2 text-xs text-red-700" role="alert">{advisorError}</p>
                    )}
                  </div>
                </div>
                  </div>

                  <section data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900">Profil Disiplin per Pilar</h3>
                      <p className="mt-1 text-sm text-slate-500">Ringkasan pelanggaran dan poin yang terpotong pada setiap pilar.</p>
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
                                  <dt className="text-slate-600">Poin terpotong</dt>
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

                  <details data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
                    <summary className="cursor-pointer list-none text-lg font-bold text-slate-900">
                      Pahami 5 Pilar dan Tingkat Pelanggaran
                    </summary>
                    <div className="mt-4 space-y-5">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                          { label: 'Disiplin Waktu', description: 'Hadir tepat waktu dan memanfaatkan waktu efektif.' },
                          { label: 'Disiplin Akademik', description: 'Bertanggung jawab dalam pembelajaran, tugas, ujian, dan praktikum.' },
                          { label: 'Disiplin Tata Tertib dan Etika', description: 'Menjaga penampilan, komunikasi, dan perilaku sesuai aturan kampus.' },
                          { label: 'Disiplin Prosedur dan Keselamatan (K3)', description: 'Mematuhi SOP, K3, serta penggunaan fasilitas dan alat.' },
                          { label: 'Disiplin Lingkungan', description: 'Menjaga kebersihan, ketertiban, fasilitas, dan kelestarian lingkungan kampus.' },
                        ].map(({ label, description }) => (
                          <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <h4 className="text-sm font-bold text-slate-800">{label}</h4>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Pengurangan poin per pilar</h4>
                        <p className="mt-1 text-xs text-slate-500">
                          Acuan skema; pengurangan aktual mengikuti bobot aturan yang digunakan saat verifikasi.
                        </p>
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full min-w-[760px] text-left text-xs">
                            <thead className="border-b border-slate-200 font-bold text-slate-600">
                              <tr>
                                <th scope="col" className="py-2 pr-3">Tingkat</th>
                                {disciplinePillars.map(({ pillar, label }) => (
                                  <th scope="col" key={pillar} className="px-2 py-2 text-center">{label.replace('Disiplin ', '')}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {violationSeverities.map(({ severity, label, badge }) => (
                                <tr key={severity}>
                                  <th scope="row" className="py-3 pr-3 font-medium">
                                    <span className={`inline-flex rounded-full px-3 py-1 font-bold ${badge}`}>{label}</span>
                                  </th>
                                  {severityPointDeductions[severity].map((points, index) => (
                                    <td key={disciplinePillars[index].pillar} className="px-2 py-3 text-center text-slate-700">
                                      −{points} poin
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-slate-600">
                          Pelanggaran berulang dapat dikenai tambahan pengurangan 5–10 poin sesuai hasil pembinaan dan keputusan kampus.
                        </p>
                      </div>
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                        Pelanggaran yang terbukti ditindaklanjuti dengan pembinaan edukatif oleh Kemahasiswaan. Skema menetapkan penyelesaian maksimal 14 hari; ikuti tenggat pada tugas yang diberikan.
                      </p>
                    </div>
                  </details>

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

              {activeTab !== 'konseling' &&
                activeTab !== 'lapor' &&
                activeTab !== 'tindak-lanjut' &&
                !(activeTab === 'sanggah' && authenticatedUser?.role === 'mhs') && (
                <>
              <div data-scroll-reveal className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-6">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {activeTab === 'dashboard' && 'Ringkasan Aktivitas & Poin'}
                      {activeTab === 'sanggah' && (authenticatedUser?.role === 'mhs' ? 'Pengajuan Sanggah Pelanggaran' : 'Pengajuan Sanggah Presensi')}
                      {activeTab === 'klaim' && 'Klaim Poin Kegiatan Non-Akademik'}
                      {activeTab === 'konseling' && 'Pengawasan & Bimbingan Konseling PA'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeTab === 'dashboard'
                        ? 'Riwayat perubahan skor dari pelanggaran dan kegiatan yang telah diverifikasi.'
                        : 'Sumber presensi: file Excel/CSV yang akan diunggah tim akademik melalui Akses Akademik.'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {activeTab === 'klaim' && (
                      <button 
                        onClick={() => setShowSKPIModal(true)}
                        className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Ajukan Klaim Kegiatan
                      </button>
                    )}
                    {activeTab === 'sanggah' && authenticatedUser?.role !== 'mhs' && (
                      <button
                        onClick={() => setShowSanggahModal(true)}
                        className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-colors"
                      >
                        <FileText className="w-4 h-4" /> {authenticatedUser?.role === 'mhs' ? 'Ajukan Sanggah Pelanggaran' : 'Ajukan Sanggah'}
                      </button>
                    )}
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

            {authenticatedUser?.role === 'akademik' && activeTab !== 'lapor' && (
              <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
                <section className="rounded-3xl border border-red-600/30 bg-gradient-to-r from-[#450a0a]/95 via-[#7f1d1d]/95 to-[#991b1b]/95 p-6 text-white shadow-2xl sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Portal Akademik
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Selamat Datang, {authenticatedUser.name || 'Pengguna'}
                  </h2>
                  <p className="mt-2 text-sm text-red-100">
                    Login Akademik berhasil. Akun Anda terhubung sebagai petugas Akademik.
                  </p>
                </section>

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
                        Unggah file CSV atau Excel (.xlsx) dengan kolom No, Mata_Kuliah, Kelas, NIM, Nama_Mahasiswa, dan Jumlah_Kehadiran.
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Baris absensi yang sama untuk mata kuliah, kelas, dan NIM yang sudah tersimpan akan dilewati.
                      </p>
                    </div>
                    <form onSubmit={handleAcademicAttendanceImport} className="space-y-4">
                      <label htmlFor="academic-attendance-file" className="block text-sm font-semibold text-slate-700">
                        File absensi
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                          id="academic-attendance-file"
                          type="file"
                          accept=".csv,.xlsx"
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

                    {/* Lampiran Riwayat File Absensi */}
                    <div className="mt-8 border-t border-slate-200 pt-6">
                      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                            <FileText className="h-5 w-5 text-red-800" />
                            Lampiran File Absensi yang Pernah Diunggah
                          </h4>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Klik nama file atau tombol preview untuk melihat isi data file secara langsung.
                          </p>
                        </div>
                        <span className="self-start sm:self-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {academicFiles.filter((f) => f.category === 'attendance').length} File Terlampir
                        </span>
                      </div>

                      {isLoadingAcademicFiles ? (
                        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
                          <Clock className="mr-2 h-4 w-4 animate-spin text-red-800" /> Memuat daftar file...
                        </div>
                      ) : academicFiles.filter((f) => f.category === 'attendance').length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center text-sm text-slate-500">
                          <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          Belum ada file absensi yang diunggah.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                          <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                              <tr>
                                <th className="px-4 py-3">Nama File</th>
                                <th className="px-4 py-3">Waktu Upload</th>
                                <th className="px-4 py-3">Ukuran</th>
                                <th className="px-4 py-3">Ringkasan Data</th>
                                <th className="px-4 py-3">Pengunggah</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {academicFiles
                                .filter((f) => f.category === 'attendance')
                                .map((file) => (
                                  <tr
                                    key={file.id}
                                    onClick={() => handleOpenFilePreview(file.id)}
                                    className="cursor-pointer transition hover:bg-red-50/60"
                                  >
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
                                    <td className="px-4 py-3.5 text-xs">
                                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-800">
                                        {file.summary || `${file.rowCount} baris`}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                                      {file.uploadedBy || 'Akademik'}
                                    </td>
                                    <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                      <div className="inline-flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenFilePreview(file.id)}
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
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {activeTab === 'pembagian-bimbingan' && (
                  <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg sm:p-8">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Pembagian Mahasiswa Bimbingan</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Unggah file CSV atau Excel (.xlsx) dengan kolom <strong>NIM, Program Studi</strong>, dan <strong>DPA</strong> atau <strong>NIP</strong>. NIM dan Program Studi wajib sesuai dengan data mahasiswa; nama DPA harus sesuai dengan nama dosen yang terdaftar.
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Format file mendukung nama lengkap DPA dengan atau tanpa gelar akademik.
                      </p>
                      <p className="mt-1 text-sm font-semibold text-amber-800">
                        Pembagian ini otomatis tersinkronisasi ke Dashboard Mahasiswa, Mahasiswa Bimbingan Dosen PA, dan Monitoring Kemahasiswaan.
                      </p>
                      <a
                        href={`data:text/csv;charset=utf-8,${encodeURIComponent("No.,NIM,Nama Lengkap,Program Studi,Angkatan,DPA\n1,24409901,Contoh Mahasiswa,Teknologi Rekayasa Logistik,2024,\"Nama Dosen PA, S.T., M.T.\"\n2,24409902,Contoh Mahasiswa,Teknologi Rekayasa Logistik,2024,\"Nama Dosen PA, S.T., M.T.\"\n3,24409903,Contoh Mahasiswa,Teknologi Rekayasa Logistik,2024,\"Nama Dosen PA, S.T., M.T.\"\n4,24409928,Contoh Mahasiswa,Teknologi Rekayasa Logistik,2024,\"Nama Dosen PA, S.T., M.T.\"\n5,24409956,Contoh Mahasiswa,Teknologi Rekayasa Logistik,2024,\"Nama Dosen PA, S.T., M.T.\"")}`}
                        download="contoh-pembagian-dosen-pa.csv"
                        className="mt-3 inline-flex text-sm font-bold text-red-800 underline underline-offset-2 hover:text-red-950"
                      >
                        Unduh contoh format file (CSV/Excel)
                      </a>
                    </div>
                    <form onSubmit={handleAdvisorAssignmentImport} className="space-y-4">
                      <label htmlFor="advisor-assignment-file" className="block text-sm font-semibold text-slate-700">
                        File pembagian dosen PA
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                          id="advisor-assignment-file"
                          type="file"
                          accept=".csv,.xlsx"
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

                    {/* Lampiran Riwayat File Pembagian DPA */}
                    <div className="mt-8 border-t border-slate-200 pt-6">
                      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                            <FileText className="h-5 w-5 text-red-800" />
                            Lampiran File Pembagian DPA yang Pernah Diunggah
                          </h4>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Klik nama file atau tombol preview untuk melihat isi pembagian DPA di dalam file.
                          </p>
                        </div>
                        <span className="self-start sm:self-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {academicFiles.filter((f) => f.category === 'advisors').length} File Terlampir
                        </span>
                      </div>

                      {isLoadingAcademicFiles ? (
                        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
                          <Clock className="mr-2 h-4 w-4 animate-spin text-red-800" /> Memuat daftar file...
                        </div>
                      ) : academicFiles.filter((f) => f.category === 'advisors').length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center text-sm text-slate-500">
                          <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          Belum ada file pembagian DPA yang diunggah.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                          <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                              <tr>
                                <th className="px-4 py-3">Nama File</th>
                                <th className="px-4 py-3">Waktu Upload</th>
                                <th className="px-4 py-3">Ukuran</th>
                                <th className="px-4 py-3">Ringkasan Data</th>
                                <th className="px-4 py-3">Pengunggah</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {academicFiles
                                .filter((f) => f.category === 'advisors')
                                .map((file) => (
                                  <tr
                                    key={file.id}
                                    onClick={() => handleOpenFilePreview(file.id)}
                                    className="cursor-pointer transition hover:bg-red-50/60"
                                  >
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
                                    <td className="px-4 py-3.5 text-xs">
                                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-800">
                                        {file.summary || `${file.rowCount} baris`}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                                      {file.uploadedBy || 'Akademik'}
                                    </td>
                                    <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                      <div className="inline-flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenFilePreview(file.id)}
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
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </main>
            )}

            {authenticatedUser?.role === 'dosen' && !['lapor', 'laporan-dpa'].includes(activeTab) && (
              <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
                <section data-scroll-reveal className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl border border-red-600/30 bg-gradient-to-r from-[#450a0a]/95 via-[#7f1d1d]/95 to-[#991b1b]/95 p-6 text-white shadow-2xl md:flex-row md:items-center sm:p-8">
                  <div className="z-10 space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-900/40 px-3 py-1 text-xs font-semibold text-amber-300">
                      <Clock className="h-3.5 w-3.5" /> Semester Genap 2026/2027 • Poltek Simas Berau
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                      Selamat Datang, {authenticatedUser?.name || 'Dosen'}
                    </h2>
                    <p className="text-sm text-red-100" data-testid="database-profile">
                      {authenticatedUser?.details
                        ?.filter((detail) => detail.label === 'Email')
                        .map((detail) => `${detail.label}: ${detail.value}`)
                        .join(' • ')}
                    </p>
                  </div>

                  <div className="flex min-w-[280px] items-center gap-4 rounded-2xl border border-red-800/60 bg-[#581c1c]/95 p-4 backdrop-blur-sm sm:p-5">
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
                </section>

                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow">
                  Data presensi akan tersedia setelah tim akademik mengunggah file Excel/CSV melalui Akses Akademik.
                </p>

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

                {activeTab === 'konseling' ? (
                  <section data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg sm:p-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">Monitoring & Konseling Kedisiplinan</h3>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500">
                          Pilih mahasiswa bimbingan untuk meninjau skor, tren perubahan poin, dan catatan konseling sebelumnya.
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
                    ) : counselingStudents.length === 0 ? (
                      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                        <p className="font-semibold text-slate-700">Belum ada mahasiswa bimbingan</p>
                        <p className="mt-1 text-sm text-slate-500">Mahasiswa yang menetapkan Anda sebagai Dosen PA akan muncul di sini.</p>
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.5fr)]">
                        <div className="space-y-2">
                          {counselingStudents.map((student) => {
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
                                <span className="mt-3 block text-xs font-semibold text-slate-600">Skor kedisiplinan: {student.pointScore}</span>
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
                ) : (
                  <section data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">Daftar Mahasiswa Bimbingan</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Mahasiswa yang pengajuan dosen PA-nya telah disetujui akan tampil di daftar ini.
                        </p>
                      </div>
                      <div>
                        <label htmlFor="student-risk-filter" className="mb-1 block text-xs font-bold text-slate-600">Filter zona risiko</label>
                        <select
                          id="student-risk-filter"
                          value={studentRiskFilter}
                          onChange={(event) => setStudentRiskFilter(event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-700"
                        >
                          <option value="ALL">Semua mahasiswa</option>
                          <option value="UNDISCIPLINED">Tidak Disiplin (0–50)</option>
                          <option value="LESS_DISCIPLINED">Kurang Disiplin (51–99)</option>
                          <option value="DISCIPLINED">Disiplin (100–200)</option>
                        </select>
                      </div>
                    </div>
                    {advisorStudentsError && (
                      <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                        {advisorStudentsError}
                      </p>
                    )}
                    {isLoadingAdvisorStudents ? (
                      <p className="mt-5 rounded-xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">Memuat mahasiswa bimbingan...</p>
                    ) : advisorStudents.length === 0 ? (
                      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                        <p className="font-semibold text-slate-700">Belum ada mahasiswa bimbingan</p>
                        <p className="mt-1 text-sm text-slate-500">Mahasiswa akan muncul di sini setelah ditetapkan oleh bagian akademik.</p>
                      </div>
                    ) : (
                      <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {filteredAdvisorStudents.map((student) => (
                          <article key={student.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <div className="min-w-0">
                              <h4 className="truncate font-bold text-slate-900">{student.nama}</h4>
                              <p className="mt-1 text-sm text-slate-600">
                                NIM {student.nim} <span className="mx-1 text-slate-300">·</span> {student.jurusan}
                              </p>
                            </div>
                            <p className="text-xs font-semibold text-slate-600 sm:text-right">
                              Skor kedisiplinan: {student.pointScore}
                            </p>
                          </article>
                        ))}
                      </div>
                    )}
                    {!isLoadingAdvisorStudents && advisorStudents.length > 0 && filteredAdvisorStudents.length === 0 && (
                      <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                        Tidak ada mahasiswa pada zona risiko yang dipilih.
                      </p>
                    )}
                  </section>
                )}
              </main>
            )}

            {authenticatedUser?.role === 'admin' && !['lapor', 'laporan-kemahasiswaan'].includes(activeTab) && (
              <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
                <section data-scroll-reveal className="rounded-3xl border border-red-600/30 bg-gradient-to-r from-[#450a0a]/95 via-[#7f1d1d]/95 to-[#991b1b]/95 p-6 text-white shadow-2xl sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Tim Kemahasiswaan & Administrasi</p>
                  <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                    Dashboard Monitoring Kedisiplinan Mahasiswa
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-red-100">
                    Pantau data mahasiswa dan dosen PA, telusuri laporan anonim, dan tetapkan tindak lanjut edukatif setelah laporan dikonfirmasi Dosen PA.
                  </p>
                </section>

                <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow">
                  Poin berkurang setelah Dosen PA mengonfirmasi pelanggaran. Kemahasiswaan menetapkan tindak lanjut; poin dipulihkan oleh sistem setelah bukti mahasiswa disetujui Dosen PA.
                </p>

                <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: 'Total mahasiswa',
                      value: adminMonitoring.students.length,
                      icon: GraduationCap,
                    },
                    {
                      label: 'Total dosen PA',
                      value: adminMonitoring.lecturers.length,
                      icon: Users,
                    },
                    {
                      label: 'Pelanggaran sudah di-coaching',
                      value: adminMonitoring.students.filter((student) => hasViolation(student) && hasCoachingForLatestViolation(student)).length,
                      icon: CheckCircle2,
                    },
                    {
                      label: 'Perlu dipantau',
                      value: adminMonitoring.students.filter((student) => student.dosenPa && hasViolation(student) && !hasCoachingForLatestViolation(student)).length,
                      icon: Clock,
                    },
                  ].map(({ label, value, icon: Icon }) => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => setActiveTab('monitoring')}
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

                {activeTab === 'monitoring' && (
                  <>
                    <section data-scroll-reveal className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-lg">
                      <div className="border-b border-slate-100 p-5 sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900">Monitoring Mahasiswa & Coaching DPA</h3>
                            <p className="mt-1 text-sm text-slate-500">
                              Seluruh mahasiswa, dosen PA, pelanggaran terbaru, serta status coaching setelah pelanggaran tercatat.
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="relative block">
                              <span className="sr-only">Cari mahasiswa atau dosen PA</span>
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                type="search"
                                value={adminMonitoringSearch}
                                onChange={(event) => setAdminMonitoringSearch(event.target.value)}
                                placeholder="Cari nama, NIM, prodi, atau NIP"
                                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                              />
                            </label>
                            <label>
                              <span className="sr-only">Filter status coaching</span>
                              <select
                                value={adminCoachingFilter}
                                onChange={(event) => setAdminCoachingFilter(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                              >
                                <option value="ALL">Semua status coaching</option>
                                <option value="NEEDS_COACHING">Pelanggaran belum di-coaching</option>
                                <option value="COACHED">Pelanggaran sudah di-coaching</option>
                                <option value="NO_ADVISOR">Belum memiliki dosen PA</option>
                              </select>
                            </label>
                          </div>
                        </div>
                      </div>
                      {isLoadingAdminMonitoring ? (
                        <p className="px-6 py-10 text-center text-sm text-slate-500">Memuat data mahasiswa dan dosen…</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-5 py-3 font-bold">Mahasiswa</th>
                                <th className="px-5 py-3 font-bold">Program studi</th>
                                <th className="px-5 py-3 font-bold">Dosen PA</th>
                                <th className="px-5 py-3 font-bold">Poin</th>
                                <th className="px-5 py-3 font-bold">Pelanggaran terakhir</th>
                                <th className="px-5 py-3 font-bold">Coaching</th>
                                <th className="px-5 py-3 font-bold">Catatan terakhir</th>
                                <th className="px-5 py-3 font-bold">Tindakan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredAdminMonitoringStudents.map((student) => {
                                const latestCoaching = student.counselingRecords?.[0];
                                const latestViolation = getLatestViolation(student);
                                const coachedAfterViolation = hasCoachingForLatestViolation(student);
                                return (
                                  <tr key={student.id} className="align-top hover:bg-slate-50/80">
                                    <td className="px-5 py-4">
                                      <p className="font-bold text-slate-900">{student.nama}</p>
                                      <p className="mt-1 text-xs text-slate-500">NIM {student.nim}</p>
                                    </td>
                                    <td className="px-5 py-4 text-slate-700">{student.jurusan}</td>
                                    <td className="px-5 py-4">
                                      {student.dosenPa ? (
                                        <>
                                          <p className="font-semibold text-slate-800">{student.dosenPa.nama}</p>
                                          <p className="mt-1 text-xs text-slate-500">NIP {String(student.dosenPa.nip)}</p>
                                        </>
                                      ) : <span className="text-slate-400">Belum ditetapkan</span>}
                                    </td>
                                    <td className="px-5 py-4 font-extrabold text-slate-900">{student.pointScore}/100</td>
                                    <td className="max-w-sm px-5 py-4">
                                      {latestViolation ? (
                                        <>
                                          <p className="font-semibold text-slate-800">
                                            {latestViolation.severity ?? 'Pelanggaran'}
                                            {' · '}−{Math.abs(latestViolation.delta)} poin
                                          </p>
                                          <p className="mt-1 text-xs text-slate-500">
                                            {disciplinePillars.find((item) => item.pillar === latestViolation.pillar)?.label ?? latestViolation.pillar}
                                            {' · '}{new Date(latestViolation.createdAt).toLocaleDateString('id-ID')}
                                          </p>
                                          <p className="mt-1 line-clamp-2 text-xs text-slate-600">{latestViolation.reason}</p>
                                        </>
                                      ) : <span className="text-slate-400">Belum ada pelanggaran tercatat</span>}
                                    </td>
                                    <td className="px-5 py-4">
                                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                        !student.dosenPa
                                          ? 'bg-slate-100 text-slate-700'
                                          : !latestViolation || coachedAfterViolation
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {!student.dosenPa
                                          ? 'Belum ada DPA'
                                          : !latestViolation
                                            ? 'Tidak ada pelanggaran'
                                            : coachedAfterViolation
                                              ? 'Sudah coaching'
                                              : 'Perlu coaching'}
                                      </span>
                                    </td>
                                    <td className="max-w-sm px-5 py-4">
                                      {latestCoaching ? (
                                        <>
                                          <p className="line-clamp-2 text-slate-700">{latestCoaching.note}</p>
                                          <p className="mt-1 text-xs text-slate-500">
                                            {new Date(latestCoaching.counselingDate).toLocaleDateString('id-ID')} • {latestCoaching.dosen?.nama}
                                          </p>
                                        </>
                                      ) : <span className="text-slate-400">Belum ada catatan coaching</span>}
                                    </td>
                                    <td className="px-5 py-4">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPointChangeForm((current) => ({
                                            ...current,
                                            nim: String(student.nim),
                                          }));
                                          setActiveTab('pengurangan-poin');
                                        }}
                                        className="whitespace-nowrap rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-800 transition hover:bg-red-50"
                                      >
                                        Tetapkan pengurangan
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {filteredAdminMonitoringStudents.length === 0 && (
                                <tr>
                                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500">
                                    {adminMonitoring.students.length === 0 ? 'Belum ada data mahasiswa.' : 'Tidak ada mahasiswa yang cocok dengan pencarian atau filter.'}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    <section data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
                      <h3 className="text-lg font-extrabold text-slate-900">Database Dosen PA</h3>
                      <p className="mt-1 text-sm text-slate-500">Ringkasan jumlah mahasiswa bimbingan dan catatan coaching per dosen.</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {adminMonitoring.lecturers.map((lecturer) => (
                          <article key={lecturer.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="font-bold text-slate-900">{lecturer.nama}</p>
                            <p className="mt-1 text-xs text-slate-500">NIP {String(lecturer.nip)}</p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-800">{lecturer._count.mahasiswaBimbingan} mahasiswa</span>
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">{lecturer._count.counselingRecords} catatan coaching</span>
                            </div>
                          </article>
                        ))}
                        {adminMonitoring.lecturers.length === 0 && (
                          <p className="text-sm text-slate-500">Belum ada data dosen.</p>
                        )}
                      </div>
                    </section>
                  </>
                )}

                {activeTab === 'pengurangan-poin' && (
                  <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg">
                    <h3 className="text-lg font-extrabold text-slate-900">Pengurangan poin melalui konfirmasi laporan</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Kemahasiswaan tidak lagi mengurangi poin secara manual. Pengurangan hanya dicatat setelah Dosen PA mengonfirmasi laporan teridentifikasi; gunakan antrean laporan untuk menetapkan tindak lanjut edukatif.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('laporan-kemahasiswaan')}
                      className="mt-4 rounded-xl bg-red-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-900"
                    >
                      Buka antrean laporan
                    </button>
                  </section>
                )}
              </main>
            )}
          </div>
        </div>
      )}

      {}

      {}
      {showSKPIModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-extrabold text-slate-900 text-lg">Klaim Poin SKPI & Sertifikasi</h3>
              <button 
                onClick={() => setShowSKPIModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setShowSKPIModal(false); }} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Nama Sertifikasi / Lomba</label>
                <input 
                  type="text" 
                  required 
                  placeholder="misal: Sertifikat K3 Umum BNSP / Juara 1 Lomba Mesin"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-800 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Kategori Kegiatan</label>
                <select className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-800 text-xs bg-white">
                  <option value="sertifikasi">Sertifikasi Keahlian Industri / BNSP</option>
                  <option value="lomba">Kompetisi & Lomba Vokasi</option>
                  <option value="organisasi">Kepengurusan Organisasi Kemahasiswaan</option>
                  <option value="seminar">Seminar / Workshop Nasional</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Unggah Bukti Sertifikat (PDF/JPG)</label>
                <input 
                  type="file" 
                  required 
                  className="w-full text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-800 hover:file:bg-red-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowSKPIModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-red-800 text-white font-bold rounded-xl shadow hover:bg-red-900"
                >
                  Kirim Klaim SKPI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSanggahModal && authenticatedUser?.role !== 'mhs' && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-extrabold text-slate-900 text-lg">Formulir Sanggah Presensi</h3>
              <button 
                onClick={() => setShowSanggahModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setShowSanggahModal(false); }} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Alasan Sanggahan</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Jelaskan catatan presensi yang ingin disanggah beserta kronologinya..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-800 text-xs"
                ></textarea>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Unggah Surat Izin / Bukti Pendukung</label>
                <input
                  type="file"
                  className="w-full text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-800 hover:file:bg-red-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSanggahModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-800 text-white font-bold rounded-xl shadow hover:bg-red-900"
                >
                  Kirim Pengajuan Sanggah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview File Excel / CSV */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-red-800 p-2.5 text-white shadow-sm">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {previewData?.record?.fileName || 'Preview File Excel / CSV'}
                    </h3>
                    {previewData?.record && (
                      <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold uppercase text-slate-800">
                        {previewData.record.category === 'advisors' ? 'Pembagian DPA' : 'Absensi'}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {previewData?.record
                      ? `Diunggah ${new Date(previewData.record.uploadedAt).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })} oleh ${previewData.record.uploadedBy} • ${(previewData.record.fileSize / 1024).toFixed(1)} KB`
                      : 'Memuat detail file...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewData?.record && (
                  <a
                    href={`/api/auth/academic/files/${previewData.record.id}/download`}
                    download={previewData.record.fileName}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                    Unduh File
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex flex-1 flex-col overflow-hidden p-6">
              {isLoadingPreview ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-slate-500">
                  <Clock className="h-8 w-8 animate-spin text-red-800" />
                  <p className="text-sm font-semibold">Membaca dan memproses isi file Excel/CSV...</p>
                </div>
              ) : previewError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">
                  <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" />
                  <p className="font-bold">Gagal membuka preview file</p>
                  <p className="mt-1 text-xs">{previewError}</p>
                </div>
              ) : !previewData || previewData.rows.length === 0 ? (
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
                        value={previewSearchTerm}
                        onChange={(e) => setPreviewSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-red-800 focus:outline-none"
                      />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Total <strong>{previewData.totalRows} baris</strong> data
                      {previewSearchTerm && (
                        <span>
                          {' '}• Menampilkan{' '}
                          <strong>
                            {
                              previewData.rows.filter((r) =>
                                Object.values(r).some((v) =>
                                  String(v).toLowerCase().includes(previewSearchTerm.toLowerCase()),
                                ),
                              ).length
                            }
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
                          {previewData.headers.map((h, i) => (
                            <th key={i} className="px-4 py-2.5 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-mono text-[11px]">
                        {previewData.rows
                          .filter((r) => {
                            if (!previewSearchTerm) return true;
                            const term = previewSearchTerm.toLowerCase();
                            return Object.values(r).some((v) =>
                              String(v).toLowerCase().includes(term),
                            );
                          })
                          .map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-slate-50 transition">
                              <td className="px-3 py-2 text-center text-slate-400 bg-slate-50/50 font-sans text-xs">
                                {row._rowIndex || rowIdx + 1}
                              </td>
                              {previewData.headers.map((h, colIdx) => (
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
                onClick={() => setPreviewModalOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow hover:bg-slate-800 transition"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
