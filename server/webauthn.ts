import { Router } from 'express';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { getDb } from './db.ts';
import {
  findUserByEmail,
  findUserByUsername,
  issueSession,
  issueWebAuthnChallenge,
  readWebAuthnChallenge,
  toPublicUser,
} from './auth.ts';

export const webAuthnRouter = Router();

function relyingParty(req: any): { origin: string; rpID: string } {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const origin = req.headers.origin || `${protocol}://${req.get('host')}`;
  const parsed = new URL(origin);
  if (!parsed.hostname || !['http:', 'https:'].includes(parsed.protocol)) throw new Error('Origin WebAuthn tidak valid.');
  return { origin: parsed.origin, rpID: parsed.hostname };
}

function credentialsForUser(userId: string) {
  return getDb().prepare('SELECT * FROM webauthn_credentials WHERE user_id = ? ORDER BY created_at ASC').all(userId) as any[];
}

function transports(row: any): AuthenticatorTransportFuture[] | undefined {
  try {
    const parsed = row.transports ? JSON.parse(row.transports) : undefined;
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function findAccount(username: string): any {
  const normalized = String(username || '').trim();
  return findUserByUsername(normalized) || (normalized.includes('@') ? findUserByEmail(normalized) : null);
}

webAuthnRouter.post('/register-options', async (req, res) => {
  try {
    const user = (req as any).authUser;
    if (!user) return res.status(401).json({ success: false, message: 'Masuk terlebih dahulu untuk mendaftarkan biometrik.' });
    const { rpID } = relyingParty(req);
    const existing = credentialsForUser(user.id);
    const options = await generateRegistrationOptions({
      rpName: 'SYSJEGER — GMIT Betel Fuimelang',
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.username,
      userDisplayName: user.name,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required',
      },
      excludeCredentials: existing.map((credential) => ({ id: credential.id, transports: transports(credential) })),
    });
    res.json({
      success: true,
      options,
      challengeToken: issueWebAuthnChallenge('register', user.id, options.challenge),
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error?.message || 'Opsi pendaftaran biometrik gagal dibuat.' });
  }
});

webAuthnRouter.post('/register', async (req, res) => {
  try {
    const user = (req as any).authUser;
    if (!user) return res.status(401).json({ success: false, message: 'Sesi tidak aktif.' });
    const response = req.body?.response as RegistrationResponseJSON;
    const challenge = readWebAuthnChallenge(String(req.body?.challengeToken || ''), 'register', user.id);
    if (!response || !challenge) return res.status(400).json({ success: false, message: 'Challenge pendaftaran tidak valid atau kedaluwarsa.' });
    const { origin, rpID } = relyingParty(req);
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!verification.verified) return res.status(400).json({ success: false, message: 'Biometrik tidak dapat diverifikasi.' });

    const credential = verification.registrationInfo.credential;
    getDb().prepare(`INSERT INTO webauthn_credentials
      (id, user_id, public_key, counter, transports, created_at, last_used_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL)`).run(
      credential.id,
      user.id,
      Buffer.from(credential.publicKey).toString('base64url'),
      credential.counter,
      JSON.stringify(credential.transports || []),
      new Date().toISOString(),
    );
    res.json({ success: true, credentialId: credential.id, message: 'Biometrik berhasil didaftarkan dan diverifikasi server.' });
  } catch (error: any) {
    console.warn('[WebAuthn] Registration verification failed:', error?.message || error);
    res.status(400).json({ success: false, message: 'Verifikasi pendaftaran biometrik gagal. Silakan ulangi.' });
  }
});

webAuthnRouter.delete('/credentials/:id', (req, res) => {
  const user = (req as any).authUser;
  if (!user) return res.status(401).json({ success: false, message: 'Sesi tidak aktif.' });
  const result = getDb().prepare('DELETE FROM webauthn_credentials WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ success: true, removed: result.changes > 0, message: 'Kredensial biometrik dihapus.' });
});

webAuthnRouter.post('/authentication-options', async (req, res) => {
  try {
    const account = findAccount(String(req.body?.username || ''));
    if (!account || account.status !== 'Aktif') {
      return res.status(400).json({ success: false, message: 'Biometrik belum terdaftar untuk akun ini.' });
    }
    const existing = credentialsForUser(account.id);
    if (existing.length === 0) {
      return res.status(400).json({ success: false, message: 'Biometrik belum terdaftar pada server. Masuk dengan kata sandi lalu daftarkan ulang.' });
    }
    const { rpID } = relyingParty(req);
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: existing.map((credential) => ({ id: credential.id, transports: transports(credential) })),
      userVerification: 'required',
    });
    res.json({
      success: true,
      options,
      challengeToken: issueWebAuthnChallenge('authenticate', account.id, options.challenge),
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error?.message || 'Opsi autentikasi biometrik gagal dibuat.' });
  }
});

webAuthnRouter.post('/authenticate', async (req, res) => {
  try {
    const account = findAccount(String(req.body?.username || ''));
    if (!account || account.status !== 'Aktif') throw new Error('Akun tidak aktif.');
    const response = req.body?.response as AuthenticationResponseJSON;
    const challenge = readWebAuthnChallenge(String(req.body?.challengeToken || ''), 'authenticate', account.id);
    if (!response || !challenge) throw new Error('Challenge autentikasi tidak valid atau kedaluwarsa.');
    const stored = getDb().prepare('SELECT * FROM webauthn_credentials WHERE id = ? AND user_id = ?').get(response.id, account.id) as any;
    if (!stored) throw new Error('Kredensial biometrik tidak dikenali.');
    const { origin, rpID } = relyingParty(req);
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: stored.id,
        publicKey: new Uint8Array(Buffer.from(stored.public_key, 'base64url')),
        counter: Number(stored.counter || 0),
        transports: transports(stored),
      },
    });
    if (!verification.verified) throw new Error('Assertion biometrik tidak valid.');
    getDb().prepare('UPDATE webauthn_credentials SET counter = ?, last_used_at = ? WHERE id = ?')
      .run(verification.authenticationInfo.newCounter, new Date().toISOString(), stored.id);
    const user = toPublicUser(account);
    res.json({ success: true, user, token: issueSession(user.id), message: 'Autentikasi biometrik berhasil diverifikasi server.' });
  } catch (error: any) {
    console.warn('[WebAuthn] Authentication verification failed:', error?.message || error);
    res.status(401).json({ success: false, message: 'Autentikasi biometrik gagal. Gunakan kata sandi atau daftarkan ulang biometrik.' });
  }
});
