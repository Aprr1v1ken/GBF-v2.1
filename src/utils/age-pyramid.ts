import { calculateAge } from './church-logic.ts';
import type { Member } from '../types/index.ts';

export type PyramidGranularity = 'detailed' | 'gmit';

export interface AgeCohortBucket {
  key: string;
  label: string;
  shortRange: string;
  kategorial: string;
  male: number;
  female: number;
  maleNeg: number;
  femalePos: number;
  total: number;
  percent: number;
}

export interface AgePyramidSummary {
  cohorts: AgeCohortBucket[];
  totalActive: number;
  totalWithValidAge: number;
  missingBirthDateCount: number;
  maleTotal: number;
  femaleTotal: number;
  productiveCount: number;
  productivePct: number;
  kidsAndTeensCount: number;
  elderlyCount: number;
  averageAge: number;
  dominantCohort: string;
  domainMax: number;
}

interface BucketDef {
  key: string;
  label: string;
  shortRange: string;
  kategorial: string;
  min: number;
  max: number;
}

// Ordered top-to-bottom for a classic demographic pyramid (oldest at top, youngest at bottom)
const DETAILED_BUCKETS: BucketDef[] = [
  { key: '60+', label: '60+ Thn', shortRange: '≥ 60 tahun', kategorial: 'Lansia (Usia Indah)', min: 60, max: 200 },
  { key: '50-59', label: '50–59 Thn', shortRange: '50–59 tahun', kategorial: 'Dewasa (PKB / PKP)', min: 50, max: 59 },
  { key: '40-49', label: '40–49 Thn', shortRange: '40–49 tahun', kategorial: 'Dewasa (PKB / PKP)', min: 40, max: 49 },
  { key: '30-39', label: '30–39 Thn', shortRange: '30–39 tahun', kategorial: 'Dewasa Muda', min: 30, max: 39 },
  { key: '18-29', label: '18–29 Thn', shortRange: '18–29 tahun', kategorial: 'Pemuda (GP GMIT)', min: 18, max: 29 },
  { key: '13-17', label: '13–17 Thn', shortRange: '13–17 tahun', kategorial: 'Remaja / Katekisasi', min: 13, max: 17 },
  { key: '6-12', label: '6–12 Thn', shortRange: '6–12 tahun', kategorial: 'PAR Besar (Sekolah Minggu)', min: 6, max: 12 },
  { key: '0-5', label: '0–5 Thn', shortRange: '0–5 tahun', kategorial: 'PAR Balita', min: 0, max: 5 },
];

const GMIT_BUCKETS: BucketDef[] = [
  { key: 'lansia', label: 'Lansia', shortRange: '≥ 60 tahun', kategorial: 'Persekutuan Usia Indah', min: 60, max: 200 },
  { key: 'dewasa', label: 'Dewasa', shortRange: '30–59 tahun', kategorial: 'Kaum Bapak & Kaum Perempuan', min: 30, max: 59 },
  { key: 'pemuda', label: 'Pemuda', shortRange: '18–29 tahun', kategorial: 'Gerakan Pemuda GMIT', min: 18, max: 29 },
  { key: 'remaja', label: 'Remaja', shortRange: '13–17 tahun', kategorial: 'Remaja Pra-Katekisasi', min: 13, max: 17 },
  { key: 'anak', label: 'PAR / Anak', shortRange: '0–12 tahun', kategorial: 'Pelayanan Anak & Remaja', min: 0, max: 12 },
];

export function hasValidBirthDate(birthDate?: string): boolean {
  if (!birthDate) return false;
  const trimmed = String(birthDate).trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return false;
  const parsed = new Date(trimmed);
  return !Number.isNaN(parsed.getTime());
}

export function buildAgePyramidData(
  members: Member[],
  options: {
    granularity?: PyramidGranularity;
    rayonFilter?: string;
    referenceDateStr?: string;
  } = {}
): AgePyramidSummary {
  const { granularity = 'detailed', rayonFilter = 'all', referenceDateStr } = options;
  const defs = granularity === 'gmit' ? GMIT_BUCKETS : DETAILED_BUCKETS;

  const filteredActive = members.filter((m) => {
    if (m.status && m.status !== 'Aktif') return false;
    if (rayonFilter !== 'all') {
      const rayonMatch =
        m.rayonName === rayonFilter ||
        m.rayonId === rayonFilter;
      if (!rayonMatch) return false;
    }
    return true;
  });

  const counters = defs.map((def) => ({
    def,
    male: 0,
    female: 0,
  }));

  let totalWithValidAge = 0;
  let missingBirthDateCount = 0;
  let maleTotal = 0;
  let femaleTotal = 0;
  let productiveCount = 0;
  let kidsAndTeensCount = 0;
  let elderlyCount = 0;
  let ageSum = 0;

  for (const m of filteredActive) {
    if (!hasValidBirthDate(m.birthDate)) {
      missingBirthDateCount++;
      continue;
    }

    const age = calculateAge(m.birthDate, referenceDateStr);
    totalWithValidAge++;
    ageSum += age;

    const isFemale = m.gender === 'Perempuan';
    if (isFemale) femaleTotal++;
    else maleTotal++;

    if (age <= 17) kidsAndTeensCount++;
    else if (age <= 59) productiveCount++;
    else elderlyCount++;

    const bucket = counters.find((c) => age >= c.def.min && age <= c.def.max) || counters[0];
    if (isFemale) bucket.female++;
    else bucket.male++;
  }

  let maxWing = 0;
  let dominantCohort = '-';
  let maxCohortTotal = -1;

  const cohorts: AgeCohortBucket[] = counters.map((item) => {
    const total = item.male + item.female;
    if (item.male > maxWing) maxWing = item.male;
    if (item.female > maxWing) maxWing = item.female;
    if (total > maxCohortTotal && total > 0) {
      maxCohortTotal = total;
      dominantCohort = `${item.def.label} (${total})`;
    }
    const percent = totalWithValidAge > 0 ? Math.round((total / totalWithValidAge) * 100) : 0;
    return {
      key: item.def.key,
      label: item.def.label,
      shortRange: item.def.shortRange,
      kategorial: item.def.kategorial,
      male: item.male,
      female: item.female,
      maleNeg: -item.male,
      femalePos: item.female,
      total,
      percent,
    };
  });

  const domainMax = maxWing <= 4 ? 5 : Math.ceil(maxWing * 1.15);

  return {
    cohorts,
    totalActive: filteredActive.length,
    totalWithValidAge,
    missingBirthDateCount,
    maleTotal,
    femaleTotal,
    productiveCount,
    productivePct: totalWithValidAge > 0 ? Math.round((productiveCount / totalWithValidAge) * 100) : 0,
    kidsAndTeensCount,
    elderlyCount,
    averageAge: totalWithValidAge > 0 ? Math.round((ageSum / totalWithValidAge) * 10) / 10 : 0,
    dominantCohort,
    domainMax,
  };
}
