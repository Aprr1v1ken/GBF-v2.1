import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAgePyramidData,
  hasValidBirthDate,
} from '../src/utils/age-pyramid.ts';
import {
  enqueueUniversalOfflineMutation,
  getUniversalOfflineMutations,
  clearUniversalOfflineMutations,
  syncUniversalOfflineMutations,
} from '../src/utils/offline-sync.ts';
import type { Member } from '../src/types/index.ts';

function ensureLocalStorageMock() {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
}

function makeMember(overrides: Partial<Member>): Member {
  return {
    id: overrides.id || 'm-1',
    memberNo: overrides.memberNo || 'GMIT-BF-2026-001',
    fullName: overrides.fullName || 'Anggota Uji',
    familyRole: overrides.familyRole || 'Kepala Keluarga',
    gender: overrides.gender || 'Laki-laki',
    birthDate: overrides.birthDate || '1990-01-15',
    address: overrides.address || 'Fuimelang',
    maritalStatus: overrides.maritalStatus || 'Menikah',
    rayonId: overrides.rayonId || 'r1',
    rayonName: overrides.rayonName || 'Rayon I',
    categorialGroupId: overrides.categorialGroupId || 'c4',
    categorialGroupName: overrides.categorialGroupName || 'PKB',
    membershipStatus: overrides.membershipStatus || 'Tetap',
    baptismStatus: overrides.baptismStatus || 'Sudah',
    confirmationStatus: overrides.confirmationStatus || 'Sudah',
    marriageChurchStatus: overrides.marriageChurchStatus || 'Sudah',
    joinDate: overrides.joinDate || '2026-01-01',
    status: overrides.status || 'Aktif',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

test('hasValidBirthDate validates YYYY-MM-DD strings strictly', () => {
  assert.equal(hasValidBirthDate('1995-07-20'), true);
  assert.equal(hasValidBirthDate('2020-02-29T00:00:00Z'), true);
  assert.equal(hasValidBirthDate(''), false);
  assert.equal(hasValidBirthDate('20-07-1995'), false);
  assert.equal(hasValidBirthDate('bukan-tanggal'), false);
});

test('buildAgePyramidData accurately buckets Laki-laki and Perempuan across 8 cohorts & filters by rayon', () => {
  const members: Member[] = [
    makeMember({ id: 'm1', gender: 'Laki-laki', birthDate: '2023-05-01', rayonName: 'Rayon I' }),   // age ~3 (0-5)
    makeMember({ id: 'm2', gender: 'Perempuan', birthDate: '2016-01-10', rayonName: 'Rayon I' }),   // age 10 (6-12)
    makeMember({ id: 'm3', gender: 'Laki-laki', birthDate: '2010-03-10', rayonName: 'Rayon II' }),  // age 16 (13-17)
    makeMember({ id: 'm4', gender: 'Perempuan', birthDate: '2001-06-15', rayonName: 'Rayon II' }),  // age 24 (18-29)
    makeMember({ id: 'm5', gender: 'Laki-laki', birthDate: '1991-02-20', rayonName: 'Rayon I' }),   // age 35 (30-39)
    makeMember({ id: 'm6', gender: 'Perempuan', birthDate: '1980-08-12', rayonName: 'Rayon III' }), // age 45 (40-49)
    makeMember({ id: 'm7', gender: 'Laki-laki', birthDate: '1970-11-01', rayonName: 'Rayon IV' }),  // age 55 (50-59)
    makeMember({ id: 'm8', gender: 'Perempuan', birthDate: '1958-04-04', rayonName: 'Rayon I' }),   // age 68 (60+)
    makeMember({ id: 'm9', gender: 'Laki-laki', birthDate: '', rayonName: 'Rayon I' }),             // missing birthDate
    makeMember({ id: 'm10', gender: 'Perempuan', birthDate: '1995-01-01', status: 'Pindah', rayonName: 'Rayon I' }), // inactive
  ];

  const detailed = buildAgePyramidData(members, {
    granularity: 'detailed',
    referenceDateStr: '2026-05-01',
  });

  assert.equal(detailed.totalActive, 9);
  assert.equal(detailed.totalWithValidAge, 8);
  assert.equal(detailed.missingBirthDateCount, 1);
  assert.equal(detailed.maleTotal, 4);
  assert.equal(detailed.femaleTotal, 4);
  assert.equal(detailed.productiveCount, 4);
  assert.equal(detailed.kidsAndTeensCount, 3);
  assert.equal(detailed.elderlyCount, 1);
  assert.equal(detailed.cohorts.length, 8);

  const cohort05 = detailed.cohorts.find((c) => c.key === '0-5')!;
  assert.equal(cohort05.male, 1);
  assert.equal(cohort05.maleNeg, -1);
  assert.equal(cohort05.female, 0);

  const cohort60 = detailed.cohorts.find((c) => c.key === '60+')!;
  assert.equal(cohort60.female, 1);
  assert.equal(cohort60.femalePos, 1);

  const rayonOneOnly = buildAgePyramidData(members, {
    granularity: 'gmit',
    rayonFilter: 'Rayon I',
    referenceDateStr: '2026-05-01',
  });
  assert.equal(rayonOneOnly.totalWithValidAge, 4);
  assert.equal(rayonOneOnly.cohorts.length, 5);
  assert.equal(detailed.domainMax % 2, 0);
  assert.ok(detailed.domainMax >= 6);
});

test('universal offline mutation queue compacts offline edits/deletes and syncs reliably', async () => {
  ensureLocalStorageMock();
  clearUniversalOfflineMutations();

  // Queue create, then update, for an offline family
  enqueueUniversalOfflineMutation({
    entity: 'family',
    action: 'create',
    targetId: 'offline-fam-1',
    payload: { headOfFamilyName: 'Keluarga Awal', address: 'Rayon I' },
    label: 'Keluarga Awal',
  });
  enqueueUniversalOfflineMutation({
    entity: 'family',
    action: 'update',
    targetId: 'offline-fam-1',
    payload: { headOfFamilyName: 'Keluarga Terkoreksi' },
    label: 'Keluarga Terkoreksi',
  });

  // Queue create then delete for an event -> should cancel each other out!
  enqueueUniversalOfflineMutation({
    entity: 'event',
    action: 'create',
    targetId: 'offline-ev-1',
    payload: { title: 'Batal' },
  });
  enqueueUniversalOfflineMutation({
    entity: 'event',
    action: 'delete',
    targetId: 'offline-ev-1',
  });

  // Queue finance transaction
  enqueueUniversalOfflineMutation({
    entity: 'finance',
    action: 'create',
    targetId: 'offline-fin-1',
    payload: { type: 'Pemasukan', amount: 250000, description: 'Kolekte Minggu' },
    label: 'Kolekte Minggu',
  });

  const queued = getUniversalOfflineMutations();
  assert.equal(queued.length, 2);
  assert.equal(queued[0].payload?.headOfFamilyName, 'Keluarga Terkoreksi');

  const syncedCalls: string[] = [];
  const res = await syncUniversalOfflineMutations({
    createFamily: async (data) => {
      syncedCalls.push(`family:${data.headOfFamilyName}`);
      return { success: true };
    },
    createFinance: async (data) => {
      syncedCalls.push(`finance:${data.amount}`);
      return { success: true };
    },
  });

  assert.equal(res.syncedCount, 2);
  assert.equal(res.failedCount, 0);
  assert.deepEqual(syncedCalls, ['family:Keluarga Terkoreksi', 'finance:250000']);
  assert.equal(getUniversalOfflineMutations().length, 0);
});
