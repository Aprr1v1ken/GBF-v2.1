import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  MessageCircle,
  Newspaper,
  Pin,
  Plus,
  Search,
  Share2,
  X,
} from 'lucide-react';
import type { Announcement, ChurchSettings, Rayon } from '../../types/index.ts';
import { DEFAULT_CHURCH_SETTINGS } from '../../utils/church-settings.ts';
import {
  formatSingleWartaWhatsApp,
  getWhatsAppShareUrl,
} from '../../utils/whatsapp-warta.ts';
import { formatDateDMY } from '../../utils/church-logic.ts';
import { BroadcastWartaModal } from '../BroadcastWartaModal.tsx';

interface WartaDigitalViewProps {
  announcements: Announcement[];
  churchSettings?: ChurchSettings;
  rayons?: Rayon[];
  onManageWarta?: () => void;
  canManage?: boolean;
}

const BOOKMARKS_STORAGE_KEY = 'sysjeger_warta_bookmarks';

function loadSavedBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export const WartaDigitalView: React.FC<WartaDigitalViewProps> = ({
  announcements,
  churchSettings = DEFAULT_CHURCH_SETTINGS,
  rayons = [],
  onManageWarta,
  canManage = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('Semua');
  const [sortOrder, setSortOrder] = useState<'priority' | 'latest'>('priority');
  const [bookmarks, setBookmarks] = useState<string[]>(loadSavedBookmarks);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeReaderItem, setActiveReaderItem] = useState<Announcement | null>(null);
  const [readerAudience, setReaderAudience] = useState<string>('Seluruh Warga Jemaat & Rayon I - IV');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTargetItem, setBroadcastTargetItem] = useState<Announcement | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {
      // Ignore storage quota errors in private mode
    }
  }, [bookmarks]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    announcements.forEach((a) => {
      if (a.category && a.category.trim()) {
        unique.add(a.category.trim());
      }
    });
    return Array.from(unique);
  }, [announcements]);

  const audienceChoices = useMemo(() => {
    const base = ['Seluruh Warga Jemaat & Rayon I - IV', 'Presbiter & Majelis Jemaat'];
    const rayonLabels = rayons.map((r) => `${r.name}${r.coverageArea ? ` (${r.coverageArea})` : ''}`);
    const categorialLabels = [
      'Pelayanan Anak & Remaja (PAR)',
      'Gerakan Pemuda GMIT (GP GMIT)',
      'Persekutuan Kaum Perempuan (PKP)',
      'Persekutuan Kaum Bapak (PKB)',
    ];
    return [...base, ...rayonLabels, ...categorialLabels];
  }, [rayons]);

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = announcements.filter((a) => {
      if (selectedFilter === 'Penting' && !a.isImportant) return false;
      if (selectedFilter === 'Tersimpan' && !bookmarks.includes(a.id)) return false;
      if (
        selectedFilter !== 'Semua' &&
        selectedFilter !== 'Penting' &&
        selectedFilter !== 'Tersimpan' &&
        a.category !== selectedFilter
      ) {
        return false;
      }

      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        (a.author || '').toLowerCase().includes(q) ||
        (a.category || '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortOrder === 'priority') {
        if (Boolean(a.isImportant) !== Boolean(b.isImportant)) {
          return a.isImportant ? -1 : 1;
        }
      }
      return (b.date || '').localeCompare(a.date || '');
    });
  }, [announcements, searchQuery, selectedFilter, bookmarks, sortOrder]);

  const importantCount = useMemo(
    () => announcements.filter((a) => Boolean(a.isImportant)).length,
    [announcements]
  );

  const toggleBookmark = (id: string) => {
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyWhatsAppText = async (item: Announcement, audience?: string) => {
    const text = formatSingleWartaWhatsApp(item, {
      churchSettings,
      targetAudience: audience,
    });
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedId(item.id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === item.id ? null : prev));
      }, 2200);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  const handleNativeShare = async (item: Announcement) => {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;
    const text = formatSingleWartaWhatsApp(item, { churchSettings });
    try {
      await navigator.share({
        title: `${item.title} — ${churchSettings.churchName}`,
        text,
      });
    } catch {
      // User dismissed share sheet
    }
  };

  const canUseNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="space-y-6">
      {/* Top Toolbar / Header Section */}
      <section className="rounded-2xl bg-[#0c1329] border border-slate-800 p-5 md:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Newspaper className="w-5 h-5 text-amber-400 shrink-0" />
              <span>Warta Digital Jemaat</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Baca warta pelayanan dalam kartu interaktif dan bagikan langsung ke grup WhatsApp jemaat maupun rayon.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {canManage && onManageWarta && (
              <button
                type="button"
                onClick={onManageWarta}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Kelola & Terbitkan</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setBroadcastTargetItem(null);
                setShowBroadcastModal(true);
              }}
              disabled={announcements.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Share2 className="w-4 h-4" />
              <span>Bagikan Edisi Mingguan (WA)</span>
            </button>
          </div>
        </div>

        {/* Summary Metrics Strip (Unboxed tabular figures separated by subtle hairline dividers) */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
          <div>
            <div className="text-xs text-slate-400">Total Warta Aktif</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              {announcements.length}
            </div>
          </div>
          <div className="border-l border-slate-800/80 pl-4">
            <div className="text-xs text-slate-400">Warta Utama / Disematkan</div>
            <div className="text-lg font-bold text-amber-300 font-mono tabular-nums mt-0.5">
              {importantCount}
            </div>
          </div>
          <div className="border-l border-slate-800/80 pl-4">
            <div className="text-xs text-slate-400">Tersimpan di Perangkat</div>
            <div className="text-lg font-bold text-emerald-300 font-mono tabular-nums mt-0.5">
              {bookmarks.filter((id) => announcements.some((a) => a.id === id)).length}
            </div>
          </div>
        </div>

        {/* Search + Segmented Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul warta, isi berita, atau penulis..."
              className="w-full pl-9 pr-8 py-2 bg-[#060b19] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                aria-label="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#060b19] border border-slate-800 overflow-x-auto max-w-full">
              {['Semua', 'Penting', 'Tersimpan', ...categories].map((filterKey) => {
                const isActive = selectedFilter === filterKey;
                return (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setSelectedFilter(filterKey)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    {filterKey}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'priority' ? 'latest' : 'priority'))}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[#060b19] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Ubah urutan kartu warta"
            >
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>{sortOrder === 'priority' ? 'Urutan: Utama' : 'Urutan: Terbaru'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Cards Grid or Empty States */}
      {announcements.length === 0 ? (
        <section className="rounded-2xl bg-[#0c1329] border border-dashed border-slate-700 p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-amber-400/50 mx-auto" />
          <h3 className="text-base font-bold text-white">Belum Ada Warta Digital yang Diterbitkan</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Saat warta jemaat ditambahkan melalui menu Warta Jemaat atau Asisten AI Berita, seluruh kartu warta interaktif akan tampil di sini dan siap dibagikan ke WhatsApp.
          </p>
          {canManage && onManageWarta && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onManageWarta}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Terbitkan Warta Pertama</span>
              </button>
            </div>
          )}
        </section>
      ) : filteredAnnouncements.length === 0 ? (
        <section className="rounded-2xl bg-[#0c1329] border border-slate-800 p-10 text-center space-y-3">
          <Search className="w-9 h-9 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Tidak Ada Warta yang Cocok</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Coba ubah kata kunci pencarian atau pilih kategori filter lainnya.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedFilter('Semua');
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
            >
              Tampilkan Semua Warta
            </button>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredAnnouncements.map((item) => {
            const isBookmarked = bookmarks.includes(item.id);
            const directWaUrl = getWhatsAppShareUrl(
              formatSingleWartaWhatsApp(item, { churchSettings })
            );
            const displayDate = item.date ? formatDateDMY(item.date) : '-';

            return (
              <article
                key={item.id}
                className={`rounded-2xl bg-[#0c1329] border transition-colors duration-150 flex flex-col justify-between overflow-hidden ${
                  item.isImportant
                    ? 'border-amber-500/45 hover:border-amber-400/70'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Media Banner or Clean Domain Fallback Header */}
                <div
                  onClick={() => setActiveReaderItem(item)}
                  className="cursor-pointer group"
                >
                  {item.imageUrl && !failedImageIds[item.id] ? (
                    <div className="relative h-44 w-full bg-slate-950 overflow-hidden border-b border-slate-800">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        onError={() => setFailedImageIds((prev) => ({ ...prev, [item.id]: true }))}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      {item.isImportant && (
                        <div className="absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-black/70 px-2.5 py-1 rounded-md">
                          <Pin className="w-3 h-3" />
                          <span>Warta Utama</span>
                        </div>
                      )}
                    </div>
                  ) : item.imageUrl ? (
                    <div className="h-28 w-full bg-gradient-to-br from-slate-900 via-[#0e1936] to-slate-950 border-b border-slate-800 flex items-center justify-center gap-2 px-4 text-xs text-slate-400">
                      <Newspaper className="w-4 h-4 text-amber-400/70 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </div>
                  ) : null}

                  <div className="p-5 space-y-2.5">
                    {/* Unboxed Clean Metadata Row */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        {item.isImportant && !item.imageUrl && (
                          <>
                            <span className="inline-flex items-center gap-1 text-amber-300 font-semibold shrink-0">
                              <Pin className="w-3 h-3" />
                              <span>Utama</span>
                            </span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span className="text-amber-300/90 font-medium truncate">
                          {item.category || 'Warta Ibadah'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums shrink-0">{displayDate}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(item.id);
                        }}
                        className={`p-1.5 rounded-md transition-colors shrink-0 cursor-pointer ${
                          isBookmarked
                            ? 'text-amber-300 bg-amber-500/15'
                            : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                        title={isBookmarked ? 'Hapus dari tersimpan' : 'Simpan warta'}
                        aria-label={isBookmarked ? 'Hapus simpanan warta' : 'Simpan warta'}
                      >
                        {isBookmarked ? (
                          <BookmarkCheck className="w-4 h-4" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-white leading-snug group-hover:text-amber-200 transition-colors">
                      {item.title}
                    </h3>

                    {/* Body Preview */}
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line line-clamp-4">
                      {item.content}
                    </p>
                  </div>
                </div>

                {/* Footer Author + Interactive Share Actions */}
                <div className="px-5 py-3.5 border-t border-slate-800/80 bg-[#090f22] space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">
                      Oleh <strong className="text-slate-200 font-medium">{item.author || 'Majelis Jemaat'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveReaderItem(item)}
                      className="text-amber-300 hover:text-amber-200 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Baca Lengkap →
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={directWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap shrink-0"
                      title="Langsung bagikan warta ini ke WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Share WhatsApp</span>
                      <ExternalLink className="w-3 h-3 opacity-75" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyWhatsAppText(item)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        copiedId === item.id
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                      title="Salin format pesan WhatsApp"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastTargetItem(item);
                        setShowBroadcastModal(true);
                      }}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                      title="Atur target rayon / edit teks sebelum kirim ke WhatsApp"
                      aria-label="Kustomisasi broadcast WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Interactive Full Reader Modal */}
      {activeReaderItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={() => setActiveReaderItem(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-[#0b1226] border border-slate-700 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0 truncate">
                <span className="text-amber-300 font-semibold truncate">
                  {activeReaderItem.category || 'Warta Ibadah'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums shrink-0">
                  {activeReaderItem.date ? formatDateDMY(activeReaderItem.date) : '-'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{activeReaderItem.author || 'Majelis Jemaat'}</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveReaderItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
                aria-label="Tutup pratinjau warta"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {activeReaderItem.imageUrl && !failedImageIds[activeReaderItem.id] && (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-72">
                  <img
                    src={activeReaderItem.imageUrl}
                    alt={activeReaderItem.title}
                    onError={() =>
                      setFailedImageIds((prev) => ({ ...prev, [activeReaderItem.id]: true }))
                    }
                    className="w-full h-full max-h-72 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="space-y-3">
                {activeReaderItem.isImportant && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <Pin className="w-3.5 h-3.5" />
                    <span>Warta Utama Jemaat</span>
                  </div>
                )}

                <h3 className="text-xl font-bold text-white leading-snug">
                  {activeReaderItem.title}
                </h3>

                <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                  {activeReaderItem.content}
                </div>
              </div>

              {/* Audience Selector for Targeted WhatsApp Share */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Sasaran Grup / Rayon saat Dibagikan ke WhatsApp
                </label>
                <select
                  value={readerAudience}
                  onChange={(e) => setReaderAudience(e.target.value)}
                  className="w-full px-3 py-2 bg-[#060b19] border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-emerald-400"
                >
                  {audienceChoices.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer Share Actions */}
            <div className="px-5 py-4 border-t border-slate-800 bg-[#060b19] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleBookmark(activeReaderItem.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
                >
                  {bookmarks.includes(activeReaderItem.id) ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tersimpan</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Simpan</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyWhatsAppText(activeReaderItem, readerAudience)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
                >
                  {copiedId === activeReaderItem.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Teks WA</span>
                    </>
                  )}
                </button>

                {canUseNativeShare && (
                  <button
                    type="button"
                    onClick={() => handleNativeShare(activeReaderItem)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Bagikan</span>
                  </button>
                )}
              </div>

              <a
                href={getWhatsAppShareUrl(
                  formatSingleWartaWhatsApp(activeReaderItem, {
                    churchSettings,
                    targetAudience: readerAudience,
                  })
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Kirim ke WhatsApp Sekarang</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Full Broadcast Modal */}
      <BroadcastWartaModal
        isOpen={showBroadcastModal}
        onClose={() => {
          setShowBroadcastModal(false);
          setBroadcastTargetItem(null);
        }}
        announcements={announcements}
        initialAnnouncement={broadcastTargetItem}
        churchSettings={churchSettings}
        rayons={rayons}
      />
    </div>
  );
};
