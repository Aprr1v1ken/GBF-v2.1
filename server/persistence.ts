import { Pool } from 'pg';
import { getDb } from './db.ts';

// The existing application uses node:sqlite for its fast local/offline data
// layer. Vercel's filesystem is ephemeral, so a small durable snapshot adapter
// keeps that same data in the project's provisioned Postgres database. It is
// deliberately enabled only on Vercel (or when explicitly requested locally).
const TABLES = [
  'users', 'webauthn_credentials', 'rayons', 'categorial_groups', 'families', 'members', 'church_staff',
  'baptisms', 'confirmations', 'marriages', 'member_mutations', 'events',
  'service_schedules', 'attendance_records', 'financial_transactions', 'church_settings', 'church_locations', 'documents',
  'announcements', 'activity_images', 'data_correction_requests', 'audit_logs',
  'n8n_config', 'whatsapp_inbox', 'service_registrations',
] as const;

type TableName = typeof TABLES[number];
type Snapshot = { version: 1; savedAt: string; tables: Record<TableName, any[]> };
// Newly introduced tables may be absent from an older durable snapshot. Their
// clean schema/default rows are retained while all pre-existing tables restore.
const DEFAULTED_SNAPSHOT_TABLES = new Set<TableName>(['church_settings', 'church_locations', 'n8n_config', 'whatsapp_inbox', 'service_registrations']);

let pool: Pool | null = null;
let preparePromise: Promise<void> | null = null;
let writePromise: Promise<void> = Promise.resolve();

export function persistenceEnabled(): boolean {
  return Boolean(
    !process.env.SYSJEGER_DISABLE_PERSISTENCE &&
    process.env.POSTGRES_URL &&
    (process.env.VERCEL || process.env.SYSJEGER_USE_POSTGRES === 'true')
  );
}

export function persistenceMode(): 'postgres-snapshot' | 'local-sqlite' {
  return persistenceEnabled() ? 'postgres-snapshot' : 'local-sqlite';
}

function getPool(): Pool {
  if (!pool) {
    // pg v8.23+ interprets sslmode=require as verify-full. Supabase's
    // pooler certificate chain is not always usable with that mode in a
    // serverless runtime; remove only the mode flag and explicitly retain TLS
    // with the standard Supabase serverless compatibility setting.
    let connectionString = process.env.POSTGRES_URL || '';
    try {
      const parsed = new URL(connectionString);
      parsed.searchParams.delete('sslmode');
      connectionString = parsed.toString();
    } catch {
      // Let pg report an invalid connection string in its normal error path.
    }
    pool = new Pool({
      connectionString,
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

function readSnapshot(): Snapshot {
  const db = getDb();
  const tables = {} as Record<TableName, any[]>;
  for (const table of TABLES) {
    tables[table] = db.prepare(`SELECT * FROM ${table}`).all() as any[];
  }
  return { version: 1, savedAt: new Date().toISOString(), tables };
}

function validSnapshot(value: any): value is Snapshot {
  return value && value.version === 1 && value.tables && TABLES.every((table) =>
    DEFAULTED_SNAPSHOT_TABLES.has(table)
      ? value.tables[table] === undefined || Array.isArray(value.tables[table])
      : Array.isArray(value.tables[table])
  );
}

function restoreSnapshot(snapshot: Snapshot) {
  const db = getDb();
  db.exec('BEGIN');
  try {
    // There are no foreign-key constraints in the legacy schema; deleting in
    // reverse order also keeps this safe if constraints are added later.
    for (const table of [...TABLES].reverse()) {
      if (DEFAULTED_SNAPSHOT_TABLES.has(table) && !Array.isArray(snapshot.tables[table])) continue;
      db.prepare(`DELETE FROM ${table}`).run();
    }
    for (const table of TABLES) {
      const rows = snapshot.tables[table];
      if (DEFAULTED_SNAPSHOT_TABLES.has(table) && !Array.isArray(rows)) continue;
      for (const row of rows) {
        const columns = Object.keys(row);
        if (columns.length === 0) continue;
        const placeholders = columns.map(() => '?').join(', ');
        const quotedColumns = columns.map((column) => `"${column.replace(/"/g, '""')}"`).join(', ');
        db.prepare(`INSERT INTO ${table} (${quotedColumns}) VALUES (${placeholders})`)
          .run(...columns.map((column) => row[column]));
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

async function prepare(): Promise<void> {
  const database = getPool();
  await database.query(`CREATE TABLE IF NOT EXISTS sysjeger_state (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const result = await database.query('SELECT payload FROM sysjeger_state WHERE id = $1', ['gmit-betel-fuimelang']);
  const raw = result.rows[0]?.payload;
  if (raw) {
    const snapshot = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!validSnapshot(snapshot)) throw new Error('Format snapshot database cloud tidak dikenali.');
    restoreSnapshot(snapshot);
  } else {
    // Initialize the durable store from the clean bundled database on first use.
    await database.query(
      'INSERT INTO sysjeger_state (id, payload, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING',
      ['gmit-betel-fuimelang', JSON.stringify(readSnapshot())],
    );
  }
}

export async function preparePersistence(): Promise<void> {
  if (!persistenceEnabled()) return;
  if (!preparePromise) {
    preparePromise = prepare().catch((error) => {
      preparePromise = null;
      throw error;
    });
  }
  return preparePromise;
}

export function persistSnapshot(): Promise<void> {
  if (!persistenceEnabled()) return Promise.resolve();
  // Serialize writes within one lambda and always snapshot after the preceding
  // write has completed, so rapid CRUD actions cannot persist an older state.
  const operation = writePromise.catch(() => undefined).then(async () => {
    await getPool().query(
      `INSERT INTO sysjeger_state (id, payload, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      ['gmit-betel-fuimelang', JSON.stringify(readSnapshot())],
    );
  });
  writePromise = operation.catch((error) => {
    console.error('[Persistence] Gagal menyimpan snapshot Postgres:', error);
  });
  return operation;
}
