import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeExcelDate,
  resolveRayon,
  resolveCategorial,
  createExcelTemplateWorkbook,
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

test('normalizeExcelDate handles YYYY-MM-DD, DD/MM/YYYY and empty values', () => {
  assert.equal(normalizeExcelDate(''), '');
  assert.equal(normalizeExcelDate('1985-04-12'), '1985-04-12');
  assert.equal(normalizeExcelDate('12/04/1985'), '1985-04-12');
  assert.equal(normalizeExcelDate('05-08-2010'), '2010-08-05');
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
