import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Printer,
  IdCard,
  Calendar,
  MapPin,
  Award,
  BookOpen,
  User,
  Phone,
  Mail,
  Palette,
  Check,
  Camera,
  Upload,
  Trash2,
  Cloud,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { calculateAge, formatDateDMY } from '../utils/church-logic.ts';
import type { Member, CardColorThemeId } from '../types/index.ts';
import { uploadMemberPhoto } from '../services/storage.ts';

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onUpdatePhoto?: (memberId: string, photoUrl: string) => Promise<void>;
}

interface ThemeDefinition {
  id: CardColorThemeId;
  name: string;
  dotColor: string;
  bgClass: string;
  borderClass: string;
  titleColor: string;
  headerSub: string;
  accentText: string;
  badgeClass: string;
  photoBg: string;
  textColor: string;
  labelColor: string;
  dividerColor: string;
  footerText: string;
  isLight?: boolean;
}

const THEMES: Record<string, ThemeDefinition> = {
  chroma: {
    id: 'chroma',
    name: 'Aurora Chroma — Signature',
    dotColor: '#f472b6',
    bgClass: 'bg-gradient-to-br from-[#08031a] via-[#101038] to-[#001b25]',
    borderClass: 'border-2 border-fuchsia-400/70 shadow-fuchsia-500/20',
    titleColor: 'text-white',
    headerSub: 'text-cyan-300',
    accentText: 'text-fuchsia-300',
    badgeClass: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/50',
    photoBg: 'bg-slate-950 border-cyan-400/50',
    textColor: 'text-slate-100',
    labelColor: 'text-violet-200/80',
    dividerColor: 'border-cyan-300/40',
    footerText: 'text-cyan-200',
  },
  gold: {
    id: 'gold',
    name: 'Midnight Gold',
    dotColor: '#D4AF37',
    bgClass: 'bg-gradient-to-br from-[#0c1630] via-[#101b3b] to-[#070d1e]',
    borderClass: 'border-2 border-amber-400/60 shadow-amber-500/10',
    titleColor: 'text-white',
    headerSub: 'text-amber-400',
    accentText: 'text-amber-300',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    photoBg: 'bg-slate-900 border-amber-400/40',
    textColor: 'text-slate-100',
    labelColor: 'text-slate-400',
    dividerColor: 'border-amber-500/30',
    footerText: 'text-amber-400/80',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Grace',
    dotColor: '#10B981',
    bgClass: 'bg-gradient-to-br from-[#062c20] via-[#0d3f2f] to-[#041912]',
    borderClass: 'border-2 border-emerald-400/60 shadow-emerald-500/10',
    titleColor: 'text-white',
    headerSub: 'text-emerald-400',
    accentText: 'text-emerald-300',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    photoBg: 'bg-emerald-950/80 border-emerald-400/40',
    textColor: 'text-slate-100',
    labelColor: 'text-emerald-200/70',
    dividerColor: 'border-emerald-500/30',
    footerText: 'text-emerald-400/80',
  },
  sapphire: {
    id: 'sapphire',
    name: 'Sapphire Royal',
    dotColor: '#38BDF8',
    bgClass: 'bg-gradient-to-br from-[#0a1c3f] via-[#112d61] to-[#06122b]',
    borderClass: 'border-2 border-sky-400/60 shadow-sky-500/10',
    titleColor: 'text-white',
    headerSub: 'text-sky-400',
    accentText: 'text-sky-300',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    photoBg: 'bg-slate-900 border-sky-400/40',
    textColor: 'text-slate-100',
    labelColor: 'text-sky-200/70',
    dividerColor: 'border-sky-500/30',
    footerText: 'text-sky-400/80',
  },
  burgundy: {
    id: 'burgundy',
    name: 'Burgundy Crimson',
    dotColor: '#F43F5E',
    bgClass: 'bg-gradient-to-br from-[#330c17] via-[#4a1223] to-[#1f060d]',
    borderClass: 'border-2 border-rose-400/60 shadow-rose-500/10',
    titleColor: 'text-white',
    headerSub: 'text-rose-400',
    accentText: 'text-rose-300',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    photoBg: 'bg-rose-950/80 border-rose-400/40',
    textColor: 'text-slate-100',
    labelColor: 'text-rose-200/70',
    dividerColor: 'border-rose-500/30',
    footerText: 'text-rose-400/80',
  },
  amethyst: {
    id: 'amethyst',
    name: 'Amethyst Regal',
    dotColor: '#C084FC',
    bgClass: 'bg-gradient-to-br from-[#230d36] via-[#351451] to-[#140620]',
    borderClass: 'border-2 border-purple-400/60 shadow-purple-500/10',
    titleColor: 'text-white',
    headerSub: 'text-purple-400',
    accentText: 'text-purple-300',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    photoBg: 'bg-purple-950/80 border-purple-400/40',
    textColor: 'text-slate-100',
    labelColor: 'text-purple-200/70',
    dividerColor: 'border-purple-500/30',
    footerText: 'text-purple-400/80',
  },
  ivory: {
    id: 'ivory',
    name: 'Putih Gading (Cetak Hemat)',
    dotColor: '#D97706',
    bgClass: 'bg-gradient-to-br from-[#fcfbf7] via-[#f7f4ea] to-[#eee8d9]',
    borderClass: 'border-2 border-amber-600/70 shadow-amber-900/10',
    titleColor: 'text-slate-950',
    headerSub: 'text-amber-800',
    accentText: 'text-amber-800',
    badgeClass: 'bg-amber-100 text-amber-950 border-amber-400 font-bold',
    photoBg: 'bg-amber-50 border-amber-600/40',
    textColor: 'text-slate-900',
    labelColor: 'text-slate-600',
    dividerColor: 'border-amber-600/30',
    footerText: 'text-amber-800',
    isLight: true,
  },
};

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  isOpen,
  onClose,
  member,
  onUpdatePhoto,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const downloadCardRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [activeThemeId, setActiveThemeId] = useState<CardColorThemeId>('chroma');
  const [printMode, setPrintMode] = useState<'card-only' | 'full'>('card-only');
  const [currentPhoto, setCurrentPhoto] = useState<string | undefined>(member?.photoUrl);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [downloadingCard, setDownloadingCard] = useState<boolean>(false);
  const [uploadSource, setUploadSource] = useState<string>('');
  const [uploadToast, setUploadToast] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPhoto(member?.photoUrl);
    setUploadToast(null);
    setUploadSource('');
  }, [member]);

  if (!isOpen || !member) return null;

  const age = calculateAge(member.birthDate);

  const handleDirectPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Silakan pilih file foto gambar (JPG, PNG, atau WEBP).');
      return;
    }

    setUploadingPhoto(true);
    setUploadToast('⏳ Sedang memproses dan menyimpan foto jemaat...');

    try {
      const uploadRes = await uploadMemberPhoto(file, member.id || member.memberNo);
      setCurrentPhoto(uploadRes.url);
      setUploadSource(uploadRes.source);

      if (onUpdatePhoto) {
        await onUpdatePhoto(member.id, uploadRes.url);
      }

      setUploadToast(
        uploadRes.source === 'device_queue'
          ? '🟡 Foto tersimpan pada perangkat dan kartu jemaat; sinkronisasi akan diulang saat online.'
          : uploadRes.source === 'cloud_server'
            ? '🟢 Foto jemaat berhasil disimpan di database dan siap dicetak pada kartu.'
            : '🟡 Foto terpasang pada data jemaat; pastikan data ikut tersimpan ke server.'
      );
      setTimeout(() => setUploadToast(null), 4500);
    } catch (err: any) {
      console.error('Error uploading member photo:', err);
      setUploadToast('❌ Gagal mengunggah foto: ' + (err?.message || 'Kesalahan jaringan.'));
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  // Auto theme by Rayon resolution
  const getResolvedTheme = (): ThemeDefinition => {
    if (activeThemeId === 'rayon_auto') {
      const rayonStr = (member.rayonName || member.rayonId || '').toLowerCase();
      if (rayonStr.includes('rayon 1') || rayonStr.includes('rayon i -') || rayonStr.includes('betlehem')) {
        return THEMES.gold;
      } else if (rayonStr.includes('rayon 2') || rayonStr.includes('rayon ii') || rayonStr.includes('nazaret')) {
        return THEMES.emerald;
      } else if (rayonStr.includes('rayon 3') || rayonStr.includes('rayon iii') || rayonStr.includes('yerusalem')) {
        return THEMES.sapphire;
      } else if (rayonStr.includes('rayon 4') || rayonStr.includes('rayon iv') || rayonStr.includes('galilea')) {
        return THEMES.burgundy;
      }
      return THEMES.gold;
    }
    return THEMES[activeThemeId] || THEMES.chroma;
  };

  const currentTheme = getResolvedTheme();

  const handleDownloadCard = async () => {
    if (!downloadCardRef.current) return;
    setDownloadingCard(true);
    setUploadToast(null);
    try {
      const element = downloadCardRef.current;
      await Promise.all(Array.from(element.querySelectorAll('img')).map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        });
      }));
      const { toPng } = await import('html-to-image');
      const bounds = element.getBoundingClientRect();
      const dataUrl = await toPng(element, {
        pixelRatio: 4,
        width: bounds.width,
        height: bounds.height,
        cacheBust: false,
        skipFonts: true,
        style: {
          position: 'static',
          left: '0',
          top: '0',
          margin: '0',
          transform: 'none',
          animation: 'none',
        },
      });
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = `Kartu-KTP-${member.fullName.replace(/[^A-Za-z0-9]+/g, '-')}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setUploadToast('✅ Kartu ID-1 berhasil diunduh sebagai PNG. Foto dan tema yang dipilih sudah disertakan.');
    } catch (error: any) {
      setUploadToast(`❌ ${error?.message || 'Kartu gagal diunduh. Coba gunakan tombol Cetak Kartu.'}`);
    } finally {
      setDownloadingCard(false);
    }
  };

  const handlePrintCardOnly = () => {
    setPrintMode('card-only');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const handlePrintFull = () => {
    setPrintMode('full');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  return (
    <div className={`member-detail-modal ${printMode === 'card-only' ? 'member-card-print-mode' : ''} fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm print:p-0 print:bg-white print:static print:block`}>
      {printMode === 'card-only' && (
        <style>{`
          @media print {
            @page { size: 85.6mm 53.98mm; margin: 0; }
            .printable-member-id-card {
              position: static !important;
              left: auto !important;
              top: auto !important;
              width: 85.6mm !important;
              height: 53.98mm !important;
              margin: 0 !important;
              overflow: hidden !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}</style>
      )}
      <div className="w-full max-w-2xl bg-[#0b1226] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:bg-transparent print:rounded-none">
        {/* Header - Hidden on print */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-5 border-b border-amber-500/20 bg-[#070b18] print:hidden">
          <div className="flex items-center gap-2.5">
            <IdCard className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Profil & Kartu Anggota Jemaat
              </h3>
              <p className="text-xs text-slate-400">
                {member.memberNo} · GMIT Betel Fuimelang
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button
              onClick={handleDownloadCard}
              disabled={downloadingCard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
              title="Unduh kartu ID-1 sebagai PNG"
            >
              <Download className={`w-3.5 h-3.5 ${downloadingCard ? 'animate-bounce' : ''}`} />
              <span>{downloadingCard ? 'Membuat…' : 'Unduh Kartu'}</span>
            </button>
            <button
              onClick={handlePrintCardOnly}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
              title="Cetak kartu ID-1 berukuran 85,60 × 53,98 mm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kartu</span>
            </button>
            <button
              onClick={handlePrintFull}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Cetak kartu beserta seluruh lembar biodata lengkap"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Cetak Biodata</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 print:p-0 print:space-y-4">
          {/* Color Variation Palette Selector - Hidden on print */}
          <div className="p-3 bg-[#070b18] border border-amber-500/20 rounded-xl space-y-2 print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Palette className="w-4 h-4 text-amber-400" />
                <span>Pilih Variasi Warna Kartu Anggota (Siap Cetak):</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Tema Aktif: <strong className="text-amber-400">{currentTheme.name}</strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {Object.values(THEMES).map((theme) => {
                const isSelected = activeThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setActiveThemeId(theme.id)}
                    type="button"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold ring-2 ring-amber-300 shadow-md'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/40 shadow-sm"
                      style={{ backgroundColor: theme.dotColor }}
                    />
                    <span>{theme.name}</span>
                    {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}

              {/* Auto Rayon theme option */}
              <button
                type="button"
                onClick={() => setActiveThemeId('rayon_auto')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeThemeId === 'rayon_auto'
                    ? 'bg-amber-500 text-slate-950 font-bold ring-2 ring-amber-300 shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                <span>🗂️ Sesuai Rayon (I-IV)</span>
                {activeThemeId === 'rayon_auto' && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            </div>
          </div>

          {/* Upload Status Banner */}
          {uploadToast && (
            <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between print:hidden">
              <span>{uploadToast}</span>
              <button
                type="button"
                onClick={() => setUploadToast(null)}
                className="text-slate-400 hover:text-white ml-2 text-sm"
              >
                ✕
              </button>
            </div>
          )}

          {/* Digital Member Card Visual (Printable ID Card with chosen theme) */}
          <div
            ref={cardRef}
            className={`chromatic-member-card ${currentTheme.isLight ? 'chromatic-card--light' : ''} p-6 rounded-2xl ${currentTheme.bgClass} ${currentTheme.borderClass} shadow-2xl relative overflow-hidden print:m-0 print:shadow-none print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact] transition-all duration-300 ${printMode === 'card-only' ? 'print:hidden' : ''}`}
          >
            <div className="chromatic-card-spectrum" />
            <div className="chromatic-card-microtext">GMIT BETEL FUIMELANG · SOLI DEO GLORIA · KARTU ANGGOTA RESMI · AURORA CHROMA</div>

            {/* Watermark Crest */}
            <div className="absolute right-4 -bottom-6 opacity-10 pointer-events-none w-48 h-48">
              <img
                src="/images/regenerated_image_1792510154483.png"
                alt="GMIT"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Top Card Bar */}
            <div className={`relative z-10 flex flex-wrap items-center justify-between gap-3 border-b ${currentTheme.dividerColor} pb-3 mb-4`}>
              <div className="flex items-center gap-3">
                <img
                  src="/images/regenerated_image_1792510154483.png"
                  alt="Cap resmi GMIT Betel Fuimelang"
                  className="chromatic-logo-frame w-10 h-10 rounded-full border border-amber-400/60 object-contain bg-white p-0.5 shadow-sm shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className={`text-[10px] font-bold tracking-wider ${currentTheme.headerSub} uppercase`}>
                    Gereja Masehi Injili di Timor
                  </div>
                  <div className={`chromatic-foil-text text-sm font-extrabold tracking-wide ${currentTheme.titleColor}`}>
                    GMIT BETEL FUIMELANG
                  </div>
                  <div className={`text-[9px] ${currentTheme.labelColor}`}>
                    Klasis Alor Tengah Utara · Nusa Tenggara Timur
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right shrink-0">
                <div className="chromatic-holo-seal" aria-label="Segel hologram GMIT"><span>GMIT</span></div>
                <div>
                  <span className={`chromatic-card-badge inline-block px-2 py-0.5 rounded text-[10px] font-bold ${currentTheme.badgeClass}`}>
                    KARTU JEMAAT
                  </span>
                  <div className={`text-[10px] font-mono mt-1 ${currentTheme.labelColor}`}>
                    {member.memberNo}
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Card Details */}
            <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start">
              {/* Photo box & Upload Control */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  className={`chromatic-photo-frame w-28 h-36 rounded-xl ${currentTheme.photoBg} border-2 overflow-hidden flex flex-col items-center justify-center relative shadow-inner group`}
                >
                  {(currentPhoto || member.photoUrl) ? (
                    <img
                      src={currentPhoto || member.photoUrl}
                      alt={member.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <User className={`w-10 h-10 mx-auto mb-1.5 ${currentTheme.isLight ? 'text-slate-500' : 'text-amber-400 opacity-70'}`} />
                      <span className={`text-[10px] font-bold block ${currentTheme.labelColor}`}>PAS FOTO</span>
                      <span className={`text-[8px] ${currentTheme.labelColor}`}>3x4 Resmi</span>
                    </div>
                  )}

                  {/* Hover Overlay Button on Web (print:hidden) */}
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[10px] font-medium print:hidden cursor-pointer"
                    title="Klik untuk memilih foto baru dari perangkat"
                  >
                    <Camera className="w-5 h-5 text-amber-400" />
                    <span>Ganti Foto</span>
                  </button>
                </div>

                {/* Upload action button & badge (Hidden on print) */}
                <div className="flex flex-col items-center gap-1 print:hidden">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDirectPhotoChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <span className="flex items-center gap-1 animate-pulse">
                        <Upload className="w-3 h-3 animate-spin" />
                        <span>Mengunggah...</span>
                      </span>
                    ) : (
                      <>
                        <Camera className="w-3 h-3" />
                        <span>{currentPhoto || member.photoUrl ? 'Ganti Foto' : 'Unggah Foto'}</span>
                      </>
                    )}
                  </button>

                  {(currentPhoto || member.photoUrl) && (
                    <span className="text-[9px] text-emerald-400 flex items-center gap-0.5 font-medium">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Foto Siap Dicetak</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Data Grid */}
              <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="col-span-2">
                  <span className={`text-[10px] block ${currentTheme.labelColor}`}>
                    Nama Anggota Jemaat:
                  </span>
                  <span className={`chromatic-foil-text text-base font-bold tracking-wide ${currentTheme.titleColor}`}>
                    {member.fullName}
                  </span>
                </div>

                <div>
                  <span className={`text-[10px] block ${currentTheme.labelColor}`}>
                    Tempat, Tgl Lahir:
                  </span>
                  <span className={`font-medium ${currentTheme.textColor}`}>
                    {member.birthPlace}, {formatDateDMY(member.birthDate)} ({age} thn)
                  </span>
                </div>

                <div>
                  <span className={`text-[10px] block ${currentTheme.labelColor}`}>
                    Jenis Kelamin:
                  </span>
                  <span className={`font-medium ${currentTheme.textColor}`}>
                    {member.gender}
                  </span>
                </div>

                <div>
                  <span className={`text-[10px] block ${currentTheme.labelColor}`}>
                    Wilayah Pelayanan:
                  </span>
                  <span className={`font-bold ${currentTheme.accentText}`}>
                    {member.rayonName || member.rayonId}
                  </span>
                </div>

                <div>
                  <span className={`text-[10px] block ${currentTheme.labelColor}`}>
                    Kelompok Kategorial:
                  </span>
                  <span className={`font-medium ${currentTheme.textColor}`}>
                    {member.categorialGroupName || member.categorialGroupId}
                  </span>
                </div>

                <div>
                  <span className={`text-[10px] block ${currentTheme.labelColor}`}>
                    Status Sakramen:
                  </span>
                  <span className={`font-medium ${currentTheme.isLight ? 'text-blue-900 font-semibold' : 'text-cyan-300'}`}>
                    Baptis: {member.baptismStatus} · Sidi: {member.confirmationStatus}
                  </span>
                </div>

                <div>
                  <span className={`text-[10px] block ${currentTheme.labelColor}`}>
                    Hubungan Keluarga:
                  </span>
                  <span className={`font-medium ${currentTheme.textColor}`}>
                    {member.familyRole}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Card Footer */}
            <div className={`relative z-10 mt-4 pt-3 border-t ${currentTheme.dividerColor} flex items-center justify-between text-[10px]`}>
              <div className={currentTheme.labelColor}>
                <span>Alamat: {member.address}, Fuimelang</span>
              </div>
              <div className={`text-right font-mono text-[9px] font-semibold ${currentTheme.footerText}`}>
                TERDAFTAR SEJAK: {formatDateDMY(member.joinDate)}
              </div>
            </div>
          </div>

          {/* Exact ID-1 card used for PNG download and card-only printing. */}
          <div
            ref={downloadCardRef}
            aria-hidden="true"
            className={`printable-member-id-card chromatic-member-card ${currentTheme.isLight ? 'chromatic-card--light' : ''} ${currentTheme.bgClass} ${currentTheme.borderClass} rounded-[2mm] relative overflow-hidden ${printMode === 'card-only' ? 'print:block' : 'print:hidden'}`}
            style={{
              position: 'fixed', left: '-10000px', top: 0,
              width: '85.6mm', height: '53.98mm', padding: '2.5mm',
              boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            <div className="chromatic-card-spectrum" />
            <div className="chromatic-card-microtext">GMIT BETEL FUIMELANG · SOLI DEO GLORIA · KARTU ANGGOTA RESMI · AURORA CHROMA</div>
            <div className="absolute right-0 bottom-0 w-[28mm] h-[28mm] opacity-10 pointer-events-none">
              <img src="/images/regenerated_image_1792510154483.png" alt="" className="w-full h-full object-contain" />
            </div>
            <div className={`flex items-center justify-between border-b ${currentTheme.dividerColor} pb-[1.2mm] mb-[1.5mm] relative z-10`}>
              <div className="flex items-center gap-[1.5mm] min-w-0">
                <img src="/images/regenerated_image_1792510154483.png" alt="" className="chromatic-logo-frame w-[8mm] h-[8mm] rounded-full object-contain bg-white p-[0.25mm] shrink-0" />
                <div className="min-w-0">
                  <div className={`text-[5pt] font-bold uppercase ${currentTheme.headerSub}`}>Gereja Masehi Injili di Timor</div>
                  <div className={`chromatic-foil-text text-[7pt] font-extrabold leading-tight ${currentTheme.titleColor}`}>GMIT BETEL FUIMELANG</div>
                  <div className={`text-[4.5pt] ${currentTheme.labelColor}`}>Klasis Alor Tengah Utara</div>
                </div>
              </div>
              <div className="flex items-center gap-[1mm] text-right shrink-0">
                <div className="chromatic-holo-seal"><span>GMIT</span></div>
                <div>
                  <div className={`chromatic-card-badge rounded-[0.8mm] px-[1mm] py-[0.2mm] text-[4.5pt] font-bold ${currentTheme.accentText}`}>KARTU JEMAAT</div>
                  <div className={`text-[4.5pt] font-mono mt-[0.4mm] ${currentTheme.labelColor}`}>{member.memberNo}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-[2.5mm] flex-1 min-h-0 relative z-10">
              <div className={`chromatic-photo-frame w-[16mm] h-[21mm] shrink-0 rounded-[1.5mm] border overflow-hidden flex items-center justify-center ${currentTheme.photoBg}`}>
                {(currentPhoto || member.photoUrl) ? <img src={currentPhoto || member.photoUrl} alt="" className="w-full h-full object-cover" /> : <User className={`w-[7mm] h-[7mm] ${currentTheme.labelColor}`} />}
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-[2mm] gap-y-[1mm] content-start text-[5.2pt]">
                <div className="col-span-2 mb-[0.5mm]"><div className={`text-[4.5pt] ${currentTheme.labelColor}`}>NAMA ANGGOTA JEMAAT</div><div className={`chromatic-foil-text text-[7.5pt] leading-tight font-extrabold ${currentTheme.titleColor}`}>{member.fullName}</div></div>
                <div className="col-span-2"><span className={currentTheme.labelColor}>Tempat/tgl lahir: </span><span className={`font-semibold ${currentTheme.textColor}`}>{member.birthPlace || '-'}, {formatDateDMY(member.birthDate)}</span></div>
                <div><span className={currentTheme.labelColor}>L/P: </span><span className={`font-semibold ${currentTheme.textColor}`}>{member.gender === 'Laki-laki' ? 'L' : member.gender === 'Perempuan' ? 'P' : '-'}</span></div>
                <div><span className={currentTheme.labelColor}>Rayon: </span><span className={`font-bold ${currentTheme.accentText}`}>{member.rayonName || member.rayonId || '-'}</span></div>
                <div className="col-span-2"><span className={currentTheme.labelColor}>Sakramen: </span><span className={`font-semibold ${currentTheme.textColor}`}>Baptis {member.baptismStatus} · Sidi {member.confirmationStatus}</span></div>
                <div className="col-span-2 truncate"><span className={currentTheme.labelColor}>Alamat: </span><span className={currentTheme.textColor}>{member.address || '-'}</span></div>
              </div>
            </div>
            <div className={`border-t ${currentTheme.dividerColor} pt-[1mm] mt-[1mm] flex justify-between text-[4.3pt] relative z-10`}><span className={currentTheme.labelColor}>Kartu identitas anggota · ID-1</span><span className={currentTheme.footerText}>Terdaftar: {formatDateDMY(member.joinDate)}</span></div>
          </div>

          {/* Full Detailed Breakdown */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs ${printMode === 'card-only' ? 'print:hidden' : 'print:grid print:mt-6 print:border-t-2 print:border-black print:pt-4 print:text-black'}`}>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 print:bg-white print:border-slate-400 print:text-black">
              <h4 className="font-bold text-amber-300 border-b border-slate-800 pb-1 print:text-black print:border-slate-300">
                Data Kependudukan & Kontak
              </h4>
              <div className="space-y-1.5 text-slate-300 print:text-black">
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">NIK:</span>
                  <span className="font-mono font-semibold text-amber-300 print:text-black">{member.nik || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">No Kartu Keluarga:</span>
                  <span className="font-mono">{member.familyCardNo || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Status Nikah:</span>
                  <span>{member.maritalStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Nama Pasangan:</span>
                  <span>{member.spouseName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Pendidikan:</span>
                  <span>{member.education || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Pekerjaan:</span>
                  <span>{member.occupation || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">No. Telepon / WA:</span>
                  <span className="font-mono">{member.phone || '-'}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 print:bg-white print:border-slate-400 print:text-black">
              <h4 className="font-bold text-amber-300 border-b border-slate-800 pb-1 print:text-black print:border-slate-300">
                Riwayat Sakramen & Catatan
              </h4>
              <div className="space-y-1.5 text-slate-300 print:text-black">
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Status Baptis:</span>
                  <span className="font-semibold text-cyan-300 print:text-black">
                    {member.baptismStatus} {member.baptismDate ? `(${formatDateDMY(member.baptismDate)})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Status Sidi:</span>
                  <span className="font-semibold text-amber-300 print:text-black">
                    {member.confirmationStatus} {member.confirmationDate ? `(${formatDateDMY(member.confirmationDate)})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Pernikahan Gereja:</span>
                  <span className="font-semibold text-emerald-300 print:text-black">
                    {member.marriageChurchStatus} {member.marriageDate ? `(${formatDateDMY(member.marriageDate)})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600">Status Keanggotaan:</span>
                  <span>{member.membershipStatus} ({member.status})</span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 print:border-slate-300">
                  <span className="text-slate-400 block text-[11px] mb-1 print:text-slate-600">Catatan Khusus:</span>
                  <p className="text-xs text-slate-300 italic bg-slate-950 p-2 rounded border border-slate-800 print:bg-slate-50 print:text-black print:border-slate-300">
                    {member.notes || 'Tidak ada catatan administrasi khusus.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#070b18] text-right print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
