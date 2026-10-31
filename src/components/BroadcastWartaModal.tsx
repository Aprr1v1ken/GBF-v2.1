import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  Users,
  Calendar,
  Share2,
  RefreshCw,
  Phone,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import type { Announcement, ChurchSettings, Rayon } from '../types/index.ts';
import { DEFAULT_CHURCH_SETTINGS } from '../utils/church-settings.ts';
import {
  formatSingleWartaWhatsApp,
  formatWeeklyWartaWhatsApp,
  getWhatsAppShareUrl,
  cleanPhoneNumber,
} from '../utils/whatsapp-warta.ts';

interface BroadcastWartaModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: Announcement[];
  initialAnnouncement?: Announcement | null;
  churchSettings?: ChurchSettings;
  rayons?: Rayon[];
}

export const BroadcastWartaModal: React.FC<BroadcastWartaModalProps> = ({
  isOpen,
  onClose,
  announcements,
  initialAnnouncement = null,
  churchSettings = DEFAULT_CHURCH_SETTINGS,
  rayons = [],
}) => {
  if (!isOpen) return null;

  // Mode: 'single' | 'summary' | 'custom_selection'
  const [mode, setMode] = useState<'single' | 'summary' | 'custom_selection'>(
    initialAnnouncement ? 'single' : 'summary'
  );

  // Selected announcement for single mode
  const [selectedSingleId, setSelectedSingleId] = useState<string>(
    initialAnnouncement?.id || announcements[0]?.id || ''
  );

  // Selected items for custom selection mode (all selected by default)
  const [selectedIds, setSelectedIds] = useState<string[]>(
    announcements.map((a) => a.id)
  );

  // Target audience / Rayon
  const [targetAudience, setTargetAudience] = useState<string>(
    'Seluruh Warga Jemaat & Rayon I - IV'
  );

  // Edition / date
  const [editionDate, setEditionDate] = useState<string>(() => {
    const today = new Date();
    // Default to coming Sunday or today
    const day = today.getDay();
    const diff = today.getDate() + (day === 0 ? 0 : 7 - day);
    const sunday = new Date(today.setDate(diff));
    return sunday.toISOString().substring(0, 10);
  });

  // Optional target phone number (e.g. rayon coordinator or group admin)
  const [targetPhone, setTargetPhone] = useState<string>('');

  // Editable generated message text
  const [messageText, setMessageText] = useState<string>('');
  const [isCustomEdited, setIsCustomEdited] = useState(false);

  // Copy status
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compute base text whenever filters change (unless user manually typed custom edits)
  const generatedText = useMemo(() => {
    if (mode === 'single') {
      const target = announcements.find((a) => a.id === selectedSingleId);
      if (!target) return '';
      return formatSingleWartaWhatsApp(target, {
        churchSettings,
        targetAudience,
        editionDate,
      });
    }

    let itemsToInclude = announcements;
    if (mode === 'custom_selection') {
      itemsToInclude = announcements.filter((a) => selectedIds.includes(a.id));
    }

    return formatWeeklyWartaWhatsApp(itemsToInclude, {
      churchSettings,
      targetAudience,
      editionDate,
    });
  }, [
    mode,
    selectedSingleId,
    selectedIds,
    targetAudience,
    editionDate,
    announcements,
    churchSettings,
  ]);

  // Sync generated text to messageText if not custom edited
  useEffect(() => {
    if (!isCustomEdited) {
      setMessageText(generatedText);
    }
  }, [generatedText, isCustomEdited]);

  // When initialAnnouncement prop changes
  useEffect(() => {
    if (initialAnnouncement) {
      setMode('single');
      setSelectedSingleId(initialAnnouncement.id);
      setIsCustomEdited(false);
    }
  }, [initialAnnouncement]);

  const handleResetToAuto = () => {
    setIsCustomEdited(false);
    setMessageText(generatedText);
    setToastMessage('Format pesan diatur ulang sesuai data warta terkini.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleSelectId = (id: string) => {
    setIsCustomEdited(false);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setIsCustomEdited(false);
    setSelectedIds(announcements.map((a) => a.id));
  };

  const handleDeselectAll = () => {
    setIsCustomEdited(false);
    setSelectedIds([]);
  };

  const handleCopyText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(messageText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = messageText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setToastMessage('Format teks WhatsApp berhasil disalin ke clipboard! Siap dipaste ke grup jemaat.');
      setTimeout(() => {
        setCopied(false);
        setToastMessage(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to copy', err);
      setToastMessage('Gagal menyalin otomatis, silakan seleksi dan salin teks pada kotak.');
    }
  };

  const whatsappUrl = useMemo(() => {
    return getWhatsAppShareUrl(messageText, targetPhone);
  }, [messageText, targetPhone]);

  const handleSendWhatsApp = () => {
    if (!messageText.trim()) return;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const audienceOptions = [
    'Seluruh Warga Jemaat & Rayon I - IV',
    'Presbiter & Majelis Jemaat',
    'Rayon I (Lembur Tengah & Sekitarnya)',
    'Rayon II (Fuimelang & Sekitarnya)',
    'Rayon III (Kelimutu & Wilayah III)',
    'Rayon IV (Wilayah IV)',
    'Gerakan Pemuda GMIT (GP GMIT)',
    'Pelayanan Anak & Remaja (PAR)',
    'Persekutuan Kaum Perempuan (PKP)',
    'Persekutuan Kaum Bapak (PKB)',
    'Persekutuan Usia Indah (Lansia)',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#0b1226] border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/80 via-[#0c182c] to-[#0c1329] border-b border-emerald-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                  <span>Broadcast Warta Jemaat ke WhatsApp</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  WA Broadcast Generator
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Format otomatis pesan warta rapi dengan teks tebal, emotikon, dan tautan kirim langsung ke grup jemaat
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-400 hover:text-white text-xs px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Controls Bar: Mode & Target */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
            {/* Broadcast Mode */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                <span>Format Siaran:</span>
              </label>
              <select
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as any);
                  setIsCustomEdited(false);
                }}
                className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-400 font-semibold cursor-pointer"
              >
                <option value="summary">Rangkuman Semua Warta (Warta Mingguan)</option>
                <option value="custom_selection">Pilih Beberapa Warta Tertentu</option>
                <option value="single">Satu Warta Spesifik</option>
              </select>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tujuan / Sasaran Grup:</span>
              </label>
              <select
                value={targetAudience}
                onChange={(e) => {
                  setTargetAudience(e.target.value);
                  setIsCustomEdited(false);
                }}
                className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-400 font-semibold cursor-pointer"
              >
                {audienceOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Edition Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tanggal Warta / Ibadah:</span>
              </label>
              <input
                type="date"
                value={editionDate}
                onChange={(e) => {
                  setEditionDate(e.target.value);
                  setIsCustomEdited(false);
                }}
                className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Conditional selector: If Single Mode */}
          {mode === 'single' && (
            <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
              <label className="block text-[11px] font-bold text-amber-300">
                Pilih Judul Warta yang Ingin Dibroadcast:
              </label>
              <select
                value={selectedSingleId}
                onChange={(e) => {
                  setSelectedSingleId(e.target.value);
                  setIsCustomEdited(false);
                }}
                className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-400 font-semibold"
              >
                {announcements.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.category}] {a.title} ({a.date})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Conditional selector: If Custom Selection Mode */}
          {mode === 'custom_selection' && (
            <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300">
                  Pilih Warta yang Disertakan ({selectedIds.length} dari {announcements.length}):
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Hapus Pilihan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {announcements.map((a) => {
                  const isChecked = selectedIds.includes(a.id);
                  return (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => handleToggleSelectId(a.id)}
                      className={`text-left p-2.5 rounded-xl border flex items-start gap-2.5 transition cursor-pointer text-xs ${
                        isChecked
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                          : 'bg-[#050811] border-slate-800 text-slate-400 opacity-60'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{a.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {a.category} · {a.date}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Direct Phone Number (or blank for general group sharing) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-200">Kirim ke Nomor Tertentu (Opsional)</span>
                <p className="text-[11px] text-slate-400">
                  Kosongkan bila ingin memilih grup WhatsApp secara bebas dari daftar obrolan Anda.
                </p>
              </div>
            </div>
            <div className="w-full sm:w-60">
              <input
                type="text"
                placeholder="Contoh: 082144556677"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-400 font-mono"
              />
            </div>
          </div>

          {/* WhatsApp Message Preview & Live Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Pratinjau Teks WhatsApp (Dapat Diedit Langsung)</span>
                </span>
                {isCustomEdited && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Kustomisasi Aktif
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isCustomEdited && (
                  <button
                    type="button"
                    onClick={handleResetToAuto}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset Format</span>
                  </button>
                )}
                <span className="text-[11px] text-slate-400 font-mono">
                  {messageText.length} karakter
                </span>
              </div>
            </div>

            {/* WhatsApp Bubble Style Preview / Editor */}
            <div className="relative rounded-2xl bg-[#071318] border-2 border-emerald-500/30 shadow-inner overflow-hidden">
              <div className="px-4 py-2 bg-[#0a1e24] border-b border-emerald-500/20 flex items-center justify-between text-[11px] text-emerald-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Format Pesan Siap Kirim
                </span>
                <span className="text-slate-400 text-[10px]">
                  *teks tebal*, _miring_, emotikon didukung
                </span>
              </div>

              <textarea
                rows={12}
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  setIsCustomEdited(true);
                }}
                className="w-full p-4 bg-transparent text-emerald-50 font-mono text-xs leading-relaxed outline-none resize-y border-none focus:ring-0 selection:bg-emerald-600/30"
                placeholder="Teks format WhatsApp akan muncul di sini..."
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Klik "Buka WhatsApp" untuk langsung mengarah ke aplikasi atau web WhatsApp.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopyText}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Salin Pesan'}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setToastMessage('Membuka WhatsApp API untuk mengirim warta...');
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Buka WhatsApp & Kirim</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
