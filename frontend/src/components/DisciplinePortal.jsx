'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  UserCheck, 
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
  User,
  ArrowLeft,
  HelpCircle,
  MapPin,
  Mail,
  Phone,
  X
} from 'lucide-react';

export default function App() {
  const router = useRouter();
  const [backendStatus, setBackendStatus] = useState('checking');
  const [activePage, setActivePage] = useState('landing');
  const [activeTab, setActiveTab] = useState('dashboard');

  const [showSKPIModal, setShowSKPIModal] = useState(false);
  const [showSanggahModal, setShowSanggahModal] = useState(false);
  const [showKonselingModal, setShowKonselingModal] = useState(false);

  const [loginError, setLoginError] = useState('');
  const [authenticatedUser, setAuthenticatedUser] = useState(null);

  const officialLogoUrl = "/sidisiplin-mark.svg";
  const bgCampusImage = "/campus.svg";

  useEffect(() => {
    let isMounted = true;
    let healthTimer;

    const checkBackend = async () => {
      try {
        const response = await fetch('/api/health', {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        if (!response.ok && data.database === 'disconnected') {
          if (isMounted) {
            setBackendStatus('database-unavailable');
          }
          return;
        }
        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`);
        }

        if (isMounted) {
          setBackendStatus(data.status === 'ok' ? 'connected' : 'unavailable');
        }
      } catch {
        if (isMounted) {
          setBackendStatus('unavailable');
        }
      } finally {
        if (isMounted) {
          healthTimer = window.setTimeout(checkBackend, 10000);
        }
      }
    };

    void checkBackend();

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
      window.clearTimeout(healthTimer);
    };
  }, []);

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
                <a href="#" className="hover:text-amber-200 transition-colors py-1 text-slate-200">Panduan Tapping KTM</a>
                <a href="#" className="hover:text-amber-200 transition-colors py-1 text-slate-200">Regulasi Poin SKPI</a>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span
                  className={`rounded-lg border px-3 py-1.5 font-medium ${
                    backendStatus === 'connected'
                      ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200'
                      : backendStatus === 'database-unavailable'
                        ? 'border-orange-400/50 bg-orange-950/40 text-orange-200'
                        : backendStatus === 'unavailable'
                          ? 'border-rose-400/50 bg-rose-950/40 text-rose-200'
                          : 'border-amber-400/50 bg-amber-950/40 text-amber-200'
                  }`}
                  role="status"
                >
                  {backendStatus === 'connected'
                    ? 'API & database terhubung'
                    : backendStatus === 'database-unavailable'
                      ? 'API aktif; database tidak terhubung'
                    : backendStatus === 'unavailable'
                      ? 'API backend tidak terhubung'
                      : 'Menghubungkan API...'}
                </span>
                <button className="flex items-center gap-1.5 bg-red-900/60 hover:bg-red-900 px-3 py-1.5 rounded-lg text-slate-100 border border-red-700/50 transition-colors font-medium">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-300" /> Pusat Sanggah & Helpdesk
                </button>
              </div>
            </div>
          </nav>

          {loginError && (
            <p className="bg-amber-50 px-6 py-3 text-center text-sm text-amber-900" role="alert">
              {loginError}
            </p>
          )}

          <div 
            className="bg-slate-900 text-white py-12 px-6 relative overflow-hidden bg-cover bg-center border-b border-slate-800" 
            style={{ backgroundImage: `linear-gradient(to right, rgba(69, 10, 10, 0.92), rgba(153, 27, 27, 0.85)), url(${bgCampusImage})` }}
          >
            <div className="max-w-7xl mx-auto relative z-10">
              <span className="bg-amber-400 text-red-950 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider shadow-sm">
                Sistem Poin Kedisiplinan & Track Record Vokasi
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mt-3 leading-tight">
                Portal Kedisiplinan & Integrasi SKPI Mahasiswa
              </h2>
              <p className="mt-2 text-slate-100 max-w-2xl text-sm sm:text-base leading-relaxed">
                Selamat datang di portal resmi pemantauan nilai kedisiplinan Politeknik Sinar Mas Berau Coal. Sistem ini mencatat presensi tapping KTM otomatis serta akumulasi poin kegiatan non-akademik.
              </p>
            </div>
          </div>

          <main className="relative flex-1 w-full bg-cover bg-center py-16 px-6 flex items-center justify-center overflow-hidden"
                style={{ backgroundImage: `url(${bgCampusImage})` }}>
            <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"></div>

            <div className="max-w-7xl mx-auto w-full relative z-10">
              <div className="text-center mb-10">
                <h3 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">Pilih Akses Masuk Portal</h3>
                <p className="text-slate-100 text-sm mt-2 font-medium drop-shadow-sm">Silakan pilih peran Anda untuk melanjutkan ke halaman login</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <button
                  type="button"
                  onClick={() => handleSelectRole('mhs')}
                  className="w-full appearance-none text-left font-sans bg-white/95 backdrop-blur-md rounded-2xl p-7 border border-white/80 shadow-2xl hover:shadow-red-500/25 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
                >
                  <div>
                    <div className="w-14 h-14 bg-red-50 text-red-800 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-red-800 group-hover:text-white transition-all shadow-sm">
                      <User className="w-8 h-8" />
                    </div>
                    <h4 className="text-2xl font-bold text-slate-900 group-hover:text-red-800 transition-colors">Akses Mahasiswa</h4>
                    <p className="text-slate-600 text-sm mt-3 leading-relaxed font-normal">
                      Cek rekapitulasi nilai kedisiplinan, histori tapping KTM, ajukan sanggah presensi, dan klaim poin SKPI kegiatan.
                    </p>
                  </div>
                  <span className="mt-8 w-full py-3 bg-slate-100 group-hover:bg-red-800 group-hover:text-white text-slate-800 font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2">
                    Masuk via NIM
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRole('dosen')}
                  className="w-full appearance-none text-left font-sans bg-white/95 backdrop-blur-md rounded-2xl p-7 border border-white/80 shadow-2xl hover:shadow-rose-500/25 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
                >
                  <div>
                    <div className="w-14 h-14 bg-rose-50 text-rose-800 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-rose-800 group-hover:text-white transition-all shadow-sm">
                      <UserCheck className="w-8 h-8" />
                    </div>
                    <h4 className="text-2xl font-bold text-slate-900 group-hover:text-rose-800 transition-colors">Akses Dosen PA</h4>
                    <p className="text-slate-600 text-sm mt-3 leading-relaxed font-normal">
                      Monitoring statistik kedisiplinan mahasiswa bimbingan, verifikasi jadwal konseling, dan berikan catatan bimbingan.
                    </p>
                  </div>
                  <span className="mt-8 w-full py-3 bg-slate-100 group-hover:bg-rose-800 group-hover:text-white text-slate-800 font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2">
                    Masuk via NIP/NIDN
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRole('admin')}
                  className="w-full appearance-none text-left font-sans bg-white/95 backdrop-blur-md rounded-2xl p-7 border border-white/80 shadow-2xl hover:shadow-red-600/25 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
                >
                  <div>
                    <div className="w-14 h-14 bg-red-50 text-red-900 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-red-900 group-hover:text-white transition-all shadow-sm">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h4 className="text-2xl font-bold text-slate-900 group-hover:text-red-900 transition-colors">Akses Kemahasiswaan</h4>
                    <p className="text-slate-600 text-sm mt-3 leading-relaxed font-normal">
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
                  <div className="h-10 w-auto bg-white p-1 rounded-xl flex items-center justify-center shadow-lg">
                    <img 
                      src={officialLogoUrl} 
                      alt="Logo Poltek Simas Berau" 
                      className="h-8 w-auto object-contain"
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

                <div className="flex items-center bg-[#581c1c]/90 p-1 rounded-xl border border-red-800/50">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'dashboard' ? 'bg-red-700 text-white shadow-md' : 'text-slate-200 hover:text-white'
                    }`}
                  >
                    Dashboard Utama
                  </button>
                  <button 
                    onClick={() => setActiveTab('presensi')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'presensi' ? 'bg-red-700 text-white shadow-md' : 'text-slate-200 hover:text-white'
                    }`}
                  >
                    Presensi KTM
                  </button>
                  <button 
                    onClick={() => setActiveTab('skpi')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'skpi' ? 'bg-red-700 text-white shadow-md' : 'text-slate-200 hover:text-white'
                    }`}
                  >
                    Poin Non-Akademik
                  </button>
                  <button 
                    onClick={() => setActiveTab('konseling')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'konseling' ? 'bg-red-700 text-white shadow-md' : 'text-slate-200 hover:text-white'
                    }`}
                  >
                    Konseling Dosen PA
                  </button>
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

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6 flex-1 w-full">
              <div className="bg-gradient-to-r from-[#450a0a]/95 via-[#7f1d1d]/95 to-[#991b1b]/95 backdrop-blur-sm text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-red-600/30">
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
                Profil di atas dimuat dari database. Statistik poin, presensi, dan aktivitas di bawah masih berupa data demo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Score Kedisiplinan</span>
                    <Bookmark className="w-5 h-5 text-red-800" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">895</span>
                    <span className="text-xs text-slate-400 font-semibold">/ 1000 Poin</span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Grade: A (Sangat Baik)</span>
                      <span className="text-slate-500 text-[11px]">Top 5% Kampus</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-red-800 h-2 rounded-full" style={{ width: '89.5%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tingkat Kehadiran</span>
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">98.2%</span>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Tepat Waktu: <strong className="text-slate-900">45</strong></span>
                      <span>Terlambat: <strong className="text-amber-600">1</strong></span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '98.2%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Poin SKPI / Kegiatan</span>
                    <TrendingUp className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">160</span>
                    <span className="text-xs text-slate-400 font-semibold">Poin Terekam</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                    <span>Sertifikasi Industri K3</span>
                    <span className="text-emerald-600 font-semibold">+30 Poin Bulan Ini</span>
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Bimbingan PA</span>
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-slate-900 leading-snug block">Konseling Vokasi Disetujui</span>
                    <p className="text-xs text-slate-500 mt-1">Konseling Terakhir: 10 Okt 2026</p>
                  </div>
                  <div 
                    onClick={() => setShowKonselingModal(true)}
                    className="mt-3 pt-2 border-t border-slate-100 text-xs text-red-800 font-semibold cursor-pointer hover:underline"
                  >
                    Ajukan / Lihat Catatan PA →
                  </div>
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-6">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {activeTab === 'dashboard' && 'Riwayat Presensi Tapping KTM Terakhir'}
                      {activeTab === 'presensi' && 'Log Detail Presensi & Pengajuan Sanggah'}
                      {activeTab === 'skpi' && 'Klaim Poin Non-Akademik & SKPI'}
                      {activeTab === 'konseling' && 'Pengawasan & Bimbingan Konseling PA'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Data tersinkronisasi otomatis dengan hardware mesin tapping KTM Poltek Simas Berau
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {activeTab === 'skpi' && (
                      <button 
                        onClick={() => setShowSKPIModal(true)}
                        className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Tambah Klaim Sertifikasi / Lomba
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                        <th className="py-3 px-4">Mata Kuliah / Praktikum / Kegiatan</th>
                        <th className="py-3 px-4">Waktu Tap</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Poin Impact</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          Praktikum Perawatan & Perbaikan Mesin
                          <p className="text-xs text-slate-400 font-normal">Workshop Teknik Mesin - Lab A</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">08:00:15 WITA</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-xs">
                            Tepat Waktu
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-emerald-600 font-bold text-xs">+10 Poin</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-xs text-slate-400">Tercatat</span>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          K3 Pertambangan & Keselamatan Kerja
                          <p className="text-xs text-slate-400 font-normal">Auditorium Utama Poltek Simas Berau</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">08:22:10 WITA</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-xs">
                            Terlambat (+12m)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-red-600 font-bold text-xs">-3 Poin</td>
                        <td className="py-3.5 px-4 text-right">
                          <button 
                            onClick={() => setShowSanggahModal(true)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs transition-colors"
                          >
                            Sanggah
                          </button>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          Sertifikasi Kompetensi Operator Alat Berat
                          <p className="text-xs text-slate-400 font-normal">Program Vokasi Penunjang Industri</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">04 Okt 2026</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold rounded-full text-xs">
                            Terverifikasi SKPI
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-emerald-600 font-bold text-xs">+50 Poin</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-xs text-slate-400">Sertifikat Valid</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <div className="w-10 h-10 bg-red-100 text-red-800 rounded-xl flex items-center justify-center font-bold">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Tentang Portal SiDisiplin Poltek Simas Berau</h3>
                    <p className="text-xs text-slate-500">Sistem Informasi Track Record, Presensi KTM, dan Poin SKPI Vokasi</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-red-800 text-white flex items-center justify-center font-bold text-xs">1</div>
                    <h4 className="font-bold text-slate-900">Presensi Tapping KTM</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Pencatatan kehadiran kuliah dan praktikum di kelas maupun laboratorium secara otomatis melalui mesin pembaca KTM di setiap gedung perkuliahan.
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
          </div>
        </div>
      )}

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
              <h3 className="font-extrabold text-slate-900 text-lg">Formulir Sanggah Presensi KTM</h3>
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
                  placeholder="Jelaskan alasan keterlambatan atau kendala tapping KTM..."
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