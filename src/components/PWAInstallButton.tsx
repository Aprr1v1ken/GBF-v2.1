import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Check, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { AndroidInstallModal } from './AndroidInstallModal.tsx';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'hero' | 'floating' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running inside installed standalone PWA app, hide
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
        return;
      }
    }
    setShowModal(true);
  };

  if (installSuccess) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold animate-pulse">
        <Check className="w-4 h-4 text-emerald-400" />
        <span>Aplikasi Berhasil Diinstal!</span>
      </div>
    );
  }

  const getButtonContent = () => {
    if (variant === 'hero') {
      return (
        <button
          type="button"
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
          type="button"
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

    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors cursor-pointer ${className}`}
        title="Pasang aplikasi langsung ke layar utama HP Android / PC"
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
      <AndroidInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};

/**
 * Floating 1-tap Android install bar shown only when running on Android or via ?install=1 deep link
 * and not yet installed as a standalone PWA.
 */
export const AndroidInstallFloatingPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isAndroid, isInstallQuery, install } =
    usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isInstallQuery && !isInstalled && !isInstallable) {
      setShowModal(true);
    }
  }, [isInstallQuery, isInstalled, isInstallable]);

  if (isInstalled || dismissed) {
    return showModal ? (
      <AndroidInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    ) : null;
  }

  if (!isAndroid && !isInstallQuery && !isInstallable) {
    return null;
  }

  const handleTapInstall = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) return;
    }
    setShowModal(true);
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-sm z-40 rounded-2xl bg-[#0b132b]/95 border border-emerald-500/50 shadow-2xl p-3.5 backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white p-1 shrink-0 flex items-center justify-center">
            <img
              src="/images/regenerated_image_1792510154483.png"
              alt="Ikon SYSJEGER"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-extrabold text-white truncate">
              Instal SYSJEGER di HP Anda
            </div>
            <div className="text-[10px] text-emerald-300 truncate">
              Layar penuh & bisa dipakai offline
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleTapInstall}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] transition-colors cursor-pointer"
          >
            {isInstallable ? 'Pasang' : 'Instal'}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Tutup banner instal Android"
            className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AndroidInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
