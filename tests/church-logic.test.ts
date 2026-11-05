import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAge,
  getAgeCategory,
  formatRupiah,
  formatDateDMY,
  generateMemberNo,
  generateFamilyNo,
  validateMemberInput,
  calculateChurchStats,
} from '../src/utils/church-logic.ts';
import type { Member, Family, FinancialTransaction } from '../src/types/index.ts';

test('calculateAge computes exact age across leap years and month boundaries', () => {
  assert.equal(calculateAge('1990-01-01', '2026-01-01'), 36);
  assert.equal(calculateAge('1990-12-31', '2026-01-01'), 35);
  assert.equal(calculateAge(''), 0);
  assert.equal(calculateAge('invalid-date'), 0);
});

test('getAgeCategory aligns with GMIT ministry conventions', () => {
  assert.equal(getAgeCategory(5), 'Anak');
  assert.equal(getAgeCategory(12), 'Anak');
  assert.equal(getAgeCategory(13), 'Remaja');
  assert.equal(getAgeCategory(17), 'Remaja');
  assert.equal(getAgeCategory(18), 'Pemuda');
  assert.equal(getAgeCategory(29), 'Pemuda');
  assert.equal(getAgeCategory(30), 'Dewasa');
  assert.equal(getAgeCategory(59), 'Dewasa');
  assert.equal(getAgeCategory(60), 'Lansia');
  assert.equal(getAgeCategory(85), 'Lansia');
});

test('formatRupiah formats IDR currency correctly', () => {
  const result = formatRupiah(1500000);
  assert.match(result, /1\.500\.000/);
  const neg = formatRupiah(-250000);
  assert.match(neg, /250\.000/);
});

test('formatDateDMY transforms ISO format to DD-MM-YYYY', () => {
  assert.equal(formatDateDMY('2026-11-05'), '05-11-2026');
  assert.equal(formatDateDMY(''), '-');
});

test('generateMemberNo and generateFamilyNo build consistent sequential identifiers', () => {
  const memberNo = generateMemberNo(1, 2026);
  assert.equal(memberNo, 'GMIT-BF-2026-001');

  const familyNo = generateFamilyNo(12);
  assert.equal(familyNo, 'KK-BF-012');
});

test('validateMemberInput checks required fields and formats', () => {
  const valid = validateMemberInput({
    fullName: 'Yohanis Fuimelang',
    gender: 'Laki-laki',
    birthDate: '1995-04-10',
    familyRole: 'Kepala Keluarga',
    rayonId: 'r1',
  });
  assert.equal(valid.valid, true);

  const missingName = validateMemberInput({
    fullName: '',
    gender: 'Laki-laki',
    familyRole: 'Kepala Keluarga',
    rayonId: 'r1',
  });
  assert.equal(missingName.valid, false);
});

test('calculateChurchStats aggregates demographics and finances accurately', () => {
  const mockMembers: Member[] = [
    {
      id: 'm1',
      memberNo: '01.0001',
      fullName: 'Yohanis',
      gender: 'Laki-laki',
      birthDate: '1980-01-01',
      familyRole: 'Kepala Keluarga',
      rayonId: 'r1',
      rayonName: 'Rayon I',
      categorialGroupId: 'c4',
      status: 'Aktif',
      membershipStatus: 'Tetap',
      baptismStatus: 'Sudah',
      confirmationStatus: 'Sudah',
      marriageChurchStatus: 'Sudah',
      maritalStatus: 'Menikah',
    },
    {
      id: 'm2',
      memberNo: '01.0002',
      fullName: 'Maria',
      gender: 'Perempuan',
      birthDate: '1985-06-15',
      familyRole: 'Istri',
      rayonId: 'r1',
      rayonName: 'Rayon I',
      categorialGroupId: 'c3',
      status: 'Aktif',
      membershipStatus: 'Tetap',
      baptismStatus: 'Sudah',
      confirmationStatus: 'Sudah',
      marriageChurchStatus: 'Sudah',
      maritalStatus: 'Menikah',
    },
  ];

  const mockFamilies: Family[] = [
    {
      id: 'f1',
      familyCardNo: 'KK-01.0001',
      headOfFamilyName: 'Yohanis',
      rayonId: 'r1',
      address: 'Fuimelang Pusat',
      memberCount: 2,
    },
  ];

  const mockTx: FinancialTransaction[] = [
    {
      id: 't1',
      date: '2026-11-01',
      type: 'Pemasukan',
      category: 'Kolekte Kebaktian Utama',
      amount: 1000000,
      description: 'Kolekte Minggu',
    },
    {
      id: 't2',
      date: '2026-11-02',
      type: 'Pengeluaran',
      category: 'Listrik & Air Gereja',
      amount: 300000,
      description: 'PLN & PDAM',
    },
  ];

  const stats = calculateChurchStats(mockMembers, mockFamilies, mockTx);
  assert.equal(stats.totalSoul, 2);
  assert.equal(stats.totalFamily, 1);
  assert.equal(stats.maleCount, 1);
  assert.equal(stats.femaleCount, 1);
  assert.equal(stats.finance.totalIncome, 1000000);
  assert.equal(stats.finance.totalExpense, 300000);
  assert.equal(stats.finance.balance, 700000);
});
