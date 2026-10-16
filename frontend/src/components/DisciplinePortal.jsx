'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Send,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  MapPin,
  Mail,
  Phone,
  X
} from 'lucide-react';

export default function App() {
  const router = useRouter();
  const [activePage, setActivePage] = useState('landing');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeHeroImage, setActiveHeroImage] = useState(0);

  const [showSKPIModal, setShowSKPIModal] = useState(false);
  const [showSanggahModal, setShowSanggahModal] = useState(false);
  const [showKonselingModal, setShowKonselingModal] = useState(false);

  const [loginError, setLoginError] = useState('');
  const [authenticatedUser, setAuthenticatedUser] = useState(null);

  const officialLogoUrl = "/poltek-simas-berau.png";
  const bgCampusImage = "/campus.svg";
  const portalAccessBackground = "/portal-access-background.jpg";
  const heroImages = [
    '/campus-team.png',
    '/header-student-team.png',
    '/header-vocational-training.png',
  ];
  const navigationByRole = {
    mhs: [
      { id: 'dashboard', label: 'Ringkasan' },
      { id: 'rekam-jejak', label: 'Rekam Jejak' },
      { id: 'sanggah', label: 'Sanggah Presensi' },
      { id: 'klaim', label: 'Klaim Kegiatan' },
      { id: 'konseling', label: 'Konseling' },
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
  };
  const dashboardNavigation =
    navigationByRole[authenticatedUser?.role] ?? navigationByRole.mhs;

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
      setActivePage('landing');
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
                  <div className="flex items-center gap-2">
                    <h1 className="font-extrabold text-slate-900 text-lg leading-none tracking-tight">Poltek Simas Berau</h1>
                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
                      Portal Resmi
                    </span>
                  </div>
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
                <span className="font-extrabold text-amber-300 text-sm tracking-wide flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> SiDisiplin PSB Portal
                </span>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

          <section id="regulasi-poin" data-scroll-reveal className="scroll-mt-6 bg-slate-50 px-6 py-14">
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

              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
                Besaran poin dan keputusan akhir mengikuti regulasi resmi kampus serta hasil verifikasi. Jika catatan presensi tidak sesuai, mahasiswa dapat mengajukan sanggahan untuk ditinjau.
              </p>
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
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-[#581c1c]/90 px-3 py-1.5 rounded-lg border border-red-800/50 flex items-center gap-2">
                    <span className="text-[10px] text-red-200 uppercase font-semibold">Role:</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold text-white">
                      {authenticatedUser?.roleLabel ?? 'Belum login'}
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

              <p className="rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow">
                Profil dimuat dari database. Rekam jejak, skor, klaim kegiatan, dan konseling akan ditampilkan setelah layanan data SiDisiplin serta integrasi e-Campus tersedia.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div data-scroll-reveal data-reveal-delay="80" className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Score Kedisiplinan</span>
                    <Bookmark className="w-5 h-5 text-red-800" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">--</span>
                    <span className="text-xs text-slate-400 font-semibold">Poin</span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Zona risiko</span>
                      <span className="font-semibold text-slate-700">Menunggu data</span>
                    </div>
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
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Poin SKPI / Kegiatan</span>
                    <TrendingUp className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">--</span>
                    <span className="text-xs text-slate-400 font-semibold">Poin</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                    <span>Kegiatan terverifikasi</span>
                    <span className="font-semibold">--</span>
                  </div>
                </div>

                <div data-scroll-reveal data-reveal-delay="80" className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Bimbingan PA</span>
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-slate-900 leading-snug block">Belum ada data konseling</span>
                    <p className="text-xs text-slate-500 mt-1">Catatan PA akan dimuat di sini.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKonselingModal(true)}
                    className="mt-3 border-t border-slate-100 pt-2 text-left text-xs font-semibold text-red-800 hover:underline"
                  >
                    Ajukan / Lihat Catatan PA →
                  </button>
                </div>
              </div>

              <div data-scroll-reveal className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-6">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {activeTab === 'dashboard' && 'Ringkasan Rekam Jejak Kedisiplinan'}
                      {activeTab === 'rekam-jejak' && 'Rekam Jejak Presensi e-Campus'}
                      {activeTab === 'sanggah' && 'Pengajuan Sanggah Presensi'}
                      {activeTab === 'klaim' && 'Klaim Poin Kegiatan Non-Akademik'}
                      {activeTab === 'konseling' && 'Pengawasan & Bimbingan Konseling PA'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sumber presensi yang direncanakan: e-Campus. Sinkronisasi belum aktif.
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
                    {activeTab === 'sanggah' && (
                      <button
                        onClick={() => setShowSanggahModal(true)}
                        className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-colors"
                      >
                        <FileText className="w-4 h-4" /> Ajukan Sanggah
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                        <th className="py-3 px-4">Mata Kuliah / Kegiatan</th>
                        <th className="py-3 px-4">Waktu Presensi</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Poin Impact</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center">
                          <p className="font-semibold text-slate-700">Belum ada rekam jejak untuk ditampilkan</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Presensi akan dimuat dari e-Campus setelah integrasi API tersedia.
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div data-scroll-reveal className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <div className="w-10 h-10 bg-red-100 text-red-800 rounded-xl flex items-center justify-center font-bold">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Tentang Portal SiDisiplin Poltek Simas Berau</h3>
                    <p className="text-xs text-slate-500">Sistem Informasi Rekam Jejak Kedisiplinan, Presensi e-Campus, dan Poin SKPI Vokasi</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-red-800 text-white flex items-center justify-center font-bold text-xs">1</div>
                    <h4 className="font-bold text-slate-900">Presensi e-Campus</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Rekam kehadiran kuliah dan praktikum diambil dari presensi yang dicatat dosen pada e-Campus dan disinkronkan ke dashboard.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-red-800 text-white flex items-center justify-center font-bold text-xs">2</div>
                    <h4 className="font-bold text-slate-900">Akumulasi Poin SKPI</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Rekognisi kegiatan ekstrakurikuler, sertifikasi keahlian industri, dan prestasi lomba sebagai syarat kelulusan wajib mahasiswa vokasi.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-red-800 text-white flex items-center justify-center font-bold text-xs">3</div>
                    <h4 className="font-bold text-slate-900">Bimbingan Dosen PA</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Fasilitas pemantauan kedisiplinan secara langsung oleh Dosen Pembimbing Akademik demi memastikan progress studi berjalan lancar.
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-900 to-rose-950 text-white p-5 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-6 h-6 text-amber-300 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Kampus Utama Politeknik Sinar Mas Berau Coal</p>
                      <p className="text-slate-200">Jl. Raja Alam II, Kel. Rinding / Sei Bedungun, Kec. Teluk Bayur / Tanjung Redeb, Kab. Berau, Kalimantan Timur 77315</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-amber-300 font-bold">Helpdesk Layanan Vokasi</p>
                    <p className="text-slate-200">sekretariat@polteksimasberau.ac.id</p>
                  </div>
                </div>
              </div>
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
                  Data mahasiswa bimbingan, presensi e-Campus, dan konseling belum terhubung ke API. Panel ini menampilkan rancangan alur sesuai use case.
                </p>

                {activeTab !== 'approval' && (
                  <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    {[
                      { label: 'Mahasiswa bimbingan', icon: UserCheck },
                      { label: 'Zona kuning / merah', icon: AlertCircle },
                      { label: 'Perlu tindak lanjut', icon: MessageSquare },
                    ].map(({ label, icon: Icon }) => (
                      <div key={label} data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                          <Icon className="h-5 w-5 text-red-800" />
                        </div>
                        <p className="mt-3 text-3xl font-extrabold text-slate-900">--</p>
                        <p className="mt-1 text-xs text-slate-500">Menunggu sinkronisasi data</p>
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
                      Daftar mahasiswa yang mengajukan untuk menjadi mahasiswa bimbingan Anda.
                    </p>
                    <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                      <p className="font-semibold text-slate-700">Data permohonan belum tersedia</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Pengajuan mahasiswa akan ditampilkan setelah layanan pengajuan bimbingan tersedia.
                      </p>
                    </div>
                  </section>
                ) : (
                  <section data-scroll-reveal className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg">
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {activeTab === 'konseling' ? 'Catatan & Konseling Kedisiplinan' : 'Daftar Mahasiswa Bimbingan'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {activeTab === 'konseling'
                        ? 'Riwayat catatan pembinaan dan jadwal konseling akan tersedia setelah layanan konseling diaktifkan.'
                        : 'Gunakan daftar ini untuk memfilter mahasiswa berdasarkan zona risiko dan membuka detail rekam jejak.'}
                    </p>
                    <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                      <p className="font-semibold text-slate-700">Belum ada data untuk ditampilkan</p>
                      <p className="mt-1 text-sm text-slate-500">Daftar dan detail mahasiswa akan dimuat dari layanan backend.</p>
                    </div>
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
                  Profil akun sudah dimuat dari database. Antrean verifikasi, aturan poin, pemulihan, sinkronisasi e-Campus, dan administrasi sistem belum tersedia melalui API.
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
                    {activeTab === 'aturan' && 'Kelola bobot poin presensi, poin kegiatan, serta ambang batas kelulusan sesuai kebijakan kampus.'}
                    {activeTab === 'redemption' && 'Tinjau bukti tugas pemulihan mahasiswa dan catat keputusan serta poin pemulihan.'}
                    {activeTab === 'sinkronisasi' && 'Pantau sinkronisasi presensi e-Campus, hasil pembaruan, dan catatan kegagalan API.'}
                    {activeTab === 'users' && 'Kelola akun, peran, status akses, dan permintaan reset kata sandi pengguna.'}
                    {activeTab === 'maintenance' && 'Pantau kesehatan sistem, log aktivitas, dan proses pemeliharaan atau backup.'}
                    {activeTab === 'dashboard' && 'Pilih menu untuk membuka antrean kerja dan fungsi administrasi yang dibutuhkan.'}
                  </p>
                  <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                    <p className="font-semibold text-slate-700">Fungsi belum terhubung ke backend</p>
                    <p className="mt-1 text-sm text-slate-500">Bagian ini adalah struktur antarmuka sesuai use case; data dan aksi akan aktif setelah endpoint terkait dibuat.</p>
                  </div>
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

      {showSanggahModal && (
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

      {showKonselingModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-extrabold text-slate-900 text-lg">Pengajuan Konseling Dosen PA</h3>
              <button 
                onClick={() => setShowKonselingModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setShowKonselingModal(false); }} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Dosen PA Pembimbing</label>
                <input 
                  type="text" 
                  disabled 
                  value="Ir. Budi Santoso, M.T. (D3 Pemeliharaan Mesin)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Topik Bimbingan / Topik Kendala</label>
                <textarea 
                  required 
                  rows={3}
                  placeholder="Tuliskan hal yang ingin dikonsultasikan terkait akademik atau kedisiplinan..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-800 text-xs"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowKonselingModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-red-800 text-white font-bold rounded-xl shadow hover:bg-red-900"
                >
                  Kirim Pengajuan Konseling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}