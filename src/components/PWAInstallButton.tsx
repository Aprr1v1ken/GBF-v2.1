import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'hero' | 'floating' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running inside installed standalone PWA app, hide
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else {
      // If prompt not yet captured, show informative modal for mobile/PC
      setShowIOSModal(true);
    }
  };

  if (installSuccess) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold animate-pulse">
        <Check className="w-4 h-4 text-emerald-400" />
        <span>Aplikasi Berhasil Diinstal!</span>
      </div>
    );
  }

  // Variant styling
  const getButtonContent = () => {
    if (variant === 'hero') {
      return (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 cursor-pointer ${className}`}
        >
          <Smartphone className="w-4 h-4 text-slate-950" />
          <span>Pasang di HP / Laptop (Aplikasi Offline)</span>
        </button>
      );
    }

    if (variant === 'sidebar') {
      return (
        <button
          onClick={handleInstallClick}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer text-left ${className}`}
        >
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white leading-tight">Instal SYSJEGER</div>
            <div className="text-[10px] text-emerald-300/80">Akses Lancar Offline & Cepat</div>
          </div>
        </button>
      );
    }

    // Default header variant
    return (
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors cursor-pointer ${className}`}
        title="Pasang aplikasi ke layar utama HP / desktop PC"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">Instal Aplikasi</span>
        <span className="sm:hidden">Instal</span>
      </button>
    );
  };

  return (
    <>
      {getButtonContent()}

      {/* Installation Guide Modal (Especially for iOS Safari / Chrome instructions) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-[#0c142c] border border-emerald-500/40 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">
                  {isIOS ? 'Pasang di iPhone / iPad' : isAndroid ? 'Pasang di Android' : 'Pasang di Komputer / Laptop'}
                </h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              {isIOS ? (
                <>
                  <p className="text-slate-200">
                    Untuk memasang <strong>SYSJEGER V2.0</strong> ke layar beranda iPhone / iPad tanpa melalui App Store:
                  </p>
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                      <p>Ketuk tombol <strong className="text-white inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 text-sky-400" /> Bagikan (Share)</strong> pada bilah bawah browser Safari.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                      <p>Gulir ke bawah dan pilih <strong className="text-white inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 text-emerald-400" /> Tambah ke Layar Utama (Add to Home Screen)</strong>.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                      <p>Ketuk <strong>Tambah</strong> di sudut kanan atas. Ikon aplikasi GMIT Betel Fuimelang akan langsung terpasang di HP Anda.</p>
                    </div>
                  </div>
                </>
              ) : isAndroid ? (
                <>
                  <p className="text-slate-200">
                    Untuk memasang aplikasi di ponsel Android Anda:
                  </p>
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <p>1. Ketuk ikon titik tiga (⋮) di pojok kanan atas browser Chrome.</p>
                    <p>2. Pilih menu <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</p>
                    <p>3. Konfirmasi dengan mengetuk <strong>Instal</strong>. Aplikasi akan muncul di laci aplikasi HP.</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-200">
                    Pasang SYSJEGER ke desktop Windows / Mac / Linux:
                  </p>
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <p>1. Pada browser Chrome atau Edge, klik ikon <strong>Instal</strong> di bilah alamat kanan atas (di samping bintang bookmark).</p>
                    <p>2. Klik <strong>Instal</strong> untuk membuat shortcut di Desktop dan Taskbar.</p>
                  </div>
                </>
              )}

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                ✨ <strong>Keunggulan PWA:</strong> Berjalan mandiri tanpa browser chrome, sangat cepat, hemat kuota internet, dan dapat dibuka saat kondisi sinyal lemah atau offline.
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
