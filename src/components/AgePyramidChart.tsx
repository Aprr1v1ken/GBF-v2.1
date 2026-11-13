import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Users,
  UserPlus,
  Layers,
  Filter,
  AlertCircle,
  ArrowRight,
  BarChart2,
} from 'lucide-react';
import {
  buildAgePyramidData,
  type AgeCohortBucket,
  type PyramidGranularity,
} from '../utils/age-pyramid.ts';
import type { Member } from '../types/index.ts';

interface AgePyramidChartProps {
  members: Member[];
  onNavigate?: (view: string) => void;
  onOpenAddMember?: () => void;
}

export const AgePyramidChart: React.FC<AgePyramidChartProps> = ({
  members,
  onNavigate,
  onOpenAddMember,
}) => {
  const [granularity, setGranularity] = useState<PyramidGranularity>('detailed');
  const [rayonFilter, setRayonFilter] = useState<string>('all');
  const [selectedCohortKey, setSelectedCohortKey] = useState<string | null>(null);

  const availableRayons = useMemo(() => {
    const defaults = ['Rayon I', 'Rayon II', 'Rayon III', 'Rayon IV'];
    const dynamic = Array.from(
      new Set(
        members
          .map((m) => m.rayonName)
          .filter((name): name is string => Boolean(name && name.trim()))
      )
    );
    return Array.from(new Set([...defaults, ...dynamic]));
  }, [members]);

  const summary = useMemo(
    () =>
      buildAgePyramidData(members, {
        granularity,
        rayonFilter,
      }),
    [members, granularity, rayonFilter]
  );

  const selectedCohort: AgeCohortBucket | null = useMemo(() => {
    if (!selectedCohortKey) return null;
    return summary.cohorts.find((c) => c.key === selectedCohortKey) || null;
  }, [summary.cohorts, selectedCohortKey]);

  const hasData = summary.totalWithValidAge > 0;
  const chartHeight = granularity === 'detailed' ? 360 : 280;

  return (
    <section className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0b132b] via-[#101c3d] to-[#0b1228] border border-amber-500/25 shadow-xl space-y-5 min-w-0">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
              Piramida Usia Jemaat
            </h3>
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30">
              Recharts Demografi
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sebaran struktur umur Laki-laki dan Perempuan untuk memudahkan sensus pelayanan kategorial GMIT Betel Fuimelang.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              aria-label="Filter Rayon Piramida Usia"
              value={rayonFilter}
              onChange={(e) => {
                setRayonFilter(e.target.value);
                setSelectedCohortKey(null);
              }}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:border-amber-400 outline-none cursor-pointer min-h-[38px]"
            >
              <option value="all">Semua Rayon</option>
              {availableRayons.map((rayonName) => (
                <option key={rayonName} value={rayonName}>
                  {rayonName}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setGranularity('detailed');
                setSelectedCohortKey(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                granularity === 'detailed'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              8 Rentang Usia
            </button>
            <button
              type="button"
              onClick={() => {
                setGranularity('gmit');
                setSelectedCohortKey(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                granularity === 'gmit'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>5 Klaster GMIT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demographic Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/85 border border-slate-800/90">
          <div className="text-[11px] text-slate-400 font-medium">Terdata di Piramida</div>
          <div className="font-mono font-extrabold text-lg text-white tabular-nums mt-0.5">
            {summary.totalWithValidAge}{' '}
            <span className="text-xs font-normal text-slate-400">Jiwa</span>
          </div>
          <div className="text-[10px] text-sky-300/90 font-mono tabular-nums mt-0.5">
            L: {summary.maleTotal} · P: {summary.femaleTotal}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/85 border border-slate-800/90">
          <div className="text-[11px] text-slate-400 font-medium">Usia Produktif (18–59)</div>
          <div className="font-mono font-extrabold text-lg text-emerald-400 tabular-nums mt-0.5">
            {summary.productiveCount}{' '}
            <span className="text-xs font-normal text-emerald-300/80">
              ({summary.productivePct}%)
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Pemuda, Kaum Bapak & Ibu</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/85 border border-slate-800/90">
          <div className="text-[11px] text-slate-400 font-medium">Anak & Lansia</div>
          <div className="font-mono font-extrabold text-lg text-amber-300 tabular-nums mt-0.5">
            {summary.kidsAndTeensCount} <span className="text-xs text-slate-500">/</span>{' '}
            {summary.elderlyCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            0–17 Thn vs ≥ 60 Thn
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/85 border border-slate-800/90">
          <div className="text-[11px] text-slate-400 font-medium">Rata-rata & Dominan</div>
          <div className="font-mono font-extrabold text-lg text-pink-300 tabular-nums mt-0.5">
            {hasData ? `${summary.averageAge} Thn` : '-'}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5" title={summary.dominantCohort}>
            Terbanyak: {summary.dominantCohort}
          </div>
        </div>
      </div>

      {/* Warning if some members are missing birthDate */}
      {summary.missingBirthDateCount > 0 && (
        <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Ada <strong className="font-mono">{summary.missingBirthDateCount}</strong> anggota jemaat yang belum memiliki tanggal lahir valid sehingga belum masuk piramida usia.
            </span>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('members')}
              className="text-amber-300 hover:text-amber-200 font-bold text-[11px] shrink-0 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>Lengkapi Data</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Main Chart or Honest Empty State */}
      {!hasData ? (
        <div className="p-8 sm:p-10 rounded-2xl bg-slate-900/50 border border-dashed border-slate-700 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">
              Belum Ada Data Usia Jemaat untuk Ditampilkan
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Piramida usia akan otomatis tergambar saat Anda menambahkan anggota jemaat baru atau mengimpor file Excel jemaat dengan kolom tanggal lahir.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {onOpenAddMember && (
              <button
                type="button"
                onClick={onOpenAddMember}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tambah Jemaat Baru</span>
              </button>
            )}
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('members')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <span>Buka Database & Impor Excel</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Wing Header Labels */}
          <div className="flex items-center justify-between px-2 sm:px-6 text-xs font-bold">
            <div className="flex items-center gap-2 text-sky-300">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-sky-600 to-cyan-400 inline-block" />
              <span>◀ Laki-laki ({summary.maleTotal})</span>
            </div>
            <span className="hidden sm:inline text-[11px] font-medium text-slate-400">
              Klik batang grafik untuk rincian kelompok umur
            </span>
            <div className="flex items-center gap-2 text-pink-300">
              <span>Perempuan ({summary.femaleTotal}) ▶</span>
              <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-pink-500 to-rose-400 inline-block" />
            </div>
          </div>

          {/* Recharts Diverging Horizontal BarChart */}
          <div className="w-full min-w-0" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.cohorts}
                layout="vertical"
                stackOffset="sign"
                margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                barCategoryGap="18%"
              >
                <defs>
                  <linearGradient id="pyramidMaleGrad" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="pyramidFemaleGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#db2777" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#f472b6" stopOpacity={1} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={true} />

                <XAxis
                  type="number"
                  domain={[-summary.domainMax, summary.domainMax]}
                  tickFormatter={(val: number) => String(Math.abs(val))}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  allowDecimals={false}
                />

                <YAxis
                  type="category"
                  dataKey="label"
                  width={80}
                  stroke="#e2e8f0"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                />

                <ReferenceLine x={0} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" />

                <RechartsTooltip
                  cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as AgeCohortBucket;
                      const malePct = item.total > 0 ? Math.round((item.male / item.total) * 100) : 0;
                      const femalePct = item.total > 0 ? 100 - malePct : 0;
                      return (
                        <div className="bg-[#091024]/95 border border-amber-500/40 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[215px]">
                          <div className="border-b border-slate-800 pb-1.5">
                            <div className="font-extrabold text-white flex items-center justify-between gap-2">
                              <span>Usia {item.shortRange}</span>
                              <span className="font-mono text-amber-300">{item.percent}% Jemaat</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{item.kategorial}</div>
                          </div>

                          <div className="space-y-1 tabular-nums">
                            <div className="flex items-center justify-between text-sky-300">
                              <span>Laki-laki:</span>
                              <strong className="font-mono">
                                {item.male} jiwa ({malePct}%)
                              </strong>
                            </div>
                            <div className="flex items-center justify-between text-pink-300">
                              <span>Perempuan:</span>
                              <strong className="font-mono">
                                {item.female} jiwa ({femalePct}%)
                              </strong>
                            </div>
                            <div className="flex items-center justify-between text-amber-300 pt-1 border-t border-slate-800/80 font-bold">
                              <span>Total Kelompok:</span>
                              <span className="font-mono">{item.total} jiwa</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Bar
                  dataKey="maleNeg"
                  name="Laki-laki"
                  stackId="pyramid"
                  fill="url(#pyramidMaleGrad)"
                  radius={[6, 0, 0, 6]}
                  maxBarSize={26}
                  onClick={(data: any) => {
                    if (data?.key) setSelectedCohortKey(data.key);
                  }}
                  className="cursor-pointer"
                >
                  {summary.cohorts.map((entry) => (
                    <Cell
                      key={`male-${entry.key}`}
                      fillOpacity={!selectedCohortKey || selectedCohortKey === entry.key ? 1 : 0.4}
                    />
                  ))}
                </Bar>

                <Bar
                  dataKey="femalePos"
                  name="Perempuan"
                  stackId="pyramid"
                  fill="url(#pyramidFemaleGrad)"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={26}
                  onClick={(data: any) => {
                    if (data?.key) setSelectedCohortKey(data.key);
                  }}
                  className="cursor-pointer"
                >
                  {summary.cohorts.map((entry) => (
                    <Cell
                      key={`female-${entry.key}`}
                      fillOpacity={!selectedCohortKey || selectedCohortKey === entry.key ? 1 : 0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Cohort Pills Strip for Mobile & Quick Inspection */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
            {summary.cohorts.map((cohort) => {
              const isSelected = selectedCohortKey === cohort.key;
              return (
                <button
                  key={cohort.key}
                  type="button"
                  onClick={() =>
                    setSelectedCohortKey((prev) => (prev === cohort.key ? null : cohort.key))
                  }
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 shadow-md'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[11px] font-bold text-white truncate">{cohort.label}</div>
                  <div className="font-mono text-xs font-extrabold text-amber-300 tabular-nums mt-0.5">
                    {cohort.total} <span className="text-[10px] font-normal text-slate-400">({cohort.percent}%)</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 tabular-nums mt-0.5">
                    <span className="text-sky-400">L:{cohort.male}</span> ·{' '}
                    <span className="text-pink-400">P:{cohort.female}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Cohort Detail Strip */}
          {selectedCohort && (
            <div className="p-3.5 rounded-xl bg-slate-900/95 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-amber-300 flex items-center gap-2">
                  <span>Kelompok Usia {selectedCohort.shortRange}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                    {selectedCohort.kategorial}
                  </span>
                </div>
                <div className="text-slate-300 tabular-nums">
                  Total <strong className="text-white">{selectedCohort.total} jiwa</strong> ({selectedCohort.percent}% dari jemaat terdata):{' '}
                  <span className="text-sky-300 font-semibold">{selectedCohort.male} Laki-laki</span> &{' '}
                  <span className="text-pink-300 font-semibold">{selectedCohort.female} Perempuan</span>.
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('members')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Buka Database Jemaat →
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedCohortKey(null)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
