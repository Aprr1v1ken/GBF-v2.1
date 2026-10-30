import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Calendar,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Heart,
  ChevronRight,
  Sparkles,
  Users,
  Home,
  BarChart3,
  Lock,
  LogOut,
  Shield,
  UserCheck,
  Layers,
  Award,
  Activity,
  Smartphone,
  Download,
  Share2,
  PlusSquare,
  Sun,
  MessageSquare,
  Music,
  Baby,
  HelpCircle,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import type { Announcement, ChurchEvent, ServiceSchedule, Member, Family, Rayon, CategorialGroup, User } from '../types/index.ts';

interface PublicLandingProps {
  onEnterApp: () => void;
  onOpenLogin: () => void;
  announcements: Announcement[];
  events: ChurchEvent[];
  schedules?: ServiceSchedule[];
  stats?: any;
  members?: Member[];
  families?: Family[];
  rayons?: Rayon[];
  categorials?: CategorialGroup[];
  currentUser?: User | null;
  onLogout?: () => void;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({
  onEnterApp,
  onOpenLogin,
  announcements,
  events,
  schedules = [],
  stats,
  members = [],
  families = [],
  rayons = [],
  categorials = [],
  currentUser = null,
  onLogout,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [wartaTheme, setWartaTheme] = useState<'rgb' | 'neon' | 'emerald'>('rgb');
  const [selectedWartaCategory, setSelectedWartaCategory] = useState<string>('Semua');

  const handleInstallClick = async () => {
    if (isInstalled) return;
    if (isIOS) {
      setShowInstallGuide(true);
      return;
    }
    if (isInstallable) {
      await install();
    } else {
      setShowInstallGuide(true);
    }
  };

  // Aggregate statistics calculation
  const totalSoul = stats?.totalSoul ?? members.filter((m) => m.status === 'Aktif').length;
  const totalFamily = stats?.totalFamily ?? families.length;
  const maleCount = stats?.maleCount ?? members.filter((m) => m.gender === 'Laki-laki' && m.status === 'Aktif').length;
  const femaleCount = stats?.femaleCount ?? members.filter((m) => m.gender === 'Perempuan' && m.status === 'Aktif').length;

  const malePercent = totalSoul > 0 ? Math.round((maleCount / totalSoul) * 100) : 0;
  const femalePercent = totalSoul > 0 ? 100 - malePercent : 0;

  // Rayon counts
  const rayonCounts: Record<string, number> = { ...(stats?.rayonCounts || {}) };
  if (Object.keys(rayonCounts).length === 0 && members.length > 0) {
    for (const m of members) {
      const r = m.rayonName || 'Rayon Lain';
      rayonCounts[r] = (rayonCounts[r] || 0) + 1;
    }
  }

  // Categorial counts
  const categorialCounts: Record<string, number> = { ...(stats?.categorialCounts || {}) };
  if (Object.keys(categorialCounts).length === 0 && members.length > 0) {
    for (const m of members) {
      const c = m.categorialGroupName || 'Lainnya';
      categorialCounts[c] = (categorialCounts[c] || 0) + 1;
    }
  }

  const getCategorialCount = (code: string, aliases: string[] = []) => {
    const direct = categorialCounts[code];
    if (direct !== undefined) return direct;
    const keys = [code, ...aliases].map((value) => value.toLowerCase());
    const matchingKey = Object.keys(categorialCounts).find((key) => {
      const normalized = key.toLowerCase();
      return keys.some((value) => normalized.includes(value));
    });
    return matchingKey ? categorialCounts[matchingKey] : 0;
  };

  // Sacraments summary
  const baptizedCount = stats?.sacraments?.baptized ?? members.filter((m) => m.baptismStatus === 'Sudah').length;
  const confirmedCount = stats?.sacraments?.confirmed ?? members.filter((m) => m.confirmationStatus === 'Sudah').length;
  const marriedChurchCount = stats?.sacraments?.marriedInChurch ?? members.filter((m) => m.marriageChurchStatus === 'Sudah').length;

  return (
    <div className="chroma-app min-h-screen text-slate-100 flex flex-col font-sans selection:bg-cyan-400 selection:text-slate-950">
      <div className="chroma-ribbon" aria-hidden="true" />

      {/* Top Banner Navigation */}
      <header className="chroma-glass sticky top-0 z-40 border-b px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/images/regenerated_image_1792510154483.png"
            alt="Cap resmi GMIT Betel Fuimelang"
            className="w-10 h-10 rounded-full border border-amber-400/50 object-contain bg-white p-0.5 shadow-md shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm md:text-base font-extrabold tracking-wide text-amber-300 uppercase">
                GMIT BETEL FUIMELANG
              </div>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                Portal Warta & Publik
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Klasis Alor Tengah Utara · Desa Lembur Tengah, NTT
            </p>
          </div>
        </div>

        {/* Quick Nav Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-300">
          <a href="#jadwal" className="hover:text-amber-400 transition-colors">
            Jadwal Ibadah
          </a>
          <a href="#statistik" className="hover:text-amber-400 transition-colors flex items-center gap-1.5 text-amber-300">
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Data Statistik</span>
            <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">Publik</span>
          </a>
          <a href="#sambutan" className="hover:text-amber-400 transition-colors">
            Gembala Jemaat
          </a>
          <a href="#warta" className="hover:text-amber-400 transition-colors">
            Warta & Pengumuman
          </a>
          <a href="#ai-rohani" className="hover:text-emerald-300 transition-colors flex items-center gap-1.5 text-emerald-300 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Rohani (Gratis)</span>
          </a>
        </nav>

        {/* Auth / Action CTA */}
        <div className="flex items-center gap-3">
          <a
            href="https://wa.me/6285173095482"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WA Sekretariat</span>
          </a>

          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer"
              title="Instal aplikasi GMIT Betel Fuimelang ke HP"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Instal di HP</span>
              <span className="sm:hidden">Instal</span>
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onEnterApp}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                title="Buka sistem internal SYSJEGER"
              >
                <span>Buka Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-slate-800 transition-colors"
                  title="Keluar dari akun"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              title="Akses Portal SYSJEGER dengan Akun dan Password"
            >
              <Lock className="w-3.5 h-3.5 text-slate-950" />
              <span>Masuk SYSJEGER</span>
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-amber-500/20">
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/aistudio/Gemini_Generated_Image_fz5m5cfz5m5cfz5m_d4b1cfd2.jpeg"
            alt="Gedung Kebaktian GMIT Betel Fuimelang"
            className="w-full h-full object-cover object-center opacity-45 sm:opacity-55 scale-105 transition-transform duration-1000"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060a16] via-[#060a16]/75 to-[#060a16]/40" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Soli Deo Gloria — Hanya Bagi Kemuliaan Allah</span>
          </div>

          <h1 className="chroma-hero-title text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Gereja Masehi Injili di Timor
            <span className="block mt-2">
              Jemaat Betel Fuimelang
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed mb-8">
            Membangun persekutuan jemaat yang berakar dalam Firman Allah, bertumbuh dalam kasih persaudaraan, dan berbuah dalam pelayanan kasih di Desa Lembur Tengah, Klasis Alor Tengah Utara.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={currentUser ? onEnterApp : onOpenLogin}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 flex items-center gap-2 transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-slate-950" />
              <span>{currentUser ? 'Buka Dashboard SYSJEGER' : 'Masuk Portal SYSJEGER'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#statistik"
              className="px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-semibold text-sm transition-colors flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>Data Statistik Jemaat</span>
            </a>
            <a
              href="#jadwal"
              className="px-5 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-sm transition-colors"
            >
              Jadwal Ibadah & Warta
            </a>
            {!isInstalled && (
              <button
                onClick={handleInstallClick}
                className="px-5 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Instal di HP</span>
              </button>
            )}
          </div>

          {/* Privacy Security Note */}
          <div className="mt-8 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 backdrop-blur-sm">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Akses Portal SYSJEGER terproteksi akun & kata sandi resmi untuk menjaga kerahasiaan data jemaat.</span>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 flex-1">
        {/* PUBLIC STATISTICS SECTION */}
        <section id="statistik" className="space-y-6 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-amber-500/20 pb-4 gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Transparansi Tata Kelola Pelayanan</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
                <span>Data Statistik & Demografi Jemaat</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Ringkasan agregat demografis gerejawi GMIT Betel Fuimelang di Desa Lembur Tengah, Klasis Alor Tengah Utara. Data pribadi individu (NIK, riwayat arsip keluarga) dilindungi dan hanya dapat dikelola melalui akun resmi SYSJEGER.
              </p>
            </div>
            <div className="text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 self-start md:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Data Terverifikasi Majelis Jemaat</span>
            </div>
          </div>

          {/* Primary 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Card 1: Total Jiwa */}
            <div className="p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 space-y-3 relative overflow-hidden group hover:border-amber-400/40 transition-colors">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider">Total Jiwa Jemaat</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white">
                {totalSoul} <span className="text-xs font-normal text-slate-400">Jiwa</span>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <span>L: {maleCount} ({malePercent}%)</span>
                <span>P: {femaleCount} ({femalePercent}%)</span>
              </div>
              {/* Mini visual ratio bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                <div style={{ width: `${malePercent}%` }} className="bg-sky-400 h-full" title={`Laki-laki: ${maleCount}`} />
                <div style={{ width: `${femalePercent}%` }} className="bg-pink-400 h-full" title={`Perempuan: ${femaleCount}`} />
              </div>
            </div>

            {/* Card 2: Total KK */}
            <div className="p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 space-y-3 relative overflow-hidden group hover:border-amber-400/40 transition-colors">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider">Kepala Keluarga (KK)</span>
                <Home className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white">
                {totalFamily} <span className="text-xs font-normal text-slate-400">Rumah Tangga</span>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                <span>Rata-rata: {totalFamily > 0 ? (totalSoul / totalFamily).toFixed(1) : 0} jiwa / keluarga</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Kartu Keluarga Gerejawi</span>
              </div>
            </div>

            {/* Card 3: Rayon Pelayanan */}
            <div className="p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 space-y-3 relative overflow-hidden group hover:border-amber-400/40 transition-colors">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider">Wilayah Rayon</span>
                <Layers className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white">
                {rayons.length} <span className="text-xs font-normal text-slate-400">Rayon Resmi</span>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                <span>{rayons.length > 0 ? rayons.map((rayon) => rayon.name).join(', ') : 'Belum ada rayon terdaftar'}</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>Desa Lembur Tengah</span>
              </div>
            </div>

            {/* Card 4: Kategorial */}
            <div className="p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 space-y-3 relative overflow-hidden group hover:border-amber-400/40 transition-colors">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider">Kelompok Kategorial</span>
                <Heart className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white">
                {categorials.length} <span className="text-xs font-normal text-slate-400">Kategorial GMIT</span>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                <span>{categorials.length > 0 ? categorials.map((group) => group.code).join(', ') : 'Belum ada kategorial terdaftar'}</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-400" />
                <span>Pelayanan Holistik</span>
              </div>
            </div>
          </div>

          {/* Detailed Infographics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Card A: Persebaran Jemaat per Rayon */}
            <div className="p-6 rounded-3xl bg-[#0c1329] border border-amber-500/20 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-white text-sm">
                    Persebaran Jemaat Berdasarkan {rayons.length} Rayon
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Wilayah Penggembalaan
                </span>
              </div>

              <div className="space-y-3.5">
                {rayons.map((r, idx) => {
                  const count = rayonCounts[r.name] || 0;
                  const pct = totalSoul > 0 ? Math.round((count / totalSoul) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{r.name}</span>
                        <span className="text-amber-400 font-mono font-bold">
                          {count} <span className="text-slate-400 font-normal">jiwa ({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Pelayanan rayon dikoordinir oleh Majelis Jemaat & Presbiter bertugas di setiap rayon.</span>
              </div>
            </div>

            {/* Card B: Distribusi Kategorial Pelayanan */}
            <div className="p-6 rounded-3xl bg-[#0c1329] border border-amber-500/20 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-white text-sm">
                    Distribusi Kategorial & Demografi Usia
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Kelompok Pelayanan
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#080d1e] border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px] font-semibold">PAR (Anak & Remaja)</div>
                  <div className="text-lg font-bold text-amber-300">
                    {getCategorialCount('PAR', ['Anak', 'Remaja'])} <span className="text-[10px] font-normal text-slate-400">jiwa</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Usia 0 - 15 Tahun</div>
                </div>

                <div className="p-3 rounded-xl bg-[#080d1e] border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px] font-semibold">Pemuda GMIT</div>
                  <div className="text-lg font-bold text-amber-300">
                    {getCategorialCount('PEMUDA', ['Pemuda'])} <span className="text-[10px] font-normal text-slate-400">jiwa</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Usia 16 - 30 Tahun</div>
                </div>

                <div className="p-3 rounded-xl bg-[#080d1e] border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px] font-semibold">Kaum Perempuan (PKP)</div>
                  <div className="text-lg font-bold text-amber-300">
                    {getCategorialCount('PKP', ['Perempuan'])} <span className="text-[10px] font-normal text-slate-400">jiwa</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Ibu Rumah Tangga / Warga Dewasa</div>
                </div>

                <div className="p-3 rounded-xl bg-[#080d1e] border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px] font-semibold">Kaum Bapak (PKB)</div>
                  <div className="text-lg font-bold text-amber-300">
                    {getCategorialCount('PKB', ['Bapak'])} <span className="text-[10px] font-normal text-slate-400">jiwa</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Kepala Keluarga / Warga Dewasa</div>
                </div>

                <div className="col-span-2 p-3 rounded-xl bg-[#080d1e] border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-[11px] font-semibold">Lansia (Lanjut Usia)</div>
                    <div className="text-[10px] text-slate-400">Usia 60 Tahun ke atas</div>
                  </div>
                  <div className="text-lg font-bold text-amber-300">
                    {getCategorialCount('LANSIA', ['Lansia', 'Usia Indah'])} <span className="text-[10px] font-normal text-slate-400">jiwa</span>
                  </div>
                </div>
              </div>

              {/* Sakramen Summary Row */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-around text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Warga Baptis</div>
                  <div className="text-sm font-bold text-emerald-400">{baptizedCount}</div>
                </div>
                <div className="w-px h-6 bg-slate-800" />
                <div>
                  <div className="text-[10px] text-slate-400">Warga Sidi</div>
                  <div className="text-sm font-bold text-sky-400">{confirmedCount}</div>
                </div>
                <div className="w-px h-6 bg-slate-800" />
                <div>
                  <div className="text-[10px] text-slate-400">Nikah Gereja</div>
                  <div className="text-sm font-bold text-amber-400">{marriedChurchCount}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Protected Access Callout Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0c1633] via-[#0e1b3d] to-[#0c1633] border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Kebijakan Privasi & Keamanan Data Jemaat</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                    Sistem Tertutup
                  </span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  Untuk menjaga privasi dan kerahasiaan warga gereja, seluruh modul internal SYSJEGER (Database Anggota, NIK, Kartu Keluarga, Mutasi, Sakramen, dan Perbendaharaan Keuangan) hanya dapat diakses dengan akun & kata sandi resmi oleh Majelis Jemaat dan Administrator yang berwenang.
                </p>
              </div>
            </div>

            <button
              onClick={currentUser ? onEnterApp : onOpenLogin}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5 text-slate-950" />
              <span>{currentUser ? 'Buka Dashboard SYSJEGER' : 'Masuk dengan Akun Resmi'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Jadwal Ibadah Section */}
        <section id="jadwal" className="space-y-6 scroll-mt-20">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                <Clock className="w-6 h-6 text-amber-400" />
                <span>Jadwal Kebaktian & Ibadah Jemaat</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Waktu Pelayanan berdasarkan Zona WITA (GMT+8) / Asia/Jayapura
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/30">
              Gedung Utama Betel
            </span>
          </div>

          {schedules && schedules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {schedules.map((sch) => (
                <div
                  key={sch.id}
                  className="p-6 rounded-2xl bg-[#0c1329] border border-amber-500/20 relative overflow-hidden space-y-2 hover:border-amber-400/40 transition-colors"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    {sch.serviceDate}
                  </div>
                  <h4 className="text-lg font-bold text-white">
                    {sch.serviceName}
                  </h4>
                  <div className="text-xs text-slate-300 space-y-1 pt-1">
                    <p><span className="text-slate-400">Pelayan:</span> {sch.preacher || <span className="text-slate-500 italic">Belum diisi</span>}</p>
                    <p><span className="text-slate-400">Liturgos:</span> {sch.liturgist || <span className="text-slate-500 italic">Belum diisi</span>}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : events && events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-6 rounded-2xl bg-[#0c1329] border border-amber-500/20 relative overflow-hidden space-y-2 hover:border-amber-400/40 transition-colors"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    {ev.category}
                  </div>
                  <h4 className="text-lg font-bold text-white">
                    {ev.title}
                  </h4>
                  <div className="text-xl font-mono font-bold text-amber-300">
                    {ev.startTime}
                  </div>
                  <p className="text-xs text-slate-300">
                    {ev.location} · {ev.picName}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 px-6 rounded-2xl bg-[#0c1329]/50 border border-dashed border-amber-500/20 text-center space-y-3">
              <Clock className="w-8 h-8 text-amber-400/50 mx-auto" />
              <p className="text-sm text-slate-300 font-medium">
                Belum ada jadwal kebaktian & ibadah yang dijadwalkan
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Majelis Jemaat dapat menambahkan jadwal kebaktian minggu dan persekutuan doa melalui menu Jadwal Ibadah di dalam sistem SYSJEGER.
              </p>
            </div>
          )}
        </section>

        {/* Pastor & Majelis Section */}
        <section id="sambutan" className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center p-8 rounded-3xl bg-[#0c1329]/80 border border-amber-500/20 scroll-mt-20">
          <div className="md:col-span-1 flex flex-col items-center text-center">
            <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-xl mb-4">
              <img
                src="/images/regenerated_image_1792335390161.png"
                alt="Pdt. Sonya W. Isu, S.Th"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <h4 className="font-bold text-white text-base">
              Pdt. Sonya W. Isu, S.Th
            </h4>
            <p className="text-xs text-amber-400 font-medium">
              Ketua Majelis Jemaat GMIT Betel Fuimelang
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Periode Pelayanan 2026 - 2029
            </p>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="inline-block px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              Sambutan Gembala Jemaat
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Selamat Datang di Sistem Informasi GMIT Betel Fuimelang
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              "Kasih karunia dan damai sejahtera dari Allah Bapa kita dan dari Tuhan Yesus Kristus menyertai saudara-saudari sekalian. SYSJEGER V2.0 dihadirkan untuk meningkatkan transparansi tata kelola pelayanan, keteraturan data administrasi jemaat dan keluarga, serta mempermudah komunikasi gerejawi demi kemuliaan nama Tuhan."
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Klasis Alor Tengah Utara · Desa Lembur Tengah, Kec. Alor Tengah Utara, NTT</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-amber-400" />
                <span>085173095482 (Sekretariat / WhatsApp)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Warta Jemaat Terkini - RGB Chromatic Theme */}
        <section id="warta" className="space-y-6 scroll-mt-20">
          {/* Top Bar with RGB Title & Theme Switcher */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0c1328] via-[#101a38] to-[#0c1328] border border-amber-500/30 relative overflow-hidden shadow-2xl">
            {/* Animated RGB Ambient Light */}
            <div
              className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
                wartaTheme === 'rgb'
                  ? 'bg-gradient-to-br from-pink-500/20 via-cyan-500/20 to-amber-500/20 animate-pulse'
                  : wartaTheme === 'neon'
                  ? 'bg-gradient-to-br from-purple-600/25 via-blue-500/25 to-pink-500/25'
                  : 'bg-gradient-to-br from-emerald-500/25 via-teal-500/25 to-amber-500/25'
              }`}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-semibold mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="rgb-text-gradient font-bold">WARTA & BERITA GEREJA PUBLIK (RGB)</span>
                </div>
                <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Warta Pelayanan GMIT Betel Fuimelang</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Informasi resmi pelayanan jemaat, dokumentasi foto bakti Jumat, aksi kasih diakonia, dan kegiatan kategorial sepekan.
                </p>
              </div>

              {/* Theme Selector Controls */}
              <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/60 border border-slate-700 shrink-0 self-start md:self-auto backdrop-blur-md">
                <span className="text-[10px] text-slate-400 font-bold px-2 uppercase tracking-wider">Thema:</span>
                <button
                  type="button"
                  onClick={() => setWartaTheme('rgb')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    wartaTheme === 'rgb'
                      ? 'rgb-rainbow-gradient text-slate-950 shadow-md shadow-pink-500/20 scale-105'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  🌈 RGB Chroma
                </button>
                <button
                  type="button"
                  onClick={() => setWartaTheme('neon')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    wartaTheme === 'neon'
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/30 scale-105'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  💎 Neon Liturgis
                </button>
                <button
                  type="button"
                  onClick={() => setWartaTheme('emerald')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    wartaTheme === 'emerald'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/30 scale-105'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  🌿 Eden Emerald
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-slate-800/80 relative z-10">
              <span className="text-xs text-slate-400 font-medium">Filter Kategori:</span>
              {[
                'Semua',
                'Bakti Jumat & Gotong Royong',
                'Warta Ibadah',
                'Diakonia & Kasih',
                'Pemuda & Remaja',
              ].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedWartaCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedWartaCategory === cat
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Announcements Card Grid */}
          {(() => {
            const filteredAnnouncements = announcements.filter((item) => {
              if (selectedWartaCategory === 'Semua') return true;
              return item.category?.toLowerCase().includes(selectedWartaCategory.toLowerCase());
            });

            if (filteredAnnouncements.length === 0) {
              return (
                <div className="py-16 px-6 rounded-3xl bg-[#0c1329]/60 border border-dashed border-amber-500/20 text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-amber-400/50 mx-auto" />
                  <p className="text-sm text-slate-300 font-bold">
                    Belum ada warta untuk kategori "{selectedWartaCategory}"
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Majelis Jemaat dapat menambahkan warta baru atau membuat liputan otomatis via Asisten AI Berita & Bakti Jumat.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAnnouncements.map((item) => {
                  const isBakti = item.category?.toLowerCase().includes('bakti') || item.title?.toLowerCase().includes('bakti');
                  const isDiakonia = item.category?.toLowerCase().includes('diakonia');
                  const isPemuda = item.category?.toLowerCase().includes('pemuda');

                  // Distinct RGB theme glowing border classes
                  const cardBorderGlow =
                    wartaTheme === 'rgb'
                      ? isBakti
                        ? 'border-emerald-400/80 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/30'
                        : isDiakonia
                        ? 'border-rose-400/80 shadow-lg shadow-rose-500/15 ring-1 ring-rose-500/30'
                        : isPemuda
                        ? 'border-cyan-400/80 shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-500/30'
                        : 'border-amber-400/80 shadow-lg shadow-amber-500/15 ring-1 ring-amber-500/30'
                      : wartaTheme === 'neon'
                      ? 'border-purple-500/70 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500/40'
                      : 'border-emerald-500/70 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/40';

                  const badgeStyle = isBakti
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : isDiakonia
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : isPemuda
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                  const shareText = `*WARTA GMIT BETEL FUIMELANG*\n\n📌 *${item.title}*\n🗓️ ${item.date} | ${item.category}\n\n${item.content}\n\n_Diumumkan oleh: ${item.author}_`;

                  return (
                    <div
                      key={item.id}
                      className={`p-6 rounded-3xl bg-[#090f24] border ${cardBorderGlow} space-y-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden`}
                    >
                      {/* Subtle Ambient Background Gradient */}
                      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                      <div className="space-y-3 relative z-10">
                        {/* Photo Banner with Zoom effect */}
                        {item.imageUrl && (
                          <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-700/60 relative bg-slate-950">
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-bold text-white border border-white/20 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>Dokumentasi Kegiatan</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-bold px-2.5 py-0.5 rounded-full border text-[10px] uppercase tracking-wide ${badgeStyle}`}>
                            {item.category}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">{item.date}</span>
                        </div>

                        <h4 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                          {item.title}
                        </h4>

                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-4 whitespace-pre-line font-sans">
                          {item.content}
                        </p>
                      </div>

                      {/* Footer Actions: Author & WhatsApp Share */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs relative z-10">
                        <div className="text-[11px] text-slate-400 truncate pr-2">
                          Oleh: <span className="text-slate-200 font-medium">{item.author}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Bagikan warta ini ke WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Bagikan</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>

        {/* PUBLIC CHRISTIAN SPIRITUAL AI SECTION */}
        <section id="ai-rohani" className="space-y-6 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-amber-500/20 pb-4 gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>100% Gratis untuk Seluruh Warga Jemaat & Majelis</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
                <span>Layanan AI Rohani Kristen GMIT</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Asisten kecerdasan buatan rohani berakar pada Alkitab (TB LAI) dan tradisi Reformasi GMIT untuk mendampingi persekutuan keluarga, renungan harian, dan pelayanan gerejawi.
              </p>
            </div>
            <button
              onClick={currentUser ? onEnterApp : onOpenLogin}
              className="text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
            >
              <span>{currentUser ? 'Buka Ruang AI Rohani' : 'Masuk untuk Akses Lengkap'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Santapan Rohani WA */}
            <div className="p-5 rounded-2xl bg-[#0c1329] border border-emerald-500/20 hover:border-emerald-400/50 transition-colors space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                  <Sun className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Santapan Rohani Harian</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Renungan pagi dan malam yang menenangkan jiwa, dilengkapi ayat emas dan teks yang siap dibagikan ke grup WhatsApp Rayon.
                </p>
              </div>
              <button
                onClick={currentUser ? onEnterApp : onOpenLogin}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <span>Akses Renungan Harian</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 2: Konseling Rohani */}
            <div className="p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 hover:border-amber-400/50 transition-colors space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Konseling & Bimbingan Iman</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tuntunan Alkitabiah atas kekhawatiran hidup, masalah keluarga, kedukaan, dan naskah doa penyerahan hati yang menguatkan.
                </p>
              </div>
              <button
                onClick={currentUser ? onEnterApp : onOpenLogin}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <span>Mulai Konseling Rohani</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 3: Sekolah Minggu PAR */}
            <div className="p-5 rounded-2xl bg-[#0c1329] border border-pink-500/20 hover:border-pink-400/50 transition-colors space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-300 flex items-center justify-center">
                  <Baby className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Sahabat Guru PAR GMIT</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Naskah cerita interaktif anak Sekolah Minggu, peraga alam (daun, jagung, batu), kuis seru, dan ayat hafalan mingguan.
                </p>
              </div>
              <button
                onClick={currentUser ? onEnterApp : onOpenLogin}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-pink-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <span>Buka Bahan PAR</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 4: Penuntun Liturgi Khusus */}
            <div className="p-5 rounded-2xl bg-[#0c1329] border border-sky-500/20 hover:border-sky-400/50 transition-colors space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center">
                  <Music className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Tata Ibadah Liturgi Khusus</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Penyusunan tata kebaktian rumah tangga rayon, syukur panen Alor, dan penghiburan duka lengkap rujukan nomor kidung KJ/PKJ.
                </p>
              </div>
              <button
                onClick={currentUser ? onEnterApp : onOpenLogin}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <span>Lihat Tata Ibadah</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-500/20 bg-[#040710] py-8 px-4 text-center text-xs text-slate-400 space-y-2">
        <p className="font-medium text-slate-300 flex items-center justify-center gap-1.5">
          <span>SYSJEGER V2.1</span>
          <span className="px-1.5 py-0.2 text-[9px] font-black bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 rounded shadow-xs">PRO</span>
          <span>— Sistem Informasi Jemaat dan Gereja GMIT BETEL FUIMELANG</span>
        </p>
        <p className="text-slate-500">
          Gereja Masehi Injili di Timor (GMIT) · Klasis Alor Tengah Utara · Desa Lembur Tengah, Kabupaten Alor, NTT
        </p>
        <p className="text-[11px] text-amber-500/80">
          Zona Waktu: Asia/Jayapura / WITA · Format DD-MM-YYYY · Akses Data Pribadi Jemaat Terproteksi Enkripsi Akun
        </p>
      </footer>

      {/* Installation Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0b1226] border border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Cara Pasang Aplikasi ke Layar Utama HP
                </h3>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-md hover:bg-slate-800"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Android Instructions */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                  <span>📱 Pengguna Android (Chrome / Edge / Samsung Internet):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pl-1">
                  <li>Buka browser Google Chrome atau browser bawaan HP Anda.</li>
                  <li>
                    Ketuk menu <strong>Titik Tiga (⋮)</strong> di sudut kanan atas.
                  </li>
                  <li>
                    Pilih <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama" (Add to Home screen)</strong>.
                  </li>
                  <li>Ketuk <strong>Instal</strong> untuk memasang ikon GMIT Betel Fuimelang di HP.</li>
                </ol>
              </div>

              {/* iOS Safari Instructions */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                  <span>🍏 Pengguna iPhone / iPad (Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pl-1">
                  <li>Buka halaman ini melalui browser <strong>Safari</strong> iPhone.</li>
                  <li>
                    Ketuk tombol <strong>Bagikan / Share</strong> (ikon kotak dengan panah ke atas <Share2 className="w-3.5 h-3.5 inline text-sky-400" />).
                  </li>
                  <li>
                    Gulir ke bawah dan ketuk opsi <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline text-amber-400" />.
                  </li>
                  <li>
                    Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas layar iPhone.
                  </li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md cursor-pointer transition-colors"
            >
              Saya Mengerti, Tutup Panduan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
