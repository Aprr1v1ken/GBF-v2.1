import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  normalizeExcelDate,
  resolveRayon,
  resolveCategorial,
  createExcelTemplateWorkbook,
  parseExcelOrCsvFile,
} from '../src/utils/excel-import-export.ts';
import type { Rayon, CategorialGroup } from '../src/types/index.ts';

const mockRayons: Rayon[] = [
  { id: 'r1', code: 'RY-01', name: 'Rayon I', leaderName: 'Penatua 1', leaderPhone: '', coverageArea: '', familyCount: 0, memberCount: 0 },
  { id: 'r2', code: 'RY-02', name: 'Rayon II', leaderName: 'Penatua 2', leaderPhone: '', coverageArea: '', familyCount: 0, memberCount: 0 },
  { id: 'r3', code: 'RY-03', name: 'Rayon III', leaderName: 'Penatua 3', leaderPhone: '', coverageArea: '', familyCount: 0, memberCount: 0 },
  { id: 'r4', code: 'RY-04', name: 'Rayon IV', leaderName: 'Penatua 4', leaderPhone: '', coverageArea: '', familyCount: 0, memberCount: 0 },
];

const mockCategorials: CategorialGroup[] = [
  { id: 'c1', code: 'PAR', name: 'Pelayanan Anak dan Remaja (PAR)', targetAgeDesc: '0-15', coordinator: '', memberCount: 0 },
  { id: 'c2', code: 'PEMUDA', name: 'Gerakan Pemuda GMIT (GP GMIT)', targetAgeDesc: '16-30', coordinator: '', memberCount: 0 },
  { id: 'c3', code: 'PKP', name: 'Persekutuan Kaum Perempuan GMIT (PKP)', targetAgeDesc: 'Ibu-ibu', coordinator: '', memberCount: 0 },
  { id: 'c4', code: 'PKB', name: 'Persekutuan Kaum Bapak GMIT (PKB)', targetAgeDesc: 'Bapak-bapak', coordinator: '', memberCount: 0 },
  { id: 'c5', code: 'LANSIA', name: 'Persekutuan Usia Indah (Lansia)', targetAgeDesc: '60+', coordinator: '', memberCount: 0 },
];

test('normalizeExcelDate handles YYYY-MM-DD, DD/MM/YYYY, empty values, and rejects invalid dates', () => {
  assert.equal(normalizeExcelDate(''), '');
  assert.equal(normalizeExcelDate('1985-04-12'), '1985-04-12');
  assert.equal(normalizeExcelDate('12/04/1985'), '1985-04-12');
  assert.equal(normalizeExcelDate('05-08-2010'), '2010-08-05');
  assert.equal(normalizeExcelDate('bukan tanggal'), '');
  assert.equal(normalizeExcelDate('32/13/2020'), '');
  assert.equal(normalizeExcelDate('2021-02-30'), '');
});

test('resolveRayon correctly resolves Rayon I through IV by number, name, or code', () => {
  assert.equal(resolveRayon('Rayon I', mockRayons).id, 'r1');
  assert.equal(resolveRayon('rayon 1', mockRayons).id, 'r1');
  assert.equal(resolveRayon('Rayon II', mockRayons).id, 'r2');
  assert.equal(resolveRayon('RY-03', mockRayons).id, 'r3');
  assert.equal(resolveRayon('Rayon IV', mockRayons).id, 'r4');
});

test('resolveCategorial maps explicit code and falls back to age and gender', () => {
  // Explicit
  assert.equal(resolveCategorial('PAR', '', 'Laki-laki', mockCategorials).id, 'c1');
  assert.equal(resolveCategorial('PEMUDA', '', 'Laki-laki', mockCategorials).id, 'c2');
  assert.equal(resolveCategorial('PKP', '', 'Perempuan', mockCategorials).id, 'c3');

  // Age based: child (age <= 15)
  assert.equal(resolveCategorial('', '2018-05-10', 'Laki-laki', mockCategorials).id, 'c1');
  // Age based: elder (>= 60)
  assert.equal(resolveCategorial('', '1955-01-01', 'Perempuan', mockCategorials).id, 'c5');
});

test('createExcelTemplateWorkbook builds valid sheets with expected headers', () => {
  const wb = createExcelTemplateWorkbook(mockRayons, mockCategorials);
  assert.ok(wb.SheetNames.includes('DATA JEMAAT & KK'));
  assert.ok(wb.SheetNames.includes('PETUNJUK & REFERENSI'));

  const ws = wb.Sheets['DATA JEMAAT & KK'];
  assert.ok(ws);
});

test('parseExcelOrCsvFile retains malformed rows with PERLU KOREKSI tags and skips completely blank rows', async () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([
    {
      No_KK: 'KK-01',
      Nama_Lengkap: 'Yohanes Tefa',
      Jenis_Kelamin: 'Laki-laki',
      Tanggal_Lahir: '1985-05-10',
      NIK: '5305011005850001',
      Rayon: 'Rayon I',
    },
    {
      No_KK: '',
      Nama_Lengkap: '',
      Jenis_Kelamin: '',
      Tanggal_Lahir: '',
      NIK: '',
      Rayon: '',
    },
    {
      No_KK: 'KK-02',
      Nama_Lengkap: '',
      Jenis_Kelamin: 'Tidak Jelas',
      Tanggal_Lahir: 'bukan-tanggal',
      NIK: '12345',
      Rayon: 'Rayon II',
    },
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'DATA JEMAAT & KK');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const mockFile = {
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  } as unknown as File;

  const parsed = await parseExcelOrCsvFile(mockFile, mockRayons, mockCategorials, []);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.totalValid, 1);
  assert.equal(parsed.totalInvalid, 1);

  assert.equal(parsed.rows[0].hasWarning, false);
  assert.equal(parsed.rows[0].rayonId, 'r1');

  const badRow = parsed.rows[1];
  assert.equal(badRow.isValid, true);
  assert.equal(badRow.hasWarning, true);
  assert.equal(badRow.birthDate, '2000-01-01');
  assert.match(badRow.fullName, /Perlu Koreksi Nama/);
  assert.match(badRow.notes || '', /PERLU KOREKSI:/);
  assert.ok(badRow.errors.length >= 3);
});
