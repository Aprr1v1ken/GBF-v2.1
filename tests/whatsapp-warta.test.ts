import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanPhoneNumber,
  formatSingleWartaWhatsApp,
  formatWeeklyWartaWhatsApp,
  getWhatsAppShareUrl,
} from '../src/utils/whatsapp-warta.ts';
import type { Announcement } from '../src/types/index.ts';

test('cleanPhoneNumber formats 08xx to 628xx and strips non-digits', () => {
  assert.equal(cleanPhoneNumber('0821-4455-6677'), '6282144556677');
  assert.equal(cleanPhoneNumber('+62 812 3456 7890'), '6281234567890');
  assert.equal(cleanPhoneNumber('62813-9999-0000'), '6281399990000');
  assert.equal(cleanPhoneNumber(''), '');
});

test('formatSingleWartaWhatsApp produces structured WhatsApp message with bolding and dividers', () => {
  const item: Announcement = {
    id: 'ann-1',
    title: 'Aksi Bakti Jumat Pembersihan Lingkungan Gereja',
    category: 'Bakti Jumat & Gotong Royong',
    date: '2026-11-06',
    author: 'Majelis Rayon II',
    content: 'Dihimbau kepada seluruh anggota jemaat Rayon II untuk hadir bersama membawa alat kebersihan.',
    isImportant: true,
  };

  const formatted = formatSingleWartaWhatsApp(item, {
    targetAudience: 'Rayon II',
  });

  assert.ok(formatted.includes('BETEL FUIMELANG'));
  assert.ok(formatted.includes('AKSI BAKTI JUMAT PEMBERSIHAN LINGKUNGAN GEREJA'));
  assert.ok(formatted.includes('Bakti Jumat & Gotong Royong'));
  assert.ok(formatted.includes('🎯 *Sasaran:* Rayon II'));
  assert.ok(formatted.includes('Majelis Rayon II'));
  assert.ok(formatted.includes('Dihimbau kepada seluruh anggota jemaat'));
});

test('formatWeeklyWartaWhatsApp formats multi-announcement bulletin with numbering', () => {
  const items: Announcement[] = [
    {
      id: 'ann-1',
      title: 'Ibadah Minggu dan Perjamuan Kudus',
      category: 'Warta Ibadah',
      date: '2026-11-08',
      author: 'Ketua Majelis Jemaat',
      content: 'Ibadah dimulai pukul 08.00 WITA. Mohon hadir 15 menit sebelumnya.',
      isImportant: true,
    },
    {
      id: 'ann-2',
      title: 'Latihan Paduan Suara Pemuda',
      category: 'Kegiatan Kategorial & Rayon',
      date: '2026-11-07',
      author: 'BPH Pemuda GMIT',
      content: 'Latihan di gedung gereja pukul 17.00 WITA.',
    },
  ];

  const formatted = formatWeeklyWartaWhatsApp(items, {
    editionDate: '2026-11-08',
    targetAudience: 'Seluruh Jemaat & Rayon I-IV',
  });

  assert.ok(formatted.includes('BETEL FUIMELANG'));
  assert.ok(formatted.includes('📢 *WARTA JEMAAT & PENGUMUMAN PELAYANAN*'));
  assert.ok(formatted.includes('1. ⭐ *[PENTING / UTAMA]* *IBADAH MINGGU DAN PERJAMUAN KUDUS*'));
  assert.ok(formatted.includes('2. *LATIHAN PADUAN SUARA PEMUDA*'));
  assert.ok(formatted.includes('🙏 Demikian warta pelayanan ini'));
});

test('getWhatsAppShareUrl returns valid api.whatsapp.com URL with encoded text and phone support', () => {
  const text = 'Shalom *Warta GMIT Betel*';
  const urlWithoutPhone = getWhatsAppShareUrl(text);
  assert.ok(urlWithoutPhone.startsWith('https://api.whatsapp.com/send?text='));
  assert.ok(urlWithoutPhone.includes(encodeURIComponent(text)));

  const urlWithPhone = getWhatsAppShareUrl(text, '0821-4455-6677');
  assert.ok(urlWithPhone.startsWith('https://api.whatsapp.com/send?phone=6282144556677&text='));
});
