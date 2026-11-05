import test from 'node:test';
import assert from 'node:assert/strict';
import type { Member, FinancialTransaction, Family } from '../src/types/index.ts';

test('Google Sheets export row mapping for members formats headers and values correctly', () => {
  const mockMember: Member = {
    id: 'm1',
    memberNo: 'GMIT-BF-2026-001',
    fullName: 'Yohanis Fuimelang',
    familyRole: 'Kepala Keluarga',
    gender: 'Laki-laki',
    birthDate: '1985-04-12',
    phone: '081234567890',
    rayonName: 'Rayon I',
    categorialGroupName: 'PKB',
    membershipStatus: 'Tetap',
    baptismStatus: 'Sudah',
    confirmationStatus: 'Sudah',
    marriageChurchStatus: 'Sudah',
    address: 'Desa Lembur Tengah',
    status: 'Aktif',
  };

  const expectedHeaders = [
    'No Anggota',
    'Nama Lengkap',
    'Peran Keluarga',
    'Jenis Kelamin',
    'Tanggal Lahir',
    'No HP',
    'Rayon Pelayanan',
    'Kategorial',
    'Status Anggota',
    'Baptis',
    'Sidi',
    'Nikah Gereja',
    'Alamat',
  ];

  assert.equal(expectedHeaders.length, 13);
  assert.equal(expectedHeaders[0], 'No Anggota');
  assert.equal(expectedHeaders[1], 'Nama Lengkap');

  const row = [
    mockMember.memberNo,
    mockMember.fullName,
    mockMember.familyRole,
    mockMember.gender,
    mockMember.birthDate,
    mockMember.phone,
    mockMember.rayonName || mockMember.rayonId,
    mockMember.categorialGroupName || mockMember.categorialGroupId,
    mockMember.membershipStatus,
    mockMember.baptismStatus,
    mockMember.confirmationStatus,
    mockMember.marriageChurchStatus,
    mockMember.address,
  ];

  assert.equal(row[0], 'GMIT-BF-2026-001');
  assert.equal(row[1], 'Yohanis Fuimelang');
  assert.equal(row[4], '1985-04-12');
  assert.equal(row.length, expectedHeaders.length);
});

test('Google Sheets export row mapping for families formats headers and values correctly', () => {
  const mockFamily: Family = {
    id: 'f1',
    familyNo: 'KK-BF-001',
    headOfFamilyName: 'Yohanis Fuimelang',
    rayonId: 'r1',
    rayonName: 'Rayon I',
    memberCount: 4,
    address: 'Fuimelang Pusat',
    phone: '081234567890',
    notes: 'Keluarga tetap aktif',
    createdAt: '2026-01-01',
  };

  const expectedHeaders = [
    'Nomor KK',
    'Nama Kepala Keluarga',
    'Rayon Pelayanan',
    'Jumlah Anggota Keluarga (Jiwa)',
    'Alamat Lengkap',
    'No Telepon / WA',
    'Catatan Khusus',
  ];

  const row = [
    mockFamily.familyNo,
    mockFamily.headOfFamilyName,
    mockFamily.rayonName || mockFamily.rayonId,
    mockFamily.memberCount || 0,
    mockFamily.address,
    mockFamily.phone || '-',
    mockFamily.notes || '-',
  ];

  assert.equal(row.length, expectedHeaders.length);
  assert.equal(row[0], 'KK-BF-001');
  assert.equal(row[3], 4);
});

test('Google Sheets export row mapping for finance formats headers and currency values correctly', () => {
  const mockTx: FinancialTransaction = {
    id: 't1',
    txNo: 'TX-2026-001',
    txDate: '2026-11-01',
    type: 'Pemasukan',
    category: 'Kolekte Kebaktian Minggu',
    amount: 1500000,
    description: 'Kolekte Ibadah Pagi',
    recordedBy: 'Bendahara Jemaat',
  };

  const expectedHeaders = [
    'No Transaksi',
    'Tanggal',
    'Jenis (Pemasukan/Pengeluaran)',
    'Kategori Kas',
    'Nominal (Rp)',
    'Keterangan',
    'Dicatat Oleh',
  ];

  const row = [
    mockTx.txNo,
    mockTx.txDate,
    mockTx.type,
    mockTx.category,
    mockTx.amount,
    mockTx.description,
    mockTx.recordedBy,
  ];

  assert.equal(row.length, expectedHeaders.length);
  assert.equal(row[0], 'TX-2026-001');
  assert.equal(row[4], 1500000);
});
