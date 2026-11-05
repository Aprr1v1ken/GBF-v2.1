import React, { useState, useMemo, useEffect } from 'react';
import {
  Bell,
  Cake,
  Heart,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Calendar,
  Sparkles,
  MapPin,
  Phone,
  User,
  PartyPopper,
  Filter,
  Check,
  RotateCcw,
} from 'lucide-react';
import type { Member } from '../types/index.ts';
import {
  getAllUpcomingCelebrations,
  type CelebrationItem,
  type UpcomingBirthdayItem,
  type UpcomingAnniversaryItem,
} from '../utils/celebrations.ts';

interface NotificationCenterProps {
  members: Member[];
  onOpenMemberDetail?: (member: Member) => void;
  className?: string;
  defaultExpanded?: boolean;
}

const STORAGE_KEY = 'sysjeger_celebrations_contacted';

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  members,
  onOpenMemberDetail,
  className = '',
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeFilter, setActiveFilter] = useState<'all' | 'birthday' | 'anniversary' | 'today'>('all');
  const [contactedIds, setContactedIds] = useState<Record<string, boolean>>({});

  // Load contacted status from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setContactedIds(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load contacted celebrations state', e);
    }
  }, []);

  const toggleContacted = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setContactedIds((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save contacted state', err);
      }
      return updated;
    });
  };

  // Query celebrations in the next 7 days
  const upcoming7Days = useMemo(() => {
    return getAllUpcomingCelebrations(members, 7);
  }, [members]);

  const todayCount = useMemo(() => {
    return upcoming7Days.filter((item) => item.isToday).length;
  }, [upcoming7Days]);

  const birthdayCount = useMemo(() => {
    return upcoming7Days.filter((item) => item.type === 'birthday').length;
  }, [upcoming7Days]);

  const anniversaryCount = useMemo(() => {
    return upcoming7Days.filter((item) => item.type === 'anniversary').length;
  }, [upcoming7Days]);

  const filteredItems = useMemo(() => {
    return upcoming7Days.filter((item) => {
      if (activeFilter === 'birthday') return item.type === 'birthday';
      if (activeFilter === 'anniversary') return item.type === 'anniversary';
      if (activeFilter === 'today') return item.isToday;
      return true;
    });
  }, [upcoming7Days, activeFilter]);

  if (upcoming7Days.length === 0) {
    return (
      <div className={`p-4 rounded-2xl bg-[#0c1329] border border-slate-800 shadow-sm ${className}`}>
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800/80 text-slate-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-300">Pusat Notifikasi Perayaan Jemaat</span>
              <p className="text-[11px] text-slate-500">
                Tidak ada jemaat yang berulang tahun atau merayakan HUT pernikahan dalam 7 hari ke depan.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
            0 Notifikasi
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-[#0c1329] via-[#0f1738] to-[#0c1329] border border-amber-500/30 shadow-xl overflow-hidden transition-all ${className}`}
    >
      {/* Header bar with counter badges and expand toggle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/20 transition-colors border-b border-slate-800/80"
      >
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
            <Bell className="w-5 h-5" />
            {todayCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-slate-950 animate-ping" />
            )}
            {todayCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-slate-950" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Notifikasi Perayaan Jemaat (7 Hari Ke Depan)</span>
              </h3>
              {todayCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-[10px] shadow-sm animate-pulse">
                  🎉 {todayCount} Hari Ini!
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Otomatis mendeteksi ulang tahun kelahiran & pernikahan warga gereja untuk pelayanan pastoral dan pengiriman ucapan WA.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-300 font-medium text-[11px]">
              🎂 {birthdayCount} HUT
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-medium text-[11px]">
              💍 {anniversaryCount} Nikah
            </span>
          </div>

          <button
            type="button"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors ml-1"
            title={isExpanded ? 'Ciutkan' : 'Buka'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Body: Filters & Notification Cards */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua ({upcoming7Days.length})
              </button>
              {todayCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('today')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    activeFilter === 'today'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  🔥 Hari Ini ({todayCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveFilter('birthday')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  activeFilter === 'birthday'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎂 Kelahiran ({birthdayCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('anniversary')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  activeFilter === 'anniversary'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                💍 Pernikahan ({anniversaryCount})
              </button>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Menampilkan {filteredItems.length} dari {upcoming7Days.length} perayaan</span>
            </div>
          </div>

          {/* Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredItems.map((item) => {
              const isContacted = !!contactedIds[item.id];
              const isBirthday = item.type === 'birthday';
              const bItem = item as UpcomingBirthdayItem;
              const aItem = item as UpcomingAnniversaryItem;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 relative ${
                    item.isToday
                      ? 'bg-gradient-to-br from-[#1b1c12] via-[#161f36] to-[#0d142b] border-amber-400/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/30'
                      : item.isTomorrow
                      ? 'bg-slate-900/90 border-sky-500/40'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  } ${isContacted ? 'opacity-85' : ''}`}
                >
                  {/* Top: Type Badge & Relative Timing */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                        isBirthday
                          ? 'bg-pink-500/10 text-pink-400 border-pink-500/30'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {isBirthday ? (
                        <>
                          <Cake className="w-3 h-3" />
                          <span>HUT Kelahiran</span>
                        </>
                      ) : (
                        <>
                          <Heart className="w-3 h-3" />
                          <span>HUT Pernikahan</span>
                        </>
                      )}
                    </span>

                    {/* Relative Days Pill */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        item.isToday
                          ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                          : item.isTomorrow
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.isToday
                        ? '🎉 HARI INI'
                        : item.isTomorrow
                        ? '⏰ BESOK'
                        : `${item.diffDays} hari lagi`}
                    </span>
                  </div>

                  {/* Main Details */}
                  <div className="flex items-start gap-3">
                    {/* Date Badge */}
                    <div
                      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                        item.isToday
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                          : 'bg-slate-950 text-amber-300 border-slate-800'
                      }`}
                    >
                      <span className="text-base font-mono font-extrabold leading-none">
                        {item.day}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">
                        {item.monthName.substring(0, 3)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Name / Couple */}
                      <h4
                        className="font-bold text-white text-xs sm:text-sm truncate"
                        title={isBirthday ? item.member.fullName : aItem.coupleName}
                      >
                        {isBirthday ? item.member.fullName : aItem.coupleName}
                      </h4>

                      {/* Celebration subtitle */}
                      <div className="text-xs font-semibold text-amber-400 mt-0.5 flex items-center gap-1.5">
                        <PartyPopper className="w-3 h-3 shrink-0" />
                        <span>
                          {isBirthday
                            ? `HUT ke-${bItem.turningAge} Tahun`
                            : `HUT Nikah ke-${aItem.yearsMarried} Tahun`}
                        </span>
                      </div>

                      {/* Rayon & Phone */}
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{item.member.rayonName || 'Rayon Jemaat'}</span>
                        </span>
                        {item.member.phone && (
                          <>
                            <span>·</span>
                            <span className="text-slate-300 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 text-slate-500" />
                              <span>{item.member.phone}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Actions: WA Button & Contacted Toggle */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {/* Mark as Contacted Toggle */}
                    <button
                      type="button"
                      onClick={(e) => toggleContacted(item.id, e)}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isContacted
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                      }`}
                      title={isContacted ? 'Sudah dikirimkan ucapan / kunjungan' : 'Tandai sudah dihubungi'}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isContacted ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>{isContacted ? 'Sudah Dihubungi' : 'Belum Dihubungi'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {onOpenMemberDetail && (
                        <button
                          type="button"
                          onClick={() => onOpenMemberDetail(item.member)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Lihat Profil Jemaat"
                        >
                          <User className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* WhatsApp Button */}
                      {item.waUrl ? (
                        <a
                          href={item.waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
                          title="Kirim Pesan WhatsApp Langsung"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Kirim Pesan WA</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenMemberDetail) {
                              onOpenMemberDetail(item.member);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-colors cursor-pointer"
                          title="Nomor telepon belum diisi. Klik untuk membuka profil jemaat."
                        >
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span className="text-[10px]">No WA Belum Diisi</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
