import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Menu,
  Shield,
  Globe,
  LogOut,
  RefreshCw,
  WifiOff,
  Cake,
  MessageCircle,
  X,
  ChevronRight,
  PartyPopper,
  Calendar,
  Phone,
  User,
  MapPin,
} from 'lucide-react';
import type { User as UserType, Member } from '../types/index.ts';
import { getUpcomingBirthdays } from '../utils/celebrations.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface HeaderProps {
  currentView: string;
  currentUser: UserType | null;
  onOpenMobileSidebar: () => void;
  onOpenPublicSite: () => void;
  onLogout?: () => void;
  isOnline?: boolean;
  pendingOfflineCount?: number;
  onSyncOffline?: () => void;
  syncingOffline?: boolean;
  members?: Member[];
  onNavigate?: (view: string) => void;
  onOpenMemberDetail?: (member: Member) => void;
}

const VIEW_TITLES: Record<string, string> = {
  dashboard: 'Dashboard Statistik & Pelayanan',
  members: 'Database Jemaat Betel Fuimelang',
  families: 'Daftar Kartu Keluarga (KK)',
  rayons: 'Wilayah Pelayanan 4 Rayon (Rayon I - IV)',
  categorials: 'Kelompok Kategorial GMIT',
  staff: 'Presbiter Majelis Jemaat & Pendeta',
  sacraments: 'Buku Registrasi Sakramen Kudus',
  mutations: 'Buku Mutasi & Peristiwa Gerejawi',
  events: 'Kalender Kegiatan & Ibadah',
  attendance: 'Pencatatan Absensi Kebaktian',
  finance: 'Administrasi Kas Keuangan Gereja',
  announcements: 'Penerbitan Warta Jemaat',
  documents: 'Arsip & Dokumen Digital Gereja',
  reports: 'Pusat Laporan & Format Cetak Resmi A4',
  portal: 'Portal Pelayanan Khusus Warga Jemaat',
  backup: 'Cadangan & Pemulihan Database',
  audit: 'Audit Trail Aktivitas Sistem',
  settings: 'Pengaturan Sistem & Instal Aplikasi HP',
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  currentUser,
  onOpenMobileSidebar,
  onOpenPublicSite,
  onLogout,
  isOnline = true,
  pendingOfflineCount = 0,
  onSyncOffline,
  syncingOffline = false,
  members = [],
  onNavigate,
  onOpenMemberDetail,
}) => {
  const [showBirthdayDropdown, setShowBirthdayDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowBirthdayDropdown(false);
      }
    }
    if (showBirthdayDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBirthdayDropdown]);

  // Query member birthdays occurring within 1 week (7 days)
  const upcomingBirthdaysWeek = useMemo(() => {
    return getUpcomingBirthdays(members, 7);
  }, [members]);

  const todayBirthdayCount = useMemo(() => {
    return upcomingBirthdaysWeek.filter((b) => b.isToday).length;
  }, [upcomingBirthdaysWeek]);

  return (
    <header className="chroma-glass sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 border-b text-slate-200">
      {/* Left zone: Mobile toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-md lg:hidden"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-1">
            <span className="text-amber-400 font-bold tracking-wide">SYSJEGER V2.1</span>
            <span className="px-1 py-0.2 text-[8px] font-black bg-amber-500 text-slate-950 rounded">PRO</span>
          </div>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200 font-semibold truncate max-w-[160px] sm:max-w-none">
            {VIEW_TITLES[currentView] || 'Sistem Informasi Gereja'}
          </span>
        </div>
      </div>

      {/* Right zone: Birthday Notification, Network Status, Fast Sync, Switch Role, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Birthday Notification Bell Dropdown (1-Week Window) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowBirthdayDropdown(!showBirthdayDropdown)}
            className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              todayBirthdayCount > 0
                ? 'bg-gradient-to-r from-amber-500/25 via-pink-500/20 to-amber-500/25 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10'
                : upcomingBirthdaysWeek.length > 0
                ? 'bg-pink-500/15 border-pink-500/40 text-pink-300 hover:bg-pink-500/25'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
            title={
              upcomingBirthdaysWeek.length > 0
                ? `${upcomingBirthdaysWeek.length} warga jemaat berulang tahun dalam 1 minggu ke depan${
                    todayBirthdayCount > 0 ? ` (${todayBirthdayCount} hari ini!)` : ''
                  }`
                : 'Tidak ada jemaat yang berulang tahun dalam 7 hari ke depan'
            }
          >
            <div className="relative">
              <Cake
                className={`w-4 h-4 ${
                  todayBirthdayCount > 0
                    ? 'text-amber-400 animate-bounce'
                    : upcomingBirthdaysWeek.length > 0
                    ? 'text-pink-400'
                    : 'text-slate-400'
                }`}
              />
              {todayBirthdayCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </div>

            {upcomingBirthdaysWeek.length > 0 ? (
              <span className="flex items-center gap-1">
                <span className="hidden sm:inline">HUT 1 Minggu:</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    todayBirthdayCount > 0
                      ? 'bg-amber-400 text-slate-950 animate-pulse'
                      : 'bg-pink-500 text-white'
                  }`}
                >
                  {upcomingBirthdaysWeek.length}
                </span>
              </span>
            ) : (
              <span className="hidden md:inline text-[11px] font-medium text-slate-400">HUT (0)</span>
            )}
          </button>

          {/* Floating Dropdown Popover */}
          {showBirthdayDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0c142b] border border-amber-500/30 shadow-2xl shadow-black/80 z-50 overflow-hidden text-slate-200 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              {/* Popover Header */}
              <div className="p-3.5 bg-gradient-to-r from-[#121c3d] via-[#1a254d] to-[#121c3d] border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30">
                    <Cake className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Notifikasi Ulang Tahun Jemaat</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {upcomingBirthdaysWeek.length > 0
                        ? `${upcomingBirthdaysWeek.length} warga jemaat berulang tahun dalam 1 minggu ke depan`
                        : 'Tidak ada jemaat yang berulang tahun minggu ini'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBirthdayDropdown(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Popover Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                {upcomingBirthdaysWeek.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <PartyPopper className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">Belum ada jemaat yang berulang tahun dalam 7 hari ke depan.</p>
                  </div>
                ) : (
                  upcomingBirthdaysWeek.map((b) => (
                    <div
                      key={b.id}
                      className={`p-2.5 rounded-xl border transition-all flex items-start justify-between gap-2.5 ${
                        b.isToday
                          ? 'bg-gradient-to-r from-amber-500/15 via-[#161f38] to-[#0c142b] border-amber-400/60 shadow-sm'
                          : b.isTomorrow
                          ? 'bg-slate-900/90 border-sky-500/40'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {/* Day/Month Box */}
                        <div
                          className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 border ${
                            b.isToday
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-xs'
                              : 'bg-slate-950 text-pink-300 border-pink-500/30'
                          }`}
                        >
                          <span className="text-sm font-mono font-black leading-none">{b.day}</span>
                          <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5">
                            {b.monthName.substring(0, 3)}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-bold text-white text-xs truncate" title={b.member.fullName}>
                              {b.member.fullName}
                            </h5>
                          </div>

                          <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 mt-0.5">
                            <PartyPopper className="w-3 h-3 shrink-0" />
                            <span>HUT ke-{b.turningAge} Tahun</span>
                          </div>

                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5 text-slate-500" />
                              <span>{b.member.rayonName || 'Rayon Jemaat'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Badge & WA Button */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            b.isToday
                              ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                              : b.isTomorrow
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {b.isToday ? '🎉 HARI INI' : b.isTomorrow ? '⏰ BESOK' : `${b.diffDays} hari lagi`}
                        </span>

                        <div className="flex items-center gap-1">
                          {onOpenMemberDetail && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenMemberDetail(b.member);
                                setShowBirthdayDropdown(false);
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                              title="Lihat Profil"
                            >
                              <User className="w-3 h-3" />
                            </button>
                          )}

                          {b.waUrl ? (
                            <a
                              href={b.waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                              title="Kirim Ucapan WA Langsung"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>WA</span>
                            </a>
                          ) : (
                            <span className="text-[9px] text-slate-500 italic">No WA (-)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Popover Footer */}
              <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('dashboard');
                    }
                    setShowBirthdayDropdown(false);
                  }}
                  className="w-full py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Buka Kalender Pastoral di Dashboard</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PWA Install Button for mobile & desktop */}
        <PWAInstallButton variant="header" />

        {/* Offline / Online Network Indicator */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium"
              title="Terhubung ke Server GMIT Betel Fuimelang"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Online</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-medium animate-pulse"
              title="Jaringan terputus. Input jemaat tetap tersimpan di perangkat lokal secara aman."
            >
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span>Offline Mode</span>
            </div>
          )}

          {/* Pending Sync Button if any offline data exists */}
          {pendingOfflineCount > 0 && (
            <button
              onClick={onSyncOffline}
              disabled={syncingOffline || !isOnline}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all shadow-sm ${
                isOnline
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-75'
              }`}
              title={
                isOnline
                  ? `Klik untuk sinkronkan ${pendingOfflineCount} data jemaat offline ke server`
                  : 'Menunggu koneksi internet tersambung untuk sinkronisasi otomatis'
              }
            >
              <RefreshCw className={`w-3 h-3 ${syncingOffline ? 'animate-spin text-slate-950' : ''}`} />
              <span>
                {syncingOffline ? 'Menyinkronkan...' : `Sinkron (${pendingOfflineCount})`}
              </span>
            </button>
          )}
        </div>

        {/* Role is shown read-only; permissions cannot be escalated from the header. */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0e162d]/80 border border-cyan-500/30 text-cyan-200"
          title="Hak akses akun yang sedang aktif"
        >
          <Shield className="w-3.5 h-3.5 text-cyan-300" />
          <span className="hidden sm:inline">Peran:</span>
          <span className="font-bold text-white">{currentUser?.role || 'Guest'}</span>
        </div>

        <button
          onClick={onOpenPublicSite}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span>Halaman Warta Publik</span>
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-xs font-bold border border-amber-300/40 shadow-xs"
            title={`${currentUser?.name || 'Pengguna'} (${currentUser?.role || 'Guest'})`}
          >
            {currentUser?.name?.substring(0, 2).toUpperCase() || 'AD'}
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md border border-slate-800 transition-colors"
              title="Keluar / Logout dari SYSJEGER"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
