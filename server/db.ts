import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

function getDatabasePath(): string {
  const localPath = path.resolve(process.cwd(), 'sysjeger.sqlite');
  // On Vercel serverless environments, root is read-only so use /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpPath = path.resolve('/tmp', 'sysjeger.sqlite');
    if (!fs.existsSync(tmpPath) && fs.existsSync(localPath)) {
      try {
        fs.copyFileSync(localPath, tmpPath);
      } catch (err) {
        console.warn('Could not copy sqlite to /tmp:', err);
      }
    }
    return tmpPath;
  }
  return localPath;
}

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = getDatabasePath();
    dbInstance = new DatabaseSync(dbPath);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  // Execute database schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      rayon_id TEXT,
      member_id TEXT,
      phone TEXT,
      email TEXT,
      status TEXT DEFAULT 'Aktif',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      public_key TEXT NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      transports TEXT,
      created_at TEXT NOT NULL,
      last_used_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_webauthn_user ON webauthn_credentials(user_id);

    CREATE TABLE IF NOT EXISTS rayons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      leader_name TEXT NOT NULL,
      leader_phone TEXT,
      coverage_area TEXT,
      notes TEXT,
      latitude REAL,
      longitude REAL
    );

    CREATE TABLE IF NOT EXISTS categorial_groups (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      target_age_desc TEXT,
      coordinator TEXT
    );

    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      family_no TEXT UNIQUE NOT NULL,
      head_of_family_name TEXT NOT NULL,
      head_of_family_id TEXT,
      address TEXT NOT NULL,
      rayon_id TEXT NOT NULL,
      phone TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      member_no TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      nickname TEXT,
      nik TEXT,
      family_card_no TEXT,
      family_id TEXT,
      family_role TEXT NOT NULL,
      gender TEXT NOT NULL,
      birth_place TEXT,
      birth_date TEXT NOT NULL,
      address TEXT NOT NULL,
      kelurahan TEXT,
      kecamatan TEXT,
      kabupaten TEXT,
      phone TEXT,
      email TEXT,
      marital_status TEXT NOT NULL,
      spouse_name TEXT,
      rayon_id TEXT NOT NULL,
      categorial_group_id TEXT NOT NULL,
      membership_status TEXT NOT NULL,
      baptism_status TEXT NOT NULL,
      baptism_date TEXT,
      confirmation_status TEXT NOT NULL,
      confirmation_date TEXT,
      marriage_church_status TEXT NOT NULL,
      marriage_date TEXT,
      education TEXT,
      occupation TEXT,
      join_date TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      photo_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS church_staff (
      id TEXT PRIMARY KEY,
      member_id TEXT,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      period TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS baptisms (
      id TEXT PRIMARY KEY,
      register_no TEXT UNIQUE NOT NULL,
      member_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      birth_date TEXT,
      parent_names TEXT,
      baptism_date TEXT NOT NULL,
      church_place TEXT NOT NULL,
      minister_name TEXT NOT NULL,
      certificate_no TEXT NOT NULL,
      witnesses TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS confirmations (
      id TEXT PRIMARY KEY,
      register_no TEXT UNIQUE NOT NULL,
      member_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      confirmation_date TEXT NOT NULL,
      church_place TEXT NOT NULL,
      minister_name TEXT NOT NULL,
      certificate_no TEXT NOT NULL,
      bible_verse TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS marriages (
      id TEXT PRIMARY KEY,
      register_no TEXT UNIQUE NOT NULL,
      groom_id TEXT,
      groom_name TEXT NOT NULL,
      bride_id TEXT,
      bride_name TEXT NOT NULL,
      blessing_date TEXT NOT NULL,
      church_place TEXT NOT NULL,
      minister_name TEXT NOT NULL,
      certificate_no TEXT NOT NULL,
      witness_names TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS member_mutations (
      id TEXT PRIMARY KEY,
      mutation_no TEXT UNIQUE NOT NULL,
      member_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      mutation_type TEXT NOT NULL,
      from_rayon_id TEXT,
      to_rayon_id TEXT,
      from_church TEXT,
      to_church TEXT,
      request_date TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL,
      approved_by TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT NOT NULL,
      pic_name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS service_schedules (
      id TEXT PRIMARY KEY,
      service_date TEXT NOT NULL,
      service_name TEXT NOT NULL,
      preacher TEXT NOT NULL,
      liturgist TEXT NOT NULL,
      elder_duty TEXT NOT NULL,
      deacon_duty TEXT NOT NULL,
      song_leader TEXT NOT NULL,
      musicians TEXT NOT NULL,
      multimedia_operator TEXT NOT NULL,
      usher TEXT NOT NULL,
      bible_reader TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      event_id TEXT,
      event_title TEXT NOT NULL,
      date TEXT NOT NULL,
      male_count INTEGER NOT NULL,
      female_count INTEGER NOT NULL,
      children_count INTEGER NOT NULL,
      total_count INTEGER NOT NULL,
      notes TEXT,
      recorded_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS financial_transactions (
      id TEXT PRIMARY KEY,
      tx_no TEXT UNIQUE NOT NULL,
      tx_date TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      recorded_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      doc_no TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      member_id TEXT,
      file_name TEXT NOT NULL,
      file_size TEXT NOT NULL,
      upload_date TEXT NOT NULL,
      access_level TEXT NOT NULL,
      mime_type TEXT,
      file_data TEXT
    );

    CREATE TABLE IF NOT EXISTS church_settings (
      id TEXT PRIMARY KEY,
      church_name TEXT NOT NULL,
      klasis TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      logo_url TEXT,
      stamp_url TEXT,
      signer_name TEXT,
      signer_role TEXT,
      secretary_name TEXT,
      secretary_role TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      is_important INTEGER DEFAULT 0,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_images (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS data_correction_requests (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      request_date TEXT NOT NULL,
      details TEXT NOT NULL,
      status TEXT NOT NULL,
      admin_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS church_locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT,
      leader_name TEXT,
      phone TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS n8n_config (
      id TEXT PRIMARY KEY,
      api_key TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      webhook_url TEXT,
      auto_broadcast_warta INTEGER DEFAULT 1,
      notes TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whatsapp_inbox (
      id TEXT PRIMARY KEY,
      sender_phone TEXT NOT NULL,
      sender_name TEXT,
      message_type TEXT NOT NULL,
      message_text TEXT NOT NULL,
      status TEXT DEFAULT 'Baru',
      reply_notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_registrations (
      id TEXT PRIMARY KEY,
      service_type TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      applicant_phone TEXT,
      details_json TEXT NOT NULL,
      status TEXT DEFAULT 'Menunggu Verifikasi',
      admin_notes TEXT,
      google_form_response_id TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Column upgrades for existing databases
  try {
    db.exec("ALTER TABLE members ADD COLUMN photo_url TEXT;");
  } catch {}
  try {
    db.exec("ALTER TABLE announcements ADD COLUMN image_url TEXT;");
  } catch {}
  try {
    db.exec("ALTER TABLE events ADD COLUMN image_url TEXT;");
  } catch {}
  try {
    db.exec("ALTER TABLE rayons ADD COLUMN latitude REAL;");
  } catch {}
  try {
    db.exec("ALTER TABLE rayons ADD COLUMN longitude REAL;");
  } catch {}
  try {
    db.exec("ALTER TABLE families ADD COLUMN latitude REAL;");
  } catch {}
  try {
    db.exec("ALTER TABLE families ADD COLUMN longitude REAL;");
  } catch {}
  try {
    db.exec("ALTER TABLE documents ADD COLUMN mime_type TEXT;");
  } catch {}
  try {
    db.exec("ALTER TABLE documents ADD COLUMN file_data TEXT;");
  } catch {}

  // Seed default landmark for church main building if none exists
  try {
    db.prepare(`
      INSERT OR IGNORE INTO church_locations
      (id, name, category, latitude, longitude, address, leader_name, phone, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'loc-church-main',
      'Gedung Gereja GMIT Betel Fuimelang',
      'church',
      -8.2384,
      124.5802,
      'Desa Lembur Tengah, Kec. Alor Tengah Utara, Kab. Alor, NTT',
      'Pdt. Sonya W. Isu, S.Th',
      '085173095482',
      'Pusat Ibadah Raya & Kantor Majelis Jemaat',
      '2026-01-01 08:00:00',
      '2026-01-01 08:00:00'
    );
  } catch {}

  db.prepare(`
    INSERT OR IGNORE INTO church_settings
    (id, church_name, klasis, address, phone, email, logo_url, stamp_url, signer_name, signer_role, secretary_name, secretary_role, updated_at)
    VALUES (?, ?, ?, ?, '', '', ?, '', ?, ?, ?, ?, ?)
  `).run(
    'gmit-betel-fuimelang',
    'GEREJA MASEHI INJILI DI TIMOR (GMIT) — JEMAAT BETEL FUIMELANG',
    'KLASIS ALOR TENGAH UTARA',
    'Jl. Raya Fuimelang - Moru, Desa Lembur Tengah, Kec. Alor Tengah Utara, Kab. Alor, Nusa Tenggara Timur',
    '/images/regenerated_image_1792510154483.png',
    'Pdt. Sonya W. Isu, S.Th',
    'Ketua Majelis Jemaat / Pendeta',
    'Dkn. Elisabeth Lopo',
    'Sekretaris Majelis Jemaat',
    new Date().toISOString(),
  );

  // Seed default n8n configuration if not already configured
  try {
    const existingN8n = db.prepare('SELECT id FROM n8n_config WHERE id = ?').get('default');
    if (!existingN8n) {
      db.prepare(`
        INSERT INTO n8n_config
        (id, api_key, is_enabled, webhook_url, auto_broadcast_warta, notes, updated_at)
        VALUES (?, ?, 1, '', 1, 'Koneksi n8n WhatsApp Bot GMIT Betel Fuimelang', ?)
      `).run(
        'default',
        'n8n_bf_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12),
        new Date().toISOString()
      );
    }
  } catch {}

  // Never delete records during startup. Vercel may create a fresh serverless
  // instance at any time; destructive "demo cleanup" here would erase real data.
  // Sample records are removed only by the explicit, narrowly scoped purge action.
  seedInitialData(db);
}

export function purgeAllSampleData(db: DatabaseSync) {
  try {
    // Only remove the fixed IDs used by the old demo seeder. Never use broad
    // member-number patterns or DELETE FROM <table> here: real records may use
    // the same numbering sequence as the old examples.
    const demoMemberFilter = `id IN ('m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12')
      AND member_no IN ('GMIT-BF-2026-001','GMIT-BF-2026-002','GMIT-BF-2026-003','GMIT-BF-2026-004','GMIT-BF-2026-005','GMIT-BF-2026-006','GMIT-BF-2026-007','GMIT-BF-2026-008','GMIT-BF-2026-009','GMIT-BF-2026-010','GMIT-BF-2026-011','GMIT-BF-2026-012')
      AND full_name IN ('Yulius Banamtuan','Maria Banamtuan-Kase','Daniel Banamtuan','Johanis Lopo','Sarah Lopo-Mone','Debora Lopo','Soleman Malaikosa','Naomi Malaikosa-Blegur','Markus Malaikosa','Simon Malaipada','Martha Doko-Lobo','Kornelius Malaipada')`;
    db.exec(`
      DELETE FROM member_mutations WHERE member_id IN (SELECT id FROM members WHERE ${demoMemberFilter});
      DELETE FROM baptisms WHERE member_id IN (SELECT id FROM members WHERE ${demoMemberFilter});
      DELETE FROM confirmations WHERE member_id IN (SELECT id FROM members WHERE ${demoMemberFilter});
      DELETE FROM data_correction_requests WHERE member_id IN (SELECT id FROM members WHERE ${demoMemberFilter});
      DELETE FROM members WHERE ${demoMemberFilter};
      DELETE FROM families WHERE id IN ('f1','f2','f3','f4')
        AND family_no IN ('KK-BF-001','KK-BF-002','KK-BF-003','KK-BF-004')
        AND head_of_family_name IN ('Pnt. Yulius Banamtuan','Johanis Lopo','Pnt. Soleman Malaikosa','Pnt. Simon Malaipada');
      DELETE FROM service_schedules WHERE id = 'sch-1' AND service_name = 'Kebaktian Minggu Pagi - Minggu XXI Setelah Pentakosta';
      DELETE FROM financial_transactions WHERE (id = 'tx-1' AND tx_no = 'TX-BF-2026-001')
        OR (id = 'tx-2' AND tx_no = 'TX-BF-2026-002') OR (id = 'tx-3' AND tx_no = 'TX-BF-2026-003');
      DELETE FROM users WHERE (id = 'u2' AND username = 'admingereja')
        OR (id = 'u3' AND username = 'pendeta')
        OR (id = 'u4' AND username = 'majelisrayon1')
        OR (id = 'u5' AND username = 'jemaat1');
    `);
    console.log('[DB] Data contoh lama berhasil dibersihkan tanpa menghapus data asli.');
    return true;
  } catch (err) {
    console.error('[DB] Gagal membersihkan data contoh:', err);
    throw err;
  }
}

function seedInitialData(db: DatabaseSync) {
  // Check if users already seeded
  const userCheck = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (userCheck && userCheck.count > 0) {
    // Ensure Super Admin email aprryviken@gmail.com is up to date
    try {
      db.prepare("UPDATE users SET email = 'aprryviken@gmail.com', role = 'Super Admin' WHERE id = 'u1' OR username = 'superadmin'").run();
    } catch {}
    return;
  }

  // 1. Rayons (Tepat 4 Rayon: Rayon I, II, III, IV) - leader_name emptied for user to input real actual data
  const rayons = [
    { id: 'r1', code: 'RY-01', name: 'Rayon I', leader_name: '', leader_phone: '', coverage_area: 'Fuimelang Pusat & Pasar Lama', notes: 'Wilayah pelayanan sektor I' },
    { id: 'r2', code: 'RY-02', name: 'Rayon II', leader_name: '', leader_phone: '', coverage_area: 'Kompleks SD Betel & Liku', notes: 'Wilayah pelayanan sektor II' },
    { id: 'r3', code: 'RY-03', name: 'Rayon III', leader_name: '', leader_phone: '', coverage_area: 'Fuimelang Atas & Kebun Sirih', notes: 'Wilayah pelayanan sektor III' },
    { id: 'r4', code: 'RY-04', name: 'Rayon IV', leader_name: '', leader_phone: '', coverage_area: 'Pesisir Pantai, Dermaga & Moru', notes: 'Wilayah pelayanan sektor IV' },
  ];
  const insertRayon = db.prepare('INSERT INTO rayons (id, code, name, leader_name, leader_phone, coverage_area, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const r of rayons) {
    insertRayon.run(r.id, r.code, r.name, r.leader_name, r.leader_phone, r.coverage_area, r.notes);
  }

  // 2. Kategorial - coordinator emptied for user to input real actual data
  const categorials = [
    { id: 'c1', code: 'PAR', name: 'Pelayanan Anak dan Remaja (PAR)', target_age_desc: '0 - 15 Tahun', coordinator: '' },
    { id: 'c2', code: 'PEMUDA', name: 'Gerakan Pemuda GMIT (GP GMIT)', target_age_desc: '16 - 30 Tahun', coordinator: '' },
    { id: 'c3', code: 'PKP', name: 'Persekutuan Kaum Perempuan GMIT (PKP)', target_age_desc: 'Ibu-ibu Jemaat', coordinator: '' },
    { id: 'c4', code: 'PKB', name: 'Persekutuan Kaum Bapak GMIT (PKB)', target_age_desc: 'Bapak-bapak Jemaat', coordinator: '' },
    { id: 'c5', code: 'LANSIA', name: 'Persekutuan Usia Indah (Lansia)', target_age_desc: 'Usia 60 Tahun ke atas', coordinator: '' },
  ];
  const insertCat = db.prepare('INSERT INTO categorial_groups (id, code, name, target_age_desc, coordinator) VALUES (?, ?, ?, ?, ?)');
  for (const c of categorials) {
    insertCat.run(c.id, c.code, c.name, c.target_age_desc, c.coordinator);
  }

  // 3. Keep one initial owner account. Other official accounts should be
  // created by the owner, not shipped as public demo credentials.
  const users = [
    { id: 'u1', username: 'superadmin', password_hash: process.env.SUPER_ADMIN_PASSWORD || 'admin123', name: 'Super Admin SYSJEGER', role: 'Super Admin', rayon_id: null, phone: '', email: 'aprryviken@gmail.com' },
  ];
  const insertUser = db.prepare('INSERT INTO users (id, username, password_hash, name, role, rayon_id, member_id, phone, email, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, \'Aktif\', \'2026-01-01 08:00:00\')');
  for (const u of users) {
    insertUser.run(u.id, u.username, u.password_hash, u.name, u.role, u.rayon_id, u.phone, u.email);
  }

  // 4. Audit Log (Database initialized clean for live church usage)
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, module, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertAudit.run('aud1', 'u1', 'Super Admin', 'Inisialisasi Sistem', 'Sistem', 'Database SYSJEGER GMIT Betel Fuimelang Periode Pelayanan 2026-2029 siap digunakan dalam kondisi bersih', '2026-10-18 08:00:00');

}

