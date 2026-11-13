import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  X,
  Download,
  ExternalLink,
  Copy,
  Check,
  MessageCircle,
  QrCode,
  PackageCheck,
  Share2,
  PlusSquare,
  AlertCircle,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import {
  PRODUCTION_VERCEL_URL,
  buildAndroidShareWhatsAppUrl,
  buildPwaBuilderUrl,
  getInstallTargetUrl,
  isLocalOrEphemeralHost,
} from '../utils/pwa-helpers.ts';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, install } =
    usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [useProdUrl, setUseProdUrl] = useState(false);

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : PRODUCTION_VERCEL_URL;
  const currentHostname =
    typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = isLocalOrEphemeralHost(currentHostname);

  const activeOrigin = useProdUrl ? PRODUCTION_VERCEL_URL : currentOrigin;
  const installTargetUrl = getInstallTargetUrl(activeOrigin);
  const cleanShareUrl = activeOrigin.replace(/\/+$/, '');
  const whatsappUrl = buildAndroidShareWhatsAppUrl(cleanShareUrl);
  const pwaBuilderUrl = buildPwaBuilderUrl(cleanShareUrl);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    QRCode.toDataURL(installTargetUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: '#091024',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, installTargetUrl]);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const ok = await install();
    if (ok) {
      setInstallSuccess(true);
      setTimeout(() => {
        setInstallSuccess(false);
        onClose();
      }, 2200);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installTargetUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3000);
    } catch {
      const input = document.createElement('input');
      input.value = installTargetUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="android-install-modal-title"
    >
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0c142c] border border-emerald-500/40 p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white p-1.5 border border-amber-400/50 shrink-0 flex items-center justify-center shadow-md">
              <img
                src="/images/regenerated_image_1792510154483.png"
                alt="Ikon SYSJEGER GMIT Betel Fuimelang"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h3
                id="android-install-modal-title"
                className="font-extrabold text-white text-base leading-tight"
              >
                Pasang SYSJEGER di HP Android
              </h3>
              <p className="text-[11px] text-emerald-300 font-medium mt-0.5">
                Instal langsung dari halaman ini · Layar Penuh & Offline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan instalasi Android"
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Already Installed Status */}
        {installSuccess || isInstalled ? (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white">
                Aplikasi SYSJEGER Sudah Terpasang!
              </div>
              <p className="text-[11px] text-emerald-200/80 mt-0.5">
                Ikon aplikasi telah tersedia di layar utama / menu aplikasi perangkat Anda dan berjalan offline.
              </p>
            </div>
          </div>
        ) : null}

        {/* Primary Action Area: 1-Tap Native Install OR Iframe Breakout */}
        {!isInstalled && isInstallable && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/10 border border-emerald-400/50 space-y-2.5">
            <div className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Siap Dipasang Langsung (1-Ketuk)!</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Perangkat Anda mendukung pemasangan langsung aplikasi Android (WebAPK). Ketuk tombol di bawah ini untuk langsung memasang ikon ke layar HP:
            </p>
            <button
              type="button"
              onClick={handleNativeInstall}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Instal Langsung ke Layar HP Sekarang</span>
            </button>
          </div>
        )}

        {!isInstalled && isInIframe && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/40 space-y-2.5">
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Anda sedang membuka halaman di dalam pratinjau/iframe</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Browser Chrome memblokir dialog instalasi Android jika masih berada di dalam frame. Buka halaman ini di tab Chrome penuh agar tombol <strong>Instal Aplikasi</strong> langsung aktif:
            </p>
            <a
              href={installTargetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Tab Penuh Chrome & Instal Aplikasi</span>
            </a>
          </div>
        )}

        {/* QR Code + Share for Phone from Laptop/Other Admins */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span>Scan QR dari HP Android Anda</span>
            </div>
            {currentOrigin !== PRODUCTION_VERCEL_URL && (
              <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setUseProdUrl(false)}
                  className={`px-2 py-1 rounded-md font-semibold cursor-pointer ${
                    !useProdUrl ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Server Ini
                </button>
                <button
                  type="button"
                  onClick={() => setUseProdUrl(true)}
                  className={`px-2 py-1 rounded-md font-semibold cursor-pointer ${
                    useProdUrl ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  URL Vercel
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="p-2 rounded-2xl bg-white shadow-md shrink-0">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code Instalasi SYSJEGER Android"
                  className="w-32 h-32 block"
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-[10px] text-slate-500">
                  Memuat QR…
                </div>
              )}
            </div>

            <div className="space-y-2.5 flex-1 min-w-0 w-full text-xs">
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Arahkan kamera HP Android / Google Lens ke QR Code ini, buka di <strong>Chrome</strong>, lalu ketuk <strong>Instal Aplikasi</strong>.
              </p>

              {isLocal && !useProdUrl && (
                <p className="text-[10px] text-amber-300/90 leading-snug">
                  Catatan: Alamat localhost hanya bisa diakses di perangkat ini. Klik <strong>URL Vercel</strong> di atas untuk tautan yang bisa dibuka semua HP.
                </p>
              )}

              <div
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-cyan-300 truncate select-all"
                title={installTargetUrl}
              >
                {installTargetUrl}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedUrl ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{copiedUrl ? 'Tersalin!' : 'Salin Link'}</span>
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Kirim ke WA</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Browser Instructions (Android / iOS / Desktop) */}
        <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs space-y-2">
          <div className="font-bold text-amber-300 text-[11px] uppercase tracking-wider">
            {isIOS
              ? 'Langkah Instal di iPhone / iPad (Safari)'
              : isAndroid
              ? 'Jika Tombol Otomatis Belum Muncul di Chrome Android'
              : 'Langkah Instal di HP Android / Komputer'}
          </div>

          {isIOS ? (
            <div className="space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
              <p>
                1. Buka di <strong>Safari</strong>, ketuk ikon{' '}
                <strong className="text-white inline-flex items-center gap-1">
                  <Share2 className="w-3 h-3 text-sky-400" /> Bagikan
                </strong>
                .
              </p>
              <p>
                2. Pilih{' '}
                <strong className="text-white inline-flex items-center gap-1">
                  <PlusSquare className="w-3 h-3 text-emerald-400" /> Tambah ke Layar Utama
                </strong>{' '}
                lalu ketuk <strong>Tambah</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
              <p>
                1. Ketuk ikon <strong>Titik Tiga (⋮)</strong> di pojok kanan atas Google Chrome Android.
              </p>
              <p>
                2. Pilih <strong>&ldquo;Instal Aplikasi&rdquo;</strong> atau{' '}
                <strong>&ldquo;Tambahkan ke Layar Utama&rdquo;</strong> lalu konfirmasi <strong>Instal</strong>.
              </p>
            </div>
          )}
        </div>

        {/* File APK Option (PWABuilder + AppMint ZIP) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/30 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 font-bold text-indigo-200">
            <PackageCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Butuh File Installer `.apk` Fisik?</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Pemasangan lewat Chrome di atas otomatis membuat <strong>WebAPK Android asli</strong>. Jika Anda tetap ingin file <strong>`.apk`</strong> yang bisa dikirim manual:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={pwaBuilderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span>Buat APK via PWABuilder</span>
            </a>
            <a
              href="/gmit-betel-fuimelang.zip"
              download="gmit-betel-fuimelang.zip"
              className="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Unduh ZIP (AppMint)</span>
            </a>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};

export default AndroidInstallModal;
