import type { Member } from '../types/index.ts';
import { cleanPhoneNumber, getWhatsAppShareUrl } from './whatsapp-warta.ts';

export const INDONESIAN_MONTH_NAMES = [
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

export interface UpcomingBirthdayItem {
  id: string;
  type: 'birthday';
  member: Member;
  day: number;
  month: number;
  monthName: string;
  birthYear: number;
  turningAge: number;
  diffDays: number;
  isToday: boolean;
  isTomorrow: boolean;
  isCurrentMonth: boolean;
  isNextMonth: boolean;
  targetDate: Date;
  dateFormatted: string;
  waUrl: string | null;
}

export interface UpcomingAnniversaryItem {
  id: string;
  type: 'anniversary';
  member: Member;
  spouseName: string;
  coupleName: string;
  day: number;
  month: number;
  monthName: string;
  marriageYear: number;
  yearsMarried: number;
  diffDays: number;
  isToday: boolean;
  isTomorrow: boolean;
  isCurrentMonth: boolean;
  isNextMonth: boolean;
  targetDate: Date;
  dateFormatted: string;
  waUrl: string | null;
}

export type CelebrationItem = UpcomingBirthdayItem | UpcomingAnniversaryItem;

/**
 * Safely parses date string in formats:
 * - YYYY-MM-DD
 * - DD/MM/YYYY
 * - DD-MM-YYYY
 */
export function parseDateParts(dateStr?: string | null): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
    const parts = trimmed.split(/[-T ]/);
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 0-indexed
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(trimmed)) {
    const separator = trimmed.includes('/') ? '/' : '-';
    const parts = trimmed.split(separator);
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 0-indexed
    const y = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  return null;
}

/**
 * Generates an official pastoral WhatsApp message for Member's Birthday.
 */
export function generateBirthdayWhatsAppMessage(
  member: Member,
  turningAge: number,
  churchName: string = 'GMIT Jemaat Betel Fuimelang'
): string {
  const name = member.fullName.trim();
  const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━';

  return [
    `*${churchName.toUpperCase()}*`,
    divider,
    `🎂 *UCAPAN SELAMAT HARI ULANG TAHUN* 🎂`,
    divider,
    '',
    `Syalom Bapak/Ibu/Saudara-i *${name}*,`,
    '',
    `Puji dan syukur kita persembahkan kepada TUHAN Allah yang setia atas anugerah penyertaan, kesehatan, dan nafas hidup yang dipercayakan hingga boleh merayakan:`,
    '',
    `🎉 *HARI ULANG TAHUN KE-${turningAge} TAHUN* 🎉`,
    '',
    `📖 *Ayat Pengharapan:*`,
    `_"TUHAN memberkati engkau dan melindungi engkau; TUHAN menyinari engkau dengan wajah-Nya dan memberi engkau kasih karunia; TUHAN menghadapkan wajah-Nya kepadamu dan memberi engkau damai sejahtera."_`,
    `*(Bilangan 6:24-26)*`,
    '',
    `Kiranya Tuhan Yesus Kristus senantiasa melimpahkan sukacita, damai sejahtera, hikmat, dan berkat yang berlimpah bagi pribadi dan keluarga tercinta. Tetaplah menjadi saluran berkat bagi sesama dan kemuliaan nama Tuhan. Amin. 🙏`,
    '',
    divider,
    `Salam Kasih & Doa Pastoral,`,
    `*Majelis & Presbiter ${churchName}*`,
  ].join('\n');
}

/**
 * Generates an official pastoral WhatsApp message for Wedding Anniversary.
 */
export function generateAnniversaryWhatsAppMessage(
  member: Member,
  yearsMarried: number,
  spouseName?: string,
  churchName: string = 'GMIT Jemaat Betel Fuimelang'
): string {
  const husbandOrWife = member.fullName.trim();
  const spouse = spouseName?.trim() || member.spouseName?.trim() || '';
  const coupleTitle = spouse ? `${husbandOrWife} & ${spouse}` : `Bapak/Ibu ${husbandOrWife}`;
  const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━';

  return [
    `*${churchName.toUpperCase()}*`,
    divider,
    `💍 *UCAPAN SELAMAT HARI ULANG TAHUN PERNIKAHAN* 💍`,
    divider,
    '',
    `Syalom Keluarga Terkasih *${coupleTitle}*,`,
    '',
    `Puji syukur kepada TUHAN Yang Maha Pengasih atas pemeliharaan dan berkat kudus pernikahan yang senantiasa menaungi bahtera rumah tangga hingga merayakan:`,
    '',
    `💒 *HARI ULANG TAHUN PERNIKAHAN KE-${yearsMarried} TAHUN* 💒`,
    '',
    `📖 *Ayat Pengharapan:*`,
    `_"Demikianlah mereka bukan lagi dua, melainkan satu. Karena itu, apa yang telah dipersatukan Allah, tidak boleh diceraikan manusia."_`,
    `*(Matius 19:6)*`,
    '',
    `_"Dan di atas semuanya itu: kenakanlah kasih, sebagai pengikat yang mempersatukan dan menyempurnakan."_`,
    `*(Kolose 3:14)*`,
    '',
    `Kiranya kasih setia Kristus senantiasa mempererat ikatan pernikahan, memenuhi rumah tangga dengan sukacita, kedamaian, dan rezeki yang berkecukupan. Semoga terus menjadi teladan keluarga kristiani yang memuliakan nama-Nya. Amin. 🙏`,
    '',
    divider,
    `Salam Kasih & Doa Pastoral,`,
    `*Majelis & Presbiter ${churchName}*`,
  ].join('\n');
}

/**
 * Queries the member list for all upcoming birthdays.
 * If maxDays is provided (e.g., 7), only returns birthdays occurring within the next maxDays days.
 */
export function getUpcomingBirthdays(
  members: Member[],
  maxDays?: number,
  refDate: Date = new Date()
): UpcomingBirthdayItem[] {
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth(); // 0-indexed
  const refDay = refDate.getDate();
  const nextMonthIdx = (refMonth + 1) % 12;

  const todayMidnight = new Date(refYear, refMonth, refDay).getTime();
  const result: UpcomingBirthdayItem[] = [];

  for (const m of members) {
    if (!m.birthDate || m.status !== 'Aktif') continue;
    const parsed = parseDateParts(m.birthDate);
    if (!parsed) continue;

    const { year: bYear, month: bMonth, day: bDay } = parsed;

    // Calculate this year's target date
    let targetYear = refYear;
    // If birthday month has already passed in the current year and we are checking future windows,
    // or if we are in December and the birthday is in January:
    if (bMonth < refMonth || (bMonth === refMonth && bDay < refDay)) {
      targetYear = refYear + 1;
    }

    const targetDate = new Date(targetYear, bMonth, bDay);
    const diffMs = targetDate.getTime() - todayMidnight;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const isCurrentMonth = bMonth === refMonth;
    const isNextMonth = bMonth === nextMonthIdx;

    // If maxDays is provided, filter strictly to [0, maxDays]
    if (typeof maxDays === 'number') {
      if (diffDays < 0 || diffDays > maxDays) continue;
    }

    const turningAge = targetYear - bYear;
    const isToday = diffDays === 0;
    const isTomorrow = diffDays === 1;

    const rawPhone = m.phone || '';
    const cleanPhone = cleanPhoneNumber(rawPhone);
    const waText = generateBirthdayWhatsAppMessage(m, turningAge);
    const waUrl = cleanPhone ? getWhatsAppShareUrl(waText, cleanPhone) : null;

    result.push({
      id: `bday-${m.id}`,
      type: 'birthday',
      member: m,
      day: bDay,
      month: bMonth,
      monthName: INDONESIAN_MONTH_NAMES[bMonth],
      birthYear: bYear,
      turningAge: Math.max(1, turningAge),
      diffDays,
      isToday,
      isTomorrow,
      isCurrentMonth,
      isNextMonth,
      targetDate,
      dateFormatted: `${bDay} ${INDONESIAN_MONTH_NAMES[bMonth]}`,
      waUrl,
    });
  }

  // Sort upcoming celebrations: today first, then nearest ascending
  result.sort((a, b) => {
    if (a.diffDays >= 0 && b.diffDays < 0) return -1;
    if (a.diffDays < 0 && b.diffDays >= 0) return 1;
    return a.diffDays - b.diffDays;
  });

  return result;
}

/**
 * Queries the member list for all upcoming wedding anniversaries.
 * Deduplicates couples living in the same family with the same marriageDate.
 */
export function getUpcomingAnniversaries(
  members: Member[],
  maxDays?: number,
  refDate: Date = new Date()
): UpcomingAnniversaryItem[] {
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth(); // 0-indexed
  const refDay = refDate.getDate();
  const nextMonthIdx = (refMonth + 1) % 12;

  const todayMidnight = new Date(refYear, refMonth, refDay).getTime();
  const result: UpcomingAnniversaryItem[] = [];
  const seenCouples = new Set<string>();

  for (const m of members) {
    if (m.status !== 'Aktif') continue;
    const mDateStr = m.marriageDate;
    if (!mDateStr) continue;

    const parsed = parseDateParts(mDateStr);
    if (!parsed) continue;

    const { year: mYear, month: mMonth, day: mDay } = parsed;
    // Basic year sanity check: cannot be married in the future
    if (mYear > refYear) continue;

    // Deduplicate couple to avoid showing both husband and wife separately if in same family
    const familyKey = m.familyId || m.familyName || m.familyCardNo || '';
    const coupleKey = familyKey
      ? `${familyKey}_${mMonth}_${mDay}`
      : `${m.fullName.toLowerCase()}_${mDateStr}`;

    if (seenCouples.has(coupleKey)) continue;
    seenCouples.add(coupleKey);

    // Calculate this year's target date
    let targetYear = refYear;
    if (mMonth < refMonth || (mMonth === refMonth && mDay < refDay)) {
      targetYear = refYear + 1;
    }

    const targetDate = new Date(targetYear, mMonth, mDay);
    const diffMs = targetDate.getTime() - todayMidnight;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const isCurrentMonth = mMonth === refMonth;
    const isNextMonth = mMonth === nextMonthIdx;

    if (typeof maxDays === 'number') {
      if (diffDays < 0 || diffDays > maxDays) continue;
    }

    const yearsMarried = targetYear - mYear;
    const isToday = diffDays === 0;
    const isTomorrow = diffDays === 1;

    // Detect spouse name from family members if missing
    let spouse = m.spouseName || '';
    if (!spouse && familyKey) {
      const partner = members.find(
        (other) =>
          other.id !== m.id &&
          other.status === 'Aktif' &&
          (other.familyId === m.familyId || other.familyName === m.familyName) &&
          (other.familyRole === 'Istri' || other.familyRole === 'Kepala Keluarga')
      );
      if (partner) {
        spouse = partner.fullName;
      }
    }

    const coupleName = spouse ? `${m.fullName} & ${spouse}` : m.fullName;
    const rawPhone = m.phone || '';
    const cleanPhone = cleanPhoneNumber(rawPhone);
    const waText = generateAnniversaryWhatsAppMessage(m, yearsMarried, spouse);
    const waUrl = cleanPhone ? getWhatsAppShareUrl(waText, cleanPhone) : null;

    result.push({
      id: `anni-${m.id}`,
      type: 'anniversary',
      member: m,
      spouseName: spouse,
      coupleName,
      day: mDay,
      month: mMonth,
      monthName: INDONESIAN_MONTH_NAMES[mMonth],
      marriageYear: mYear,
      yearsMarried: Math.max(1, yearsMarried),
      diffDays,
      isToday,
      isTomorrow,
      isCurrentMonth,
      isNextMonth,
      targetDate,
      dateFormatted: `${mDay} ${INDONESIAN_MONTH_NAMES[mMonth]}`,
      waUrl,
    });
  }

  // Sort upcoming celebrations: today first, then nearest ascending
  result.sort((a, b) => {
    if (a.diffDays >= 0 && b.diffDays < 0) return -1;
    if (a.diffDays < 0 && b.diffDays >= 0) return 1;
    return a.diffDays - b.diffDays;
  });

  return result;
}

/**
 * Returns merged celebrations within a window (e.g. 7 days or current month).
 */
export function getAllUpcomingCelebrations(
  members: Member[],
  maxDays?: number,
  refDate: Date = new Date()
): CelebrationItem[] {
  const birthdays = getUpcomingBirthdays(members, maxDays, refDate);
  const anniversaries = getUpcomingAnniversaries(members, maxDays, refDate);

  const merged: CelebrationItem[] = [...birthdays, ...anniversaries];
  merged.sort((a, b) => {
    if (a.diffDays >= 0 && b.diffDays < 0) return -1;
    if (a.diffDays < 0 && b.diffDays >= 0) return 1;
    if (a.diffDays !== b.diffDays) return a.diffDays - b.diffDays;
    return a.type === 'birthday' ? -1 : 1;
  });

  return merged;
}
