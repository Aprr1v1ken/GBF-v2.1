import test from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '../server/db.ts';

test('service_registrations table supports insert, retrieve, update status, and cleanup', () => {
  const db = getDb();

  const testId = 'test-reg-' + Date.now();
  const details = JSON.stringify({
    fullName: 'Anak Uji Baptisan',
    fatherName: 'Bapak Uji',
    motherName: 'Ibu Uji',
    birthPlace: 'Kupang',
    birthDate: '2024-01-01',
    rayon: 'Rayon 1',
    sacramentType: 'BAPTISAN_ANAK',
  });

  const now = new Date().toISOString();
  // Insert
  db.prepare(`
    INSERT INTO service_registrations (id, service_type, applicant_name, applicant_phone, details_json, status, admin_notes, created_at)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(testId, 'BAPTISM', 'Bapak Uji', '081234567890', details, 'Menunggu pemeriksaan berkas', now);

  // Retrieve
  const saved = db.prepare('SELECT * FROM service_registrations WHERE id = ?').get(testId) as any;
  assert.ok(saved);
  assert.equal(saved.service_type, 'BAPTISM');
  assert.equal(saved.applicant_name, 'Bapak Uji');
  assert.equal(saved.status, 'PENDING');

  const parsedDetails = JSON.parse(saved.details_json);
  assert.equal(parsedDetails.fullName, 'Anak Uji Baptisan');

  // Update status to VERIFIED / APPROVED
  db.prepare(`
    UPDATE service_registrations
    SET status = ?, admin_notes = ?
    WHERE id = ?
  `).run('APPROVED', 'Berkas lengkap dan telah diverifikasi', testId);

  const updated = db.prepare('SELECT status, admin_notes FROM service_registrations WHERE id = ?').get(testId) as any;
  assert.equal(updated.status, 'APPROVED');
  assert.equal(updated.admin_notes, 'Berkas lengkap dan telah diverifikasi');

  // Filter query test
  const list = db.prepare('SELECT * FROM service_registrations WHERE service_type = ?').all('BAPTISM') as any[];
  assert.ok(list.some(r => r.id === testId));

  // Cleanup
  db.prepare('DELETE FROM service_registrations WHERE id = ?').run(testId);
  const deleted = db.prepare('SELECT * FROM service_registrations WHERE id = ?').get(testId);
  assert.equal(deleted, undefined);
});
