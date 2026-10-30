import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type { User } from '../types/index.ts';
import {
  webAuthnAuthenticateApi,
  webAuthnAuthenticationOptionsApi,
  webAuthnRegisterApi,
  webAuthnRegistrationOptionsApi,
  webAuthnDeleteCredentialApi,
} from '../services/api.ts';

const WEBAUTHN_STORAGE_KEY = 'sysjeger_biometric_credential';

export interface StoredBiometricCredential {
  credentialId: string;
  username: string;
  // Kept only as a display hint. It is never used to authorize a login.
  user: User;
  registeredAt: string;
}

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext !== false &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials !== 'undefined'
  );
}

export async function isPlatformBiometricAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch {
    return false;
  }
}

export function getRegisteredBiometricCredential(): StoredBiometricCredential | null {
  try {
    const raw = localStorage.getItem(WEBAUTHN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.credentialId && parsed?.username ? parsed : null;
  } catch {
    return null;
  }
}

export function clearRegisteredBiometricCredential(): void {
  try { localStorage.removeItem(WEBAUTHN_STORAGE_KEY); } catch { /* storage unavailable */ }
}

function errorMessage(error: any, fallback: string): string {
  if (error?.name === 'NotAllowedError') return 'Pemindaian biometrik dibatalkan atau ditolak.';
  if (error?.name === 'InvalidStateError') return 'Biometrik ini sudah terdaftar. Hapus pendaftaran lama lalu coba lagi.';
  return error?.message || fallback;
}

/** Register a real WebAuthn credential and verify its attestation on the server. */
export async function registerBiometricCredential(user: User): Promise<{ success: boolean; message: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, message: 'Perangkat atau browser ini belum mendukung autentikasi biometrik WebAuthn.' };
  }
  try {
    const optionsResult = await webAuthnRegistrationOptionsApi();
    if (!optionsResult.success) throw new Error(optionsResult.message || 'Sesi akun tidak valid.');
    const response = await startRegistration({ optionsJSON: optionsResult.options });
    const verified = await webAuthnRegisterApi(response, optionsResult.challengeToken);
    if (!verified.success) throw new Error(verified.message || 'Server menolak pendaftaran biometrik.');

    const storedData: StoredBiometricCredential = {
      credentialId: verified.credentialId || response.id,
      username: user.username,
      user,
      registeredAt: new Date().toISOString(),
    };
    try { localStorage.setItem(WEBAUTHN_STORAGE_KEY, JSON.stringify(storedData)); } catch { /* server credential is still valid */ }
    return { success: true, message: `Sidik jari / Face ID berhasil didaftarkan untuk "${user.name}" dan diverifikasi server.` };
  } catch (error: any) {
    console.warn('WebAuthn registration failed:', error);
    return { success: false, message: errorMessage(error, 'Gagal mendaftarkan biometrik pada perangkat ini.') };
  }
}

/** Remove both the server credential and the local username hint. */
export async function removeRegisteredBiometricCredential(): Promise<{ success: boolean; message: string }> {
  const stored = getRegisteredBiometricCredential();
  try {
    if (stored?.credentialId) {
      const result = await webAuthnDeleteCredentialApi(stored.credentialId);
      if (!result.success) throw new Error(result.message || 'Server menolak penghapusan kredensial.');
    }
    clearRegisteredBiometricCredential();
    return { success: true, message: 'Pendaftaran biometrik berhasil dihapus dari perangkat dan server.' };
  } catch (error: any) {
    return { success: false, message: errorMessage(error, 'Kredensial server belum dapat dihapus.') };
  }
}

/** Authenticate with a server-registered credential; no cached User is trusted. */
export async function authenticateWithBiometrics(): Promise<{
  success: boolean;
  user?: User;
  token?: string;
  message: string;
}> {
  if (!isWebAuthnSupported()) {
    return { success: false, message: 'Perangkat atau browser ini belum mendukung autentikasi biometrik WebAuthn.' };
  }
  const stored = getRegisteredBiometricCredential();
  if (!stored) {
    return { success: false, message: 'Belum ada sidik jari atau Face ID yang didaftarkan untuk perangkat ini.' };
  }

  try {
    const optionsResult = await webAuthnAuthenticationOptionsApi(stored.username);
    if (!optionsResult.success) throw new Error(optionsResult.message || 'Biometrik belum terdaftar pada server.');
    const response = await startAuthentication({ optionsJSON: optionsResult.options });
    const verified = await webAuthnAuthenticateApi(stored.username, response, optionsResult.challengeToken);
    if (!verified.success || !verified.user) throw new Error(verified.message || 'Server menolak autentikasi biometrik.');
    return {
      success: true,
      user: verified.user,
      token: verified.token,
      message: `Autentikasi sidik jari / Face ID berhasil. Selamat datang, ${verified.user.name}!`,
    };
  } catch (error: any) {
    console.warn('WebAuthn authentication failed:', error);
    return { success: false, message: errorMessage(error, 'Gagal memverifikasi biometrik perangkat.') };
  }
}
