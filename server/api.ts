import { Router } from 'express';
import { getDb, purgeAllSampleData } from './db.ts';
import {
  findUserByEmail,
  findUserByUsername,
  getRequestUser,
  hashPassword,
  issueSession,
  isSuperAdmin,
  toPublicUser,
  verifyPassword,
} from './auth.ts';
import { verifyFirebaseGoogleToken } from './google-auth.ts';
import { persistSnapshot, persistenceEnabled, persistenceMode, preparePersistence } from './persistence.ts';
import { aiRouter } from './ai.ts';
import { adminCrudRouter } from './admin-crud.ts';
import { webAuthnRouter } from './webauthn.ts';
import {
  generateMemberNo,
  generateFamilyNo,
  validateMemberInput,
  calculateChurchStats,
  formatDateDMY,
} from '../src/utils/church-logic.ts';
import type { Member, Family, FinancialTransaction } from '../src/types/index.ts';

export const apiRouter = Router();

// Hydrate the local SQLite working set from durable Postgres on a cold start,
// and delay mutating responses until the snapshot has been committed.
apiRouter.use(async (req, res, next) => {
  if (!persistenceEnabled() || req.path.startsWith('/ai/')) return next();
  try {
    await preparePersistence();
  } catch (error: any) {
    console.error('[Persistence] Database cloud tidak siap:', error?.message || error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ success: false, message: 'Penyimpanan cloud sementara tidak dapat dihubungi. Coba beberapa saat lagi.' });
  }

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const originalJson = res.json.bind(res);
  let responseStarted = false;
  (res as any).json = (body: any) => {
    if (responseStarted) return originalJson(body);
    responseStarted = true;
    if (res.statusCode >= 400 || body?.success === false) return originalJson(body);
    persistSnapshot()
      .then(() => originalJson(body))
      .catch(() => {
        if (!res.headersSent) {
          res.status(500);
          originalJson({ success: false, message: 'Perubahan belum berhasil disimpan ke penyimpanan cloud. Silakan coba lagi.' });
        }
      });
    return res;
  };
  return next();
});

// Public pages only receive aggregate/content endpoints. Every private read or
// mutation requires a server-issued session; hiding a menu in React is not an
// authorization boundary.
const PUBLIC_READ_PATHS = new Set(['/health', '/stats', '/events', '/schedules', '/announcements', '/rayons', '/categorials', '/locations']);
apiRouter.use((req, res, next) => {
  const path = req.path.replace(/\/$/, '') || '/';
  const publicWebAuthn = path === '/auth/webauthn/authentication-options' || path === '/auth/webauthn/authenticate';
  if (req.method === 'OPTIONS' || path === '/auth/login' || path === '/auth/google' || publicWebAuthn) return next();
  if (req.method === 'GET' && path === '/ai/status') return next();
  if (req.method === 'GET' && PUBLIC_READ_PATHS.has(path)) return next();

  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Sesi tidak valid atau sudah berakhir. Silakan masuk kembali.' });
  }
  (req as any).authUser = user;
  res.setHeader('Cache-Control', 'no-store');

  if ((path.startsWith('/users') || path.startsWith('/backup') || path.startsWith('/database') || path.startsWith('/audit-logs')) && !isSuperAdmin(user)) {
    return res.status(403).json({ success: false, message: 'Hanya Super Admin yang dapat mengakses fitur ini.' });
  }

  if (user.role === 'Jemaat') {
    const ownRead = req.method === 'GET' && ['/members', '/families', '/corrections'].includes(path);
    const ownCorrection = req.method === 'POST' && path === '/corrections';
    const ownWebAuthn = path.startsWith('/auth/webauthn/');
    if (!ownRead && !ownCorrection && !ownWebAuthn) {
      return res.status(403).json({ success: false, message: 'Akun Jemaat hanya dapat mengakses Portal Jemaat dan data dirinya sendiri.' });
    }
  }
  next();
});

// Mount AI services and additional Super Admin CRUD controls
apiRouter.use('/ai', aiRouter);
apiRouter.use(adminCrudRouter);
apiRouter.use('/auth/webauthn', webAuthnRouter);

// Log audit action helper
function addAuditLog(userId: string, userName: string, action: string, module: string, details: string) {
  try {
    const db = getDb();
    const id = 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.prepare('INSERT INTO audit_logs (id, user_id, user_name, action, module, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, userId, userName, action, module, details, now);
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// 1. Auth Login. Legacy plaintext passwords are migrated after a successful login.
apiRouter.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan kata sandi wajib diisi' });
  }

  const db = getDb();
  const user = findUserByUsername(String(username).trim());
  if (!user || user.status !== 'Aktif' || !verifyPassword(user.password_hash, String(password))) {
    return res.status(401).json({ success: false, message: 'Nama pengguna atau kata sandi salah' });
  }
  if (!String(user.password_hash).startsWith('scrypt$')) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(password)), user.id);
  }

  const publicUser = toPublicUser(user);
  addAuditLog(user.id, user.name, 'Login Berhasil', 'Autentikasi', `Pengguna ${user.username} (${user.role}) masuk ke sistem`);
  return res.json({ success: true, user: publicUser, token: issueSession(user.id) });
});

apiRouter.post('/auth/google', async (req, res) => {
  try {
    const idToken = String(req.body?.idToken || '');
    if (!idToken) return res.status(400).json({ success: false, message: 'Token Google wajib disertakan.' });
    const profile = await verifyFirebaseGoogleToken(idToken);
    const db = getDb();
    let row = findUserByEmail(profile.email);
    if (!row) {
      const id = `google-${profile.uid}`;
      const now = new Date().toISOString();
      db.prepare(`INSERT INTO users (id, username, password_hash, name, role, rayon_id, member_id, phone, email, status, created_at)
        VALUES (?, ?, ?, ?, 'Jemaat', NULL, NULL, '', ?, 'Aktif', ?)`)
        .run(id, profile.email, hashPassword(`${profile.uid}:${Date.now()}`), profile.name, profile.email, now);
      row = findUserByEmail(profile.email);
    }
    if (!row || row.status !== 'Aktif') return res.status(403).json({ success: false, message: 'Akun Google ini belum diaktifkan oleh Tata Usaha.' });
    const user = toPublicUser(row);
    addAuditLog(user.id, user.name, 'Login Google Berhasil', 'Autentikasi', `Pengguna ${user.username} masuk melalui Google terverifikasi`);
    return res.json({ success: true, user, token: issueSession(user.id) });
  } catch (error: any) {
    return res.status(401).json({ success: false, message: error?.message || 'Verifikasi akun Google gagal.' });
  }
});

apiRouter.get('/auth/session', (req, res) => {
  const user = (req as any).authUser || getRequestUser(req);
  if (!user) return res.status(401).json({ success: false, message: 'Sesi tidak aktif' });
  res.json({ success: true, user, token: issueSession(user.id) });
});

const MANAGED_USER_ROLES = ['Super Admin', 'Admin Gereja', 'Ketua Majelis/Pendeta', 'Majelis/Rayon', 'Jemaat'] as const;
type ManagedUserRole = typeof MANAGED_USER_ROLES[number];
type ManagedUserValidation =
  | { error: string; role?: never }
  | { error?: never; role: ManagedUserRole };

function validateManagedUser(data: any, requirePassword: boolean): ManagedUserValidation {
  const username = String(data.username || '').trim();
  if (requirePassword && !/^[A-Za-z0-9._-]{3,40}$/.test(username)) {
    return { error: 'Username harus 3–40 karakter dan hanya memakai huruf, angka, titik, strip, atau garis bawah.' };
  }
  if (!String(data.name || '').trim()) return { error: 'Nama lengkap pengguna wajib diisi.' };
  if (!MANAGED_USER_ROLES.includes(data.role)) return { error: 'Peran pengguna tidak valid.' };
  if (data.role === 'Majelis/Rayon' && !data.rayonId) return { error: 'Pilih rayon untuk akun Majelis/Rayon.' };
  if (data.role === 'Jemaat' && !data.memberId) return { error: 'Pilih data jemaat yang terhubung dengan akun Jemaat.' };
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) return { error: 'Format email tidak valid.' };
  if ((requirePassword || data.password) && String(data.password || '').length < 8) {
    return { error: 'Kata sandi minimal 8 karakter.' };
  }
  if (data.status && !['Aktif', 'Nonaktif'].includes(data.status)) return { error: 'Status akun tidak valid.' };
  return { role: data.role };
}

function hasAnotherActiveSuperAdmin(db: any, excludedId: string): boolean {
  const row = db.prepare("SELECT count(*) AS count FROM users WHERE role = 'Super Admin' AND status = 'Aktif' AND id != ?").get(excludedId) as { count: number };
  return Number(row.count) > 0;
}

// Super Admin user administration. The /users middleware above enforces the
// role again at the server boundary; hiding these controls in the UI is not
// treated as authorization.
apiRouter.get('/users', (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM users ORDER BY name ASC').all() as any[];
  res.json({ success: true, users: rows.map(toPublicUser) });
});

apiRouter.post('/users', (req, res) => {
  const actor = (req as any).authUser;
  const data = req.body || {};
  const validation = validateManagedUser(data, true);
  if (validation.error) return res.status(400).json({ success: false, message: validation.error });
  const db = getDb();
  const username = String(data.username).trim().toLowerCase();
  const duplicate = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get(username);
  if (duplicate) return res.status(409).json({ success: false, message: 'Username sudah digunakan.' });
  const email = String(data.email || '').trim().toLowerCase();
  if (email && db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(email)) {
    return res.status(409).json({ success: false, message: 'Email sudah terhubung dengan akun lain.' });
  }
  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  try {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, name, role, rayon_id, member_id, phone, email, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, username, hashPassword(String(data.password)), String(data.name).trim(), validation.role!,
      data.rayonId || null, data.memberId || null, String(data.phone || '').trim() || null,
      email || null, data.status || 'Aktif', now,
    );
    addAuditLog(actor.id, actor.name, 'Tambah Pengguna', 'Manajemen Pengguna', `Membuat akun ${username} dengan peran ${validation.role}`);
    const created = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json({ success: true, user: toPublicUser(created), message: 'Pengguna berhasil ditambahkan.' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error?.message || 'Pengguna gagal ditambahkan.' });
  }
});

apiRouter.put('/users/:id', (req, res) => {
  const actor = (req as any).authUser;
  const id = String(req.params.id);
  const data = { ...(req.body || {}), username: 'existing-user' };
  const validation = validateManagedUser(data, false);
  if (validation.error) return res.status(400).json({ success: false, message: validation.error });
  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
  const email = String(data.email || '').trim().toLowerCase();
  if (email && db.prepare('SELECT id FROM users WHERE lower(email) = lower(?) AND id != ?').get(email, id)) {
    return res.status(409).json({ success: false, message: 'Email sudah terhubung dengan akun lain.' });
  }
  const status = data.status || 'Aktif';
  if (id === actor.id && (validation.role !== actor.role || status !== 'Aktif')) {
    return res.status(400).json({ success: false, message: 'Anda tidak dapat mengubah peran atau menonaktifkan akun sendiri.' });
  }
  if (id === 'u1' && (validation.role !== 'Super Admin' || status !== 'Aktif')) {
    return res.status(400).json({ success: false, message: 'Akun Super Admin utama tidak dapat diturunkan atau dinonaktifkan.' });
  }
  if (existing.role === 'Super Admin' && (validation.role !== 'Super Admin' || status !== 'Aktif') && !hasAnotherActiveSuperAdmin(db, id)) {
    return res.status(400).json({ success: false, message: 'Sistem harus memiliki sedikitnya satu Super Admin aktif.' });
  }
  try {
    db.prepare(`
      UPDATE users SET name = ?, role = ?, rayon_id = ?, member_id = ?, phone = ?, email = ?, status = ? WHERE id = ?
    `).run(
      String(data.name).trim(), validation.role!, data.rayonId || null, data.memberId || null,
      String(data.phone || '').trim() || null, email || null, status, id,
    );
    if (data.password) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(data.password)), id);
    addAuditLog(actor.id, actor.name, 'Ubah Pengguna', 'Manajemen Pengguna', `Memperbarui akun ${existing.username}${data.password ? ' dan mengganti kata sandi' : ''}`);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json({ success: true, user: toPublicUser(updated), message: 'Data pengguna berhasil diperbarui.' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error?.message || 'Pengguna gagal diperbarui.' });
  }
});

apiRouter.delete('/users/:id', (req, res) => {
  const actor = (req as any).authUser;
  const id = String(req.params.id);
  if (id === actor.id) return res.status(400).json({ success: false, message: 'Anda tidak dapat menghapus akun sendiri.' });
  if (id === 'u1') return res.status(400).json({ success: false, message: 'Akun Super Admin utama tidak dapat dihapus.' });
  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
  if (existing.role === 'Super Admin' && !hasAnotherActiveSuperAdmin(db, id)) {
    return res.status(400).json({ success: false, message: 'Super Admin aktif terakhir tidak dapat dihapus.' });
  }
  try {
    db.exec('BEGIN');
    db.prepare('DELETE FROM webauthn_credentials WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    db.exec('COMMIT');
  } catch (error: any) {
    db.exec('ROLLBACK');
    return res.status(500).json({ success: false, message: error?.message || 'Pengguna gagal dihapus.' });
  }
  addAuditLog(actor.id, actor.name, 'Hapus Pengguna', 'Manajemen Pengguna', `Menghapus akun ${existing.username}`);
  res.json({ success: true, message: 'Pengguna berhasil dihapus.' });
});

function getSafeNextMemberNo(db: any): string {
  const prefix = 'GMIT-BF-2026-';
  const existing = db.prepare("SELECT member_no FROM members WHERE member_no LIKE ?").all(`${prefix}%`) as { member_no: string }[];
  let maxSeq = 0;
  for (const row of existing) {
    const numPart = parseInt(row.member_no.replace(prefix, ''), 10);
    if (!isNaN(numPart) && numPart > maxSeq) {
      maxSeq = numPart;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

function getSafeNextFamilyNo(db: any): string {
  const prefix = 'KK-BF-';
  const existing = db.prepare("SELECT family_no FROM families WHERE family_no LIKE ?").all(`${prefix}%`) as { family_no: string }[];
  let maxSeq = 0;
  for (const row of existing) {
    const numPart = parseInt(row.family_no.replace(prefix, ''), 10);
    if (!isNaN(numPart) && numPart > maxSeq) {
      maxSeq = numPart;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

// 2. Members CRUD
apiRouter.get('/members', (req, res) => {
  const db = getDb();
  const { query, rayonId, categorialId, status } = req.query;

  let sql = `
    SELECT m.*, r.name as rayon_name, c.name as categorial_group_name, f.family_no, f.head_of_family_name
    FROM members m
    LEFT JOIN rayons r ON m.rayon_id = r.id
    LEFT JOIN categorial_groups c ON m.categorial_group_id = c.id
    LEFT JOIN families f ON m.family_id = f.id
    WHERE 1=1
  `;
  const params: any[] = [];
  const authUser = (req as any).authUser;
  if (authUser?.role === 'Jemaat') {
    sql += ' AND m.id = ?';
    params.push(authUser.memberId || '__no_linked_member__');
  }

  if (rayonId && rayonId !== 'all') {
    sql += ' AND m.rayon_id = ?';
    params.push(rayonId);
  }
  if (categorialId && categorialId !== 'all') {
    sql += ' AND m.categorial_group_id = ?';
    params.push(categorialId);
  }
  if (status && status !== 'all') {
    sql += ' AND m.status = ?';
    params.push(status);
  }
  if (query && typeof query === 'string') {
    const q = `%${query.trim()}%`;
    sql += ' AND (m.full_name LIKE ? OR m.member_no LIKE ? OR m.nik LIKE ? OR m.phone LIKE ? OR m.address LIKE ?)';
    params.push(q, q, q, q, q);
  }

  sql += ' ORDER BY m.member_no ASC';

  const rows = db.prepare(sql).all(...params) as any[];

  const members: Member[] = rows.map((r) => ({
    id: r.id,
    memberNo: r.member_no,
    fullName: r.full_name,
    nickname: r.nickname || '',
    nik: r.nik || '',
    familyCardNo: r.family_card_no || '',
    familyId: r.family_id || '',
    familyName: r.head_of_family_name || '',
    familyRole: r.family_role,
    gender: r.gender,
    birthPlace: r.birth_place || '',
    birthDate: r.birth_date,
    address: r.address,
    kelurahan: r.kelurahan || '',
    kecamatan: r.kecamatan || '',
    kabupaten: r.kabupaten || '',
    phone: r.phone || '',
    email: r.email || '',
    maritalStatus: r.marital_status,
    spouseName: r.spouse_name || '',
    rayonId: r.rayon_id,
    rayonName: r.rayon_name || '',
    categorialGroupId: r.categorial_group_id,
    categorialGroupName: r.categorial_group_name || '',
    membershipStatus: r.membership_status,
    baptismStatus: r.baptism_status,
    baptismDate: r.baptism_date || '',
    confirmationStatus: r.confirmation_status,
    confirmationDate: r.confirmation_date || '',
    marriageChurchStatus: r.marriage_church_status,
    marriageDate: r.marriage_date || '',
    education: r.education || '',
    occupation: r.occupation || '',
    joinDate: r.join_date,
    status: r.status,
    notes: r.notes || '',
    photoUrl: r.photo_url || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  res.json({ success: true, count: members.length, members });
});

apiRouter.post('/members', (req, res) => {
  const db = getDb();
  const data = req.body;
  const validation = validateMemberInput(data);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.errors.join(', ') });
  }

  if (data.nik && data.nik.trim().length > 0 && !/^\d{16}$/.test(data.nik.trim())) {
    return res.status(400).json({ success: false, message: 'Nomor Induk Kependudukan (NIK) tidak boleh kurang atau lebih dari 16 angka' });
  }

  const memberNo = data.memberNo || getSafeNextMemberNo(db);
  const requestedOfflineId = typeof data.id === 'string' && /^offline-[a-zA-Z0-9-]{1,120}$/.test(data.id) ? data.id : null;
  const id = requestedOfflineId || 'm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString().substring(0, 10);

  try {
    if (requestedOfflineId) {
      const existing = db.prepare('SELECT id, member_no, full_name FROM members WHERE id = ?').get(requestedOfflineId) as any;
      if (existing) {
        if (existing.full_name !== data.fullName) {
          return res.status(409).json({ success: false, message: 'ID offline sudah digunakan oleh data jemaat lain.' });
        }
        return res.json({ success: true, id: existing.id, memberNo: existing.member_no, duplicate: true, message: 'Data offline sudah tersimpan sebelumnya.' });
      }
    }
    db.prepare(`
      INSERT INTO members (
        id, member_no, full_name, nickname, nik, family_card_no, family_id, family_role, gender,
        birth_place, birth_date, address, kelurahan, kecamatan, kabupaten, phone, email,
        marital_status, spouse_name, rayon_id, categorial_group_id, membership_status,
        baptism_status, baptism_date, confirmation_status, confirmation_date,
        marriage_church_status, marriage_date, education, occupation, join_date, status,
        notes, photo_url, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      id, memberNo, data.fullName, data.nickname || '', data.nik || '', data.familyCardNo || '',
      data.familyId || '', data.familyRole || 'Anggota', data.gender, data.birthPlace || '',
      data.birthDate, data.address || '', data.kelurahan || '', data.kecamatan || '',
      data.kabupaten || '', data.phone || '', data.email || '', data.maritalStatus || 'Belum Menikah',
      data.spouseName || '', data.rayonId, data.categorialGroupId || '', data.membershipStatus || 'Tetap',
      data.baptismStatus || 'Belum', data.baptismDate || '', data.confirmationStatus || 'Belum',
      data.confirmationDate || '', data.marriageChurchStatus || 'Belum', data.marriageDate || '',
      data.education || '', data.occupation || '', data.joinDate || now, data.status || 'Aktif',
      data.notes || '', data.photoUrl || '', now, now
    );

    addAuditLog('admin', 'Admin', 'Tambah Jemaat', 'Database Jemaat', `Menambahkan anggota jemaat baru: ${data.fullName} (${memberNo})`);

    const createdMember: Member = {
      id,
      memberNo,
      fullName: data.fullName,
      nickname: data.nickname || '',
      nik: data.nik || '',
      familyCardNo: data.familyCardNo || '',
      familyId: data.familyId || '',
      familyName: '',
      familyRole: data.familyRole || 'Anggota',
      gender: data.gender,
      birthPlace: data.birthPlace || '',
      birthDate: data.birthDate,
      address: data.address || '',
      kelurahan: data.kelurahan || '',
      kecamatan: data.kecamatan || '',
      kabupaten: data.kabupaten || '',
      phone: data.phone || '',
      email: data.email || '',
      maritalStatus: data.maritalStatus || 'Belum Menikah',
      spouseName: data.spouseName || '',
      rayonId: data.rayonId,
      rayonName: '',
      categorialGroupId: data.categorialGroupId || '',
      categorialGroupName: '',
      membershipStatus: data.membershipStatus || 'Tetap',
      baptismStatus: data.baptismStatus || 'Belum',
      baptismDate: data.baptismDate || '',
      confirmationStatus: data.confirmationStatus || 'Belum',
      confirmationDate: data.confirmationDate || '',
      marriageChurchStatus: data.marriageChurchStatus || 'Belum',
      marriageDate: data.marriageDate || '',
      education: data.education || '',
      occupation: data.occupation || '',
      joinDate: data.joinDate || now,
      status: data.status || 'Aktif',
      notes: data.notes || '',
      photoUrl: data.photoUrl || '',
      createdAt: now,
      updatedAt: now,
    };

    res.json({ success: true, message: 'Data jemaat berhasil disimpan', id, memberNo, member: createdMember });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan data: ' + err.message });
  }
});

apiRouter.put('/members/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const data = req.body;
  const now = new Date().toISOString().substring(0, 10);

  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Data jemaat tidak ditemukan' });
  }

  const fullName = data.fullName !== undefined ? data.fullName : existing.full_name;
  const nickname = data.nickname !== undefined ? data.nickname : (existing.nickname || '');
  const nik = data.nik !== undefined ? data.nik : (existing.nik || '');
  const familyCardNo = data.familyCardNo !== undefined ? data.familyCardNo : (existing.family_card_no || '');
  const familyId = data.familyId !== undefined ? data.familyId : (existing.family_id || '');
  const familyRole = data.familyRole !== undefined ? data.familyRole : (existing.family_role || 'Anggota');
  const gender = data.gender !== undefined ? data.gender : existing.gender;
  const birthPlace = data.birthPlace !== undefined ? data.birthPlace : (existing.birth_place || '');
  const birthDate = data.birthDate !== undefined ? data.birthDate : existing.birth_date;
  const address = data.address !== undefined ? data.address : (existing.address || '');
  const kelurahan = data.kelurahan !== undefined ? data.kelurahan : (existing.kelurahan || '');
  const kecamatan = data.kecamatan !== undefined ? data.kecamatan : (existing.kecamatan || '');
  const kabupaten = data.kabupaten !== undefined ? data.kabupaten : (existing.kabupaten || '');
  const phone = data.phone !== undefined ? data.phone : (existing.phone || '');
  const email = data.email !== undefined ? data.email : (existing.email || '');
  const maritalStatus = data.maritalStatus !== undefined ? data.maritalStatus : existing.marital_status;
  const spouseName = data.spouseName !== undefined ? data.spouseName : (existing.spouse_name || '');
  const rayonId = data.rayonId !== undefined ? data.rayonId : existing.rayon_id;
  const categorialGroupId = data.categorialGroupId !== undefined ? data.categorialGroupId : existing.categorial_group_id;
  const membershipStatus = data.membershipStatus !== undefined ? data.membershipStatus : existing.membership_status;
  const baptismStatus = data.baptismStatus !== undefined ? data.baptismStatus : existing.baptism_status;
  const baptismDate = data.baptismDate !== undefined ? data.baptismDate : (existing.baptism_date || '');
  const confirmationStatus = data.confirmationStatus !== undefined ? data.confirmationStatus : existing.confirmation_status;
  const confirmationDate = data.confirmationDate !== undefined ? data.confirmationDate : (existing.confirmation_date || '');
  const marriageChurchStatus = data.marriageChurchStatus !== undefined ? data.marriageChurchStatus : existing.marriage_church_status;
  const marriageDate = data.marriageDate !== undefined ? data.marriageDate : (existing.marriage_date || '');
  const education = data.education !== undefined ? data.education : (existing.education || '');
  const occupation = data.occupation !== undefined ? data.occupation : (existing.occupation || '');
  const status = data.status !== undefined ? data.status : existing.status;
  const notes = data.notes !== undefined ? data.notes : (existing.notes || '');
  const photoUrl = data.photoUrl !== undefined ? data.photoUrl : (existing.photo_url || '');

  if (nik && nik.trim().length > 0 && !/^\d{16}$/.test(nik.trim())) {
    return res.status(400).json({ success: false, message: 'Nomor Induk Kependudukan (NIK) tidak boleh kurang atau lebih dari 16 angka' });
  }

  try {
    db.prepare(`
      UPDATE members SET
        full_name = ?, nickname = ?, nik = ?, family_card_no = ?, family_id = ?, family_role = ?,
        gender = ?, birth_place = ?, birth_date = ?, address = ?, kelurahan = ?, kecamatan = ?,
        kabupaten = ?, phone = ?, email = ?, marital_status = ?, spouse_name = ?, rayon_id = ?,
        categorial_group_id = ?, membership_status = ?, baptism_status = ?, baptism_date = ?,
        confirmation_status = ?, confirmation_date = ?, marriage_church_status = ?, marriage_date = ?,
        education = ?, occupation = ?, status = ?, notes = ?, photo_url = ?, updated_at = ?
      WHERE id = ?
    `).run(
      fullName, nickname, nik, familyCardNo, familyId,
      familyRole, gender, birthPlace, birthDate, address,
      kelurahan, kecamatan, kabupaten,
      phone, email, maritalStatus, spouseName,
      rayonId, categorialGroupId, membershipStatus,
      baptismStatus, baptismDate, confirmationStatus,
      confirmationDate, marriageChurchStatus, marriageDate,
      education, occupation, status, notes,
      photoUrl, now, id
    );

    addAuditLog('admin', 'Admin', 'Ubah Jemaat', 'Database Jemaat', `Mengubah data anggota jemaat: ${fullName}`);

    res.json({ success: true, message: 'Data jemaat berhasil diperbarui', photoUrl });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui data: ' + err.message });
  }
});

// Update Member Photo directly
apiRouter.post('/members/:id/photo', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { photoUrl } = req.body;
  const now = new Date().toISOString().substring(0, 10);

  if (!photoUrl) {
    return res.status(400).json({ success: false, message: 'URL foto jemaat wajib disertakan' });
  }

  try {
    const existing = db.prepare('SELECT full_name FROM members WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Jemaat tidak ditemukan' });
    }

    db.prepare('UPDATE members SET photo_url = ?, updated_at = ? WHERE id = ?').run(photoUrl, now, id);
    addAuditLog('admin', 'Admin', 'Upload Foto Jemaat', 'Database Jemaat', `Mengunggah foto kartu jemaat untuk: ${existing.full_name}`);
    res.json({ success: true, message: 'Foto jemaat berhasil diperbarui di database', photoUrl });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/members/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  try {
    const member = db.prepare('SELECT full_name, member_no FROM members WHERE id = ?').get(id) as any;
    db.prepare('DELETE FROM members WHERE id = ?').run(id);

    addAuditLog('admin', 'Admin', 'Hapus Jemaat', 'Database Jemaat', `Menghapus anggota jemaat: ${member?.full_name || id}`);
    res.json({ success: true, message: 'Data jemaat berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus data: ' + err.message });
  }
});

// 3. Families CRUD
apiRouter.get('/families', (req, res) => {
  const db = getDb();
  const authUser = (req as any).authUser;
  const params: any[] = [];
  let where = '';
  if (authUser?.role === 'Jemaat') {
    const ownMember = db.prepare('SELECT family_id FROM members WHERE id = ?').get(authUser.memberId || '') as any;
    where = 'WHERE f.id = ?';
    params.push(ownMember?.family_id || '__no_linked_family__');
  }
  const rows = db.prepare(`
    SELECT f.*, r.name as rayon_name,
      (SELECT count(*) FROM members WHERE family_id = f.id) as member_count
    FROM families f
    LEFT JOIN rayons r ON f.rayon_id = r.id
    ${where}
    ORDER BY f.family_no ASC
  `).all(...params) as any[];

  const families: Family[] = rows.map((r) => ({
    id: r.id,
    familyNo: r.family_no,
    headOfFamilyName: r.head_of_family_name,
    headOfFamilyId: r.head_of_family_id,
    address: r.address,
    rayonId: r.rayon_id,
    rayonName: r.rayon_name || '',
    phone: r.phone || '',
    memberCount: r.member_count || 0,
    notes: r.notes || '',
    createdAt: r.created_at,
    latitude: r.latitude == null ? null : Number(r.latitude),
    longitude: r.longitude == null ? null : Number(r.longitude),
  }));

  res.json({ success: true, count: families.length, families });
});

apiRouter.post('/families', (req, res) => {
  const db = getDb();
  const data = req.body;
  if (!data.headOfFamilyName || !data.rayonId) {
    return res.status(400).json({ success: false, message: 'Nama Kepala Keluarga dan Rayon wajib diisi' });
  }

  const familyNo = data.familyNo || getSafeNextFamilyNo(db);
  const id = 'f-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString().substring(0, 10);
  const lat = data.latitude !== undefined && data.latitude !== null && data.latitude !== '' ? Number(data.latitude) : null;
  const lng = data.longitude !== undefined && data.longitude !== null && data.longitude !== '' ? Number(data.longitude) : null;

  try {
    db.prepare(`
      INSERT INTO families (id, family_no, head_of_family_name, head_of_family_id, address, rayon_id, phone, notes, created_at, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, familyNo, data.headOfFamilyName, data.headOfFamilyId || null, data.address || '', data.rayonId, data.phone || '', data.notes || '', now, lat, lng);

    addAuditLog('admin', 'Admin', 'Tambah Kartu Keluarga', 'Keluarga & KK', `Menambahkan Kartu Keluarga baru: ${data.headOfFamilyName} (${familyNo})`);

    res.json({ success: true, message: 'Kartu Keluarga berhasil ditambahkan', id, familyNo });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan KK: ' + err.message });
  }
});

apiRouter.put('/families/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const data = req.body;
  try {
    const existing = db.prepare('SELECT * FROM families WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Data KK tidak ditemukan' });
    }
    const headName = data.headOfFamilyName !== undefined ? data.headOfFamilyName : existing.head_of_family_name;
    const address = data.address !== undefined ? data.address : existing.address;
    const rayonId = data.rayonId !== undefined ? data.rayonId : existing.rayon_id;
    const phone = data.phone !== undefined ? data.phone : existing.phone;
    const notes = data.notes !== undefined ? data.notes : existing.notes;
    const lat = data.latitude !== undefined ? (data.latitude === null || data.latitude === '' ? null : Number(data.latitude)) : existing.latitude;
    const lng = data.longitude !== undefined ? (data.longitude === null || data.longitude === '' ? null : Number(data.longitude)) : existing.longitude;

    db.prepare(`
      UPDATE families SET
        head_of_family_name = ?, address = ?, rayon_id = ?, phone = ?, notes = ?, latitude = ?, longitude = ?
      WHERE id = ?
    `).run(headName, address, rayonId, phone, notes, lat, lng, id);

    addAuditLog('admin', 'Admin', 'Ubah Kartu Keluarga', 'Keluarga & KK', `Mengubah Kartu Keluarga: ${headName}`);
    res.json({ success: true, message: 'Data KK berhasil diperbarui' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui KK: ' + err.message });
  }
});

apiRouter.delete('/families/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM families WHERE id = ?').run(id);
    addAuditLog('admin', 'Admin', 'Hapus Kartu Keluarga', 'Keluarga & KK', `Menghapus KK ID: ${id}`);
    res.json({ success: true, message: 'Data KK berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus KK: ' + err.message });
  }
});

// 3b. Church Landmark & Physical Locations CRUD
apiRouter.get('/locations', (_req, res) => {
  const db = getDb();
  try {
    const rows = db.prepare('SELECT * FROM church_locations ORDER BY created_at ASC').all() as any[];
    const locations = rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      address: r.address || '',
      leaderName: r.leader_name || '',
      phone: r.phone || '',
      notes: r.notes || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json({ success: true, count: locations.length, locations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data lokasi: ' + err.message });
  }
});

apiRouter.post('/locations', (req, res) => {
  const db = getDb();
  const data = req.body;
  if (!data.name || data.latitude == null || data.longitude == null) {
    return res.status(400).json({ success: false, message: 'Nama lokasi dan koordinat (latitude, longitude) wajib diisi' });
  }
  const lat = Number(data.latitude);
  const lng = Number(data.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ success: false, message: 'Koordinat lokasi tidak valid' });
  }

  const id = data.id || 'loc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO church_locations (id, name, category, latitude, longitude, address, leader_name, phone, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name.trim(),
      data.category || 'other',
      lat,
      lng,
      data.address || '',
      data.leaderName || '',
      data.phone || '',
      data.notes || '',
      now,
      now
    );

    addAuditLog('admin', 'Admin', 'Tambah Titik Lokasi', 'Peta Geografis', `Menambahkan titik peta baru: ${data.name} (${lat}, ${lng})`);
    res.json({ success: true, message: 'Titik lokasi berhasil disimpan ke database', id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan titik lokasi: ' + err.message });
  }
});

apiRouter.put('/locations/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const data = req.body;

  try {
    const existing = db.prepare('SELECT * FROM church_locations WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Data titik lokasi tidak ditemukan' });
    }

    const name = data.name !== undefined ? String(data.name).trim() : existing.name;
    const category = data.category !== undefined ? data.category : existing.category;
    const lat = data.latitude !== undefined ? Number(data.latitude) : existing.latitude;
    const lng = data.longitude !== undefined ? Number(data.longitude) : existing.longitude;
    const address = data.address !== undefined ? data.address : existing.address;
    const leaderName = data.leaderName !== undefined ? data.leaderName : existing.leader_name;
    const phone = data.phone !== undefined ? data.phone : existing.phone;
    const notes = data.notes !== undefined ? data.notes : existing.notes;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE church_locations SET
        name = ?, category = ?, latitude = ?, longitude = ?, address = ?,
        leader_name = ?, phone = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(name, category, lat, lng, address, leaderName, phone, notes, now, id);

    addAuditLog('admin', 'Admin', 'Ubah Titik Lokasi', 'Peta Geografis', `Mengubah titik lokasi: ${name} (${lat}, ${lng})`);
    res.json({ success: true, message: 'Titik lokasi berhasil diperbarui' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui titik lokasi: ' + err.message });
  }
});

apiRouter.delete('/locations/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM church_locations WHERE id = ?').run(id);
    addAuditLog('admin', 'Admin', 'Hapus Titik Lokasi', 'Peta Geografis', `Menghapus titik lokasi ID: ${id}`);
    res.json({ success: true, message: 'Titik lokasi berhasil dihapus dari database' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus titik lokasi: ' + err.message });
  }
});

// 4. Rayons & Kategorial
apiRouter.get('/rayons', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT r.*,
      (SELECT count(*) FROM members WHERE rayon_id = r.id AND status = 'Aktif') as member_count,
      (SELECT count(*) FROM families WHERE rayon_id = r.id) as family_count
    FROM rayons r
    ORDER BY r.code ASC
  `).all() as any[];

  res.json({ success: true, rayons: rows.map(r => ({
    id: r.id,
    code: r.code,
    name: r.name,
    leaderName: r.leader_name,
    leaderPhone: r.leader_phone || '',
    coverageArea: r.coverage_area || '',
    familyCount: r.family_count,
    memberCount: r.member_count,
    notes: r.notes || '',
    latitude: r.latitude == null ? null : Number(r.latitude),
    longitude: r.longitude == null ? null : Number(r.longitude),
  }))});
});

apiRouter.get('/categorials', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT c.*,
      (SELECT count(*) FROM members WHERE categorial_group_id = c.id AND status = 'Aktif') as member_count
    FROM categorial_groups c
    ORDER BY c.code ASC
  `).all() as any[];

  res.json({ success: true, categorials: rows.map(c => ({
    id: c.id,
    code: c.code,
    name: c.name,
    targetAgeDesc: c.target_age_desc || '',
    coordinator: c.coordinator || '',
    memberCount: c.member_count,
  }))});
});

// 5. Church Staff / Majelis
apiRouter.get('/staff', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM church_staff ORDER BY position ASC').all() as any[];
  res.json({ success: true, staff: rows.map(s => ({
    id: s.id,
    memberId: s.member_id,
    name: s.name,
    position: s.position,
    period: s.period,
    phone: s.phone || '',
    email: s.email || '',
    status: s.status,
  }))});
});

apiRouter.post('/staff', (req, res) => {
  const db = getDb();
  const data = req.body;
  const id = 'st-' + Date.now();
  try {
    db.prepare('INSERT INTO church_staff (id, member_id, name, position, period, phone, email, status) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)')
      .run(id, data.name, data.position, data.period || '2026 - 2029', data.phone || '', data.email || '', data.status || 'Aktif');
    addAuditLog('admin', 'Admin', 'Tambah Majelis', 'Majelis & Pendeta', `Menambahkan pelayan majelis: ${data.name}`);
    res.json({ success: true, message: 'Pelayan majelis berhasil ditambahkan', id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/staff/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const data = req.body;
  try {
    db.prepare(`
      UPDATE church_staff
      SET name = ?, position = ?, period = ?, phone = ?, email = ?, status = ?
      WHERE id = ?
    `).run(
      data.name,
      data.position,
      data.period || '2026 - 2029',
      data.phone || '',
      data.email || '',
      data.status || 'Aktif',
      id
    );
    addAuditLog('admin', 'Admin', 'Perbarui Majelis', 'Majelis & Pendeta', `Memperbarui data pelayan majelis: ${data.name} (${data.position})`);
    res.json({ success: true, message: 'Data pelayan majelis berhasil diperbarui' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/staff/:id', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM church_staff WHERE id = ?').run(req.params.id);
    addAuditLog('admin', 'Admin', 'Hapus Majelis', 'Majelis & Pendeta', `Menghapus data pelayan majelis ID: ${req.params.id}`);
    res.json({ success: true, message: 'Data pelayan majelis berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/staff', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM church_staff').run();
    addAuditLog('admin', 'Admin', 'Kosongkan Majelis', 'Majelis & Pendeta', 'Mengosongkan seluruh data pelayan majelis');
    res.json({ success: true, message: 'Seluruh data pelayan majelis berhasil dikosongkan' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Sacraments (Baptism, Confirmation, Marriage)
apiRouter.get('/sacraments', (req, res) => {
  const db = getDb();
  const baptisms = db.prepare('SELECT * FROM baptisms ORDER BY baptism_date DESC').all();
  const confirmations = db.prepare('SELECT * FROM confirmations ORDER BY confirmation_date DESC').all();
  const marriages = db.prepare('SELECT * FROM marriages ORDER BY blessing_date DESC').all();

  res.json({
    success: true,
    baptisms: baptisms.map((b: any) => ({
      id: b.id,
      registerNo: b.register_no,
      memberId: b.member_id,
      memberName: b.member_name,
      birthDate: b.birth_date,
      parentNames: b.parent_names,
      baptismDate: b.baptism_date,
      churchPlace: b.church_place,
      ministerName: b.minister_name,
      certificateNo: b.certificate_no,
      witnesses: b.witnesses || '',
      notes: b.notes || '',
    })),
    confirmations: confirmations.map((c: any) => ({
      id: c.id,
      registerNo: c.register_no,
      memberId: c.member_id,
      memberName: c.member_name,
      confirmationDate: c.confirmation_date,
      churchPlace: c.church_place,
      ministerName: c.minister_name,
      certificateNo: c.certificate_no,
      bibleVerse: c.bible_verse || '',
      notes: c.notes || '',
    })),
    marriages: marriages.map((m: any) => ({
      id: m.id,
      registerNo: m.register_no,
      groomId: m.groom_id,
      groomName: m.groom_name,
      brideId: m.bride_id,
      brideName: m.bride_name,
      blessingDate: m.blessing_date,
      churchPlace: m.church_place,
      ministerName: m.minister_name,
      certificateNo: m.certificate_no,
      witnessNames: m.witness_names || '',
      notes: m.notes || '',
    })),
  });
});

apiRouter.post('/sacraments/baptisms', (req, res) => {
  const db = getDb();
  const data = req.body;
  const id = 'bp-' + Date.now();
  const regNo = data.registerNo || `REG-BAP-${Date.now().toString().slice(-4)}`;

  try {
    db.prepare(`
      INSERT INTO baptisms (id, register_no, member_id, member_name, birth_date, parent_names, baptism_date, church_place, minister_name, certificate_no, witnesses, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, regNo, data.memberId, data.memberName, data.birthDate || '', data.parentNames || '', data.baptismDate, data.churchPlace || 'Gedung Kebaktian GMIT Betel Fuimelang', data.ministerName, data.certificateNo, data.witnesses || '', data.notes || '');

    // Update member's baptism status
    if (data.memberId) {
      db.prepare("UPDATE members SET baptism_status = 'Sudah', baptism_date = ? WHERE id = ?").run(data.baptismDate, data.memberId);
    }

    addAuditLog('admin', 'Admin', 'Catat Sakramen Baptis', 'Sakramen & Peristiwa', `Mencatat baptisan kudus untuk: ${data.memberName}`);
    res.json({ success: true, message: 'Data baptisan berhasil dicatat' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.post('/sacraments/confirmations', (req, res) => {
  const db = getDb();
  const data = req.body;
  const id = 'cf-' + Date.now();
  const regNo = data.registerNo || `REG-SD-${Date.now().toString().slice(-4)}`;

  try {
    db.prepare(`
      INSERT INTO confirmations (id, register_no, member_id, member_name, confirmation_date, church_place, minister_name, certificate_no, bible_verse, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, regNo, data.memberId, data.memberName, data.confirmationDate, data.churchPlace || 'Gedung Kebaktian GMIT Betel Fuimelang', data.ministerName, data.certificateNo, data.bibleVerse || '', data.notes || '');

    if (data.memberId) {
      db.prepare("UPDATE members SET confirmation_status = 'Sudah', confirmation_date = ? WHERE id = ?").run(data.confirmationDate, data.memberId);
    }

    addAuditLog('admin', 'Admin', 'Catat Peneguhan Sidi', 'Sakramen & Peristiwa', `Mencatat peneguhan sidi untuk: ${data.memberName}`);
    res.json({ success: true, message: 'Data peneguhan sidi berhasil dicatat' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.post('/sacraments/marriages', (req, res) => {
  const db = getDb();
  const data = req.body;
  const id = 'mr-' + Date.now();
  const regNo = data.registerNo || `REG-NK-${Date.now().toString().slice(-4)}`;

  try {
    db.prepare(`
      INSERT INTO marriages (id, register_no, groom_id, groom_name, bride_id, bride_name, blessing_date, church_place, minister_name, certificate_no, witness_names, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, regNo, data.groomId || null, data.groomName, data.brideId || null, data.brideName, data.blessingDate, data.churchPlace || 'Gedung Kebaktian GMIT Betel Fuimelang', data.ministerName, data.certificateNo, data.witnessNames || '', data.notes || '');

    if (data.groomId) {
      db.prepare("UPDATE members SET marriage_church_status = 'Sudah', marriage_date = ? WHERE id = ?").run(data.blessingDate, data.groomId);
    }
    if (data.brideId) {
      db.prepare("UPDATE members SET marriage_church_status = 'Sudah', marriage_date = ? WHERE id = ?").run(data.blessingDate, data.brideId);
    }

    addAuditLog('admin', 'Admin', 'Catat Nikah Kudus', 'Sakramen & Peristiwa', `Mencatat pemberkatan nikah kudus: ${data.groomName} & ${data.brideName}`);
    res.json({ success: true, message: 'Data pernikahan gerejawi berhasil dicatat' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Mutations
apiRouter.get('/mutations', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM member_mutations ORDER BY request_date DESC').all() as any[];
  res.json({
    success: true,
    mutations: rows.map(m => ({
      id: m.id,
      mutationNo: m.mutation_no,
      memberId: m.member_id,
      memberName: m.member_name,
      mutationType: m.mutation_type,
      fromRayonId: m.from_rayon_id,
      toRayonId: m.to_rayon_id,
      fromChurch: m.from_church,
      toChurch: m.to_church,
      requestDate: m.request_date,
      effectiveDate: m.effective_date,
      reason: m.reason || '',
      status: m.status,
      approvedBy: m.approved_by || '',
      notes: m.notes || '',
    })),
  });
});

apiRouter.post('/mutations', (req, res) => {
  const db = getDb();
  const data = req.body;
  const id = 'mut-' + Date.now();
  const mutNo = `MUT-${Date.now().toString().slice(-4)}`;

  try {
    db.prepare(`
      INSERT INTO member_mutations (id, mutation_no, member_id, member_name, mutation_type, from_rayon_id, to_rayon_id, from_church, to_church, request_date, effective_date, reason, status, approved_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, mutNo, data.memberId, data.memberName, data.mutationType, data.fromRayonId || null,
      data.toRayonId || null, data.fromChurch || 'GMIT Betel Fuimelang', data.toChurch || '',
      data.requestDate, data.effectiveDate, data.reason || '', 'Disetujui',
      data.approvedBy || 'Pdt. Sonya W. Isu, S.Th', data.notes || ''
    );

    // Update member life status if Pindah or Meninggal
    if (data.mutationType === 'Pindah Keluar') {
      db.prepare("UPDATE members SET status = 'Pindah' WHERE id = ?").run(data.memberId);
    } else if (data.mutationType === 'Meninggal Dunia') {
      db.prepare("UPDATE members SET status = 'Meninggal' WHERE id = ?").run(data.memberId);
    } else if (data.mutationType === 'Pindah Rayon' && data.toRayonId) {
      db.prepare("UPDATE members SET rayon_id = ? WHERE id = ?").run(data.toRayonId, data.memberId);
    }

    addAuditLog('admin', 'Admin', 'Catat Mutasi Anggota', 'Mutasi Jemaat', `Mencatat mutasi ${data.mutationType} untuk: ${data.memberName}`);
    res.json({ success: true, message: 'Mutasi jemaat berhasil dicatat dan diproses' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Events & Service Schedules
apiRouter.get('/events', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM events ORDER BY start_time ASC').all() as any[];
  res.json({
    success: true,
    events: rows.map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      startTime: e.start_time,
      endTime: e.end_time,
      location: e.location,
      picName: e.pic_name,
      description: e.description || '',
      status: e.status,
      imageUrl: e.image_url || '',
    })),
  });
});

apiRouter.post('/events', (req, res) => {
  const db = getDb();
  const data = req.body;
  const id = 'ev-' + Date.now();
  try {
    db.prepare(`
      INSERT INTO events (id, title, category, start_time, end_time, location, pic_name, description, status, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.title, data.category, data.startTime, data.endTime, data.location, data.picName, data.description || '', data.status || 'Terjadwal', data.imageUrl || '');
    addAuditLog('admin', 'Admin', 'Tambah Jadwal Kegiatan', 'Ibadah & Kegiatan', `Membuat kegiatan baru: ${data.title}`);
    res.json({ success: true, message: 'Kegiatan berhasil dijadwalkan', id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/events/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const data = req.body;
  try {
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Kegiatan tidak ditemukan' });
    }
    const value = (key: string, column: string) => data[key] !== undefined ? data[key] : existing[column];
    db.prepare(`
      UPDATE events
      SET title = ?, category = ?, start_time = ?, end_time = ?, location = ?,
          pic_name = ?, description = ?, status = ?, image_url = ?
      WHERE id = ?
    `).run(
      value('title', 'title'),
      value('category', 'category'),
      value('startTime', 'start_time'),
      value('endTime', 'end_time'),
      value('location', 'location'),
      value('picName', 'pic_name'),
      value('description', 'description') || '',
      value('status', 'status') || 'Terjadwal',
      value('imageUrl', 'image_url') || '',
      id
    );
    addAuditLog('admin', 'Admin', 'Perbarui Kegiatan', 'Agenda Kegiatan', `Memperbarui kegiatan: ${value('title', 'title')}`);
    res.json({ success: true, message: 'Kegiatan berhasil diperbarui' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.get('/schedules', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM service_schedules ORDER BY id DESC').all() as any[];
  res.json({
    success: true,
    schedules: rows.map(s => ({
      id: s.id,
      serviceDate: s.service_date,
      serviceName: s.service_name,
      preacher: s.preacher,
      liturgist: s.liturgist,
      elderDuty: s.elder_duty,
      deaconDuty: s.deacon_duty,
      songLeader: s.song_leader,
      musicians: s.musicians,
      multimediaOperator: s.multimedia_operator,
      usher: s.usher,
      bibleReader: s.bible_reader,
      notes: s.notes || '',
    })),
  });
});

apiRouter.post('/schedules', (req, res) => {
  const db = getDb();
  const data = req.body;
  if (!data.serviceDate || !String(data.serviceName || '').trim()) {
    return res.status(400).json({ success: false, message: 'Tanggal dan nama ibadah wajib diisi' });
  }
  const id = 'sch-' + Date.now();
  try {
    db.prepare(`
      INSERT INTO service_schedules (id, service_date, service_name, preacher, liturgist, elder_duty, deacon_duty, song_leader, musicians, multimedia_operator, usher, bible_reader, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.serviceDate, String(data.serviceName).trim(), data.preacher || '', data.liturgist || '', data.elderDuty || '',
      data.deaconDuty || '', data.songLeader || '', data.musicians || '', data.multimediaOperator || '', data.usher || '',
      data.bibleReader || '', data.notes || ''
    );
    addAuditLog('admin', 'Admin', 'Buat Jadwal Petugas Ibadah', 'Jadwal Pelayanan', `Membuat jadwal petugas kebaktian: ${data.serviceName} (${data.serviceDate})`);
    res.json({ success: true, message: 'Jadwal petugas ibadah berhasil disimpan', id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/schedules/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const data = req.body;
  try {
    db.prepare(`
      UPDATE service_schedules
      SET service_date = ?, service_name = ?, preacher = ?, liturgist = ?, elder_duty = ?,
          deacon_duty = ?, song_leader = ?, musicians = ?, multimedia_operator = ?, usher = ?,
          bible_reader = ?, notes = ?
      WHERE id = ?
    `).run(
      data.serviceDate,
      data.serviceName,
      data.preacher || '',
      data.liturgist || '',
      data.elderDuty || '',
      data.deaconDuty || '',
      data.songLeader || '',
      data.musicians || '',
      data.multimediaOperator || '',
      data.usher || '',
      data.bibleReader || '',
      data.notes || '',
      id
    );
    addAuditLog('admin', 'Admin', 'Perbarui Jadwal Ibadah', 'Jadwal Pelayanan', `Memperbarui petugas ibadah: ${data.serviceName}`);
    res.json({ success: true, message: 'Jadwal petugas ibadah berhasil diperbarui' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/schedules/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM service_schedules WHERE id = ?').run(id);
    addAuditLog('admin', 'Admin', 'Hapus Jadwal Ibadah', 'Jadwal Pelayanan', `Menghapus jadwal petugas ID: ${id}`);
    res.json({ success: true, message: 'Jadwal petugas ibadah berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/schedules', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM service_schedules').run();
    addAuditLog('admin', 'Admin', 'Kosongkan Seluruh Jadwal', 'Jadwal Pelayanan', 'Mengosongkan seluruh jadwal petugas ibadah');
    res.json({ success: true, message: 'Seluruh jadwal petugas ibadah berhasil dikosongkan' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Attendance
apiRouter.get('/attendance', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM attendance_records ORDER BY date DESC').all() as any[];
  res.json({
    success: true,
    attendance: rows.map(a => ({
      id: a.id,
      eventId: a.event_id,
      eventTitle: a.event_title,
      date: a.date,
      maleCount: a.male_count,
      femaleCount: a.female_count,
      childrenCount: a.children_count,
      totalCount: a.total_count,
      notes: a.notes || '',
      recordedBy: a.recorded_by,
    })),
  });
});

apiRouter.post('/attendance', (req, res) => {
  const db = getDb();
  const data = req.body;
  const id = 'att-' + Date.now();
  const male = Number(data.maleCount) || 0;
  const female = Number(data.femaleCount) || 0;
  const children = Number(data.childrenCount) || 0;
  const total = male + female + children;

  try {
    db.prepare(`
      INSERT INTO attendance_records (id, event_id, event_title, date, male_count, female_count, children_count, total_count, notes, recorded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.eventId || null, data.eventTitle, data.date, male, female, children, total, data.notes || '', data.recordedBy || 'Tata Usaha');
    addAuditLog('admin', 'Admin', 'Catat Absensi Ibadah', 'Absensi & Kehadiran', `Mencatat kehadiran ${total} jiwa pada ${data.eventTitle}`);
    res.json({ success: true, message: 'Absensi ibadah berhasil dicatat' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. Financial Transactions
apiRouter.get('/finance', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM financial_transactions ORDER BY tx_date DESC, id DESC').all() as any[];
  const transactions: FinancialTransaction[] = rows.map(t => ({
    id: t.id,
    txNo: t.tx_no,
    txDate: t.tx_date,
    type: t.type,
    category: t.category,
    amount: t.amount,
    description: t.description,
    recordedBy: t.recorded_by,
  }));

  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.type === 'Pemasukan') totalIncome += t.amount;
    else if (t.type === 'Pengeluaran') totalExpense += t.amount;
  }

  res.json({
    success: true,
    summary: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      count: transactions.length,
    },
    transactions,
  });
});

apiRouter.post('/finance', (req, res) => {
  const db = getDb();
  const data = req.body;
  const id = 'tx-' + Date.now();
  const txNo = data.txNo || `TX-${Date.now().toString().slice(-6)}`;
  const amount = Number(data.amount) || 0;

  try {
    db.prepare(`
      INSERT INTO financial_transactions (id, tx_no, tx_date, type, category, amount, description, recorded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, txNo, data.txDate, data.type, data.category, amount, data.description, data.recordedBy || 'Bendahara Jemaat');

    addAuditLog('admin', 'Admin', 'Catat Transaksi Keuangan', 'Keuangan Kas Gereja', `Mencatat ${data.type} sebesar Rp ${amount.toLocaleString('id-ID')} untuk ${data.category}`);
    res.json({ success: true, message: 'Transaksi kas gereja berhasil dicatat' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

function mapChurchSettings(row: any) {
  return {
    id: row.id,
    churchName: row.church_name,
    klasis: row.klasis,
    address: row.address || '',
    phone: row.phone || '',
    email: row.email || '',
    logoUrl: row.logo_url || '',
    stampUrl: row.stamp_url || '',
    signerName: row.signer_name || '',
    signerRole: row.signer_role || '',
    secretaryName: row.secretary_name || '',
    secretaryRole: row.secretary_role || '',
    updatedAt: row.updated_at || '',
  };
}

function validLetterheadImage(value: unknown, allowEmpty = false) {
  if (allowEmpty && !value) return true;
  if (typeof value !== 'string' || value.length > 1_500_000) return false;
  return /^\/images\/[A-Za-z0-9._/-]+$/.test(value) || /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value);
}

apiRouter.get('/settings/church', (_req, res) => {
  const row = getDb().prepare("SELECT * FROM church_settings WHERE id = 'gmit-betel-fuimelang'").get();
  if (!row) return res.status(404).json({ success: false, message: 'Pengaturan kop belum tersedia.' });
  res.json({ success: true, settings: mapChurchSettings(row) });
});

apiRouter.put('/settings/church', (req, res) => {
  const actor = (req as any).authUser;
  if (!isSuperAdmin(actor)) return res.status(403).json({ success: false, message: 'Hanya Super Admin yang dapat mengubah kop resmi.' });
  const data = req.body || {};
  if (!String(data.churchName || '').trim() || !String(data.klasis || '').trim()) {
    return res.status(400).json({ success: false, message: 'Nama gereja/jemaat dan klasis wajib diisi.' });
  }
  if (!validLetterheadImage(data.logoUrl) || !validLetterheadImage(data.stampUrl, true)) {
    return res.status(400).json({ success: false, message: 'Logo/cap tidak valid atau terlalu besar. Gunakan PNG, JPG, atau WebP.' });
  }
  const text = (value: unknown, max = 500) => String(value || '').trim().slice(0, max);
  const updatedAt = new Date().toISOString();
  const db = getDb();
  db.prepare(`
    UPDATE church_settings SET church_name = ?, klasis = ?, address = ?, phone = ?, email = ?,
      logo_url = ?, stamp_url = ?, signer_name = ?, signer_role = ?, secretary_name = ?, secretary_role = ?, updated_at = ?
    WHERE id = 'gmit-betel-fuimelang'
  `).run(
    text(data.churchName, 250), text(data.klasis, 200), text(data.address), text(data.phone, 100), text(data.email, 150),
    data.logoUrl, data.stampUrl || '', text(data.signerName, 150), text(data.signerRole, 150),
    text(data.secretaryName, 150), text(data.secretaryRole, 150), updatedAt,
  );
  addAuditLog(actor.id, actor.name, 'Ubah Kop Resmi', 'Pengaturan Gereja', 'Memperbarui identitas kop, logo, cap, dan penanda tangan');
  const row = db.prepare("SELECT * FROM church_settings WHERE id = 'gmit-betel-fuimelang'").get();
  res.json({ success: true, settings: mapChurchSettings(row), message: 'Kop resmi berhasil disimpan dan disinkronkan.' });
});

// 11. Digital Documents. Binary content stays out of list responses and is
// downloaded one record at a time after the same role/access checks.
const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);
const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;

function canAccessDocument(user: any, accessLevel: string) {
  if (accessLevel !== 'Admin') return true;
  return isSuperAdmin(user) || user?.role === 'Admin Gereja';
}

type ParsedDocumentFile =
  | { fileData: string; mimeType: string; fileSize: string; error?: never }
  | { error: string; fileData?: never; mimeType?: never; fileSize?: never };

function parseDocumentFile(fileData: unknown): ParsedDocumentFile {
  if (typeof fileData !== 'string') return { error: 'Pilih berkas dokumen yang akan diunggah.' };
  const match = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i.exec(fileData);
  if (!match || !DOCUMENT_MIME_TYPES.has(match[1].toLowerCase())) {
    return { error: 'Format berkas harus PDF, JPG, PNG, WebP, DOC/DOCX, XLS/XLSX, atau TXT.' };
  }
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES) return { error: 'Berkas dokumen harus berisi dan berukuran maksimal 2 MB.' };
  const fileSize = bytes.length < 1024 * 1024
    ? `${(bytes.length / 1024).toFixed(1)} KB`
    : `${(bytes.length / (1024 * 1024)).toFixed(2)} MB`;
  return { fileData, mimeType: match[1].toLowerCase(), fileSize };
}

function documentMetadata(d: any) {
  return {
    id: d.id,
    docNo: d.doc_no,
    title: d.title,
    category: d.category,
    memberId: d.member_id || '',
    fileName: d.file_name,
    fileSize: d.file_size,
    uploadDate: d.upload_date,
    accessLevel: d.access_level,
    mimeType: d.mime_type || '',
    hasFile: Boolean(d.file_data),
  };
}

apiRouter.get('/documents', (req, res) => {
  const db = getDb();
  const user = (req as any).authUser;
  const rows = db.prepare('SELECT * FROM documents ORDER BY upload_date DESC').all() as any[];
  const documents = rows.filter((d) => canAccessDocument(user, d.access_level)).map(documentMetadata);
  res.json({ success: true, documents });
});

apiRouter.get('/documents/:id/file', (req, res) => {
  const db = getDb();
  const user = (req as any).authUser;
  const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(String(req.params.id)) as any;
  if (!document) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
  if (!canAccessDocument(user, document.access_level)) return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke berkas ini.' });
  if (!document.file_data) return res.status(404).json({ success: false, message: 'Arsip lama ini belum memiliki berkas asli. Unggah ulang sebagai dokumen baru.' });
  addAuditLog(user.id, user.name, 'Unduh Dokumen', 'Dokumen & Arsip', `Mengunduh ${document.doc_no}: ${document.title}`);
  res.json({
    success: true,
    file: {
      ...documentMetadata(document),
      fileData: document.file_data,
      mimeType: document.mime_type || 'application/octet-stream',
    },
  });
});

apiRouter.post('/documents', (req, res) => {
  const db = getDb();
  const user = (req as any).authUser;
  const data = req.body || {};
  if (!String(data.title || '').trim()) return res.status(400).json({ success: false, message: 'Judul dokumen wajib diisi.' });
  const parsed = parseDocumentFile(data.fileData);
  if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
  const id = 'doc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const docNo = data.docNo || `DOC-BF-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString().substring(0, 10);
  const accessLevel = ['Publik', 'Majelis', 'Admin'].includes(data.accessLevel) ? data.accessLevel : 'Admin';

  try {
    db.prepare(`
      INSERT INTO documents (id, doc_no, title, category, member_id, file_name, file_size, upload_date, access_level, mime_type, file_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, docNo, String(data.title).trim(), data.category || 'Lainnya', data.memberId || null,
      String(data.fileName || 'dokumen').replace(/[\\/\0]/g, '_'), parsed.fileSize!, now, accessLevel,
      parsed.mimeType!, parsed.fileData!,
    );
    addAuditLog(user.id, user.name, 'Unggah Dokumen Digital', 'Dokumen & Arsip', `Menyimpan berkas asli ${docNo}: ${data.title}`);
    const created = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    res.status(201).json({ success: true, document: documentMetadata(created), message: 'Berkas dokumen berhasil disimpan.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 12. Announcements (Warta Jemaat)
apiRouter.get('/announcements', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM announcements ORDER BY date DESC').all() as any[];
  res.json({
    success: true,
    announcements: rows.map(a => ({
      id: a.id,
      title: a.title,
      date: a.date,
      category: a.category,
      content: a.content,
      author: a.author,
      isImportant: Boolean(a.is_important),
      imageUrl: a.image_url || '',
    })),
  });
});

apiRouter.post('/announcements', (req, res) => {
  const db = getDb();
  const data = req.body;
  const id = 'an-' + Date.now();
  const now = formatDateDMY(new Date().toISOString().substring(0, 10));

  try {
    db.prepare(`
      INSERT INTO announcements (id, title, date, category, content, author, is_important, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.title, data.date || now, data.category || 'Warta Ibadah', data.content, data.author || 'Sekretariat Majelis', data.isImportant ? 1 : 0, data.imageUrl || '');

    addAuditLog('admin', 'Admin', 'Terbitkan Warta', 'Warta & Pengumuman', `Menerbitkan warta jemaat: ${data.title}`);
    res.json({ success: true, message: 'Warta jemaat berhasil diterbitkan', id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/announcements/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const data = req.body;
  try {
    db.prepare(`
      UPDATE announcements
      SET title = ?, category = ?, content = ?, author = ?, is_important = ?, image_url = ?
      WHERE id = ?
    `).run(
      data.title,
      data.category || 'Warta Ibadah',
      data.content,
      data.author || 'Sekretariat Majelis',
      data.isImportant ? 1 : 0,
      data.imageUrl || '',
      id
    );
    addAuditLog('admin', 'Admin', 'Perbarui Warta', 'Warta & Pengumuman', `Memperbarui warta jemaat: ${data.title}`);
    res.json({ success: true, message: 'Warta jemaat berhasil diperbarui' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/announcements/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
    addAuditLog('admin', 'Admin', 'Hapus Warta', 'Warta & Pengumuman', `Menghapus warta jemaat ID: ${id}`);
    res.json({ success: true, message: 'Warta jemaat berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Activity images are private working assets until attached to public warta.
// The API keeps uploads available to password and Google admins alike.
function mapActivityImage(row: any) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description || '',
    url: row.url,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
    pendingSync: false,
  };
}

function validateActivityImage(data: any): string | null {
  const url = String(data?.url || '');
  if (!data?.title || !String(data.title).trim()) return 'Judul foto kegiatan wajib diisi.';
  if (String(data.title).length > 200 || String(data.category || '').length > 100 || String(data.description || '').length > 5000) return 'Metadata foto melebihi batas.';
  if (url.length === 0 || url.length > 2_000_000) return 'Ukuran data foto harus kurang dari 2 MB setelah kompresi.';
  if (!/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=\r\n]+$/.test(url) && !/^https:\/\//i.test(url)) return 'URL foto harus berupa gambar atau tautan HTTPS yang valid.';
  return null;
}

apiRouter.get('/activity-images', (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM activity_images ORDER BY created_at DESC LIMIT 100').all() as any[];
  res.json({ success: true, images: rows.map(mapActivityImage) });
});

apiRouter.post('/activity-images', (req, res) => {
  const data = req.body || {};
  const validationError = validateActivityImage(data);
  if (validationError) return res.status(400).json({ success: false, message: validationError });
  const id = String(data.id || `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return res.status(400).json({ success: false, message: 'ID foto tidak valid.' });
  const createdAt = data.createdAt && !Number.isNaN(Date.parse(data.createdAt)) ? new Date(data.createdAt).toISOString() : new Date().toISOString();
  const syncedAt = new Date().toISOString();
  try {
    getDb().prepare(`INSERT INTO activity_images (id, title, category, description, url, created_at, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, category = excluded.category,
        description = excluded.description, url = excluded.url, synced_at = excluded.synced_at`)
      .run(id, String(data.title).trim(), String(data.category || 'Kegiatan Jemaat').trim(), String(data.description || ''), data.url, createdAt, syncedAt);
    const row = getDb().prepare('SELECT * FROM activity_images WHERE id = ?').get(id);
    const user = (req as any).authUser;
    addAuditLog(user?.id || 'admin', user?.name || 'Admin', 'Unggah Foto Kegiatan', 'Galeri Kegiatan', `Menyimpan foto: ${String(data.title).trim()}`);
    res.json({ success: true, image: mapActivityImage(row), message: 'Foto kegiatan berhasil disimpan.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message || 'Foto gagal disimpan.' });
  }
});

apiRouter.put('/activity-images/:id', (req, res) => {
  const db = getDb();
  const old = db.prepare('SELECT * FROM activity_images WHERE id = ?').get(req.params.id) as any;
  if (!old) return res.status(404).json({ success: false, message: 'Foto tidak ditemukan.' });
  const data = {
    title: req.body?.title ?? old.title,
    category: req.body?.category ?? old.category,
    description: req.body?.description ?? old.description,
    url: req.body?.url ?? old.url,
  };
  const validationError = validateActivityImage(data);
  if (validationError) return res.status(400).json({ success: false, message: validationError });
  db.prepare('UPDATE activity_images SET title = ?, category = ?, description = ?, url = ?, synced_at = ? WHERE id = ?')
    .run(String(data.title).trim(), String(data.category).trim(), String(data.description || ''), data.url, new Date().toISOString(), req.params.id);
  res.json({ success: true, image: mapActivityImage(db.prepare('SELECT * FROM activity_images WHERE id = ?').get(req.params.id)) });
});

apiRouter.delete('/activity-images/:id', (req, res) => {
  const result = getDb().prepare('DELETE FROM activity_images WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, message: 'Foto tidak ditemukan.' });
  res.json({ success: true, message: 'Foto kegiatan berhasil dihapus.' });
});

// 13. Data Correction Requests (from Jemaat Portal)
apiRouter.get('/corrections', (req, res) => {
  const db = getDb();
  const authUser = (req as any).authUser;
  const rows = authUser?.role === 'Jemaat'
    ? db.prepare('SELECT * FROM data_correction_requests WHERE member_id = ? ORDER BY request_date DESC').all(authUser.memberId || '') as any[]
    : db.prepare('SELECT * FROM data_correction_requests ORDER BY request_date DESC').all() as any[];
  res.json({
    success: true,
    corrections: rows.map(c => ({
      id: c.id,
      memberId: c.member_id,
      memberName: c.member_name,
      requestDate: c.request_date,
      details: c.details,
      status: c.status,
      adminNotes: c.admin_notes || '',
    })),
  });
});

apiRouter.post('/corrections', (req, res) => {
  const db = getDb();
  const data = { ...(req.body || {}) };
  const authUser = (req as any).authUser;
  if (authUser?.role === 'Jemaat') {
    const ownMember = db.prepare('SELECT id, full_name FROM members WHERE id = ?').get(authUser.memberId || '') as any;
    if (!ownMember) return res.status(403).json({ success: false, message: 'Akun belum tertaut ke data jemaat.' });
    data.memberId = ownMember.id;
    data.memberName = ownMember.full_name;
  }
  if (!data.memberId || !data.memberName || !String(data.details || '').trim()) {
    return res.status(400).json({ success: false, message: 'Data jemaat dan rincian koreksi wajib diisi.' });
  }
  const id = 'cr-' + Date.now();
  const now = new Date().toISOString().substring(0, 10);

  try {
    db.prepare(`
      INSERT INTO data_correction_requests (id, member_id, member_name, request_date, details, status, admin_notes)
      VALUES (?, ?, ?, ?, ?, 'Menunggu', '')
    `).run(id, data.memberId, data.memberName, now, String(data.details).trim());

    addAuditLog(data.memberId, data.memberName, 'Ajukan Pembaruan Data', 'Portal Jemaat', `Warga jemaat ${data.memberName} mengajukan koreksi biodata`);
    res.json({ success: true, message: 'Pengajuan koreksi biodata berhasil dikirimkan ke tata usaha gereja' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/corrections/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { status, adminNotes } = req.body;
  try {
    db.prepare('UPDATE data_correction_requests SET status = ?, admin_notes = ? WHERE id = ?')
      .run(status, adminNotes || '', id);
    res.json({ success: true, message: 'Status pengajuan berhasil diperbarui' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 14. Dashboard Statistics
apiRouter.get('/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, service: 'sysjeger-api', storage: persistenceMode(), timestamp: new Date().toISOString() });
});

apiRouter.get('/stats', (req, res) => {
  const db = getDb();

  const membersRows = db.prepare(`
    SELECT m.*, r.name as rayon_name, c.name as categorial_group_name
    FROM members m
    LEFT JOIN rayons r ON m.rayon_id = r.id
    LEFT JOIN categorial_groups c ON m.categorial_group_id = c.id
  `).all() as any[];

  const members: Member[] = membersRows.map(r => ({
    id: r.id,
    memberNo: r.member_no,
    fullName: r.full_name,
    nickname: r.nickname || '',
    nik: r.nik || '',
    familyCardNo: r.family_card_no || '',
    familyId: r.family_id || '',
    familyRole: r.family_role,
    gender: r.gender,
    birthPlace: r.birth_place || '',
    birthDate: r.birth_date,
    address: r.address,
    kelurahan: r.kelurahan || '',
    kecamatan: r.kecamatan || '',
    kabupaten: r.kabupaten || '',
    phone: r.phone || '',
    email: r.email || '',
    maritalStatus: r.marital_status,
    spouseName: r.spouse_name || '',
    rayonId: r.rayon_id,
    rayonName: r.rayon_name || '',
    categorialGroupId: r.categorial_group_id,
    categorialGroupName: r.categorial_group_name || '',
    membershipStatus: r.membership_status,
    baptismStatus: r.baptism_status,
    confirmationStatus: r.confirmation_status,
    marriageChurchStatus: r.marriage_church_status,
    education: r.education || '',
    occupation: r.occupation || '',
    joinDate: r.join_date,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const familiesRows = db.prepare('SELECT * FROM families').all() as any[];
  const families: Family[] = familiesRows.map(f => ({
    id: f.id,
    familyNo: f.family_no,
    headOfFamilyName: f.head_of_family_name,
    address: f.address,
    rayonId: f.rayon_id,
    phone: f.phone || '',
    memberCount: 0,
    createdAt: f.created_at,
  }));

  const txRows = db.prepare('SELECT * FROM financial_transactions').all() as any[];
  const transactions: FinancialTransaction[] = txRows.map(t => ({
    id: t.id,
    txNo: t.tx_no,
    txDate: t.tx_date,
    type: t.type,
    category: t.category,
    amount: t.amount,
    description: t.description,
    recordedBy: t.recorded_by,
  }));

  const stats = calculateChurchStats(members, families, transactions);

  // Upcoming events
  const upcomingEvents = db.prepare('SELECT * FROM events WHERE status = \'Terjadwal\' ORDER BY start_time ASC LIMIT 5').all();
  const nextService = db.prepare('SELECT * FROM service_schedules ORDER BY id DESC LIMIT 1').get();

  res.json({
    success: true,
    stats: {
      ...stats,
      upcomingEvents,
      nextService,
    },
  });
});

// 15. Audit Logs
apiRouter.get('/audit-logs', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50').all();
  res.json({ success: true, logs: rows });
});

// 16. Import Batch
apiRouter.post('/import/members', (req, res) => {
  const db = getDb();
  const { members } = req.body;

  if (!Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ success: false, message: 'Tidak ada data jemaat yang diimpor' });
  }

  let successCount = 0;
  const errors: string[] = [];
  const now = new Date().toISOString().substring(0, 10);

  const insertMember = db.prepare(`
    INSERT INTO members (
      id, member_no, full_name, nickname, nik, family_card_no, family_id, family_role, gender,
      birth_place, birth_date, address, kelurahan, kecamatan, kabupaten, phone, email,
      marital_status, spouse_name, rayon_id, categorial_group_id, membership_status,
      baptism_status, baptism_date, confirmation_status, confirmation_date,
      marriage_church_status, marriage_date, education, occupation, join_date, status,
      notes, photo_url, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, NULL, ?, ?
    )
  `);

  for (let i = 0; i < members.length; i++) {
    const item = members[i];
    try {
      const v = validateMemberInput(item);
      if (!v.valid) {
        errors.push(`Baris ${i + 1} (${item.fullName || 'Tanpa Nama'}): ${v.errors.join(', ')}`);
        continue;
      }

      const id = 'm-imp-' + Date.now() + '-' + i;
      const count = (db.prepare('SELECT count(*) as count FROM members').get() as { count: number }).count;
      const memberNo = item.memberNo || generateMemberNo(count + 1);

      insertMember.run(
        id, memberNo, item.fullName, item.nickname || '', item.nik || '', item.familyCardNo || '',
        item.familyId || '', item.familyRole || 'Anggota', item.gender, item.birthPlace || '',
        item.birthDate, item.address || '', item.kelurahan || '',
        item.kecamatan || '', item.kabupaten || '', item.phone || '', item.email || '',
        item.maritalStatus || 'Belum Menikah', item.spouseName || '', item.rayonId,
        item.categorialGroupId || '', item.membershipStatus || 'Tetap',
        item.baptismStatus || 'Belum', item.baptismDate || '', item.confirmationStatus || 'Belum',
        item.confirmationDate || '', item.marriageChurchStatus || 'Belum', item.marriageDate || '',
        item.education || '', item.occupation || '', item.joinDate || now, item.status || 'Aktif',
        item.notes || 'Diimpor via Excel/CSV', now, now
      );

      successCount++;
    } catch (err: any) {
      errors.push(`Baris ${i + 1} gagal: ${err.message}`);
    }
  }

  addAuditLog('admin', 'Admin', 'Impor Data Jemaat', 'Impor & Ekspor', `Berhasil mengimpor ${successCount} data jemaat. Gagal: ${errors.length}`);

  res.json({
    success: true,
    imported: successCount,
    failed: errors.length,
    errors,
  });
});

// 17. Backup Database (Snapshot)
apiRouter.get('/backup', (req, res) => {
  const db = getDb();
  const tables = [
    'users', 'webauthn_credentials', 'rayons', 'categorial_groups', 'families', 'members',
    'church_staff', 'baptisms', 'confirmations', 'marriages', 'member_mutations',
    'events', 'service_schedules', 'attendance_records', 'financial_transactions', 'church_settings',
    'documents', 'announcements', 'activity_images', 'data_correction_requests', 'audit_logs'
  ];

  const backupData: Record<string, any[]> = {};
  for (const t of tables) {
    const rows = db.prepare(`SELECT * FROM ${t}`).all() as any[];
    // A downloadable backup must never contain password hashes.
    backupData[t] = t === 'users' ? rows.map(({ password_hash: _passwordHash, ...safeUser }) => safeUser) : rows;
  }

  addAuditLog('admin', 'Admin', 'Pencadangan Database', 'Backup & Restore', `Mengunduh berkas cadangan database SYSJEGER GMIT Betel Fuimelang`);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=sysjeger_backup_gmit_betel_${new Date().toISOString().substring(0, 10)}.json`);
  res.json({
    version: '2.0',
    church: 'GMIT BETEL FUIMELANG',
    backupTime: new Date().toISOString(),
    tables: backupData,
  });
});

// 18. Purge All Sample / Dummy Data
apiRouter.post('/database/clear-samples', (req, res) => {
  try {
    const db = getDb();
    purgeAllSampleData(db);
    addAuditLog('superadmin', 'Super Admin', 'Pembersihan Data Contoh', 'Manajemen Database', 'Menghapus seluruh data contoh/dummy jemaat, kartu keluarga, jadwal, transaksi, dan sakramen.');
    res.json({
      success: true,
      message: 'Seluruh data contoh berhasil dihapus. Database GMIT Betel Fuimelang kini dalam kondisi bersih dan siap diisi data riil jemaat.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal membersihkan data contoh: ' + err.message });
  }
});

// 19. Additional Super Admin Delete Endpoints for complete data control
apiRouter.delete('/finance/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM financial_transactions WHERE id = ?').run(id);
    addAuditLog('admin', 'Admin', 'Hapus Transaksi', 'Keuangan Kas Gereja', `Menghapus transaksi ID: ${id}`);
    res.json({ success: true, message: 'Transaksi kas berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/sacraments/:type/:id', (req, res) => {
  const db = getDb();
  const { type, id } = req.params;
  try {
    if (type === 'baptisms' || type === 'baptis') {
      db.prepare('DELETE FROM baptisms WHERE id = ?').run(id);
    } else if (type === 'confirmations' || type === 'sidi') {
      db.prepare('DELETE FROM confirmations WHERE id = ?').run(id);
    } else if (type === 'marriages' || type === 'nikah') {
      db.prepare('DELETE FROM marriages WHERE id = ?').run(id);
    }
    addAuditLog('admin', 'Admin', 'Hapus Sakramen', 'Sakramen & Peristiwa', `Menghapus data sakramen ${type} ID: ${id}`);
    res.json({ success: true, message: 'Catatan sakramen berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/events/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    addAuditLog('admin', 'Admin', 'Hapus Kegiatan', 'Agenda Kegiatan', `Menghapus kegiatan ID: ${id}`);
    res.json({ success: true, message: 'Kegiatan berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
