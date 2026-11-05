import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDateParts,
  getUpcomingBirthdays,
  getUpcomingAnniversaries,
  getAllUpcomingCelebrations,
  generateBirthdayWhatsAppMessage,
  generateAnniversaryWhatsAppMessage,
} from '../src/utils/celebrations.ts';
import type { Member } from '../src/types/index.ts';

test('parseDateParts parses YYYY-MM-DD, DD/MM/YYYY, and DD-MM-YYYY accurately', () => {
  const p1 = parseDateParts('1990-05-15');
  assert.deepEqual(p1, { year: 1990, month: 4, day: 15 }); // 0-indexed month

  const p2 = parseDateParts('25/12/1985');
  assert.deepEqual(p2, { year: 1985, month: 11, day: 25 });

  const p3 = parseDateParts('01-01-2000');
  assert.deepEqual(p3, { year: 2000, month: 0, day: 1 });

  assert.equal(parseDateParts(''), null);
  assert.equal(parseDateParts(undefined), null);
  assert.equal(parseDateParts('invalid-date'), null);
});

test('getUpcomingBirthdays identifies upcoming birthdays and computes age correctly', () => {
  // Use a fixed reference date: October 15, 2026
  const refDate = new Date(2026, 9, 15); // Month 9 is October (0-indexed)

  const mockMembers: Member[] = [
    {
      id: 'm1',
      memberNo: '001',
      fullName: 'Yohanes Alor',
      status: 'Aktif',
      birthDate: '1995-10-15', // Today!
      birthPlace: 'Kalabahi',
      gender: 'Laki-laki',
      familyRole: 'Kepala Keluarga',
      address: 'Fuimelang',
      rayonId: 'r1',
      rayonName: 'Rayon I',
      categorialGroupId: 'c1',
      membershipStatus: 'Tetap',
      baptismStatus: 'Sudah',
      confirmationStatus: 'Sudah',
      marriageChurchStatus: 'Sudah',
      maritalStatus: 'Menikah',
      phone: '081234567890',
      kelurahan: 'Fuimelang',
      kecamatan: 'Teluk Mutiara',
      kabupaten: 'Alor',
    },
    {
      id: 'm2',
      memberNo: '002',
      fullName: 'Maria Alor',
      status: 'Aktif',
      birthDate: '1998-10-18', // 3 days later
      birthPlace: 'Kalabahi',
      gender: 'Perempuan',
      familyRole: 'Istri',
      address: 'Fuimelang',
      rayonId: 'r1',
      rayonName: 'Rayon I',
      categorialGroupId: 'c1',
      membershipStatus: 'Tetap',
      baptismStatus: 'Sudah',
      confirmationStatus: 'Sudah',
      marriageChurchStatus: 'Sudah',
      maritalStatus: 'Menikah',
      phone: '081234567891',
      kelurahan: 'Fuimelang',
      kecamatan: 'Teluk Mutiara',
      kabupaten: 'Alor',
    },
    {
      id: 'm3',
      memberNo: '003',
      fullName: 'Petrus Nonaktif',
      status: 'Pindah', // Inactive
      birthDate: '1990-10-15',
      birthPlace: 'Kupang',
      gender: 'Laki-laki',
      familyRole: 'Kepala Keluarga',
      address: 'Kupang',
      rayonId: 'r2',
      categorialGroupId: 'c1',
      membershipStatus: 'Tetap',
      baptismStatus: 'Sudah',
      confirmationStatus: 'Sudah',
      marriageChurchStatus: 'Sudah',
      maritalStatus: 'Menikah',
      phone: '',
      kelurahan: '',
      kecamatan: '',
      kabupaten: '',
    },
  ];

  const birthdays = getUpcomingBirthdays(mockMembers, 7, refDate);

  // m3 is inactive, should be excluded
  assert.equal(birthdays.length, 2);

  // Yohanes: today (15 Oct), turning 2026 - 1995 = 31
  const b1 = birthdays.find((b) => b.member.id === 'm1');
  assert.ok(b1);
  assert.equal(b1.isToday, true);
  assert.equal(b1.diffDays, 0);
  assert.equal(b1.turningAge, 31);
  assert.ok(b1.waUrl);
  assert.ok(b1.waUrl.includes('6281234567890'));

  // Maria: 18 Oct, turning 2026 - 1998 = 28
  const b2 = birthdays.find((b) => b.member.id === 'm2');
  assert.ok(b2);
  assert.equal(b2.diffDays, 3);
  assert.equal(b2.isToday, false);
  assert.equal(b2.turningAge, 28);
});

test('getUpcomingAnniversaries detects wedding anniversaries and deduplicates couples in same household', () => {
  const refDate = new Date(2026, 9, 20); // 20 October 2026

  const mockCouple: Member[] = [
    {
      id: 'h1',
      memberNo: '010',
      fullName: 'Bpk. Markus Duka',
      status: 'Aktif',
      birthDate: '1980-01-01',
      birthPlace: 'Alor',
      gender: 'Laki-laki',
      familyRole: 'Kepala Keluarga',
      familyId: 'fam-duka-01',
      familyName: 'Keluarga Markus Duka',
      address: 'Fuimelang',
      rayonId: 'r1',
      rayonName: 'Rayon I',
      categorialGroupId: 'c1',
      membershipStatus: 'Tetap',
      baptismStatus: 'Sudah',
      confirmationStatus: 'Sudah',
      marriageChurchStatus: 'Sudah',
      maritalStatus: 'Menikah',
      marriageDate: '2016-10-21', // Tomorrow!
      spouseName: 'Ibu Marta Duka',
      phone: '085239123456',
      kelurahan: 'Fuimelang',
      kecamatan: 'Teluk Mutiara',
      kabupaten: 'Alor',
    },
    {
      id: 'w1',
      memberNo: '011',
      fullName: 'Ibu Marta Duka',
      status: 'Aktif',
      birthDate: '1984-02-02',
      birthPlace: 'Alor',
      gender: 'Perempuan',
      familyRole: 'Istri',
      familyId: 'fam-duka-01',
      familyName: 'Keluarga Markus Duka',
      address: 'Fuimelang',
      rayonId: 'r1',
      rayonName: 'Rayon I',
      categorialGroupId: 'c1',
      membershipStatus: 'Tetap',
      baptismStatus: 'Sudah',
      confirmationStatus: 'Sudah',
      marriageChurchStatus: 'Sudah',
      maritalStatus: 'Menikah',
      marriageDate: '2016-10-21', // Same wedding date
      spouseName: 'Bpk. Markus Duka',
      phone: '085239123457',
      kelurahan: 'Fuimelang',
      kecamatan: 'Teluk Mutiara',
      kabupaten: 'Alor',
    },
  ];

  const anniversaries = getUpcomingAnniversaries(mockCouple, 7, refDate);

  // Must deduplicate to exactly 1 anniversary notification for the couple
  assert.equal(anniversaries.length, 1);
  const a = anniversaries[0];
  assert.equal(a.isTomorrow, true);
  assert.equal(a.diffDays, 1);
  assert.equal(a.yearsMarried, 10); // 2026 - 2016
  assert.ok(a.waUrl);
  assert.ok(a.waUrl.includes('6285239123456'));
});

test('getAllUpcomingCelebrations integrates 7-day notification window', () => {
  const refDate = new Date(2026, 9, 10);

  const testMembers: Member[] = [
    {
      id: 't1',
      memberNo: '101',
      fullName: 'Jemaat HUT Hari Ini',
      status: 'Aktif',
      birthDate: '2000-10-10', // diffDays 0
      birthPlace: 'Alor',
      gender: 'Laki-laki',
      familyRole: 'Kepala Keluarga',
      address: 'Fuimelang',
      rayonId: 'r1',
      categorialGroupId: 'c1',
      membershipStatus: 'Tetap',
      baptismStatus: 'Sudah',
      confirmationStatus: 'Sudah',
      marriageChurchStatus: 'Sudah',
      maritalStatus: 'Belum Menikah',
      phone: '081200000001',
      kelurahan: '',
      kecamatan: '',
      kabupaten: '',
    },
    {
      id: 't2',
      memberNo: '102',
      fullName: 'Jemaat HUT 5 Hari Lagi',
      status: 'Aktif',
      birthDate: '1995-10-15', // diffDays 5
      birthPlace: 'Alor',
      gender: 'Perempuan',
      familyRole: 'Anak',
      address: 'Fuimelang',
      rayonId: 'r1',
      categorialGroupId: 'c1',
      membershipStatus: 'Tetap',
      baptismStatus: 'Sudah',
      confirmationStatus: 'Sudah',
      marriageChurchStatus: 'Belum',
      maritalStatus: 'Belum Menikah',
      phone: '081200000002',
      kelurahan: '',
      kecamatan: '',
      kabupaten: '',
    },
    {
      id: 't3',
      memberNo: '103',
      fullName: 'Jemaat HUT Jauh (20 Hari Lagi)',
      status: 'Aktif',
      birthDate: '1992-10-30', // diffDays 20 (beyond 7 days)
      birthPlace: 'Alor',
      gender: 'Laki-laki',
      familyRole: 'Kepala Keluarga',
      address: 'Fuimelang',
      rayonId: 'r1',
      categorialGroupId: 'c1',
      membershipStatus: 'Tetap',
      baptismStatus: 'Sudah',
      confirmationStatus: 'Sudah',
      marriageChurchStatus: 'Belum',
      maritalStatus: 'Belum Menikah',
      phone: '',
      kelurahan: '',
      kecamatan: '',
      kabupaten: '',
    },
  ];

  const celebrations = getAllUpcomingCelebrations(testMembers, 7, refDate);
  assert.equal(celebrations.length, 2);
  assert.equal(celebrations[0].id, 'bday-t1');
  assert.equal(celebrations[0].isToday, true);
  assert.equal(celebrations[1].id, 'bday-t2');
  assert.equal(celebrations[1].diffDays, 5);
});

test('generateBirthdayWhatsAppMessage and generateAnniversaryWhatsAppMessage produce biblical pastoral text', () => {
  const member: Member = {
    id: 'b1',
    memberNo: '201',
    fullName: 'Yosias Banik',
    status: 'Aktif',
    birthDate: '1985-05-20',
    birthPlace: 'Kalabahi',
    gender: 'Laki-laki',
    familyRole: 'Kepala Keluarga',
    address: 'RT 02 RW 01',
    rayonId: 'r1',
    categorialGroupId: 'c1',
    membershipStatus: 'Tetap',
    baptismStatus: 'Sudah',
    confirmationStatus: 'Sudah',
    marriageChurchStatus: 'Sudah',
    maritalStatus: 'Menikah',
    marriageDate: '2010-08-12',
    spouseName: 'Ester Banik',
    phone: '08123456789',
    kelurahan: 'Fuimelang',
    kecamatan: 'Teluk Mutiara',
    kabupaten: 'Alor',
  };

  const bMsg = generateBirthdayWhatsAppMessage(member, 41);
  assert.ok(bMsg.includes('Yosias Banik'));
  assert.ok(bMsg.includes('HARI ULANG TAHUN KE-41'));
  assert.ok(bMsg.includes('Bilangan 6:24-26'));
  assert.ok(bMsg.includes('GMIT Jemaat Betel Fuimelang'));

  const aMsg = generateAnniversaryWhatsAppMessage(member, 16, 'Ester Banik');
  assert.ok(aMsg.includes('Yosias Banik & Ester Banik'));
  assert.ok(aMsg.includes('HARI ULANG TAHUN PERNIKAHAN KE-16'));
  assert.ok(aMsg.includes('Matius 19:6'));
  assert.ok(aMsg.includes('Kolose 3:14'));
});
