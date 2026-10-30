import React, { useState, useEffect } from 'react';
import {
  Settings,
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  PlusSquare,
  Shield,
  Church,
  MapPin,
  Phone,
  Calendar,
  Lock,
  Database,
  ExternalLink,
  Laptop,
  Sparkles,
  Info,
  Fingerprint,
  ScanFace,
  Trash2,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';
import type { ChurchSettings, Member, Rayon, User } from '../../types/index.ts';
import { UserManagement } from '../UserManagement.tsx';
import { ChurchLetterheadForm } from '../ChurchLetterheadForm.tsx';
import {
  isWebAuthnSupported,
  isPlatformBiometricAvailable,
  getRegisteredBiometricCredential,
  registerBiometricCredential,
  removeRegisteredBiometricCredential,
  authenticateWithBiometrics,
  type StoredBiometricCredential,
} from '../../utils/webauthn.ts';

interface SettingsViewProps {
  onNavigateToBackup?: () => void;
  onPurgeSampleData?: () => Promise<void>;
  isSuperAdmin?: boolean;
  currentUser?: User | null;
  members?: Member[];
  rayons?: Rayon[];
  churchSettings: ChurchSettings;
  onSaveChurchSettings: (settings: ChurchSettings) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onNavigateToBackup,
  onPurgeSampleData,
  isSuperAdmin = true,
  currentUser = null,
  members = [],
  rayons = [],
  churchSettings,
  onSaveChurchSettings,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // WebAuthn Biometric settings state
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [savedCredential, setSavedCredential] = useState<StoredBiometricCredential | null>(null);
  const [bioFeedback, setBioFeedback] = useState<{ message: string; success: boolean } | null>(null);
  const [bioTesting, setBioTesting] = useState(false);
  const [showEnrollSelector, setShowEnrollSelector] = useState(false);

  useEffect(() => {
    const supported = isWebAuthnSupported();
    setBiometricSupported(supported);
    setSavedCredential(getRegisteredBiometricCredential());

    if (supported) {
      isPlatformBiometricAvailable().then((avail) => {
        setPlatformAvailable(avail);
      });
    }
  }, []);

  const handleTestBiometrics = async () => {
    setBioTesting(true);
    setBioFeedback(null);
    try {
      const res = await authenticateWithBiometrics();
      setBioFeedback({ message: res.message, success: res.success });
    } catch (err: any) {
      setBioFeedback({ message: err?.message || 'Pengujian biometrik gagal', success: false });
    } finally {
      setBioTesting(false);
    }
  };

  const handleRegisterBiometrics = async () => {
    setBioTesting(true);
    setBioFeedback(null);

    if (!currentUser) {
      setBioFeedback({ message: 'Masuk ke akun Anda sebelum mendaftarkan biometrik.', success: false });
      setBioTesting(false);
      return;
    }

    try {
      const res = await registerBiometricCredential(currentUser);
      setBioFeedback({ message: res.message, success: res.success });
      if (res.success) {
        setSavedCredential(getRegisteredBiometricCredential());
        setShowEnrollSelector(false);
      }
    } catch (err: any) {
      setBioFeedback({ message: err?.message || 'Gagal mendaftarkan biometrik', success: false });
    } finally {
      setBioTesting(false);
    }
  };

  const handleClearBiometrics = async () => {
    setBioTesting(true);
    const result = await removeRegisteredBiometricCredential();
    if (result.success) setSavedCredential(null);
    setBioFeedback({ message: result.message, success: result.success });
    setBioTesting(false);
  };

  const handleInstallClick = async () => {
    if (isInstalled) return;

    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 5000);
      }
    } else {
      // Browser didn't fire beforeinstallprompt yet or manual instruction
      setShowIOSModal(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0c1329] border border-amber-500/20 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
            <Settings className="w-3.5 h-3.5" />
            <span>Pengaturan Sistem & Aplikasi Mobile</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <span>SYSJEGER Versi 2.1</span>
            <span className="px-2 py-0.5 text-xs font-black tracking-wider bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 rounded-md shadow-xs">
              PRO
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Sistem Informasi Manajemen Jemaat dan Gereja GMIT Betel Fuimelang edisi mutakhir Versi 2.1 Pro dengan integrasi Google Docs & Workspace, Cloud SQL PostgreSQL, dan Google Maps interaktif.
          </p>
        </div>

        {/* Status Badge */}
        <div className="self-start md:self-auto flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Edisi 2.1 Pro</span>
          </div>
          {isInstalled ? (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Aplikasi Terpasang</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>PWA Siap Dipasang</span>
            </div>
          )}
        </div>
      </div>

      {/* FEATURED: WHAT'S NEW IN VERSI 2.1 PRO */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0d1738] via-[#0f1d47] to-[#0a122e] border border-sky-500/30 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Pembaruan Utama SYSJEGER Versi 2.1 Pro</span>
                <span className="px-2 py-0.2 text-[9px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded-full">
                  TERBARU
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Peningkatan kapabilitas gerejawi berbasis cloud dan integrasi Google</p>
            </div>
          </div>
          <span className="text-xs font-mono text-amber-400 font-bold">Release v2.1.0</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-blue-500/30 space-y-1">
            <div className="font-bold text-blue-300 flex items-center gap-1.5">
              <span>📄 Google Docs & Workspace</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Membuat dan menyinkronkan warta jemaat, surat baptis, notulen majelis, dan khotbah langsung ke Google Docs resmi.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-1">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <span>📍 Google Maps Interaktif</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Peta wilayah 4 rayon dan pemilihan titik GPS lokasi rumah tangga jemaat langsung dengan klik pada peta nyata.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-1">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>☁️ Cloud SQL PostgreSQL</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Infrastruktur database relasional cloud di region asia-southeast1 dengan latensi rendah dan sinkronisasi otomatis.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-1">
            <div className="font-bold text-purple-300 flex items-center gap-1.5">
              <span>🔐 WebAuthn & PWA Offline</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Login biometrik sidik jari / Face ID FIDO2 dan operasional tanpa internet (offline sync) di aplikasi smartphone.
            </p>
          </div>
        </div>
      </div>

      {/* PWA INSTALL SECTION (FEATURED CARD) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0c1633] via-[#0f1d44] to-[#0c1633] border-2 border-amber-500/40 shadow-2xl relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white border border-amber-400/40 p-2 shrink-0 shadow-lg flex items-center justify-center">
                <img
                  src="/images/regenerated_image_1792510154483.png"
                  alt="Ikon GMIT Betel Fuimelang"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                  <span>Instal SYSJEGER Versi 2.1 Pro ke Layar HP</span>
                </h3>
                <p className="text-xs text-amber-300/90 font-medium">
                  Progressive Web App (PWA) · GMIT BETEL FUIMELANG
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pasang aplikasi ini langsung di HP Android atau iPhone Anda. Anda dapat membuka SYSJEGER seperti aplikasi biasa dari layar utama HP, tanpa perlu mengetik ulang tautan web di peramban, berjalan layar penuh, dan memuat data lebih cepat.
            </p>

            {/* 3 Key Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Ikon di Layar HP</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Muncul di home screen HP berdampingan dengan aplikasi lain.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Layar Penuh (App)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tampilan mandiri tanpa bilah URL browser (*standalone*).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pemuatan Instan</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Didukung service worker cache untuk performa maksimal.
                </p>
              </div>
            </div>

            {installSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Permintaan instalasi berhasil dikonfirmasi! Periksa layar utama HP Anda.</span>
              </div>
            )}
          </div>

          {/* Action Column */}
          <div className="flex flex-col gap-3 shrink-0 lg:w-72">
            {isInstalled ? (
              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-white">Aplikasi Sudah Terpasang</div>
                <p className="text-[11px] text-slate-400">
                  SYSJEGER sedang berjalan dalam mode aplikasi penuh (*standalone*).
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={handleInstallClick}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2.5 transition-transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <Download className="w-5 h-5 text-slate-950" />
                  <span>Instal Aplikasi ke HP Sekarang</span>
                </button>

                <button
                  onClick={() => setShowIOSModal(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4 text-amber-400" />
                  <span>Petunjuk Pasang di Android & iPhone</span>
                </button>
              </>
            )}

            <div className="text-center text-[11px] text-slate-400">
              Mendukung Android (Chrome/Edge/Samsung) & iOS Safari
            </div>
          </div>
        </div>
      </div>

      {/* CHURCH PROFILE & CONFIGURATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Church Profile Info */}
        <div className="p-6 rounded-2xl bg-[#0c1329] border border-amber-500/20 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <Church className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">
              Identitas Resmi Jemaat & Gereja
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Nama Jemaat:</span>
              <span className="font-bold text-white text-right max-w-[65%]">{churchSettings.churchName}</span>
            </div>
            <div className="flex items-start justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Klasis:</span>
              <span className="font-semibold text-slate-200 text-right">{churchSettings.klasis}</span>
            </div>
            <div className="flex items-start justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Alamat Desa:</span>
              <span className="font-semibold text-slate-200 text-right max-w-[65%]">{churchSettings.address || 'Belum diisi'}</span>
            </div>
            <div className="flex items-start justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Periode Pelayanan:</span>
              <span className="font-bold text-amber-400 text-right">2026 - 2029</span>
            </div>
            <div className="flex items-start justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Ketua Majelis Jemaat:</span>
              <span className="font-semibold text-slate-200 text-right">{churchSettings.signerName || 'Belum diisi'}</span>
            </div>
            <div className="flex items-start justify-between py-1.5">
              <span className="text-slate-400">No. HP / WA Sekretariat:</span>
              <span className="font-mono font-bold text-emerald-400 text-right">{churchSettings.phone || 'Belum diisi'}</span>
            </div>
          </div>
        </div>

        {/* Security & System Info */}
        <div className="p-6 rounded-2xl bg-[#0c1329] border border-amber-500/20 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <Shield className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">
                Keamanan & Akses Terbatas (Privasi Gereja)
              </h3>
            </div>

            <div className="space-y-3 text-xs pt-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span>Status Akses Publik:</span>
                  <span className="text-emerald-400 font-mono text-[11px]">Halaman Warta & Statistik</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Warga umum dan pihak luar hanya dapat melihat warta, jadwal, dan agregat statistik publik.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span>Proteksi Portal SYSJEGER:</span>
                  <span className="text-amber-400 font-mono text-[11px]">Wajib Username & Password</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Database jemaat, kartu keluarga, dan keuangan kas terproteksi ketat di balik autentikasi akun majelis.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {onNavigateToBackup && (
              <button
                type="button"
                onClick={onNavigateToBackup}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Database className="w-4 h-4 text-amber-400" />
                <span>Buka Menu Cadangan & Pemulihan Database</span>
              </button>
            )}

            {onPurgeSampleData && (
              <button
                type="button"
                onClick={onPurgeSampleData}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-rose-950/30"
                title="Hapus seluruh data contoh/dummy anggota jemaat, keluarga, jadwal, dan transaksi"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Bersihkan Seluruh Data Contoh (Database Murni)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {isSuperAdmin && (
        <ChurchLetterheadForm settings={churchSettings} onSave={onSaveChurchSettings} />
      )}

      {isSuperAdmin && currentUser && (
        <UserManagement currentUser={currentUser} members={members} rayons={rayons} />
      )}

      {/* WEBAUTHN BIOMETRIC SECURITY CARD */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0d1633] via-[#0b142d] to-[#0d1633] border border-amber-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm">
              <Fingerprint className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Autentikasi Biometrik WebAuthn (Sidik Jari / Face Unlock)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  FIDO2 / Passkey
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Standar keamanan modern W3C WebAuthn untuk login instan presbiter tanpa kata sandi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {biometricSupported ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Perangkat Mendukung</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-400">
                Tidak Didukung di Browser Ini
              </span>
            )}
          </div>
        </div>

        {bioFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
              bioFeedback.success
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
            }`}
          >
            <span>{bioFeedback.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Kredensial Terdaftar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Status Kredensial di Perangkat Ini:</span>
              {savedCredential ? (
                <span className="text-amber-400 font-semibold">● Terhubung</span>
              ) : (
                <span className="text-slate-500 font-normal">Belum Didaftarkan</span>
              )}
            </div>

            {savedCredential ? (
              <div className="space-y-1.5 text-xs">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-200">
                  <div className="font-bold text-amber-300 text-sm">{savedCredential.user.name}</div>
                  <div className="text-[11px] text-slate-400">
                    Peran: <strong className="text-white">{savedCredential.user.role}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Didaftarkan pada: {new Date(savedCredential.registeredAt).toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleTestBiometrics}
                    disabled={bioTesting}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <ScanFace className={`w-3.5 h-3.5 ${bioTesting ? 'animate-spin' : ''}`} />
                    <span>{bioTesting ? 'Memverifikasi...' : 'Uji Coba Sidik Jari / Wajah'}</span>
                  </button>

                  <button
                    onClick={handleClearBiometrics}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Hapus kredensial biometrik dari perangkat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Daftarkan sensor sidik jari atau kamera Face Unlock perangkat ini untuk langsung masuk ke aplikasi tanpa harus mengetik kata sandi.
                </p>
                {!showEnrollSelector ? (
                  <button
                    onClick={() => setShowEnrollSelector(true)}
                    disabled={!biometricSupported}
                    className="w-full py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Daftarkan Sidik Jari / Wajah Sekarang
                  </button>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="text-[11px] text-slate-300 font-semibold">Akun yang didaftarkan:</div>
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200">
                      <div className="font-bold text-amber-300">{currentUser?.name || 'Akun aktif'}</div>
                      <div className="text-[10px] text-slate-400">Peran: {currentUser?.role || '-'}</div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleRegisterBiometrics}
                        disabled={bioTesting}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        {bioTesting ? 'Menyentuh Sensor...' : 'Sentuh Sensor Biometrik'}
                      </button>
                      <button
                        onClick={() => setShowEnrollSelector(false)}
                        className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs hover:text-white"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Keamanan & Petunjuk WebAuthn */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>Bagaimana Keamanan Biometrik Bekerja?</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
              <li>
                Data sidik jari dan pemindaian wajah <strong>TIDAK PERNAH dikirim atau disimpan di server</strong>.
              </li>
              <li>
                Sensor biometrik diproses langsung di dalam Secure Enclave / TPM (Trusted Platform Module) perangkat Anda.
              </li>
              <li>
                Sistem menggunakan pasangan kunci publik kriptografi asimetris (WebAuthn / Passkeys) yang tahan terhadap phishing dan pencurian kata sandi.
              </li>
              <li>
                Mendukung <strong>Touch ID / Face ID</strong> di Apple iOS & macOS, <strong>Fingerprint Sensor</strong> di HP Android, dan <strong>Windows Hello</strong> di laptop.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* INSTALL INSTRUCTIONS MODAL (FOR ANDROID & IOS SAFARI) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0b1226] border border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Panduan Pasang Aplikasi ke Layar Utama HP
                </h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-md hover:bg-slate-800"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Android Instructions */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                  <span>📱 Pengguna Android (Google Chrome / Edge / Samsung Internet):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pl-1">
                  <li>Buka browser dan buka situs aplikasi GMIT Betel Fuimelang.</li>
                  <li>
                    Ketuk tombol menu <strong>Titik Tiga (⋮)</strong> di pojok kanan atas browser.
                  </li>
                  <li>
                    Pilih menu <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama" (Add to Home screen)</strong>.
                  </li>
                  <li>Ketuk <strong>Instal</strong>. Ikon SYSJEGER akan otomatis muncul di menu aplikasi HP Anda.</li>
                </ol>
              </div>

              {/* iOS Safari Instructions */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                  <span>🍏 Pengguna iPhone / iPad (Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pl-1">
                  <li>Buka halaman web ini di peramban <strong>Safari</strong> bawaan iPhone.</li>
                  <li>
                    Ketuk tombol <strong>Bagikan / Share</strong> (ikon kotak dengan panah ke atas <Share2 className="w-3.5 h-3.5 inline text-sky-400" /> di bilah bawah).
                  </li>
                  <li>
                    Gulir ke bawah dan ketuk opsi <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline text-amber-400" />.
                  </li>
                  <li>
                    Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas. Aplikasi siap digunakan di iPhone Anda.
                  </li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
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
