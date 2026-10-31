import type { Announcement, ChurchSettings } from '../types/index.ts';
import { DEFAULT_CHURCH_SETTINGS } from './church-settings.ts';

export interface WhatsAppBroadcastOptions {
  churchSettings?: ChurchSettings;
  targetAudience?: string; // e.g. "Semua Rayon (Rayon I - IV)", "Rayon I", "Pemuda & PAR"
  customGreeting?: string;
  editionDate?: string;
  includeSignature?: boolean;
}

/**
 * Normalizes an Indonesian phone number to international format (e.g., 0821 -> 62821).
 */
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Formats a single announcement for WhatsApp broadcast.
 */
export function formatSingleWartaWhatsApp(
  announcement: Announcement,
  options: WhatsAppBroadcastOptions = {}
): string {
  const settings = options.churchSettings || DEFAULT_CHURCH_SETTINGS;
  const churchName = settings.churchName || 'GMIT BETEL FUIMELANG';
  const klasis = settings.klasis || 'Klasis Alor Tengah Utara';
  const target = options.targetAudience ? `\n🎯 *Sasaran:* ${options.targetAudience}` : '';
  const dateStr = options.editionDate || announcement.date || new Date().toISOString().substring(0, 10);

  const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━';

  const parts = [
    `*${churchName.toUpperCase()}*`,
    `*${klasis.toUpperCase()}*`,
    divider,
    `📢 *WARTA PELAYANAN*`,
    `📌 *${announcement.title.trim().toUpperCase()}*`,
    `🏷️ *Kategori:* ${announcement.category}`,
    `📅 *Tanggal:* ${dateStr}${target}`,
    divider,
    '',
    options.customGreeting || 'Shalom Bapak/Ibu/Saudara-i warga jemaat yang dikasihi Tuhan Yesus Kristus,',
    '',
    announcement.content.trim(),
    '',
    divider,
    `👤 *Penanggung Jawab / Penulis:* ${announcement.author || 'Sekretariat Majelis Jemaat'}`,
    '',
    '🙏 _Tuhan Yesus Kristus Kepala Gereja senantiasa memberkati pelayanan dan persekutuan kita bersama. Amin._',
    '',
    `*Majelis Jemaat ${churchName}*`,
  ];

  if (settings.address) {
    parts.push(`📍 ${settings.address}`);
  }
  if (settings.phone) {
    parts.push(`📞 Kontak: ${settings.phone}`);
  }

  return parts.join('\n');
}

/**
 * Formats a collective list of announcements (e.g. weekly bulletin / warta mingguan) for WhatsApp broadcast.
 */
export function formatWeeklyWartaWhatsApp(
  announcements: Announcement[],
  options: WhatsAppBroadcastOptions = {}
): string {
  const settings = options.churchSettings || DEFAULT_CHURCH_SETTINGS;
  const churchName = settings.churchName || 'GMIT BETEL FUIMELANG';
  const klasis = settings.klasis || 'Klasis Alor Tengah Utara';
  const target = options.targetAudience || 'Seluruh Warga Jemaat & Rayon I - IV';
  const dateStr = options.editionDate || new Date().toISOString().substring(0, 10);

  const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━';

  if (!announcements || announcements.length === 0) {
    return [
      `*${churchName.toUpperCase()}*`,
      `*${klasis.toUpperCase()}*`,
      divider,
      `📢 *WARTA JEMAAT & PENGUMUMAN PELAYANAN*`,
      `📅 *Tanggal:* ${dateStr}`,
      `🎯 *Sasaran:* ${target}`,
      divider,
      '',
      'Saat ini belum ada warta atau pengumuman pelayanan aktif.',
      '',
      `*Majelis Jemaat ${churchName}*`,
    ].join('\n');
  }

  const sections: string[] = [
    `*${churchName.toUpperCase()}*`,
    `*${klasis.toUpperCase()}*`,
    divider,
    `📢 *WARTA JEMAAT & PENGUMUMAN PELAYANAN*`,
    `📅 *Edisi / Tanggal:* ${dateStr}`,
    `🎯 *Penerima:* ${target}`,
    divider,
    '',
    options.customGreeting ||
      'Shalom Bapak/Ibu/Saudara-i yang terkasih dalam Tuhan Yesus Kristus,\nBerikut kami sampaikan pokok-pokok warta dan agenda pelayanan jemaat untuk menjadi perhatian bersama:',
    '',
  ];

  announcements.forEach((a, idx) => {
    const num = idx + 1;
    const badge = a.isImportant ? '⭐ *[PENTING / UTAMA]* ' : '';
    sections.push(`${num}. ${badge}*${a.title.toUpperCase()}*`);
    sections.push(`   🏷️ _Kategori: ${a.category}_`);
    if (a.date && a.date !== dateStr) {
      sections.push(`   🗓️ _Tanggal Acara: ${a.date}_`);
    }
    // Indent content lines slightly or keep clean
    const formattedContent = a.content
      .split('\n')
      .map((line) => (line.trim() ? `   ${line.trim()}` : ''))
      .join('\n');
    sections.push(formattedContent);
    if (a.author) {
      sections.push(`   👤 _PJ: ${a.author}_`);
    }
    sections.push('');
  });

  sections.push(divider);
  sections.push(
    '🙏 Demikian warta pelayanan ini kami sampaikan. Kiranya kasih setia dan damai sejahtera dari Tuhan Yesus Kristus menyertai segala karya, persekutuan, dan keluarga kita sekalian. Haleluya!'
  );
  sections.push('');
  sections.push(`*Majelis Jemaat ${churchName}*`);

  if (settings.address) {
    sections.push(`📍 ${settings.address}`);
  }
  if (settings.phone) {
    sections.push(`📞 Sekretariat: ${settings.phone}`);
  }

  return sections.join('\n');
}

/**
 * Generates an official WhatsApp API link to share text directly to WhatsApp app / web.
 * If phoneNumber is provided, targets that number; otherwise opens group / contact picker.
 */
export function getWhatsAppShareUrl(text: string, phoneNumber?: string): string {
  const cleanPhone = cleanPhoneNumber(phoneNumber);
  const encodedText = encodeURIComponent(text);

  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }

  // Opens WhatsApp with prefilled message, prompting user to choose a group or chat
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}
