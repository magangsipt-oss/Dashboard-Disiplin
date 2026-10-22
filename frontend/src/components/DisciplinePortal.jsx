'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LaporSatgas from './student/LaporSatgas';
import TindakLanjut from './student/TindakLanjut';
import SanggahanMahasiswa from './student/SanggahanMahasiswa';
import AktivitasMahasiswa from './student/AktivitasMahasiswa';
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
} from 'lucide-react';

const disciplinePillars = [
  { pillar: 'WAKTU', label: 'Disiplin Waktu', Icon: Clock },
  { pillar: 'AKADEMIK', label: 'Disiplin Akademik', Icon: BookOpen },
  { pillar: 'TATA_TERTIB', label: 'Disiplin Tata Tertib dan Etika', Icon: Scale },
  { pillar: 'PROSEDUR_K3', label: 'Disiplin Prosedur dan Keselamatan (K3)', Icon: ClipboardCheck },
  { pillar: 'LINGKUNGAN', label: 'Disiplin Lingkungan', Icon: Leaf },
];

const violationSeverities = [
  { severity: 'RINGAN', label: 'Ringan', followUp: 'Peringatan dan koreksi langsung', badge: 'bg-amber-100 text-amber-800' },
  { severity: 'SEDANG', label: 'Sedang', followUp: 'Pembinaan dan refleksi tertulis', badge: 'bg-orange-100 text-orange-800' },
  { severity: 'BERAT', label: 'Berat', followUp: 'Penanganan formal sesuai peraturan kampus', badge: 'bg-red-100 text-red-800' },
  { severity: 'SANGAT_BERAT', label: 'Sangat Berat', followUp: 'Penghentian aktivitas tidak aman dan penanganan segera', badge: 'bg-red-800 text-white' },
];

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
  const [advisors, setAdvisors] = useState([]);
  const [advisor, setAdvisor] = useState(null);
  const [advisorRequest, setAdvisorRequest] = useState(null);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('');
  const [isLoadingAdvisors, setIsLoadingAdvisors] = useState(false);
  const [isSavingAdvisor, setIsSavingAdvisor] = useState(false);
  const [advisorError, setAdvisorError] = useState('');
  const [advisorStatus, setAdvisorStatus] = useState('');
  const [advisorRequests, setAdvisorRequests] = useState([]);
  const [isLoadingAdvisorRequests, setIsLoadingAdvisorRequests] = useState(false);
  const [advisorRequestError, setAdvisorRequestError] = useState('');
  const [advisorDecisionStatus, setAdvisorDecisionStatus] = useState('');
  const [updatingAdvisorRequestId, setUpdatingAdvisorRequestId] = useState(null);
  const [advisorStudents, setAdvisorStudents] = useState([]);
  const [isLoadingAdvisorStudents, setIsLoadingAdvisorStudents] = useState(false);
  const [advisorStudentsError, setAdvisorStudentsError] = useState('');
  const [counselingRecords, setCounselingRecords] = useState([]);
  const [isLoadingCounseling, setIsLoadingCounseling] = useState(false);
  const [counselingError, setCounselingError] = useState('');
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
  const [pointChangeForm, setPointChangeForm] = useState({
    nim: '',
    type: 'late',
    reason: '',
  });
  const [isSubmittingPointChange, setIsSubmittingPointChange] = useState(false);
  const [pointChangeStatus, setPointChangeStatus] = useState('');
  const [pointChangeError, setPointChangeError] = useState('');
  const [academicAttendanceFile, setAcademicAttendanceFile] = useState(null);
  const [academicAttendanceResult, setAcademicAttendanceResult] = useState(null);
  const [academicAttendanceError, setAcademicAttendanceError] = useState('');
  const [isImportingAcademicAttendance, setIsImportingAcademicAttendance] = useState(false);
  const [advisorAssignmentFile, setAdvisorAssignmentFile] = useState(null);
  const [advisorAssignmentResult, setAdvisorAssignmentResult] = useState(null);
  const [advisorAssignmentError, setAdvisorAssignmentError] = useState('');
  const [isImportingAdvisorAssignments, setIsImportingAdvisorAssignments] = useState(false);

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
      { id: 'konseling', label: 'Konseling' },
      { id: 'dosen-pa', label: 'Dosen PA' },
    ],
    dosen: [
      { id: 'bimbingan', label: 'Mahasiswa Bimbingan' },
      { id: 'konseling', label: 'Catatan & Konseling' },
      { id: 'approval', label: 'Approval' },
    ],
    admin: [
      { id: 'dashboard', label: 'Ringkasan' },
      { id: 'sanggah', label: 'Sanggah Presensi' },
      { id: 'verifikasi', label: 'Verifikasi Klaim' },
      { id: 'kelulusan', label: 'SKPI & Kelulusan' },
      { id: 'aturan', label: 'Aturan Poin' },
      { id: 'redemption', label: 'Pemulihan Poin' },
      { id: 'sinkronisasi', label: 'Sinkronisasi e-Campus' },
      { id: 'users', label: 'Manajemen User' },
      { id: 'maintenance', label: 'Pemeliharaan' },
    ],
    akademik: [
      { id: 'dashboard', label: 'Dashboard Akademik' },
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

            setIsLoadingAdvisors(true);
            Promise.all([
              fetch('/api/auth/advisors'),
              fetch('/api/auth/advisor'),
            ])
              .then(async ([advisorsResponse, advisorResponse]) => {
                const [advisorsData, advisorData] = await Promise.all([
                  advisorsResponse.json().catch(() => ({})),
                  advisorResponse.json().catch(() => ({})),
                ]);
                if (isMounted) {
                  if (advisorsResponse.ok) {
                    setAdvisors(advisorsData.advisors ?? []);
                  } else {
                    setAdvisorError(advisorsData.message || 'Daftar dosen PA gagal dimuat.');
                  }
                  if (advisorResponse.ok) {
                    setAdvisor(advisorData.advisor ?? null);
                    setAdvisorRequest(advisorData.request ?? null);
                    setSelectedAdvisorId(
                      advisorData.request
                        ? String(advisorData.request.dosenId)
                        : advisorData.advisor
                          ? String(advisorData.advisor.id)
                          : '',
                    );
                  } else {
                    setAdvisorError((current) => current || advisorData.message || 'Status dosen PA gagal dimuat.');
                  }
                }
              })
              .catch((error) => {
                if (isMounted) {
                  setAdvisorError(
                    error instanceof Error
                      ? error.message
                      : 'Daftar dosen PA gagal dimuat.',
                  );
                }
              })
              .finally(() => {
                if (isMounted) {
                  setIsLoadingAdvisors(false);
                }
              });
          }
          if (data.profile.role === 'dosen') {
            setIsLoadingAdvisorRequests(true);
            fetch('/api/auth/advisor-requests')
              .then(async (response) => {
                const result = await response.json();
                if (!response.ok) {
                  throw new Error(result.message || 'Permohonan PA gagal dimuat.');
                }
                return result.requests ?? [];
              })
              .then((requests) => {
                if (isMounted) {
                  setAdvisorRequests(requests);
                  setAdvisorRequestError('');
                }
              })
              .catch((error) => {
                if (isMounted) {
                  setAdvisorRequestError(
                    error instanceof Error ? error.message : 'Permohonan PA gagal dimuat.',
                  );
                }
              })
              .finally(() => {
                if (isMounted) {
                  setIsLoadingAdvisorRequests(false);
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
    const refreshAdvisorRequests = async () => {
      try {
        const response = await fetch('/api/auth/advisor-requests');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Permohonan PA gagal dimuat.');
        }
        if (isMounted) {
          setAdvisorRequests(data.requests ?? []);
          setAdvisorRequestError('');
        }
      } catch (error) {
        if (isMounted) {
          setAdvisorRequestError(
            error instanceof Error ? error.message : 'Permohonan PA gagal dimuat.',
          );
        }
      }
    };

    refreshAdvisorRequests();
    const refreshTimer = window.setInterval(refreshAdvisorRequests, 15000);
    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [authenticatedUser?.role, activePage]);

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
    const isStudentCounseling =
      role === 'mhs' && activeTab === 'konseling';
    const isAdvisorCounseling =
      role === 'dosen' && ['bimbingan', 'konseling'].includes(activeTab);
    if (activePage !== 'dashboard' || (!isStudentCounseling && !isAdvisorCounseling)) {
      return undefined;
    }

    let isMounted = true;
    const loadCounseling = async (showLoading) => {
      if (showLoading) {
        setIsLoadingCounseling(true);
      }
      if (isStudentCounseling) {
        setCounselingError('');
      } else {
        setCounselingStudentsError('');
      }

      try {
        const response = await fetch('/api/auth/counseling');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Data konseling gagal dimuat.');
        }
        if (isMounted) {
          if (isStudentCounseling) {
            setCounselingRecords(data.records ?? []);
          } else {
            setCounselingStudents(data.students ?? []);
          }
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error
            ? error.message
            : 'Data konseling gagal dimuat.';
          if (isStudentCounseling) {
            setCounselingError(message);
          } else {
            setCounselingStudentsError(message);
          }
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
        'Pembagian ini akan mengganti semua penetapan dosen PA. Mahasiswa yang tidak ada di file akan menjadi tanpa dosen PA. Lanjutkan?',
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
      setAdvisorRequest(null);
      setAdvisors([]);
      setAdvisorRequests([]);
      setSelectedAdvisorId('');
      setActivePage('landing');
    }
  };

  const handlePointChangeSubmit = async (event) => {
    event.preventDefault();
    setPointChangeStatus('');
    setPointChangeError('');
    setIsSubmittingPointChange(true);

    try {
      const response = await fetch('/api/auth/points/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pointChangeForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Perubahan poin gagal disimpan.');
      }

      const sign = data.delta > 0 ? '+' : '';
      setPointChangeStatus(
        `Poin ${data.name} berhasil dicatat: ${sign}${data.delta} (total ${data.score}, ${data.predicate}).`,
      );
      setPointChangeForm((current) => ({ ...current, reason: '' }));
    } catch (error) {
      setPointChangeError(
        error instanceof Error
          ? error.message
          : 'Perubahan poin gagal disimpan.',
      );
    } finally {
      setIsSubmittingPointChange(false);
    }
  };

  const handleAdvisorSubmit = async (event) => {
    event.preventDefault();
    setAdvisorError('');
    setAdvisorStatus('');
    setIsSavingAdvisor(true);

    try {
      const response = await fetch('/api/auth/advisor/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dosenId: Number(selectedAdvisorId) }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Pilihan dosen PA gagal disimpan.');
      }

      setAdvisorRequest(data.request);
      setAdvisorStatus(`Permohonan kepada ${data.request.dosen.nama} dikirim dan menunggu persetujuan.`);
    } catch (error) {
      setAdvisorError(
        error instanceof Error
          ? error.message
          : 'Pilihan dosen PA gagal disimpan.',
      );
    } finally {
      setIsSavingAdvisor(false);
    }
  };

  const handleAdvisorDecision = async (requestId, decision) => {
    setAdvisorRequestError('');
    setAdvisorDecisionStatus('');
    setUpdatingAdvisorRequestId(requestId);

    try {
      const response = await fetch(`/api/auth/advisor-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Keputusan permohonan gagal disimpan.');
      }

      setAdvisorRequests((current) => current.filter((item) => item.id !== requestId));
      setAdvisorDecisionStatus(
        decision === 'approved'
          ? `Permohonan ${data.request.student.nama} disetujui.`
          : `Permohonan ${data.request.student.nama} ditolak.`,
      );

      if (decision === 'approved') {
        try {
          const studentsResponse = await fetch('/api/auth/advisor/students');
          const studentsData = await studentsResponse.json();
          if (!studentsResponse.ok) {
            throw new Error(studentsData.message || 'Daftar mahasiswa bimbingan gagal dimuat.');
          }
          setAdvisorStudents(studentsData.students ?? []);
          setAdvisorStudentsError('');
        } catch (error) {
          setAdvisorStudentsError(
            error instanceof Error
              ? error.message
              : 'Daftar mahasiswa bimbingan gagal dimuat.',
          );
        }
      }
    } catch (error) {
      setAdvisorRequestError(
        error instanceof Error ? error.message : 'Keputusan permohonan gagal disimpan.',
      );
    } finally {
      setUpdatingAdvisorRequestId(null);
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
                  <h1 className="font-extrabold text-slate-900 text-lg leading-none tracking-tight">Poltek Simas Berau</h1>
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
                Selamat datang di portal pemantauan kedisiplinan Politeknik Sinar Mas Berau Coal. Sistem ini menyajikan rekam jejak presensi yang bersumber dari e-Campus serta poin kegiatan non-akademik.
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
                      Cek rekam jejak kedisiplinan dan presensi e-Campus, ajukan sanggah, serta klaim poin kegiatan non-akademik.
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
                    Masuk via NIP/NIDN
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
                      Verifikasi klaim sertifikat & kegiatan non-akademik, validasi sanggahan presensi, serta kelola syarat kelulusan.
                    </p>
                  </div>
                  <span className="mt-8 w-full py-3 bg-slate-100 group-hover:bg-red-900 group-hover:text-white text-slate-800 font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2">
                    Masuk Portal Admin
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
                      Masuk ke portal Akademik menggunakan NIP dan kata sandi akun Akademik.
                    </p>
                  </div>
                  <span className="mt-8 w-full py-3 bg-slate-100 group-hover:bg-red-800 group-hover:text-white text-slate-800 font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2">
                    Masuk via NIP
                  </span>
                </button>
              </div>
            </div>
          </main>

          <section id="tentang-website" data-scroll-reveal className="scroll-mt-6 bg-white px-6 py-14">
            <div className="max-w-5xl mx-auto">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-800">
                  <HelpCircle className="h-4 w-4" /> Tentang SiDisiplin
                </span>
                <h2 data-scroll-reveal data-reveal="text" className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Apa itu Website SiDisiplin?
                </h2>
                <p data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                  SiDisiplin adalah portal informasi kedisiplinan Politeknik Sinar Mas Berau Coal. Website ini dirancang untuk membantu mahasiswa, dosen pembimbing akademik, dan pihak kemahasiswaan mengakses informasi presensi, catatan kedisiplinan, kegiatan non-akademik, serta bimbingan dalam satu tempat.
                </p>
              </div>

              <div data-scroll-reveal className="mt-8 rounded-3xl bg-gradient-to-br from-red-950 via-red-900 to-rose-800 p-6 text-white shadow-xl sm:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Cara kerja portal</p>
                    <h3 data-scroll-reveal data-reveal="text" className="mt-1 text-lg font-extrabold sm:text-xl">Informasi kedisiplinan dalam satu alur</h3>
                  </div>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-red-100">
                    Ringkasan use case SiDisiplin
                  </span>
                </div>
                <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
                  <div data-scroll-reveal data-reveal="left" className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-800">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p data-scroll-reveal data-reveal="text" className="mt-3 text-sm font-bold">Presensi e-Campus</p>
                    <p data-scroll-reveal data-reveal="text" data-reveal-delay="80" className="mt-1 text-xs leading-relaxed text-red-100">Sumber catatan kehadiran perkuliahan</p>
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
                    Mahasiswa dapat melihat presensi yang disinkronkan dari e-Campus dan mengajukan sanggahan jika ada catatan yang perlu ditinjau.
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
                    Portal menyediakan informasi dan fasilitas pengajuan konseling antara mahasiswa dengan dosen pembimbing akademik.
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
                      <p className="text-sm leading-relaxed text-slate-700"><strong>Presensi tepat waktu</strong><br />Kehadiran kuliah atau praktikum yang tercatat di e-Campus dan diproses sesuai aturan kampus.</p>
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
                  <p className="mt-1 text-sm text-slate-600">Catatan presensi e-Campus dan poin kegiatan yang disetujui menjadi bahan perhitungan rekam jejak kedisiplinan.</p>
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
            © 2026 Politeknik Sinar Mas Berau Coal — Sistem Informasi Kedisiplinan Mahasiswa (SiDisiplin)
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
                    <h1 className="font-bold text-lg leading-tight tracking-tight">SiDisiplin PSB</h1>
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
                      {item.id === 'approval' && advisorRequests.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold text-red-950">
                          {advisorRequests.length}
                        </span>
                      )}
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

            {authenticatedUser?.role === 'mhs' && (
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
                      <span>Sumber data: e-Campus</span>
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
                      {advisor?.nama ?? (advisorRequest?.status === 'PENDING'
                        ? `Menunggu persetujuan ${advisorRequest.dosen.nama}`
                        : 'Belum ada dosen PA disetujui')}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      {advisor
                        ? 'Dosen pembimbing akademik Anda.'
                        : advisorRequest?.status === 'REJECTED'
                          ? 'Permohonan sebelumnya ditolak. Anda dapat mengajukan kembali.'
                          : 'Pilih dosen PA melalui menu Dosen PA.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('konseling')}
                    className="mt-3 border-t border-slate-100 pt-2 text-left text-xs font-semibold text-red-800 hover:underline"
                  >
                    Lihat Catatan & Panggilan PA →
                  </button>
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
                        {violationSeverities.map(({ severity, label, followUp, badge }) => (
                          <div key={severity} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badge}`}>{label}</span>
                              <span className="text-sm font-semibold text-slate-800">{studentPoints.severityCounts[severity] ?? 0} pelanggaran</span>
                            </div>
                            <p className="text-xs text-slate-600">{followUp}</p>
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
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <tr><th className="py-2 pr-4">Tingkat</th><th className="py-2">Tindak lanjut</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {violationSeverities.map(({ severity, label, followUp, badge }) => (
                              <tr key={severity}>
                                <td className="py-3 pr-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badge}`}>{label}</span></td>
                                <td className="py-3 text-xs text-slate-600">{followUp}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </details>

                  <AktivitasMahasiswa onNavigate={(tab) => setActiveTab(tab)} />
                </>
              )}

              {activeTab === 'dosen-pa' && (
                <section data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg sm:p-8">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Pilih Dosen Pembimbing Akademik</h3>
                    <p className="mt-1 text-sm text-slate-600">Pilih dosen PA Anda dari daftar dosen yang terdaftar.</p>
                  </div>

                  {advisor && (
                    <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Dosen PA saat ini: <strong>{advisor.nama}</strong>
                    </p>
                  )}
                  {advisorRequest?.status === 'PENDING' && (
                    <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
                      Permohonan kepada <strong>{advisorRequest.dosen.nama}</strong> sedang menunggu persetujuan dosen.
                    </p>
                  )}
                  {advisorRequest?.status === 'REJECTED' && (
                    <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="status">
                      Permohonan sebelumnya ditolak. Silakan pilih dosen PA dan kirim pengajuan kembali.
                    </p>
                  )}

                  <form onSubmit={handleAdvisorSubmit} className="max-w-xl space-y-4">
                    <div>
                      <label htmlFor="advisor-select" className="mb-1.5 block text-sm font-semibold text-slate-700">Nama dosen</label>
                      <select
                        id="advisor-select"
                        required
                        value={selectedAdvisorId}
                        onChange={(event) => setSelectedAdvisorId(event.target.value)}
                        disabled={isLoadingAdvisors || isSavingAdvisor || advisors.length === 0}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-800 disabled:bg-slate-100"
                      >
                        <option value="">
                          {isLoadingAdvisors ? 'Memuat daftar dosen...' : 'Pilih dosen PA'}
                        </option>
                        {advisors.map((item) => (
                          <option key={item.id} value={item.id}>{item.nama}</option>
                        ))}
                      </select>
                    </div>

                    {advisorError && <p className="text-sm text-red-700" role="alert">{advisorError}</p>}
                    {advisorStatus && <p className="text-sm text-emerald-700" role="status">{advisorStatus}</p>}

                    <button
                      type="submit"
                      disabled={!selectedAdvisorId || isLoadingAdvisors || isSavingAdvisor}
                      className="rounded-xl bg-red-800 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingAdvisor ? 'Mengirim...' : 'Kirim Permohonan PA'}
                    </button>
                  </form>
                </section>
              )}

              {activeTab === 'konseling' && (
                <section data-scroll-reveal className="space-y-5">
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/95 p-5 shadow-sm sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-purple-950">Catatan Pembinaan & Panggilan Konseling</h3>
                        <p className="mt-1 text-sm leading-relaxed text-purple-900">
                          Informasi ini dikirim oleh Dosen PA Anda. Mahasiswa dapat melihat catatan dan jadwal tindak lanjut di sini.
                        </p>
                      </div>
                    </div>
                  </div>

                  {counselingError && (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                      {counselingError}
                    </p>
                  )}

                  {isLoadingCounseling ? (
                    <div className="rounded-2xl border border-slate-200 bg-white/95 px-5 py-12 text-center text-sm text-slate-500 shadow-lg">
                      Memuat catatan konseling...
                    </div>
                  ) : counselingRecords.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/95 px-5 py-12 text-center shadow-lg">
                      <MessageSquare className="mx-auto h-8 w-8 text-slate-400" />
                      <p className="mt-3 font-semibold text-slate-700">Belum ada catatan pembinaan atau panggilan konseling</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Catatan dari Dosen PA akan muncul di sini setelah dikirim.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {counselingRecords.map((record) => (
                        <article key={record.id} className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg sm:p-6">
                          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                            <div>
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                record.type === 'COUNSELING_CALL'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-blue-100 text-blue-900'
                              }`}>
                                {record.type === 'COUNSELING_CALL' ? 'Panggilan Konseling' : 'Catatan Pembinaan'}
                              </span>
                              <p className="mt-2 text-sm font-bold text-slate-900">Dosen PA: {record.dosen.nama}</p>
                            </div>
                            <div className="text-right text-xs text-slate-500">
                              <p>Dicatat {new Date(record.createdAt).toLocaleString('id-ID')}</p>
                              <p className="mt-1 font-semibold text-slate-700">
                                {record.type === 'COUNSELING_CALL' ? 'Jadwal' : 'Tanggal konseling'}:{' '}
                                {new Date(record.counselingDate).toLocaleDateString('id-ID', { timeZone: 'UTC' })}
                              </p>
                            </div>
                          </div>
                          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{record.note}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'lapor' && <LaporSatgas />}

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

              {activeTab !== 'dosen-pa' &&
                activeTab !== 'konseling' &&
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
                        : 'Sumber presensi yang direncanakan: e-Campus. Sinkronisasi belum aktif.'}
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
                              Presensi akan dimuat dari e-Campus setelah integrasi API tersedia.
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

            {authenticatedUser?.role === 'akademik' && (
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
                        <dt className="font-semibold text-slate-500">NIP</dt>
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
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-red-800 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-red-900"
                      />
                      <button
                        type="submit"
                        disabled={isImportingAcademicAttendance || !academicAttendanceFile}
                        className="rounded-xl bg-red-800 px-5 py-3 text-sm font-bold text-white shadow transition hover:bg-red-900 disabled:cursor-wait disabled:opacity-60"
                      >
                        {isImportingAcademicAttendance ? 'Mengunggah absensi…' : 'Upload Absensi'}
                      </button>
                    </form>
                    {academicAttendanceError && (
                      <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {academicAttendanceError}
                      </p>
                    )}
                    {academicAttendanceResult && (
                      <p aria-live="polite" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        Berhasil menyimpan {academicAttendanceResult.imported} baris. {academicAttendanceResult.skipped} baris duplikat dilewati dari total {academicAttendanceResult.totalRows} baris.
                      </p>
                    )}
                  </section>
                )}

                {activeTab === 'pembagian-bimbingan' && (
                  <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg sm:p-8">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Pembagian Mahasiswa Bimbingan</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Unggah file CSV atau Excel (.xlsx) dengan kolom NIM dan NIP. NIP harus merupakan NIP dosen yang terdaftar.
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Pada file Excel, simpan NIM dan NIP sebagai teks agar angka panjang tidak berubah.
                      </p>
                      <p className="mt-1 text-sm font-semibold text-amber-800">
                        Pembagian ini mengganti semua penetapan dosen PA saat ini. Mahasiswa yang tidak tercantum dalam file akan menjadi belum memiliki dosen PA.
                      </p>
                      <a
                        href={`data:text/csv;charset=utf-8,${encodeURIComponent('NIM,NIP\n123456,198701012010011001')}`}
                        download="contoh-pembagian-dosen-pa.csv"
                        className="mt-3 inline-flex text-sm font-bold text-red-800 underline underline-offset-2 hover:text-red-950"
                      >
                        Unduh contoh format file
                      </a>
                    </div>
                    <form onSubmit={handleAdvisorAssignmentImport} className="space-y-4">
                      <label htmlFor="advisor-assignment-file" className="block text-sm font-semibold text-slate-700">
                        File pembagian dosen PA
                      </label>
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
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-red-800 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-red-900"
                      />
                      <button
                        type="submit"
                        disabled={isImportingAdvisorAssignments || !advisorAssignmentFile}
                        className="rounded-xl bg-red-800 px-5 py-3 text-sm font-bold text-white shadow transition hover:bg-red-900 disabled:cursor-wait disabled:opacity-60"
                      >
                        {isImportingAdvisorAssignments ? 'Menyimpan pembagian…' : 'Upload Pembagian'}
                      </button>
                    </form>
                    {advisorAssignmentError && (
                      <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {advisorAssignmentError}
                      </p>
                    )}
                    {advisorAssignmentResult && (
                      <p aria-live="polite" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        Pembagian berhasil diperbarui: {advisorAssignmentResult.assigned} mahasiswa dibagikan dan {advisorAssignmentResult.unassigned} mahasiswa tidak tercantum dari total {advisorAssignmentResult.totalStudents} mahasiswa.
                      </p>
                    )}
                  </section>
                )}
              </main>
            )}

            {authenticatedUser?.role === 'dosen' && (
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
                        ?.filter((detail) => detail.label === 'NIDN' || detail.label === 'NIP')
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
                  Permohonan dosen PA sudah terhubung. Data presensi e-Campus masih menunggu integrasi; catatan pembinaan dan panggilan konseling dapat dikelola melalui menu konseling.
                </p>

                {advisorRequests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('approval')}
                    className="flex w-full items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-left text-sm text-amber-950 shadow-sm hover:bg-amber-200"
                    role="status"
                  >
                    <span>
                      <strong>{advisorRequests.length} permohonan PA menunggu</strong>
                      {' '}— buka untuk meninjau dan memberikan keputusan.
                    </span>
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                  </button>
                )}

                {activeTab !== 'approval' && (
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
                )}

                {activeTab === 'approval' ? (
                  <section data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg">
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Permohonan Mahasiswa Bimbingan
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Tinjau permohonan mahasiswa yang memilih Anda sebagai dosen PA.
                    </p>
                    {advisorRequestError && (
                      <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                        {advisorRequestError}
                      </p>
                    )}
                    {advisorDecisionStatus && (
                      <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                        {advisorDecisionStatus}
                      </p>
                    )}
                    {isLoadingAdvisorRequests ? (
                      <p className="mt-5 rounded-xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">Memuat permohonan...</p>
                    ) : advisorRequests.length === 0 ? (
                      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                        <p className="font-semibold text-slate-700">Tidak ada permohonan yang menunggu</p>
                        <p className="mt-1 text-sm text-slate-500">Permohonan mahasiswa yang memilih Anda akan tampil di sini.</p>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-4">
                        {advisorRequests.map((request) => (
                          <article key={request.id} className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
                            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                              <div>
                                <p className="font-bold text-slate-900">{request.student.nama}</p>
                                <p className="mt-1 text-sm text-slate-600">NIM {request.student.nim} · {request.student.jurusan}</p>
                                <p className="mt-1 text-xs text-slate-500">Diajukan {new Date(request.createdAt).toLocaleString('id-ID')}</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAdvisorDecision(request.id, 'rejected')}
                                  disabled={updatingAdvisorRequestId !== null}
                                  className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                                >
                                  {updatingAdvisorRequestId === request.id ? 'Memproses...' : 'Tolak'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdvisorDecision(request.id, 'approved')}
                                  disabled={updatingAdvisorRequestId !== null}
                                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                                >
                                  {updatingAdvisorRequestId === request.id ? 'Memproses...' : 'Setujui'}
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                ) : activeTab === 'konseling' ? (
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
                        <p className="mt-1 text-sm text-slate-500">Mahasiswa akan muncul di sini setelah pengajuan DPA disetujui.</p>
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

            {authenticatedUser?.role === 'admin' && (
              <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
                <section data-scroll-reveal className="rounded-3xl border border-red-600/30 bg-gradient-to-r from-[#450a0a]/95 via-[#7f1d1d]/95 to-[#991b1b]/95 p-6 text-white shadow-2xl sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Tim Kemahasiswaan & Administrasi</p>
                  <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                    Panel Verifikasi & Pengelolaan SiDisiplin
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-red-100">
                    Kelola sanggahan presensi, verifikasi klaim kegiatan, tinjau kelayakan SKPI, serta pantau integrasi dan administrasi sistem.
                  </p>
                </section>

                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow">
                  Perubahan poin dapat dicatat pada menu Aturan Poin. Verifikasi klaim, sinkronisasi e-Campus, pemulihan, dan antrean administrasi lainnya belum tersedia melalui API.
                </p>

                <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  {[
                    { label: 'Sanggahan menunggu', icon: FileText },
                    { label: 'Klaim kegiatan menunggu', icon: Award },
                    { label: 'Verifikasi kelulusan', icon: CheckCircle2 },
                  ].map(({ label, icon: Icon }) => (
                    <div key={label} data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                        <Icon className="h-5 w-5 text-red-800" />
                      </div>
                      <p className="mt-3 text-3xl font-extrabold text-slate-900">--</p>
                      <p className="mt-1 text-xs text-slate-500">Menunggu layanan antrean</p>
                    </div>
                  ))}
                </section>

                <section data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {dashboardNavigation.find((item) => item.id === activeTab)?.label ?? 'Ringkasan'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {activeTab === 'sanggah' && 'Tinjau alasan dan dokumen pendukung, lalu setujui atau tolak sanggahan dengan catatan.'}
                    {activeTab === 'verifikasi' && 'Periksa bukti sertifikat, kategori kegiatan, dan bobot poin sebelum menyetujui atau menolak klaim.'}
                    {activeTab === 'kelulusan' && 'Tinjau skor kedisiplinan dan portofolio kegiatan, lalu siapkan rekap status kelulusan dan SKPI.'}
                    {activeTab === 'aturan' && 'Skor awal 100; terlambat −2, tidak hadir tanpa keterangan −5, pelanggaran tata tertib −10, lomba terverifikasi +10, dan kegiatan non-akademik terverifikasi +5. Skor dibatasi 0–200.'}
                    {activeTab === 'redemption' && 'Tinjau bukti tugas pemulihan mahasiswa dan catat keputusan serta poin pemulihan.'}
                    {activeTab === 'sinkronisasi' && 'Pantau sinkronisasi presensi e-Campus, hasil pembaruan, dan catatan kegagalan API.'}
                    {activeTab === 'users' && 'Kelola akun, peran, status akses, dan permintaan reset kata sandi pengguna.'}
                    {activeTab === 'maintenance' && 'Pantau kesehatan sistem, log aktivitas, dan proses pemeliharaan atau backup.'}
                    {activeTab === 'dashboard' && 'Pilih menu untuk membuka antrean kerja dan fungsi administrasi yang dibutuhkan.'}
                  </p>
                  {activeTab === 'aturan' ? (
                    <form onSubmit={handlePointChangeSubmit} className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="point-student-nim" className="mb-1.5 block text-sm font-bold text-slate-700">NIM Mahasiswa</label>
                        <input
                          id="point-student-nim"
                          type="text"
                          inputMode="numeric"
                          required
                          value={pointChangeForm.nim}
                          onChange={(event) => setPointChangeForm((current) => ({ ...current, nim: event.target.value }))}
                          placeholder="Masukkan NIM mahasiswa"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                        />
                      </div>
                      <div>
                        <label htmlFor="point-change-type" className="mb-1.5 block text-sm font-bold text-slate-700">Jenis perubahan poin</label>
                        <select
                          id="point-change-type"
                          value={pointChangeForm.type}
                          onChange={(event) => setPointChangeForm((current) => ({ ...current, type: event.target.value }))}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                        >
                          <option value="late">Terlambat (−2 poin)</option>
                          <option value="unexcused_absence">Tidak hadir tanpa keterangan (−5 poin)</option>
                          <option value="discipline_violation">Pelanggaran tata tertib (−10 poin)</option>
                          <option value="competition">Mengikuti lomba terverifikasi (+10 poin)</option>
                          <option value="non_academic_activity">Kegiatan non-akademik terverifikasi (+5 poin)</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="point-change-reason" className="mb-1.5 block text-sm font-bold text-slate-700">Catatan / bukti pendukung</label>
                        <textarea
                          id="point-change-reason"
                          required
                          maxLength={500}
                          rows={3}
                          value={pointChangeForm.reason}
                          onChange={(event) => setPointChangeForm((current) => ({ ...current, reason: event.target.value }))}
                          placeholder="Tuliskan keterangan pelanggaran atau kegiatan yang telah diverifikasi"
                          className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                        />
                      </div>
                      {pointChangeError && (
                        <p className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                          {pointChangeError}
                        </p>
                      )}
                      {pointChangeStatus && (
                        <p className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                          {pointChangeStatus}
                        </p>
                      )}
                      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">Skor dibatasi pada rentang 0–200. Pastikan kegiatan positif telah diverifikasi.</p>
                        <button
                          type="submit"
                          disabled={isSubmittingPointChange}
                          className="rounded-xl bg-red-800 px-5 py-3 text-sm font-bold text-white shadow transition hover:bg-red-900 disabled:cursor-wait disabled:opacity-60"
                        >
                          {isSubmittingPointChange ? 'Menyimpan...' : 'Simpan Perubahan Poin'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                      <p className="font-semibold text-slate-700">Fungsi belum terhubung ke backend</p>
                      <p className="mt-1 text-sm text-slate-500">Bagian ini adalah struktur antarmuka sesuai use case; data dan aksi akan aktif setelah endpoint terkait dibuat.</p>
                    </div>
                  )}
                </section>
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
              <h3 className="font-extrabold text-slate-900 text-lg">Formulir Sanggah Presensi e-Campus</h3>
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
                  placeholder="Jelaskan catatan presensi e-Campus yang ingin disanggah beserta kronologinya..."
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

    </div>
  );
}
