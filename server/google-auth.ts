import { createVerify } from 'node:crypto';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

interface FirebaseProfile {
  uid: string;
  email: string;
  name: string;
}

let certificateCache: { expires: number; certificates: Record<string, string> } | null = null;

function decodeJsonPart(value: string): any {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

async function getFirebaseCertificates(): Promise<Record<string, string>> {
  if (certificateCache && certificateCache.expires > Date.now()) return certificateCache.certificates;
  const response = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  if (!response.ok) throw new Error('Layanan verifikasi Google tidak dapat dihubungi.');
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600);
  const certificates = await response.json() as Record<string, string>;
  certificateCache = { certificates, expires: Date.now() + maxAge * 1000 };
  return certificates;
}

/** Verify a Firebase Google ID token using Google's rotating public certificates. */
export async function verifyFirebaseGoogleToken(idToken: string): Promise<FirebaseProfile> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Token Google tidak valid.');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJsonPart(encodedHeader);
  const payload = decodeJsonPart(encodedPayload);
  const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const now = Math.floor(Date.now() / 1000);

  if (header.alg !== 'RS256' || !header.kid || payload.aud !== projectId ||
      payload.iss !== `https://securetoken.google.com/${projectId}` ||
      !payload.sub || !payload.exp || payload.exp <= now || !payload.email || payload.email_verified === false) {
    throw new Error('Token Google tidak valid atau sudah kedaluwarsa.');
  }

  const certificates = await getFirebaseCertificates();
  const certificate = certificates[header.kid];
  if (!certificate) {
    certificateCache = null;
    const refreshed = await getFirebaseCertificates();
    if (!refreshed[header.kid]) throw new Error('Sertifikat Google tidak dikenali.');
  }
  const key = certificate || (await getFirebaseCertificates())[header.kid];
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  if (!verifier.verify(key, Buffer.from(encodedSignature, 'base64url'))) {
    throw new Error('Tanda tangan token Google tidak valid.');
  }

  return {
    uid: String(payload.sub),
    email: String(payload.email).toLowerCase(),
    name: String(payload.name || payload.email),
  };
}
