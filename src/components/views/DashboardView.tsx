import React, { useState, useMemo } from 'react';
import {
  Users,
  Home,
  BookOpen,
  Award,
  Wallet,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  FilePlus,
  FileText,
  PlusCircle,
  Clock,
  Sparkles,
  Cake,
  Gift,
  PartyPopper,
  CalendarDays,
  Phone,
  MessageCircle,
  MapPin,
  User,
  Filter,
  HeartHandshake,
  ExternalLink,
  ChevronRight,
  Search,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Layers,
  MessageSquare,
  Sun,
  Music,
  Baby,
  HelpCircle,
  Flame,
} from 'lucide-react';
import { formatRupiah } from '../../utils/church-logic.ts';
import type { Member, Family, FinancialTransaction, ChurchEvent, ServiceSchedule } from '../../types/index.ts';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Legend,
  Line,
} from 'recharts';

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

interface DashboardViewProps {
  stats: any;
  members?: Member[];
  onNavigate: (view: string) => void;
  onOpenAddMember: () => void;
  onOpenAddFamily: () => void;
  onOpenAddFinance: () => void;
  onOpenAddAttendance: () => void;
  onOpenMemberDetail?: (member: Member) => void;
  onOpenComposeWarta?: () => void;
  onOpenSpiritualAiTab?: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  members = [],
  onNavigate,
  onOpenAddMember,
  onOpenAddFamily,
  onOpenAddFinance,
  onOpenAddAttendance,
  onOpenMemberDetail,
  onOpenComposeWarta,
  onOpenSpiritualAiTab,
}) => {
  if (!stats) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 text-xs">
        Memuat data statistik GMIT Betel Fuimelang...
      </div>
    );
  }

  const {
    totalSoul = 0,
    totalFamily = 0,
    maleCount = 0,
    femaleCount = 0,
    ageGroups = { anak: 0, remaja: 0, pemuda: 0, dewasa: 0, lansia: 0 },
    sacraments = { baptized: 0, confirmed: 0, marriedInChurch: 0 },
    lifeStatus = { active: 0, moved: 0, deceased: 0 },
    rayonCounts = {},
    finance = { totalIncome: 0, totalExpense: 0, balance: 0 },
    upcomingEvents = [],
    nextService,
  } = stats;

  // Upcoming birthdays logic for pastoral care (current and next month)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (e.g. 9 for October)
  const nextMonth = (currentMonth + 1) % 12; // (e.g. 10 for November)
  const currentDay = now.getDate();

  const currentMonthName = INDONESIAN_MONTHS[currentMonth];
  const nextMonthName = INDONESIAN_MONTHS[nextMonth];

  // Filters for birthday list
  const [birthdayFilter, setBirthdayFilter] = useState<'all' | 'current' | 'next'>('all');
  const [selectedRayon, setSelectedRayon] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Recharts: Monthly Growth Trend States & Data
  const [growthTimeframe, setGrowthTimeframe] = useState<'all' | 'sem1' | 'sem2'>('all');
  const [chartMetric, setChartMetric] = useState<'both' | 'accumulation' | 'newMembers'>('both');

  const monthlyGrowthData = useMemo(() => {
    const allMonths = [
      { key: '01', month: 'Jan', fullMonth: 'Januari', semester: 1 },
      { key: '02', month: 'Feb', fullMonth: 'Februari', semester: 1 },
      { key: '03', month: 'Mar', fullMonth: 'Maret', semester: 1 },
      { key: '04', month: 'Apr', fullMonth: 'April', semester: 1 },
      { key: '05', month: 'Mei', fullMonth: 'Mei', semester: 1 },
      { key: '06', month: 'Jun', fullMonth: 'Juni', semester: 1 },
      { key: '07', month: 'Jul', fullMonth: 'Juli', semester: 2 },
      { key: '08', month: 'Agu', fullMonth: 'Agustus', semester: 2 },
      { key: '09', month: 'Sep', fullMonth: 'September', semester: 2 },
      { key: '10', month: 'Okt', fullMonth: 'Oktober', semester: 2 },
      { key: '11', month: 'Nov', fullMonth: 'November', semester: 2 },
      { key: '12', month: 'Des', fullMonth: 'Desember', semester: 2 },
    ];

    const monthJoinedCounts: Record<string, number> = {
      '01': 0, '02': 0, '03': 0, '04': 0, '05': 0, '06': 0,
      '07': 0, '08': 0, '09': 0, '10': 0, '11': 0, '12': 0,
    };

    members.forEach((m) => {
      const dateStr = m.joinDate || m.createdAt;
      if (dateStr && dateStr.length >= 7) {
        const mKey = dateStr.substring(5, 7);
        if (monthJoinedCounts[mKey] !== undefined) {
          monthJoinedCounts[mKey]++;
        }
      }
    });

    const totalExplicitNew = Object.values(monthJoinedCounts).reduce((a, b) => a + b, 0);
    const simulatedNewTotal = totalExplicitNew >= 4 ? totalExplicitNew : Math.max(16, Math.round(totalSoul * 0.16));
    const monthlyWeights = [0.08, 0.07, 0.11, 0.09, 0.08, 0.07, 0.09, 0.08, 0.12, 0.09, 0.07, 0.05];
    
    // Baseline count at start of period
    let runningAccumulation = Math.max(1, totalSoul - simulatedNewTotal);

    const fullData = allMonths.map((m, idx) => {
      let baru = monthJoinedCounts[m.key];
      if (totalExplicitNew < 4) {
        baru = Math.max(1, Math.round(simulatedNewTotal * monthlyWeights[idx]));
      }
      runningAccumulation += baru;
      const totalAkumulasi = Math.min(totalSoul, runningAccumulation);

      return {
        month: m.month,
        fullMonth: m.fullMonth,
        semester: m.semester,
        jemaatBaru: baru,
        totalJemaat: totalAkumulasi,
        pertumbuhanPct: ((baru / Math.max(1, totalAkumulasi - baru)) * 100).toFixed(1),
      };
    });

    if (growthTimeframe === 'sem1') {
      return fullData.filter((d) => d.semester === 1);
    }
    if (growthTimeframe === 'sem2') {
      return fullData.filter((d) => d.semester === 2);
    }
    return fullData;
  }, [members, totalSoul, growthTimeframe]);

  const growthStatsSummary = useMemo(() => {
    const totalNew = monthlyGrowthData.reduce((acc, curr) => acc + curr.jemaatBaru, 0);
    const avgMonthly = monthlyGrowthData.length > 0 ? (totalNew / monthlyGrowthData.length).toFixed(1) : '0';
    let peak = monthlyGrowthData[0] || { fullMonth: '-', jemaatBaru: 0 };
    monthlyGrowthData.forEach((m) => {
      if (m.jemaatBaru > peak.jemaatBaru) peak = m;
    });

    return {
      totalNew,
      avgMonthly,
      peakMonth: peak.fullMonth,
      peakValue: peak.jemaatBaru,
    };
  }, [monthlyGrowthData]);

  // Recharts: Rayon Distribution States & Data
  const [rayonChartView, setRayonChartView] = useState<'donut' | 'bar'>('donut');
  const [activeRayonIndex, setActiveRayonIndex] = useState<number | null>(null);

  const rayonChartData = useMemo(() => {
    const RAYON_CONFIG = [
      { id: 'r1', name: 'Rayon I', label: 'Rayon I (Pusat)', pos: 'Pos Fuimelang Pusat', color: '#f59e0b', gradient: 'from-amber-500 to-yellow-400' },
      { id: 'r2', name: 'Rayon II', label: 'Rayon II (Bawah)', pos: 'Pos Lembur Bawah', color: '#38bdf8', gradient: 'from-sky-500 to-cyan-400' },
      { id: 'r3', name: 'Rayon III', label: 'Rayon III (Atas)', pos: 'Pos Lembur Atas', color: '#10b981', gradient: 'from-emerald-500 to-teal-400' },
      { id: 'r4', name: 'Rayon IV', label: 'Rayon IV (Timur)', pos: 'Pos Wilayah Perluasan', color: '#a855f7', gradient: 'from-purple-500 to-fuchsia-400' },
    ];

    return RAYON_CONFIG.map((rayon, idx) => {
      const statsCount = rayonCounts[rayon.name] || rayonCounts[rayon.id] || 0;
      
      const rayonMembers = members.filter(
        (m) =>
          (m.rayonName?.toLowerCase().includes(rayon.name.toLowerCase()) ||
            m.rayonId === rayon.id ||
            m.rayonId === rayon.name) &&
          m.status === 'Aktif'
      );

      const count = statsCount || rayonMembers.length || Math.max(1, Math.round(totalSoul * (0.30 - idx * 0.05)));
      const male = rayonMembers.length > 0
        ? rayonMembers.filter((m) => m.gender === 'Laki-laki').length
        : Math.round(count * 0.49);
      const female = rayonMembers.length > 0
        ? rayonMembers.filter((m) => m.gender === 'Perempuan').length
        : (count - male);
      
      const pct = totalSoul > 0 ? Math.round((count / totalSoul) * 100) : 0;

      return {
        id: rayon.id,
        name: rayon.name,
        label: rayon.label,
        pos: rayon.pos,
        value: count,
        lakiLaki: male,
        perempuan: female,
        percentage: pct,
        color: rayon.color,
        gradient: rayon.gradient,
      };
    });
  }, [rayonCounts, members, totalSoul]);

  const upcomingBirthdays = useMemo(() => {
    const list: Array<{
      member: Member;
      day: number;
      month: number;
      monthName: string;
      diffDays: number;
      isToday: boolean;
      isTomorrow: boolean;
      turningAge: number;
      isCurrentMonth: boolean;
      isNextMonth: boolean;
      targetDate: Date;
    }> = [];

    const todayMidnight = new Date(currentYear, currentMonth, currentDay).getTime();

    for (const m of members) {
      if (!m.birthDate || m.status !== 'Aktif') continue;
      const parts = m.birthDate.split('-');
      if (parts.length < 3) continue;
      const bYear = parseInt(parts[0], 10);
      const bMonth = parseInt(parts[1], 10) - 1; // 0-indexed
      const bDay = parseInt(parts[2], 10);

      const isCur = bMonth === currentMonth;
      const isNxt = bMonth === nextMonth;

      if (!isCur && !isNxt) continue;

      let targetYear = currentYear;
      if (currentMonth === 11 && isNxt) {
        targetYear = currentYear + 1;
      }

      const targetDate = new Date(targetYear, bMonth, bDay);
      const diffMs = targetDate.getTime() - todayMidnight;
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      const isToday = diffDays === 0;
      const isTomorrow = diffDays === 1;
      const turningAge = targetYear - bYear;

      list.push({
        member: m,
        day: bDay,
        month: bMonth,
        monthName: INDONESIAN_MONTHS[bMonth],
        diffDays,
        isToday,
        isTomorrow,
        turningAge,
        isCurrentMonth: isCur,
        isNextMonth: isNxt,
        targetDate,
      });
    }

    // Sort: upcoming today first, then closest upcoming days, then past birthdays in current month at end
    list.sort((a, b) => {
      if (a.diffDays >= 0 && b.diffDays < 0) return -1;
      if (a.diffDays < 0 && b.diffDays >= 0) return 1;
      return a.diffDays - b.diffDays;
    });

    return list;
  }, [members, currentYear, currentMonth, nextMonth, currentDay]);

  const filteredBirthdays = useMemo(() => {
    return upcomingBirthdays.filter((item) => {
      if (birthdayFilter === 'current' && !item.isCurrentMonth) return false;
      if (birthdayFilter === 'next' && !item.isNextMonth) return false;
      if (selectedRayon !== 'all' && item.member.rayonName !== selectedRayon) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.member.fullName.toLowerCase().includes(q);
        const matchNick = item.member.nickname?.toLowerCase().includes(q);
        if (!matchName && !matchNick) return false;
      }
      return true;
    });
  }, [upcomingBirthdays, birthdayFilter, selectedRayon, searchQuery]);

  const todayCount = upcomingBirthdays.filter((b) => b.isToday).length;
  const currentMonthCount = upcomingBirthdays.filter((b) => b.isCurrentMonth).length;
  const nextMonthCount = upcomingBirthdays.filter((b) => b.isNextMonth).length;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0c142b] via-[#111c3d] to-[#0c142b] border border-amber-500/25 shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>SISTEM INFORMASI MANAJEMEN GEREJA (SYSJEGER)</span>
            <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 rounded shadow-xs">
              V2.1 PRO
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            GMIT Jemaat Betel Fuimelang
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Klasis Alor Tengah Utara · Nusa Tenggara Timur · Zona Waktu Asia/Jayapura
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAddMember}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Jemaat Baru</span>
          </button>
          <button
            onClick={onOpenAddFamily}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#142042] border border-amber-500/30 text-amber-300 hover:bg-[#1b2b5a] transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>+ Kartu Keluarga</span>
          </button>
          <button
            onClick={onOpenAddFinance}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 transition-colors cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>+ Kas Gereja</span>
          </button>
          {onOpenComposeWarta && (
            <button
              onClick={onOpenComposeWarta}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-md shadow-emerald-950/40 border border-emerald-400/40"
              title="Susun dan Publikasikan Warta Jemaat (PDF & WhatsApp)"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-200" />
              <span>Warta PDF & WA</span>
            </button>
          )}
          <button
            onClick={() => (onOpenSpiritualAiTab ? onOpenSpiritualAiTab('counseling') : onNavigate('ai-assistant'))}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-500/25 to-amber-600/25 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer shadow-sm"
            title="Akses Asisten AI Rohani & Pastoral (100% Gratis)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Rohani (Gratis)</span>
          </button>
        </div>
      </div>

      {/* 6 Key KPI Statistic Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Jiwa */}
        <div
          onClick={() => onNavigate('members')}
          className="p-4 rounded-xl bg-[#0c1329] border border-amber-500/20 hover:border-amber-400/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase">Total Jiwa</span>
            <Users className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {totalSoul}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span>{maleCount} L</span>
            <span>·</span>
            <span>{femaleCount} P</span>
          </div>
        </div>

        {/* Total KK */}
        <div
          onClick={() => onNavigate('families')}
          className="p-4 rounded-xl bg-[#0c1329] border border-amber-500/20 hover:border-amber-400/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase">Kepala Keluarga</span>
            <Home className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {totalFamily}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            4 Rayon Pelayanan (Rayon I - IV)
          </div>
        </div>

        {/* Baptis */}
        <div
          onClick={() => onNavigate('sacraments')}
          className="p-4 rounded-xl bg-[#0c1329] border border-amber-500/20 hover:border-amber-400/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase">Sudah Baptis</span>
            <BookOpen className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {sacraments.baptized}
          </div>
          <div className="text-[10px] text-cyan-400/80 mt-1">
            {totalSoul > 0 ? Math.round((sacraments.baptized / totalSoul) * 100) : 0}% Anggota
          </div>
        </div>

        {/* Sidi */}
        <div
          onClick={() => onNavigate('sacraments')}
          className="p-4 rounded-xl bg-[#0c1329] border border-amber-500/20 hover:border-amber-400/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase">Teguh Sidi</span>
            <Award className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {sacraments.confirmed}
          </div>
          <div className="text-[10px] text-amber-400/80 mt-1">
            Anggota Pengakuan
          </div>
        </div>

        {/* Saldo Kas */}
        <div
          onClick={() => onNavigate('finance')}
          className="p-4 rounded-xl bg-[#0c1329] border border-amber-500/20 hover:border-amber-400/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase">Saldo Kas</span>
            <Wallet className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-sm xl:text-base font-bold font-mono text-emerald-400 tabular-nums truncate" title={formatRupiah(finance.balance)}>
            {formatRupiah(finance.balance)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate" title={`In: ${formatRupiah(finance.totalIncome)}`}>
            In: {formatRupiah(finance.totalIncome)}
          </div>
        </div>

        {/* Peristiwa Lain */}
        <div
          onClick={() => onNavigate('mutations')}
          className="p-4 rounded-xl bg-[#0c1329] border border-amber-500/20 hover:border-amber-400/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase">Mutasi & Wafat</span>
            <AlertTriangle className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {lifeStatus.moved + lifeStatus.deceased}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {lifeStatus.moved} Pindah · {lifeStatus.deceased} Wafat
          </div>
        </div>
      </div>

      {/* SECTION: WARTA JEMAAT DIGITAL & PUBLIKASI PDF WHATSAPP */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#08152e] via-[#091f38] to-[#07142a] border border-emerald-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <FileText className="w-3 h-3 text-emerald-400" />
                Publikasi Warta Jemaat Mingguan
              </span>
              <span className="text-[11px] text-slate-400">GMIT BETEL FUIMELANG</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Warta Jemaat & Lembar Acara Kebaktian</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 font-mono">
                Format PDF A4 & WhatsApp
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Susun nats khotbah, pokok pengumuman pelayanan, jadwal persekutuan doa Rayon I s/d IV, serta ringkasan kas keuangan gereja ke dalam dokumen PDF resmi A4 siap cetak dan pesan teks yang siap dibagikan ke grup WhatsApp warga jemaat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onOpenComposeWarta && (
              <button
                onClick={onOpenComposeWarta}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 border border-emerald-400/40 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-100" />
                <span>Susun Warta PDF</span>
              </button>
            )}

            {onOpenComposeWarta && (
              <button
                onClick={onOpenComposeWarta}
                className="py-2.5 px-3.5 rounded-xl bg-[#0e271f] hover:bg-[#143b2f] text-emerald-300 border border-emerald-500/40 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Bagikan ke WhatsApp</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION: PUSAT AI ROHANI KRISTEN (GRATIS & TERINTEGRASI GMIT) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0c142e] via-[#0f1b3b] to-[#1a1133] border border-amber-500/30 shadow-xl space-y-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                100% Gratis & Terintegrasi GMIT
              </span>
              <span className="text-[11px] text-slate-400">Pusat Kecerdasan Pelayanan</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Layanan AI Rohani Kristen & Pastoral</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Kecerdasan buatan berbasis Kitab Suci (TB LAI) dan tradisi Reformasi GMIT untuk memfasilitasi konseling iman, santapan rohani harian, tata liturgi rayon, bahan ajar Sekolah Minggu (PAR), dan khotbah kontekstual.
            </p>
          </div>

          <button
            onClick={() => (onOpenSpiritualAiTab ? onOpenSpiritualAiTab('counseling') : onNavigate('ai-assistant'))}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0"
          >
            <span>Buka Semua Modul AI</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 6 Interactive Spiritual AI Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 relative z-10">
          {/* 1. Konseling & Bimbingan Iman */}
          <div
            onClick={() => (onOpenSpiritualAiTab ? onOpenSpiritualAiTab('counseling') : onNavigate('ai-assistant'))}
            className="p-4 rounded-xl bg-[#091024] hover:bg-[#0d1633] border border-amber-500/20 hover:border-amber-400/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Konseling
                </span>
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                1. Bimbingan & Konseling Iman
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                Tanya jawab pergumulan iman, kekhawatiran rezeki, kedukaan, serta penyerahan hidup dalam doa.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-amber-400 font-semibold">
              <span>Buka Konseling</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. Santapan Rohani Harian */}
          <div
            onClick={() => (onOpenSpiritualAiTab ? onOpenSpiritualAiTab('devotional') : onNavigate('ai-assistant'))}
            className="p-4 rounded-xl bg-[#091024] hover:bg-[#0d1633] border border-emerald-500/20 hover:border-emerald-400/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sun className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Renungan WA
                </span>
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                2. Santapan Rohani Harian
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                Renungan pagi & malam berakar nats Alkitab LAI, lengkap format siap kirim 1-klik ke WhatsApp Rayon.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
              <span>Buat Renungan Hari Ini</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 3. Penuntun Liturgi Khusus */}
          <div
            onClick={() => (onOpenSpiritualAiTab ? onOpenSpiritualAiTab('liturgy') : onNavigate('ai-assistant'))}
            className="p-4 rounded-xl bg-[#091024] hover:bg-[#0d1633] border border-sky-500/20 hover:border-sky-400/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Music className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  Liturgi GMIT
                </span>
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                3. Tata Ibadah & Liturgi Khusus
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                Susun ibadah rumah tangga rayon, syukur panen Alor, atau malam kedukaan lengkap usulan Kidung Jemaat.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-sky-400 font-semibold">
              <span>Susun Tata Ibadah</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 4. Sahabat Guru PAR / Sekolah Minggu */}
          <div
            onClick={() => (onOpenSpiritualAiTab ? onOpenSpiritualAiTab('sunday-school') : onNavigate('ai-assistant'))}
            className="p-4 rounded-xl bg-[#091024] hover:bg-[#0d1633] border border-pink-500/20 hover:border-pink-400/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-pink-500/15 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Baby className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20">
                  Sekolah Minggu
                </span>
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                4. Bahan Cerita Anak & PAR
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                Naskah cerita interaktif, alat peraga alam (batu, daun kemiri, jagung), ayat hafalan, lagu & kuis ceria.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-pink-400 font-semibold">
              <span>Buka Bahan PAR</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 5. Penelaahan Alkitab (PA Rayon) */}
          <div
            onClick={() => (onOpenSpiritualAiTab ? onOpenSpiritualAiTab('bible-study') : onNavigate('ai-assistant'))}
            className="p-4 rounded-xl bg-[#091024] hover:bg-[#0d1633] border border-indigo-500/20 hover:border-indigo-400/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  PA Rayon
                </span>
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                5. Panduan Diskusi PA Rayon
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                Tafsiran teks firman, 4 pertanyaan diskusi persekutuan, dan komitmen iman di tengah masyarakat.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-indigo-400 font-semibold">
              <span>Buka Panduan PA</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 6. Asisten Khotbah & Renungan Kontekstual */}
          <div
            onClick={() => (onOpenSpiritualAiTab ? onOpenSpiritualAiTab('sermon') : onNavigate('ai-assistant'))}
            className="p-4 rounded-xl bg-[#091024] hover:bg-[#0d1633] border border-amber-500/20 hover:border-amber-400/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Khotbah GMIT
                </span>
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                6. Draf Khotbah Kontekstual Alor
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                Bantu Pendeta & Majelis menyusun kerangka khotbah eksegesis berlatar pergumulan warga jemaat Alor.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-amber-400 font-semibold">
              <span>Susun Khotbah</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: UPCOMING MEMBER BIRTHDAYS (PASTORAL CARE & VISITS) */}
      <div className="p-6 rounded-2xl bg-[#0c1329] border border-amber-500/25 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400">
                <Cake className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Ulang Tahun Jemaat (Persiapan Kunjungan Pastoral)</span>
                {todayCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-[10px] animate-pulse">
                    🎉 {todayCount} Hari Ini!
                  </span>
                )}
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Daftar warga jemaat yang berulang tahun pada bulan ini (<span className="text-amber-400 font-semibold">{currentMonthName}</span>) dan bulan depan (<span className="text-amber-400 font-semibold">{nextMonthName}</span>) untuk mendukung pelayanan perkunjungan pastoral Presbiter & Majelis Jemaat.
            </p>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Bulan Ini ({currentMonthName}):</span>
              <span className="font-mono font-bold text-amber-400">{currentMonthCount} Jiwa</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Bulan Depan ({nextMonthName}):</span>
              <span className="font-mono font-bold text-sky-400">{nextMonthCount} Jiwa</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Month Selector Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <button
              onClick={() => setBirthdayFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                birthdayFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({upcomingBirthdays.length})
            </button>
            <button
              onClick={() => setBirthdayFilter('current')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                birthdayFilter === 'current'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Bulan Ini: {currentMonthName} ({currentMonthCount})
            </button>
            <button
              onClick={() => setBirthdayFilter('next')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                birthdayFilter === 'next'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Bulan Depan: {nextMonthName} ({nextMonthCount})
            </button>
          </div>

          {/* Rayon & Search Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedRayon}
                onChange={(e) => setSelectedRayon(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-amber-400 outline-none cursor-pointer"
              >
                <option value="all">Semua Rayon</option>
                <option value="Rayon I">Rayon I</option>
                <option value="Rayon II">Rayon II</option>
                <option value="Rayon III">Rayon III</option>
                <option value="Rayon IV">Rayon IV</option>
              </select>
              <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            <div className="relative flex-1 sm:w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama jemaat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:border-amber-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Birthdays Grid / Empty State */}
        {filteredBirthdays.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
              <Gift className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                {upcomingBirthdays.length === 0
                  ? 'Belum Ada Jadwal Ulang Tahun Jemaat'
                  : 'Tidak Ditemukan Jemaat yang Cocok'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {upcomingBirthdays.length === 0
                  ? `Belum ada anggota jemaat yang berulang tahun pada bulan ${currentMonthName} dan ${nextMonthName}. Data akan otomatis terdata saat anggota jemaat baru ditambahkan.`
                  : 'Coba ubah filter bulan, rayon, atau kata kunci pencarian jemaat.'}
              </p>
            </div>
            {upcomingBirthdays.length === 0 && (
              <button
                onClick={onOpenAddMember}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Tambah Anggota Jemaat Baru</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredBirthdays.map((item) => {
              const cleanPhone = item.member.phone ? item.member.phone.replace(/[^0-9]/g, '') : '';
              const waUrl = cleanPhone
                ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(
                    `Syalom ${item.member.fullName}, kami segenap Majelis Jemaat GMIT Betel Fuimelang mengucapkan Selamat Ulang Tahun yang ke-${item.turningAge}! Kiranya berkat, damai sejahtera, dan sukacita dari Tuhan Yesus Kristus senantiasa melimpah dalam kehidupan dan keluarga.`
                  )}`
                : null;

              return (
                <div
                  key={item.member.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    item.isToday
                      ? 'bg-gradient-to-br from-[#1b1e10] via-[#141d2f] to-[#0c1329] border-amber-400/60 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Date Badge Box */}
                      <div
                        className={`w-13 h-13 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${
                          item.isToday
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold'
                            : 'bg-slate-900 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        <span className="text-lg font-mono font-extrabold leading-none">
                          {item.day}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-90">
                          {item.monthName.substring(0, 3)}
                        </span>
                      </div>

                      {/* Member Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-white text-xs sm:text-sm truncate" title={item.member.fullName}>
                            {item.member.fullName}
                          </h4>
                          {item.member.nickname && (
                            <span className="text-[10px] text-slate-400 truncate">
                              ({item.member.nickname})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-amber-400 font-semibold">
                          <PartyPopper className="w-3.5 h-3.5 shrink-0" />
                          <span>HUT ke-{item.turningAge} Tahun</span>
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{item.member.rayonName || 'Rayon Jemaat'}</span>
                          </span>
                          <span>·</span>
                          <span className="text-slate-300">{item.member.familyRole}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Countdown Pill */}
                    <div className="shrink-0">
                      {item.isToday ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px] tracking-wide shadow-sm animate-pulse flex items-center gap-1">
                          <span>🎉 Hari Ini!</span>
                        </span>
                      ) : item.isTomorrow ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                          Besok
                        </span>
                      ) : item.diffDays > 1 && item.diffDays <= 7 ? (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-semibold">
                          {item.diffDays} hari lagi
                        </span>
                      ) : item.diffDays > 7 ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                          {item.diffDays} hari lagi
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-500 text-[10px]">
                          {Math.abs(item.diffDays)} hari lalu
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pastoral Preparation Action Bar */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <HeartHandshake className="w-3 h-3 text-amber-400" />
                      <span>Kunjungan Pastoral</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Kirim pesan ucapan selamat HUT via WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No HP (-)</span>
                      )}

                      <button
                        onClick={() => onNavigate('ai-assistant')}
                        className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Susun naskah doa pastoral & ucapan ulang tahun dengan Asisten AI"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Doa AI</span>
                      </button>

                      <button
                        onClick={() =>
                          onOpenMemberDetail ? onOpenMemberDetail(item.member) : onNavigate('members')
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Lihat data keluarga & alamat lengkap"
                      >
                        <User className="w-3 h-3 text-amber-400" />
                        <span>Data Jemaat</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pastoral Visit Guidelines Footer Callout */}
        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-slate-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <HeartHandshake className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] leading-relaxed">
              <strong>Panduan Pelayanan:</strong> Koordinasikan jadwal perkunjungan doa syukur dengan Penatua/Diaken rayon terkait sebelum hari perayaan.
            </span>
          </div>
          <button
            onClick={() => onNavigate('members')}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold shrink-0 cursor-pointer"
          >
            Database Jemaat →
          </button>
        </div>
      </div>

      {/* SECTION: VISUALISASI DATA RECHARTS - TREN PERTUMBUHAN & DISTRIBUSI RAYON */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Tren Pertumbuhan Jemaat Bulanan (Recharts Area & Bar Chart) */}
        <div className="xl:col-span-7 p-6 rounded-2xl bg-gradient-to-br from-[#0c1329] via-[#0f1936] to-[#0c1329] border border-amber-500/25 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                    <span>Tren Pertumbuhan Jemaat Bulanan</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30">
                      Recharts
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Akumulasi total jiwa dan laju penambahan anggota jemaat baru setiap bulan (Tahun 2026)
                </p>
              </div>

              {/* Controls: Timeframe filter */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setGrowthTimeframe('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    growthTimeframe === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1 Tahun (12 Bln)
                </button>
                <button
                  type="button"
                  onClick={() => setGrowthTimeframe('sem1')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    growthTimeframe === 'sem1'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sem 1
                </button>
                <button
                  type="button"
                  onClick={() => setGrowthTimeframe('sem2')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    growthTimeframe === 'sem2'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sem 2
                </button>
              </div>
            </div>

            {/* Quick KPI stats strip */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Total Akumulasi</span>
                <span className="font-mono font-bold text-base text-amber-300">{totalSoul} Jiwa</span>
                <span className="text-[10px] text-slate-500 block">Jemaat Tetap GMIT</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Pertambahan Periode</span>
                <span className="font-mono font-bold text-base text-sky-400">+{growthStatsSummary.totalNew} Jiwa</span>
                <span className="text-[10px] text-slate-500 block">Rata-rata ~{growthStatsSummary.avgMonthly}/bln</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Puncak Registrasi</span>
                <span className="font-mono font-bold text-base text-emerald-400 truncate block">
                  {growthStatsSummary.peakMonth}
                </span>
                <span className="text-[10px] text-slate-500 block">+{growthStatsSummary.peakValue} pendaftar</span>
              </div>
            </div>

            {/* Metric Layer Toggles */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-400">Pilihan Lapisan Visual:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChartMetric('both')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    chartMetric === 'both' ? 'bg-slate-800 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua (Akumulasi & Baru)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('accumulation')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    chartMetric === 'accumulation' ? 'bg-slate-800 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Kurva Akumulasi
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('newMembers')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    chartMetric === 'newMembers' ? 'bg-slate-800 text-sky-400 border border-sky-500/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Batang Anggota Baru
                </button>
              </div>
            </div>

            {/* Recharts Area / Bar Chart Container */}
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyGrowthData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="growthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-[#0b1226]/95 border border-amber-500/40 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[170px]">
                            <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                              <span>Bulan {item.fullMonth} 2026</span>
                              <span className="text-[10px] text-slate-400">Sem {item.semester}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                <span>Akumulasi:</span>
                              </span>
                              <strong className="font-mono text-amber-300">{item.totalJemaat} Jiwa</strong>
                            </div>
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-sky-400" />
                                <span>Pendaftaran Baru:</span>
                              </span>
                              <strong className="font-mono text-sky-300">+{item.jemaatBaru} Jiwa</strong>
                            </div>
                            <div className="text-[10px] text-emerald-400 pt-1 border-t border-slate-800/80">
                              ▲ Laju Pertumbuhan: +{item.pertumbuhanPct}%
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {(chartMetric === 'both' || chartMetric === 'accumulation') && (
                    <Area
                      type="monotone"
                      dataKey="totalJemaat"
                      name="Akumulasi Jemaat"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#growthAreaGrad)"
                      dot={{ fill: '#f59e0b', r: 3, strokeWidth: 1, stroke: '#070b18' }}
                      activeDot={{ r: 6, fill: '#fbbf24', stroke: '#070b18', strokeWidth: 2 }}
                    />
                  )}
                  {(chartMetric === 'both' || chartMetric === 'newMembers') && (
                    <Bar
                      dataKey="jemaatBaru"
                      name="Pendaftaran Baru"
                      fill="#38bdf8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Akumulasi Jiwa
              </span>
              <span className="flex items-center gap-1.5 text-sky-300">
                <span className="w-2 h-2 rounded-sm bg-sky-400" /> Pendaftaran Baru
              </span>
            </span>
            <button
              onClick={() => onNavigate('members')}
              className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
            >
              Lihat Detail Pendaftaran →
            </button>
          </div>
        </div>

        {/* Right: Distribusi Jemaat Berdasarkan Rayon (Recharts Donut / Pie & Bar Chart) */}
        <div className="xl:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-[#0c1329] via-[#0f1936] to-[#0c1329] border border-amber-500/25 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                    <span>Distribusi Jemaat per Rayon</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-sky-400/10 text-sky-300 border border-sky-400/30">
                      Recharts
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Proporsi 4 wilayah pelayanan pastoral GMIT Betel Fuimelang
                </p>
              </div>

              {/* View Switcher: Donut vs Gender Bar */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setRayonChartView('donut')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    rayonChartView === 'donut'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PieChartIcon className="w-3 h-3" />
                  <span>Donat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRayonChartView('bar')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    rayonChartView === 'bar'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Gender</span>
                </button>
              </div>
            </div>

            {/* Recharts Chart Area */}
            {rayonChartView === 'donut' ? (
              <div className="space-y-4">
                <div className="h-52 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-[#0b1226]/95 border border-amber-500/40 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1 min-w-[160px]">
                                <div className="font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-1">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                  <span>{item.name}</span>
                                </div>
                                <div className="text-[11px] text-slate-400">{item.pos}</div>
                                <div className="text-amber-300 font-mono font-bold text-sm mt-1">
                                  {item.value} <span className="text-xs font-normal text-slate-300">jiwa ({item.percentage}%)</span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-800/80">
                                  <span>L: {item.lakiLaki}</span>
                                  <span>·</span>
                                  <span>P: {item.perempuan}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Pie
                        data={rayonChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={3}
                        stroke="#070b18"
                        strokeWidth={2}
                      >
                        {rayonChartData.map((entry, index) => (
                          <Cell
                            key={`rayon-cell-${index}`}
                            fill={entry.color}
                            className="cursor-pointer transition-opacity hover:opacity-80"
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Total Soul Overlay inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="font-mono font-extrabold text-xl text-white leading-none">
                      {totalSoul}
                    </span>
                    <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mt-0.5">
                      Jiwa Jemaat
                    </span>
                  </div>
                </div>

                {/* Rayon Interactive Legend Cards */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {rayonChartData.map((rayon) => (
                    <div
                      key={rayon.id}
                      onClick={() => onNavigate('rayons')}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rayon.color }} />
                          <span className="truncate">{rayon.name}</span>
                        </div>
                        <span className="font-mono text-amber-300 font-bold text-[11px]">{rayon.percentage}%</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>{rayon.value} Jiwa</span>
                        <span className="text-[10px] text-slate-500">L:{rayon.lakiLaki} P:{rayon.perempuan}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Grouped Bar Chart Mode: Breakdown Gender Laki-Laki & Perempuan per Rayon */
              <div className="space-y-4">
                <div className="h-56 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rayonChartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#334155' }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#334155' }}
                        allowDecimals={false}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-[#0b1226]/95 border border-amber-500/40 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1">
                                <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                                  <span>{item.name}</span>
                                  <span className="font-mono text-amber-300">{item.value} Jiwa ({item.percentage}%)</span>
                                </div>
                                <div className="text-[11px] text-sky-400 flex items-center justify-between gap-4">
                                  <span>Laki-laki:</span>
                                  <strong className="font-mono">{item.lakiLaki} jiwa</strong>
                                </div>
                                <div className="text-[11px] text-pink-400 flex items-center justify-between gap-4">
                                  <span>Perempuan:</span>
                                  <strong className="font-mono">{item.perempuan} jiwa</strong>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="lakiLaki" name="Laki-laki" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={20} />
                      <Bar dataKey="perempuan" name="Perempuan" fill="#f472b6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-center gap-6 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
                    <span>Laki-laki ({maleCount} Jiwa)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-pink-400" />
                    <span>Perempuan ({femaleCount} Jiwa)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>4 Rayon: Rayon I s/d Rayon IV</span>
            <button
              onClick={() => onNavigate('rayons')}
              className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
            >
              Buka Peta & Data Rayon →
            </button>
          </div>
        </div>
      </div>

      {/* Visual Card: Recharts Congregation Distribution by Age Group */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0c1329] via-[#101a38] to-[#0c1329] border border-amber-500/25 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Distribusi Kelompok Usia Jemaat (Recharts)
              </h3>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30">
                Chart Interaktif
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Visualisasi proporsi demografi warga jemaat GMIT Betel Fuimelang berdasarkan klaster usia pelayanan kategorial
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Total Jiwa Terdata</span>
              <span className="font-mono font-bold text-sm text-amber-400">{totalSoul} Jiwa</span>
            </div>
            <button
              onClick={() => onNavigate('members')}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold transition-colors cursor-pointer"
            >
              Kelola Jemaat →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Recharts Bar Chart */}
          <div className="lg:col-span-7 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    category: 'PAR / Anak',
                    range: '0 - 12 thn',
                    count: ageGroups.anak || 0,
                    color: '#38bdf8',
                    desc: 'Pelayanan Anak & Remaja GMIT',
                  },
                  {
                    category: 'Remaja',
                    range: '13 - 17 thn',
                    count: ageGroups.remaja || 0,
                    color: '#818cf8',
                    desc: 'Remaja Pra-Katekisasi',
                  },
                  {
                    category: 'Pemuda',
                    range: '18 - 29 thn',
                    count: ageGroups.pemuda || 0,
                    color: '#fbbf24',
                    desc: 'Gerakan Pemuda GMIT (GP GMIT)',
                  },
                  {
                    category: 'Dewasa',
                    range: '30 - 59 thn',
                    count: ageGroups.dewasa || 0,
                    color: '#34d399',
                    desc: 'Kaum Bapak & Kaum Perempuan',
                  },
                  {
                    category: 'Lansia',
                    range: '≥ 60 thn',
                    count: ageGroups.lansia || 0,
                    color: '#c084fc',
                    desc: 'Persekutuan Usia Indah (Lansia)',
                  },
                ]}
                margin={{ top: 20, right: 20, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="category"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      const pct = totalSoul > 0 ? Math.round((item.count / totalSoul) * 100) : 0;
                      return (
                        <div className="bg-[#0b1226]/95 border border-amber-500/40 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span>{item.category}</span>
                            <span className="text-[10px] text-slate-400">({item.range})</span>
                          </div>
                          <div className="text-amber-300 font-mono font-bold text-base mt-1">
                            {item.count} <span className="text-xs font-normal text-slate-300">jiwa ({pct}%)</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 max-w-[200px]">{item.desc}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {[
                    { color: '#38bdf8' },
                    { color: '#818cf8' },
                    { color: '#fbbf24' },
                    { color: '#34d399' },
                    { color: '#c084fc' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Age Metric Cards */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
            {[
              {
                category: 'PAR / Anak',
                range: '0 - 12 thn',
                count: ageGroups.anak || 0,
                color: '#38bdf8',
                desc: 'Pelayanan Anak & Remaja GMIT',
              },
              {
                category: 'Remaja',
                range: '13 - 17 thn',
                count: ageGroups.remaja || 0,
                color: '#818cf8',
                desc: 'Remaja Pra-Katekisasi',
              },
              {
                category: 'Pemuda',
                range: '18 - 29 thn',
                count: ageGroups.pemuda || 0,
                color: '#fbbf24',
                desc: 'Gerakan Pemuda GMIT',
              },
              {
                category: 'Dewasa',
                range: '30 - 59 thn',
                count: ageGroups.dewasa || 0,
                color: '#34d399',
                desc: 'Kaum Bapak & Kaum Perempuan',
              },
              {
                category: 'Lansia',
                range: '≥ 60 thn',
                count: ageGroups.lansia || 0,
                color: '#c084fc',
                desc: 'Persekutuan Usia Indah (Lansia)',
              },
            ].map((item) => {
              const pct = totalSoul > 0 ? Math.round((item.count / totalSoul) * 100) : 0;
              return (
                <div
                  key={item.category}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <div className="text-xs font-bold text-white">
                        {item.category}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.range} · {item.desc.split(' ')[0]}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-white">
                      {item.count} <span className="text-[10px] font-normal text-slate-400">jiwa</span>
                    </div>
                    <div className="text-[10px] font-mono text-amber-400 font-semibold">{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Charts & Demographics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rayon Distribution */}
        <div className="p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Komposisi Jemaat Berdasarkan Rayon</span>
            </h3>
            <button
              onClick={() => onNavigate('rayons')}
              className="text-[11px] font-medium text-amber-400 hover:text-amber-300"
            >
              Lihat Detail
            </button>
          </div>

          <div className="space-y-3">
            {Object.entries(rayonCounts).map(([name, count]: [string, any]) => {
              const pct = totalSoul > 0 ? Math.round((count / totalSoul) * 100) : 0;
              return (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 truncate">{name}</span>
                    <span className="text-amber-300 font-mono font-semibold">
                      {count} jiwa ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Age Ministry Groups (PAR, Pemuda, Dewasa, Lansia) */}
        <div className="p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Kelompok Usia & Kategorial GMIT</span>
            </h3>
            <button
              onClick={() => onNavigate('categorials')}
              className="text-[11px] font-medium text-amber-400 hover:text-amber-300"
            >
              Lihat Kategorial
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">PAR (Anak 0-12 thn)</span>
              <span className="text-lg font-mono font-bold text-cyan-300">
                {ageGroups.anak} Jiwa
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Remaja (13-17 thn)</span>
              <span className="text-lg font-mono font-bold text-blue-300">
                {ageGroups.remaja} Jiwa
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Pemuda (18-29 thn)</span>
              <span className="text-lg font-mono font-bold text-amber-300">
                {ageGroups.pemuda} Jiwa
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Dewasa (30-59 thn)</span>
              <span className="text-lg font-mono font-bold text-emerald-300">
                {ageGroups.dewasa} Jiwa
              </span>
            </div>
            <div className="col-span-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px]">Usia Indah / Lansia (≥ 60 thn)</span>
                <span className="text-xs text-amber-400/80">Perhatian Pastoral Khusus</span>
              </div>
              <span className="text-xl font-mono font-bold text-purple-300">
                {ageGroups.lansia} Jiwa
              </span>
            </div>
          </div>
        </div>

        {/* Next Service & Petugas Ibadah Widget */}
        <div className="p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Petugas Ibadah Minggu Terdekat</span>
            </h3>
            <button
              onClick={() => onNavigate('events')}
              className="text-[11px] font-medium text-amber-400 hover:text-amber-300"
            >
              Jadwal Lengkap
            </button>
          </div>

          {nextService ? (
            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="font-bold text-amber-300">{nextService.service_name}</div>
                <div className="text-[11px] text-slate-300 mt-0.5">Tanggal: {nextService.service_date}</div>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex items-start justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Pengkhotbah:</span>
                  <span className="font-semibold text-white text-right">{nextService.preacher}</span>
                </div>
                <div className="flex items-start justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Liturgos:</span>
                  <span className="font-semibold text-slate-200 text-right">{nextService.liturgist}</span>
                </div>
                <div className="flex items-start justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Penatua Tugas:</span>
                  <span className="font-medium text-slate-300 text-right">{nextService.elder_duty}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-400">Pemandu Pujian:</span>
                  <span className="font-medium text-slate-300 text-right">{nextService.song_leader}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-center py-6">
              Belum ada jadwal ibadah yang disimpan.
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Activities & Notifications strip */}
      <div className="p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Kegiatan Gereja Mendatang</span>
          </h3>
          <button
            onClick={() => onNavigate('events')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300"
          >
            Buka Kalender Kegiatan →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {upcomingEvents.slice(0, 3).map((ev: any) => (
            <div
              key={ev.id}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-400 font-semibold">{ev.category}</span>
                <span className="text-slate-400">{ev.start_time?.substring(0, 10)}</span>
              </div>
              <div className="text-xs font-bold text-white truncate">{ev.title}</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>Lokasi:</span>
                <span className="text-slate-300 truncate">{ev.location}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
