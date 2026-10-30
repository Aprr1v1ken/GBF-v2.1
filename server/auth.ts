import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { getDb } from './db.ts';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  rayonId: string | null;
  memberId: string | null;
  phone: string | null;
  email: string | null;
  status: string;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
// Vercel deployments must provide SESSION_SECRET so sessions and WebAuthn
// challenges remain valid across serverless instances. Local development has
// a separate non-production fallback.
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.AUTH_SECRET ||
  (process.env.VERCEL ? (() => { throw new Error('SESSION_SECRET is required on Vercel'); })() : 'sysjeger-local-development-secret');

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function sign(value: string): string {
  return createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

export function issueSession(userId: string): string {
  const payload = base64url(JSON.stringify({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }));
  return `v1.${payload}.${sign(payload)}`;
}

export function readSession(token?: string | null): { userId: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const [, payload, signature] = parts;
  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string; exp?: number };
    if (!decoded.sub || !decoded.exp || decoded.exp <= Math.floor(Date.now() / 1000)) return null;
    return { userId: decoded.sub };
  } catch {
    return null;
  }
}

export function issueWebAuthnChallenge(kind: 'register' | 'authenticate', userId: string, challenge: string): string {
  const payload = base64url(JSON.stringify({
    kind,
    sub: userId,
    challenge,
    exp: Math.floor(Date.now() / 1000) + 5 * 60,
  }));
  return `w1.${payload}.${sign(payload)}`;
}

export function readWebAuthnChallenge(token: string, kind: 'register' | 'authenticate', userId: string): string | null {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'w1') return null;
  const [, payload, signature] = parts;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as any;
    if (decoded.kind !== kind || decoded.sub !== userId || !decoded.challenge || decoded.exp <= Math.floor(Date.now() / 1000)) return null;
    return decoded.challenge;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPassword(stored: string, candidate: string): boolean {
  if (!stored || !candidate) return false;
  if (!stored.startsWith('scrypt$')) {
    // Migrate legacy databases without exposing the old password in logs.
    const left = Buffer.from(stored);
    const right = Buffer.from(candidate);
    return left.length === right.length && timingSafeEqual(left, right);
  }
  const [, saltText, hashText] = stored.split('$');
  if (!saltText || !hashText) return false;
  try {
    const expected = Buffer.from(hashText, 'base64url');
    const actual = scryptSync(candidate, Buffer.from(saltText, 'base64url'), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function toPublicUser(row: any): AuthUser {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    rayonId: row.rayon_id ?? null,
    memberId: row.member_id ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    status: row.status,
  };
}

export function findUserById(id: string): AuthUser | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ? AND status = 'Aktif'").get(id) as any;
  return row ? toPublicUser(row) : null;
}

export function findUserByUsername(username: string): any {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
}

export function findUserByEmail(email: string): any {
  return getDb().prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email) as any;
}

export function getRequestUser(req: Request): AuthUser | null {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  const session = readSession(token);
  return session ? findUserById(session.userId) : null;
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  return user?.role === 'Super Admin';
}
