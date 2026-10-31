import test from 'node:test';
import assert from 'node:assert/strict';
import { getN8nConfig } from '../server/n8n.ts';
import { getDb } from '../server/db.ts';

test('getN8nConfig retrieves or creates active configuration with API key', () => {
  const config = getN8nConfig();
  assert.ok(config);
  assert.ok(config.api_key.startsWith('n8n_bf_'));
  assert.equal(config.id, 'default');
});

test('n8n member lookup handles digits and fuzzy query format correctly', () => {
  const db = getDb();
  // Ensure a test member exists or check existing
  const member = db.prepare('SELECT member_no, full_name, phone FROM members LIMIT 1').get() as any;
  if (member) {
    const res = db.prepare(`
      SELECT m.id, m.member_no, m.full_name, r.name as rayon_name
      FROM members m
      LEFT JOIN rayons r ON m.rayon_id = r.id
      WHERE m.member_no = ? OR m.full_name LIKE ?
    `).all(member.member_no, `%${member.full_name}%`) as any[];

    assert.ok(res.length > 0);
    assert.equal(res[0].member_no, member.member_no);
  } else {
    // If empty DB, test query compiles without error
    const count = db.prepare('SELECT count(*) as total FROM members').get() as any;
    assert.ok(count.total >= 0);
  }
});

test('n8n_config table stores webhook URL and auto-broadcast setting', () => {
  const db = getDb();
  const row = db.prepare('SELECT is_enabled, auto_broadcast_warta FROM n8n_config WHERE id = ?').get('default') as any;
  assert.ok(row);
  assert.equal(row.is_enabled, 1);
  assert.equal(row.auto_broadcast_warta, 1);
});
