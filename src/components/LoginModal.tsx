import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  ArrowRight,
  Shield,
  AlertCircle,
  X,
  Check,
  Fingerprint,
  ScanFace,
  Sparkles,
  KeyRound,
  Trash2,
} from 'lucide-react';
import { googleLoginApi, loginApi } from '../services/api.ts';
import { auth, googleProvider } from '../services/firebase.ts';
import { signInWithPopup } from '@firebase/auth';
import type { User as UserType } from '../types/index.ts';
import {
  isWebAuthnSupported,
  isPlatformBiometricAvailable,
  getRegisteredBiometricCredential,
  authenticateWithBiometrics,
  removeRegisteredBiometricCredential,
  type StoredBiometricCredential,
} from '../utils/webauthn.ts';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType, token?: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricMessage, setBiometricMessage] = useState('');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [storedBiometric, setStoredBiometric] = useState<StoredBiometricCredential | null>(null);

  // Check biometric support and load saved credentials on open
  useEffect(() => {
    if (isOpen) {
      const supported = isWebAuthnSupported();
      setBiometricSupported(supported);
      setStoredBiometric(getRegisteredBiometricCredential());
      setError('');
      setBiometricMessage('');

      if (supported) {
        isPlatformBiometricAvailable().then((avail) => {
          if (!avail && !getRegisteredBiometricCredential()) {
            setBiometricSupported(false);
          }
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // WebAuthn Biometric Login Handler (Fingerprint / Face Unlock / Touch ID)
  const handleBiometricLogin = async () => {
    setError('');
    setBiometricMessage('');
    setBiometricLoading(true);

    try {
      const res = await authenticateWithBiometrics();
      if (res.success && res.user) {
        setBiometricMessage(res.message);
        setTimeout(() => {
          onLoginSuccess(res.user!, res.token);
          onClose();
        }, 400);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memverifikasi sensor sidik jari / wajah.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleRemoveBiometric = async () => {
    const result = await removeRegisteredBiometricCredential();
    if (result.success) setStoredBiometric(null);
    setBiometricMessage(result.message);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();
      const serverLogin = await googleLoginApi(idToken);
      if (!serverLogin.success || !serverLogin.user) {
        throw new Error(serverLogin.message || 'Akun Google belum terdaftar atau belum aktif.');
      }
      // Roles and member links always come from the server, never from an
      // email comparison or a client-created user object.
      onLoginSuccess(serverLogin.user, serverLogin.token);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal masuk menggunakan Google Firebase');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginApi(username, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user, res.token);
        onClose();
      } else {
        setError(res.message || 'Nama pengguna atau kata sandi tidak valid');
      }
    } catch (err: any) {
      setError('Gagal terhubung ke server autentikasi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0b1226] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-b from-[#131d3b] to-[#0b1226] border-b border-amber-500/20 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 mx-auto mb-3 rounded-full border-2 border-amber-400/60 overflow-hidden bg-slate-900 shadow-lg">
            <img
              src="/images/regenerated_image_1792510154483.png"
              alt="GMIT Betel Fuimelang"
              className="w-full h-full object-contain bg-white p-1"
              referrerPolicy="no-referrer"
            />
          </div>

          <h3 className="text-lg font-bold text-amber-300">
            Masuk Sistem SYSJEGER V2.0
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            GMIT BETEL FUIMELANG · SISTEM INFORMASI GEREJA
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-[11px] text-amber-200/90 leading-relaxed">
            <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Akses khusus Majelis Jemaat & Administrator resmi GMIT Betel Fuimelang. Masuk menggunakan biometrik sensor perangkat atau akun terdaftar.
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {biometricMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{biometricMessage}</span>
            </div>
          )}

          {/* Biometric unlock is available only after the signed-in user enrolls it in Settings. */}
          {biometricSupported && storedBiometric && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/15 border border-amber-400/50 text-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2"><Fingerprint className="w-4 h-4 text-amber-300" /><span className="text-xs font-bold text-amber-300">Biometrik WebAuthn Aktif</span></div>
                  <button type="button" onClick={handleRemoveBiometric} className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1" title="Hapus pendaftaran biometrik"><Trash2 className="w-3 h-3" /><span>Hapus</span></button>
                </div>
                <button type="button" onClick={handleBiometricLogin} disabled={loading || biometricLoading} className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-between disabled:opacity-50">
                  <span className="flex items-center gap-2"><ScanFace className={`w-4 h-4 ${biometricLoading ? 'animate-spin' : ''}`} /><span>{biometricLoading ? 'Memindai Sensor...' : 'Buka dengan Sidik Jari / Face ID'}</span></span>
                  <span className="text-[10px] font-normal">{storedBiometric.user.name}</span>
                </button>
              </div>
              <div className="relative my-2"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div><div className="relative flex justify-center text-[10px] uppercase"><span className="bg-[#0b1226] px-2 text-slate-500 font-semibold">atau gunakan kata sandi</span></div></div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nama Pengguna (Username)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Nama pengguna akun resmi"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#070c1b] border border-slate-700 focus:border-amber-400 rounded-xl text-white outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#070c1b] border border-slate-700 focus:border-amber-400 rounded-xl text-white outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-[#0b1226] px-2 text-slate-500 font-semibold">atau autentikasi</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/40 text-slate-200 font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.4s.2-1.7.4-2.4L1.9 7C.7 9.4 0 12 0 14.7s.7 5.3 1.9 7.7l3.7-2.7z"/>
                <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16.4C3.7 20.2 7.5 23.5 12 23.5z"/>
              </svg>
              <span>Masuk dengan Akun Google (Firebase)</span>
            </button>
          </form>

          <p className="pt-3 border-t border-slate-800 text-center text-[11px] text-slate-500 leading-relaxed">
            Gunakan akun resmi yang diberikan Majelis Jemaat. Jangan membagikan kata sandi kepada pihak lain.
          </p>
        </div>
      </div>
    </div>
  );
};
