import { Router } from 'express';
import { getDb } from './db.ts';
import { isSuperAdmin } from './auth.ts';

/**
 * Additional CRUD endpoints used by the Super Admin data controls.
 * Keeping these small handlers separate makes the original API easier to audit.
 */
export const adminCrudRouter = Router();

function logAction(action: string, module: string, details: string) {
  try {
    const db = getDb();
    const id = `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.prepare('INSERT INTO audit_logs (id, user_id, user_name, action, module, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, 'admin', 'Admin', action, module, details, timestamp);
  } catch (error) {
    console.warn('Could not write admin audit log:', error);
  }
}

function errorResponse(res: any, error: any, fallback: string) {
  console.error(fallback, error);
  return res.status(500).json({ success: false, message: `${fallback}: ${error?.message || 'Kesalahan server'}` });
}

function required(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function canMutateDocument(user: any, accessLevel: string) {
  return accessLevel !== 'Admin' || isSuperAdmin(user) || user?.role === 'Admin Gereja';
}

type CoordinateResult =
  | { latitude: number | null; longitude: number | null; error?: never }
  | { error: string; latitude?: never; longitude?: never };

function readRayonCoordinates(data: any): CoordinateResult {
  const hasLatitude = data.latitude !== undefined && data.latitude !== null && data.latitude !== '';
  const hasLongitude = data.longitude !== undefined && data.longitude !== null && data.longitude !== '';
  if (!hasLatitude && !hasLongitude) return { latitude: null, longitude: null };
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  if (!hasLatitude || !hasLongitude || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: 'Latitude dan longitude harus diisi bersama dengan nilai yang valid.' };
  }
  return { latitude, longitude };
}

// Rayon pelayanan: create, edit, and safely delete unused rows.
adminCrudRouter.post('/rayons', (req, res) => {
  const data = req.body || {};
  if (!required(data.name)) return res.status(400).json({ success: false, message: 'Nama rayon wajib diisi' });
  const coordinates = readRayonCoordinates(data);
  if (coordinates.error) return res.status(400).json({ success: false, message: coordinates.error });
  const db = getDb();
  const id = `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    db.prepare('INSERT INTO rayons (id, code, name, leader_name, leader_phone, coverage_area, notes, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, data.code || `RY-${Date.now().toString().slice(-3)}`, data.name.trim(), data.leaderName || '', data.leaderPhone || '', data.coverageArea || '', data.notes || '', coordinates.latitude ?? null, coordinates.longitude ?? null);
    logAction('Tambah Rayon', 'Rayon Pelayanan', `Menambahkan ${data.name}`);
    res.json({ success: true, id, message: 'Rayon berhasil ditambahkan' });
  } catch (error) { return errorResponse(res, error, 'Gagal menambahkan rayon'); }
});

adminCrudRouter.put('/rayons/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const data = req.body || {};
  try {
    const old = db.prepare('SELECT * FROM rayons WHERE id = ?').get(id) as any;
    if (!old) return res.status(404).json({ success: false, message: 'Rayon tidak ditemukan' });
    const name = data.name !== undefined ? data.name : old.name;
    if (!required(name)) return res.status(400).json({ success: false, message: 'Nama rayon wajib diisi' });
    const coordinates: CoordinateResult = (data.latitude !== undefined || data.longitude !== undefined)
      ? readRayonCoordinates(data)
      : { latitude: old.latitude ?? null, longitude: old.longitude ?? null };
    if (coordinates.error) return res.status(400).json({ success: false, message: coordinates.error });
    db.prepare('UPDATE rayons SET code = ?, name = ?, leader_name = ?, leader_phone = ?, coverage_area = ?, notes = ?, latitude = ?, longitude = ? WHERE id = ?')
      .run(data.code ?? old.code, name.trim(), data.leaderName ?? old.leader_name ?? '', data.leaderPhone ?? old.leader_phone ?? '', data.coverageArea ?? old.coverage_area ?? '', data.notes ?? old.notes ?? '', coordinates.latitude ?? null, coordinates.longitude ?? null, id);
    logAction('Ubah Rayon', 'Rayon Pelayanan', `Memperbarui ${name}`);
    res.json({ success: true, message: 'Rayon berhasil diperbarui' });
  } catch (error) { return errorResponse(res, error, 'Gagal memperbarui rayon'); }
});

adminCrudRouter.delete('/rayons/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  try {
    const used = db.prepare('SELECT (SELECT count(*) FROM members WHERE rayon_id = ?) + (SELECT count(*) FROM families WHERE rayon_id = ?) AS count').get(id, id) as any;
    if (Number(used?.count || 0) > 0) return res.status(409).json({ success: false, message: 'Rayon masih memiliki jemaat atau keluarga. Pindahkan data terlebih dahulu sebelum menghapus rayon.' });
    const result = db.prepare('DELETE FROM rayons WHERE id = ?').run(id);
    if (!result.changes) return res.status(404).json({ success: false, message: 'Rayon tidak ditemukan' });
    logAction('Hapus Rayon', 'Rayon Pelayanan', `Menghapus rayon ${id}`);
    res.json({ success: true, message: 'Rayon berhasil dihapus' });
  } catch (error) { return errorResponse(res, error, 'Gagal menghapus rayon'); }
});

// Kategorial GMIT.
adminCrudRouter.post('/categorials', (req, res) => {
  const data = req.body || {};
  if (!required(data.name)) return res.status(400).json({ success: false, message: 'Nama kategorial wajib diisi' });
  const db = getDb();
  const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    db.prepare('INSERT INTO categorial_groups (id, code, name, target_age_desc, coordinator) VALUES (?, ?, ?, ?, ?)')
      .run(id, data.code || `CAT-${Date.now().toString().slice(-3)}`, data.name.trim(), data.targetAgeDesc || '', data.coordinator || '');
    logAction('Tambah Kategorial', 'Kategorial GMIT', `Menambahkan ${data.name}`);
    res.json({ success: true, id, message: 'Kategorial berhasil ditambahkan' });
  } catch (error) { return errorResponse(res, error, 'Gagal menambahkan kategorial'); }
});

adminCrudRouter.put('/categorials/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const data = req.body || {};
  try {
    const old = db.prepare('SELECT * FROM categorial_groups WHERE id = ?').get(id) as any;
    if (!old) return res.status(404).json({ success: false, message: 'Kategorial tidak ditemukan' });
    const name = data.name !== undefined ? data.name : old.name;
    if (!required(name)) return res.status(400).json({ success: false, message: 'Nama kategorial wajib diisi' });
    db.prepare('UPDATE categorial_groups SET code = ?, name = ?, target_age_desc = ?, coordinator = ? WHERE id = ?')
      .run(data.code ?? old.code, name.trim(), data.targetAgeDesc ?? old.target_age_desc ?? '', data.coordinator ?? old.coordinator ?? '', id);
    logAction('Ubah Kategorial', 'Kategorial GMIT', `Memperbarui ${name}`);
    res.json({ success: true, message: 'Kategorial berhasil diperbarui' });
  } catch (error) { return errorResponse(res, error, 'Gagal memperbarui kategorial'); }
});

adminCrudRouter.delete('/categorials/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  try {
    const used = db.prepare('SELECT count(*) AS count FROM members WHERE categorial_group_id = ?').get(id) as any;
    if (Number(used?.count || 0) > 0) return res.status(409).json({ success: false, message: 'Kategorial masih digunakan oleh data jemaat. Ubah kategorial jemaat terlebih dahulu.' });
    const result = db.prepare('DELETE FROM categorial_groups WHERE id = ?').run(id);
    if (!result.changes) return res.status(404).json({ success: false, message: 'Kategorial tidak ditemukan' });
    logAction('Hapus Kategorial', 'Kategorial GMIT', `Menghapus kategorial ${id}`);
    res.json({ success: true, message: 'Kategorial berhasil dihapus' });
  } catch (error) { return errorResponse(res, error, 'Gagal menghapus kategorial'); }
});

// Absensi: support correcting or removing an incorrectly entered register.
adminCrudRouter.put('/attendance/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const data = req.body || {};
  try {
    const old = db.prepare('SELECT * FROM attendance_records WHERE id = ?').get(id) as any;
    if (!old) return res.status(404).json({ success: false, message: 'Catatan absensi tidak ditemukan' });
    const male = Math.max(0, Number(data.maleCount ?? old.male_count) || 0);
    const female = Math.max(0, Number(data.femaleCount ?? old.female_count) || 0);
    const children = Math.max(0, Number(data.childrenCount ?? old.children_count) || 0);
    db.prepare('UPDATE attendance_records SET event_id = ?, event_title = ?, date = ?, male_count = ?, female_count = ?, children_count = ?, total_count = ?, notes = ?, recorded_by = ? WHERE id = ?')
      .run(data.eventId ?? old.event_id, data.eventTitle ?? old.event_title, data.date ?? old.date, male, female, children, male + female + children, data.notes ?? old.notes ?? '', data.recordedBy ?? old.recorded_by ?? '', id);
    logAction('Ubah Absensi', 'Absensi & Kehadiran', `Memperbarui absensi ${data.eventTitle ?? old.event_title}`);
    res.json({ success: true, message: 'Absensi berhasil diperbarui' });
  } catch (error) { return errorResponse(res, error, 'Gagal memperbarui absensi'); }
});

adminCrudRouter.delete('/attendance/:id', (req, res) => {
  const db = getDb();
  try {
    const result = db.prepare('DELETE FROM attendance_records WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ success: false, message: 'Catatan absensi tidak ditemukan' });
    logAction('Hapus Absensi', 'Absensi & Kehadiran', `Menghapus absensi ${req.params.id}`);
    res.json({ success: true, message: 'Absensi berhasil dihapus' });
  } catch (error) { return errorResponse(res, error, 'Gagal menghapus absensi'); }
});

// Finance: editing preserves the original transaction number unless supplied.
adminCrudRouter.put('/finance/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const data = req.body || {};
  try {
    const old = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(id) as any;
    if (!old) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    const amount = Number(data.amount ?? old.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: 'Jumlah transaksi harus lebih dari nol' });
    db.prepare('UPDATE financial_transactions SET tx_no = ?, tx_date = ?, type = ?, category = ?, amount = ?, description = ?, recorded_by = ? WHERE id = ?')
      .run(data.txNo ?? old.tx_no, data.txDate ?? old.tx_date, data.type ?? old.type, data.category ?? old.category, amount, data.description ?? old.description ?? '', data.recordedBy ?? old.recorded_by ?? '', id);
    logAction('Ubah Transaksi', 'Keuangan Kas Gereja', `Memperbarui transaksi ${data.txNo ?? old.tx_no}`);
    res.json({ success: true, message: 'Transaksi berhasil diperbarui' });
  } catch (error) { return errorResponse(res, error, 'Gagal memperbarui transaksi'); }
});

// Documents: metadata can be corrected without re-uploading the original file.
adminCrudRouter.put('/documents/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const data = req.body || {};
  try {
    const old = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
    if (!old) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    const user = (req as any).authUser;
    if (!canMutateDocument(user, old.access_level) || !canMutateDocument(user, data.accessLevel ?? old.access_level)) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk mengubah dokumen Admin.' });
    }
    db.prepare('UPDATE documents SET doc_no = ?, title = ?, category = ?, member_id = ?, file_name = ?, file_size = ?, access_level = ? WHERE id = ?')
      .run(data.docNo ?? old.doc_no, data.title ?? old.title, data.category ?? old.category, data.memberId ?? old.member_id, data.fileName ?? old.file_name, data.fileSize ?? old.file_size, data.accessLevel ?? old.access_level, id);
    logAction('Ubah Dokumen', 'Dokumen & Arsip', `Memperbarui dokumen ${data.title ?? old.title}`);
    res.json({ success: true, message: 'Dokumen berhasil diperbarui' });
  } catch (error) { return errorResponse(res, error, 'Gagal memperbarui dokumen'); }
});

adminCrudRouter.delete('/documents/:id', (req, res) => {
  const db = getDb();
  try {
    const old = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id) as any;
    if (!old) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    if (!canMutateDocument((req as any).authUser, old.access_level)) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk menghapus dokumen Admin.' });
    }
    const result = db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    logAction('Hapus Dokumen', 'Dokumen & Arsip', `Menghapus dokumen ${req.params.id}`);
    res.json({ success: true, message: 'Dokumen berhasil dihapus' });
  } catch (error) { return errorResponse(res, error, 'Gagal menghapus dokumen'); }
});

// Sacrament registers: edit the same fields that can be entered at creation.
adminCrudRouter.put('/sacraments/:type/:id', (req, res) => {
  const db = getDb();
  const { type, id } = req.params;
  const data = req.body || {};
  const table = type === 'baptis' ? 'baptisms' : type === 'sidi' ? 'confirmations' : type === 'nikah' ? 'marriages' : null;
  if (!table) return res.status(400).json({ success: false, message: 'Jenis sakramen tidak valid' });
  try {
    const old = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as any;
    if (!old) return res.status(404).json({ success: false, message: 'Catatan sakramen tidak ditemukan' });
    const value = (key: string, column: string) => data[key] !== undefined ? data[key] : old[column];
    if (type === 'baptis') {
      db.prepare('UPDATE baptisms SET register_no = ?, member_id = ?, member_name = ?, birth_date = ?, parent_names = ?, baptism_date = ?, church_place = ?, minister_name = ?, certificate_no = ?, witnesses = ?, notes = ? WHERE id = ?')
        .run(value('registerNo', 'register_no'), value('memberId', 'member_id'), value('memberName', 'member_name'), value('birthDate', 'birth_date') || '', value('parentNames', 'parent_names') || '', value('baptismDate', 'baptism_date'), value('churchPlace', 'church_place'), value('ministerName', 'minister_name'), value('certificateNo', 'certificate_no'), value('witnesses', 'witnesses') || '', value('notes', 'notes') || '', id);
      db.prepare("UPDATE members SET baptism_status = 'Sudah', baptism_date = ? WHERE id = ?").run(value('baptismDate', 'baptism_date'), value('memberId', 'member_id'));
    } else if (type === 'sidi') {
      db.prepare('UPDATE confirmations SET register_no = ?, member_id = ?, member_name = ?, confirmation_date = ?, church_place = ?, minister_name = ?, certificate_no = ?, bible_verse = ?, notes = ? WHERE id = ?')
        .run(value('registerNo', 'register_no'), value('memberId', 'member_id'), value('memberName', 'member_name'), value('confirmationDate', 'confirmation_date'), value('churchPlace', 'church_place'), value('ministerName', 'minister_name'), value('certificateNo', 'certificate_no'), value('bibleVerse', 'bible_verse') || '', value('notes', 'notes') || '', id);
      db.prepare("UPDATE members SET confirmation_status = 'Sudah', confirmation_date = ? WHERE id = ?").run(value('confirmationDate', 'confirmation_date'), value('memberId', 'member_id'));
    } else {
      db.prepare('UPDATE marriages SET register_no = ?, groom_id = ?, groom_name = ?, bride_id = ?, bride_name = ?, blessing_date = ?, church_place = ?, minister_name = ?, certificate_no = ?, witness_names = ?, notes = ? WHERE id = ?')
        .run(value('registerNo', 'register_no'), value('groomId', 'groom_id'), value('groomName', 'groom_name'), value('brideId', 'bride_id'), value('brideName', 'bride_name'), value('blessingDate', 'blessing_date'), value('churchPlace', 'church_place'), value('ministerName', 'minister_name'), value('certificateNo', 'certificate_no'), value('witnessNames', 'witness_names') || '', value('notes', 'notes') || '', id);
    }
    logAction('Ubah Sakramen', 'Sakramen & Peristiwa', `Memperbarui register ${type} ${id}`);
    res.json({ success: true, message: 'Catatan sakramen berhasil diperbarui' });
  } catch (error) { return errorResponse(res, error, 'Gagal memperbarui sakramen'); }
});

// Mutations can be corrected or removed by an administrator.
adminCrudRouter.put('/mutations/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const data = req.body || {};
  try {
    const old = db.prepare('SELECT * FROM member_mutations WHERE id = ?').get(id) as any;
    if (!old) return res.status(404).json({ success: false, message: 'Catatan mutasi tidak ditemukan' });
    db.prepare('UPDATE member_mutations SET member_id = ?, member_name = ?, mutation_type = ?, from_rayon_id = ?, to_rayon_id = ?, from_church = ?, to_church = ?, request_date = ?, effective_date = ?, reason = ?, status = ?, approved_by = ?, notes = ? WHERE id = ?')
      .run(
        data.memberId ?? old.member_id,
        data.memberName ?? old.member_name,
        data.mutationType ?? old.mutation_type,
        data.fromRayonId ?? old.from_rayon_id,
        data.toRayonId ?? old.to_rayon_id,
        data.fromChurch ?? old.from_church ?? '',
        data.toChurch ?? old.to_church ?? '',
        data.requestDate ?? old.request_date,
        data.effectiveDate ?? old.effective_date,
        data.reason ?? old.reason ?? '',
        data.status ?? old.status,
        data.approvedBy ?? old.approved_by ?? '',
        data.notes ?? old.notes ?? '',
        id,
      );
    const nextType = data.mutationType ?? old.mutation_type;
    const nextMemberId = data.memberId ?? old.member_id;
    if (nextType === 'Pindah Keluar') {
      db.prepare("UPDATE members SET status = 'Pindah' WHERE id = ?").run(nextMemberId);
    } else if (nextType === 'Meninggal Dunia') {
      db.prepare("UPDATE members SET status = 'Meninggal' WHERE id = ?").run(nextMemberId);
    } else if (nextType === 'Pindah Rayon' && (data.toRayonId ?? old.to_rayon_id)) {
      db.prepare('UPDATE members SET rayon_id = ?, status = \'Aktif\' WHERE id = ?').run(data.toRayonId ?? old.to_rayon_id, nextMemberId);
    }
    logAction('Ubah Mutasi', 'Mutasi Jemaat', `Memperbarui mutasi ${id}`);
    res.json({ success: true, message: 'Mutasi berhasil diperbarui' });
  } catch (error) { return errorResponse(res, error, 'Gagal memperbarui mutasi'); }
});

adminCrudRouter.delete('/mutations/:id', (req, res) => {
  const db = getDb();
  try {
    const result = db.prepare('DELETE FROM member_mutations WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ success: false, message: 'Catatan mutasi tidak ditemukan' });
    logAction('Hapus Mutasi', 'Mutasi Jemaat', `Menghapus mutasi ${req.params.id}`);
    res.json({ success: true, message: 'Mutasi berhasil dihapus' });
  } catch (error) { return errorResponse(res, error, 'Gagal menghapus mutasi'); }
});

adminCrudRouter.delete('/corrections/:id', (req, res) => {
  const db = getDb();
  try {
    const result = db.prepare('DELETE FROM data_correction_requests WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan' });
    res.json({ success: true, message: 'Pengajuan berhasil dihapus' });
  } catch (error) { return errorResponse(res, error, 'Gagal menghapus pengajuan'); }
});
