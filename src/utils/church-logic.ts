import type { Member, Family, FinancialTransaction } from '../types/index.ts';

/**
 * Calculates current age in years given a YYYY-MM-DD birth date string
 */
export function calculateAge(birthDate: string, referenceDateStr?: string): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return 0;
  
  const ref = referenceDateStr ? new Date(referenceDateStr) : new Date();
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
}

/**
 * Categorizes age according to GMIT church ministry conventions:
 * - Anak: 0 - 12 tahun (Pelayanan Anak dan Remaja - PAR)
 * - Remaja: 13 - 17 tahun
 * - Pemuda: 18 - 29 tahun
 * - Dewasa: 30 - 59 tahun
 * - Lansia (Usia Indah): >= 60 tahun
 */
export function getAgeCategory(age: number): 'Anak' | 'Remaja' | 'Pemuda' | 'Dewasa' | 'Lansia' {
  if (age <= 12) return 'Anak';
  if (age <= 17) return 'Remaja';
  if (age <= 29) return 'Pemuda';
  if (age <= 59) return 'Dewasa';
  return 'Lansia';
}

/**
 * Formats integer or number to Indonesian Rupiah representation
 */
export function formatRupiah(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absVal);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Formats YYYY-MM-DD to standard DD-MM-YYYY format
 */
export function formatDateDMY(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

/**
 * Generates official GMIT Betel Fuimelang member registration number
 */
export function generateMemberNo(sequence: number, year: number = 2026): string {
  const padded = String(sequence).padStart(3, '0');
  return `GMIT-BF-${year}-${padded}`;
}

/**
 * Generates official Family Card / KK number
 */
export function generateFamilyNo(sequence: number): string {
  const padded = String(sequence).padStart(3, '0');
  return `KK-BF-${padded}`;
}

/**
 * Validates member payload ensuring data integrity
 */
export function validateMemberInput(data: Partial<Member>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.push('Nama lengkap wajib diisi minimal 2 karakter');
  }
  if (!data.gender || (data.gender !== 'Laki-laki' && data.gender !== 'Perempuan')) {
    errors.push('Jenis kelamin wajib dipilih (Laki-laki atau Perempuan)');
  }
  if (!data.birthDate) {
    errors.push('Tanggal lahir wajib diisi');
  }
  if (!data.rayonId) {
    errors.push('Rayon pelayanan wajib dipilih');
  }
  if (data.nik !== undefined && data.nik !== null && data.nik.trim().length > 0) {
    const cleanNik = data.nik.trim();
    if (!/^\d{16}$/.test(cleanNik)) {
      errors.push('Nomor Induk Kependudukan (NIK) tidak boleh kurang atau lebih dari 16 angka (harus tepat 16 digit)');
    }
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Format email tidak valid');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Aggregates complete live church statistics from members, families, and finance
 */
export function calculateChurchStats(
  members: Member[],
  families: Family[],
  transactions: FinancialTransaction[] = []
) {
  const activeMembers = members.filter((m) => m.status === 'Aktif');
  const totalSoul = activeMembers.length;
  const totalFamily = families.length;

  let maleCount = 0;
  let femaleCount = 0;
  let baptized = 0;
  let confirmed = 0;
  let marriedInChurch = 0;

  const ageGroups = {
    anak: 0,
    remaja: 0,
    pemuda: 0,
    dewasa: 0,
    lansia: 0,
  };

  const rayonCounts: Record<string, number> = {};
  const categorialCounts: Record<string, number> = {};

  for (const m of activeMembers) {
    if (m.gender === 'Laki-laki') maleCount++;
    else if (m.gender === 'Perempuan') femaleCount++;

    if (m.baptismStatus === 'Sudah') baptized++;
    if (m.confirmationStatus === 'Sudah') confirmed++;
    if (m.marriageChurchStatus === 'Sudah') marriedInChurch++;

    const age = calculateAge(m.birthDate);
    const cat = getAgeCategory(age);
    if (cat === 'Anak') ageGroups.anak++;
    else if (cat === 'Remaja') ageGroups.remaja++;
    else if (cat === 'Pemuda') ageGroups.pemuda++;
    else if (cat === 'Dewasa') ageGroups.dewasa++;
    else if (cat === 'Lansia') ageGroups.lansia++;

    const rName = m.rayonName || 'Rayon Lain';
    rayonCounts[rName] = (rayonCounts[rName] || 0) + 1;

    const cName = m.categorialGroupName || 'Lainnya';
    categorialCounts[cName] = (categorialCounts[cName] || 0) + 1;
  }

  const movedCount = members.filter((m) => m.status === 'Pindah').length;
  const deceasedCount = members.filter((m) => m.status === 'Meninggal').length;

  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type === 'Pemasukan') {
      totalIncome += tx.amount;
    } else if (tx.type === 'Pengeluaran') {
      totalExpense += tx.amount;
    }
  }

  const balance = totalIncome - totalExpense;

  return {
    totalSoul,
    totalFamily,
    maleCount,
    femaleCount,
    ageGroups,
    sacraments: {
      baptized,
      confirmed,
      marriedInChurch,
    },
    lifeStatus: {
      active: totalSoul,
      moved: movedCount,
      deceased: deceasedCount,
    },
    rayonCounts,
    categorialCounts,
    finance: {
      totalIncome,
      totalExpense,
      balance,
    },
  };
}

/**
 * Filter members by search text, rayon, categorial group, and membership status
 */
export function filterMembers(
  members: Member[],
  query: string = '',
  rayonId: string = 'all',
  categorialId: string = 'all',
  status: string = 'all'
): Member[] {
  const q = query.trim().toLowerCase();

  return members.filter((m) => {
    if (rayonId !== 'all' && m.rayonId !== rayonId) return false;
    if (categorialId !== 'all' && m.categorialGroupId !== categorialId) return false;
    if (status !== 'all' && m.status !== status) return false;

    if (!q) return true;

    return (
      m.fullName.toLowerCase().includes(q) ||
      m.memberNo.toLowerCase().includes(q) ||
      (m.nickname && m.nickname.toLowerCase().includes(q)) ||
      (m.nik && m.nik.includes(q)) ||
      (m.phone && m.phone.includes(q)) ||
      (m.address && m.address.toLowerCase().includes(q)) ||
      (m.familyName && m.familyName.toLowerCase().includes(q))
    );
  });
}
