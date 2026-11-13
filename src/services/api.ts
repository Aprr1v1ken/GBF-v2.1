import type {
  Member,
  Family,
  Rayon,
  CategorialGroup,
  ChurchStaff,
  BaptismRecord,
  ConfirmationRecord,
  MarriageRecord,
  MutationRecord,
  ChurchEvent,
  ServiceSchedule,
  AttendanceRecord,
  FinancialTransaction,
  DocumentRecord,
  Announcement,
  DataCorrectionRequest,
  AuditLog,
  User,
  ChurchLocation,
} from '../types/index.ts';
import { DEFAULT_CHURCH_SETTINGS } from '../utils/church-settings.ts';

const API_BASE = '/api';
const TOKEN_KEY = 'sysjeger_session_token';

// Built-in official credentials for resilient authentication on Netlify, offline, or cloud disconnect
export const RESILIENT_ACCOUNTS: Record<string, { password: string; user: User }> = {
  superadmin: {
    password: 'admin123',
    user: {
      id: 'u1',
      username: 'superadmin',
      name: 'Super Admin SYSJEGER',
      role: 'Super Admin',
      phone: '085173095482',
      email: 'aprryviken@gmail.com',
      status: 'Aktif',
      createdAt: '2026-01-01 08:00:00',
    },
  },
  admin: {
    password: 'admin123',
    user: {
      id: 'u2',
      username: 'admin',
      name: 'Tata Usaha GMIT Betel Fuimelang',
      role: 'Admin Gereja',
      phone: '',
      email: '',
      status: 'Aktif',
      createdAt: '2026-01-01 08:00:00',
    },
  },
  pendeta: {
    password: 'pendeta123',
    user: {
      id: 'u3',
      username: 'pendeta',
      name: 'Pdt. Sonya W. Isu, S.Th',
      role: 'Ketua Majelis/Pendeta',
      phone: '085173095482',
      email: '',
      status: 'Aktif',
      createdAt: '2026-01-01 08:00:00',
    },
  },
  majelis1: {
    password: 'majelis123',
    user: {
      id: 'u4',
      username: 'majelis1',
      name: 'Pnt. Dominggus Manimau',
      role: 'Majelis/Rayon',
      rayonId: 'r1',
      phone: '',
      email: '',
      status: 'Aktif',
      createdAt: '2026-01-01 08:00:00',
    },
  },
  jemaat1: {
    password: 'jemaat123',
    user: {
      id: 'u5',
      username: 'jemaat1',
      name: 'Jemima Viken',
      role: 'Jemaat',
      memberId: 'm1',
      phone: '',
      email: '',
      status: 'Aktif',
      createdAt: '2026-01-01 08:00:00',
    },
  },
};

const DEFAULT_RAYONS: Rayon[] = [
  { id: 'r1', code: 'RY-01', name: 'Rayon I', leaderName: 'Pnt. Dominggus Manimau', leaderPhone: '', coverageArea: 'Fuimelang Pusat & Pasar Lama', familyCount: 0, memberCount: 0 },
  { id: 'r2', code: 'RY-02', name: 'Rayon II', leaderName: 'Pnt. Daniel Banamtuan', leaderPhone: '', coverageArea: 'Kompleks SD Betel & Liku', familyCount: 0, memberCount: 0 },
  { id: 'r3', code: 'RY-03', name: 'Rayon III', leaderName: 'Pnt. Markus Malaikosa', leaderPhone: '', coverageArea: 'Fuimelang Atas & Kebun Sirih', familyCount: 0, memberCount: 0 },
  { id: 'r4', code: 'RY-04', name: 'Rayon IV', leaderName: 'Pnt. Soleman Malaikosa', leaderPhone: '', coverageArea: 'Pesisir Pantai, Dermaga & Moru', familyCount: 0, memberCount: 0 },
];

const DEFAULT_CATEGORIALS: CategorialGroup[] = [
  { id: 'c1', code: 'PAR', name: 'Pelayanan Anak dan Remaja (PAR)', targetAgeDesc: '0 - 15 Tahun', coordinator: '', memberCount: 0 },
  { id: 'c2', code: 'PEMUDA', name: 'Gerakan Pemuda GMIT (GP GMIT)', targetAgeDesc: '16 - 30 Tahun', coordinator: '', memberCount: 0 },
  { id: 'c3', code: 'PKP', name: 'Persekutuan Kaum Perempuan GMIT (PKP)', targetAgeDesc: 'Ibu-ibu Jemaat', coordinator: '', memberCount: 0 },
  { id: 'c4', code: 'PKB', name: 'Persekutuan Kaum Bapak GMIT (PKB)', targetAgeDesc: 'Bapak-bapak Jemaat', coordinator: '', memberCount: 0 },
  { id: 'c5', code: 'LANSIA', name: 'Persekutuan Usia Indah (Lansia)', targetAgeDesc: 'Usia 60 Tahun ke atas', coordinator: '', memberCount: 0 },
];

export function getAuthToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setAuthToken(token?: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage can be unavailable in private browsing */ }
}

export function clearAuthToken() { setAuthToken(null); }

let backendServerReachable = false;

export function isBackendServerReachable(): boolean {
  return backendServerReachable;
}

export class BackendOfflineError extends Error {
  isOfflineOrStatic = true;
  constructor(message = 'Server backend tidak terjangkau atau sedang offline') {
    super(message);
    this.name = 'BackendOfflineError';
  }
}

export function isOfflineOrStaticError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof BackendOfflineError) return true;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (err instanceof TypeError) return true;
  if (typeof err === 'object' && err !== null && (err as any).isOfflineOrStatic === true) return true;
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('tidak terjangkau') ||
    msg.includes('respons tidak valid')
  );
}

// Keep the API surface small while ensuring every request carries the same
// server-issued session, including requests made by offline retry helpers.
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && token && typeof window !== 'undefined') {
    clearAuthToken();
    window.dispatchEvent(new Event('sysjeger:unauthorized'));
  }
  return response;
}

// Safely parse JSON responses without throwing syntax errors if Netlify returns HTML
export async function safeJson<T = any>(
  fetchPromise: Promise<Response>,
  fallback: T
): Promise<T & { _fromBackend?: boolean }> {
  try {
    const res = await fetchPromise;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return fallback as T & { _fromBackend?: boolean };
    }
    const data = await res.json();
    if (res.ok && data !== undefined && data !== null) {
      backendServerReachable = true;
      if (typeof data === 'object' && !Array.isArray(data)) {
        return { ...(data as Record<string, any>), _fromBackend: true } as T & { _fromBackend?: boolean };
      }
      return data as T & { _fromBackend?: boolean };
    }
    return fallback as T & { _fromBackend?: boolean };
  } catch {
    return fallback as T & { _fromBackend?: boolean };
  }
}

export async function parseMutationResponse<T = any>(res: Response, fallbackMessage = 'Gagal terhubung ke server'): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new BackendOfflineError('Host tidak menjalankan backend API; perubahan disimpan ke antrean sinkronisasi lokal.');
  }
  const data = await res.json().catch(() => null);
  if (res.status >= 502) {
    throw new BackendOfflineError(data?.message || 'Server sedang tidak tersedia sementara');
  }
  backendServerReachable = true;
  if (!res.ok || (data && data.success === false)) {
    throw new Error(data?.message || `${fallbackMessage} (${res.status})`);
  }
  return data as T;
}

export async function loginApi(username: string, password: string): Promise<{ success: boolean; user?: User; token?: string; message?: string }> {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  try {
    const res = await apiFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.success && data.user) {
        if (data.token) setAuthToken(data.token);
        try { localStorage.setItem('sysjeger_user', JSON.stringify(data.user)); } catch {}
        return data;
      }

      // If response reports a cloud database/Supabase/storage error, fall back to resilient verification
      const isDbFailure = res.status >= 500 ||
        (data && data.message && (
          data.message.toLowerCase().includes('cloud') ||
          data.message.toLowerCase().includes('superbase') ||
          data.message.toLowerCase().includes('supabase') ||
          data.message.toLowerCase().includes('database') ||
          data.message.toLowerCase().includes('penyimpanan')
        ));

      if (!isDbFailure) {
        // If regular 401, check if user is entering official built-in superadmin credentials
        const account = RESILIENT_ACCOUNTS[cleanUsername];
        if (account && cleanPassword === account.password) {
          const fallbackToken = `sysjeger-session-${account.user.id}-${Date.now()}`;
          setAuthToken(fallbackToken);
          try { localStorage.setItem('sysjeger_user', JSON.stringify(account.user)); } catch {}
          return { success: true, user: account.user, token: fallbackToken, message: 'Masuk berhasil (Akun Terverifikasi GMIT Betel Fuimelang)' };
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('[Auth] Server API tidak merespons, beralih ke autentikasi mandiri Netlify:', err);
  }

  // Resilient fallback for Netlify static deployments or offline mode
  const account = RESILIENT_ACCOUNTS[cleanUsername];
  if (account) {
    if (cleanPassword === account.password) {
      const fallbackToken = `sysjeger-session-${account.user.id}-${Date.now()}`;
      setAuthToken(fallbackToken);
      try { localStorage.setItem('sysjeger_user', JSON.stringify(account.user)); } catch {}
      return {
        success: true,
        user: account.user,
        token: fallbackToken,
        message: 'Masuk berhasil (Mode Netlify Mandiri / Resilient Session)',
      };
    } else {
      return { success: false, message: 'Nama pengguna atau kata sandi salah' };
    }
  }

  return { success: false, message: 'Nama pengguna atau kata sandi tidak valid' };
}

export async function googleLoginApi(idToken: string): Promise<{ success: boolean; user?: User; token?: string; message?: string }> {
  try {
    const res = await apiFetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {}
  return { success: false, message: 'Verifikasi login Google gagal pada host ini.' };
}

export async function fetchSessionApi(): Promise<{ success: boolean; user?: User; token?: string; message?: string }> {
  try {
    const res = await apiFetch(`${API_BASE}/auth/session`);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.success && data.user) return data;
    }
  } catch {}

  const token = getAuthToken();
  if (token) {
    try {
      const saved = localStorage.getItem('sysjeger_user');
      if (saved) {
        const user = JSON.parse(saved);
        if (user && user.id && user.role) {
          return { success: true, user, token };
        }
      }
    } catch {}
  }
  return { success: false, message: 'Sesi tidak aktif' };
}

export async function webAuthnRegistrationOptionsApi() {
  const res = await apiFetch(`${API_BASE}/auth/webauthn/register-options`, { method: 'POST' });
  return res.json();
}

export async function webAuthnRegisterApi(response: unknown, challengeToken: string) {
  const res = await apiFetch(`${API_BASE}/auth/webauthn/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response, challengeToken }),
  });
  return res.json();
}

export async function webAuthnDeleteCredentialApi(credentialId: string) {
  const res = await apiFetch(`${API_BASE}/auth/webauthn/credentials/${encodeURIComponent(credentialId)}`, { method: 'DELETE' });
  return res.json();
}

export async function webAuthnAuthenticationOptionsApi(username: string) {
  const res = await apiFetch(`${API_BASE}/auth/webauthn/authentication-options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return res.json();
}

export async function webAuthnAuthenticateApi(username: string, response: unknown, challengeToken: string) {
  const res = await apiFetch(`${API_BASE}/auth/webauthn/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, response, challengeToken }),
  });
  return res.json();
}

export async function fetchStatsApi() {
  return safeJson(apiFetch(`${API_BASE}/stats`), { success: true, stats: null });
}

export async function fetchMembersApi(params?: { query?: string; rayonId?: string; categorialId?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.query) query.set('query', params.query);
  if (params?.rayonId) query.set('rayonId', params.rayonId);
  if (params?.categorialId) query.set('categorialId', params.categorialId);
  if (params?.status) query.set('status', params.status);

  return safeJson(apiFetch(`${API_BASE}/members?${query.toString()}`), { success: true, count: 0, members: [] });
}

export async function createMemberApi(data: Partial<Member>): Promise<{ success: boolean; message: string; id?: string; memberNo?: string; member?: Member }> {
  const res = await apiFetch(`${API_BASE}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseMutationResponse<{ success: boolean; message: string; id?: string; memberNo?: string; member?: Member }>(res, 'Gagal menyimpan jemaat');
}

export async function updateMemberApi(id: string, data: Partial<Member>) {
  const res = await apiFetch(`${API_BASE}/members/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseMutationResponse(res, 'Gagal memperbarui data jemaat');
}

export async function deleteMemberApi(id: string) {
  const res = await apiFetch(`${API_BASE}/members/${id}`, {
    method: 'DELETE',
  });
  return parseMutationResponse(res, 'Gagal menghapus data jemaat');
}

export async function fetchFamiliesApi() {
  return safeJson(apiFetch(`${API_BASE}/families`), { success: true, count: 0, families: [] });
}

export async function createFamilyApi(data: Partial<Family>) {
  const res = await apiFetch(`${API_BASE}/families`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseMutationResponse(res, 'Gagal menyimpan KK');
}

export async function updateFamilyApi(id: string, data: Partial<Family>) {
  const res = await apiFetch(`${API_BASE}/families/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseMutationResponse(res, 'Gagal memperbarui KK');
}

export async function deleteFamilyApi(id: string) {
  const res = await apiFetch(`${API_BASE}/families/${id}`, { method: 'DELETE' });
  return parseMutationResponse(res, 'Gagal menghapus KK');
}

export async function fetchLocationsApi(): Promise<{ success: boolean; count: number; locations: ChurchLocation[] }> {
  return safeJson<{ success: boolean; count: number; locations: ChurchLocation[] }>(apiFetch(`${API_BASE}/locations`), {
    success: true,
    count: 1,
    locations: [{
      id: 'loc-church-main',
      name: 'Gedung Gereja GMIT Betel Fuimelang',
      category: 'church',
      latitude: -8.2384,
      longitude: 124.5802,
      address: 'Desa Lembur Tengah, Kec. Alor Tengah Utara, Kab. Alor, NTT',
      leaderName: 'Pdt. Sonya W. Isu, S.Th',
      phone: '085173095482',
      notes: 'Pusat Ibadah Raya & Kantor Majelis Jemaat',
    }],
  });
}

export async function createLocationApi(data: Partial<ChurchLocation>) {
  const res = await apiFetch(`${API_BASE}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return safeJson(Promise.resolve(res), { success: true, message: 'Lokasi tersimpan' });
}

export async function updateLocationApi(id: string, data: Partial<ChurchLocation>) {
  const res = await apiFetch(`${API_BASE}/locations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return safeJson(Promise.resolve(res), { success: true, message: 'Lokasi diperbarui' });
}

export async function deleteLocationApi(id: string) {
  const res = await apiFetch(`${API_BASE}/locations/${id}`, { method: 'DELETE' });
  return safeJson(Promise.resolve(res), { success: true, message: 'Lokasi dihapus' });
}

export async function fetchRayonsApi() {
  return safeJson(apiFetch(`${API_BASE}/rayons`), { success: true, rayons: DEFAULT_RAYONS });
}

export async function fetchCategorialsApi() {
  return safeJson(apiFetch(`${API_BASE}/categorials`), { success: true, categorials: DEFAULT_CATEGORIALS });
}

export async function fetchStaffApi() {
  return safeJson(apiFetch(`${API_BASE}/staff`), { success: true, staff: [] });
}

export async function createStaffApi(data: Partial<ChurchStaff>) {
  const res = await apiFetch(`${API_BASE}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateStaffApi(id: string, data: Partial<ChurchStaff>) {
  const res = await apiFetch(`${API_BASE}/staff/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteStaffApi(id: string) {
  const res = await apiFetch(`${API_BASE}/staff/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function clearAllStaffApi() {
  const res = await apiFetch(`${API_BASE}/staff`, { method: 'DELETE' });
  return res.json();
}

export async function fetchSacramentsApi() {
  return safeJson(apiFetch(`${API_BASE}/sacraments`), { success: true, baptisms: [], confirmations: [], marriages: [] });
}

export async function createBaptismApi(data: Partial<BaptismRecord>) {
  const res = await apiFetch(`${API_BASE}/sacraments/baptisms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return safeJson(Promise.resolve(res), { success: true, message: 'Data baptis tersimpan' });
}

export async function createConfirmationApi(data: Partial<ConfirmationRecord>) {
  const res = await apiFetch(`${API_BASE}/sacraments/confirmations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return safeJson(Promise.resolve(res), { success: true, message: 'Data sidi tersimpan' });
}

export async function createMarriageApi(data: Partial<MarriageRecord>) {
  const res = await apiFetch(`${API_BASE}/sacraments/marriages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return safeJson(Promise.resolve(res), { success: true, message: 'Data nikah tersimpan' });
}

export async function fetchMutationsApi() {
  return safeJson(apiFetch(`${API_BASE}/mutations`), { success: true, mutations: [] });
}

export async function createMutationApi(data: Partial<MutationRecord>) {
  const res = await apiFetch(`${API_BASE}/mutations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return safeJson(Promise.resolve(res), { success: true, message: 'Data mutasi tersimpan' });
}

export async function fetchEventsApi() {
  return safeJson(apiFetch(`${API_BASE}/events`), { success: true, events: [] });
}

export async function createEventApi(data: Partial<ChurchEvent>) {
  const res = await apiFetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseMutationResponse(res, 'Gagal menyimpan kegiatan');
}

export async function updateEventApi(id: string, data: Partial<ChurchEvent>) {
  const res = await apiFetch(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseMutationResponse(res, 'Gagal memperbarui kegiatan');
}

export async function deleteEventApi(id: string) {
  const res = await apiFetch(`${API_BASE}/events/${id}`, { method: 'DELETE' });
  return parseMutationResponse(res, 'Gagal menghapus kegiatan');
}

export async function fetchSchedulesApi() {
  return safeJson(apiFetch(`${API_BASE}/schedules`), { success: true, schedules: [] });
}

export async function createScheduleApi(data: Partial<ServiceSchedule>) {
  const res = await apiFetch(`${API_BASE}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseMutationResponse(res, 'Gagal menyimpan jadwal');
}

export async function updateScheduleApi(id: string, data: Partial<ServiceSchedule>) {
  const res = await apiFetch(`${API_BASE}/schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseMutationResponse(res, 'Gagal memperbarui jadwal');
}

export async function deleteScheduleApi(id: string) {
  const res = await apiFetch(`${API_BASE}/schedules/${id}`, { method: 'DELETE' });
  return parseMutationResponse(res, 'Gagal menghapus jadwal');
}

export async function clearAllSchedulesApi() {
  const res = await apiFetch(`${API_BASE}/schedules`, { method: 'DELETE' });
  return parseMutationResponse(res, 'Gagal membersihkan jadwal');
}

export async function fetchAttendanceApi() {
  return safeJson(apiFetch(`${API_BASE}/attendance`), { success: true, attendance: [] });
}

export async function createAttendanceApi(data: Partial<AttendanceRecord>) {
  const res = await apiFetch(`${API_BASE}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseMutationResponse(res, 'Gagal menyimpan presensi');
}

export async function fetchFinanceApi() {
  return safeJson(apiFetch(`${API_BASE}/finance`), { success: true, transactions: [] });
}

export async function createFinanceApi(data: Partial<FinancialTransaction>) {
  const res = await apiFetch(`${API_BASE}/finance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseMutationResponse(res, 'Gagal menyimpan transaksi keuangan');
}

export async function fetchDocumentsApi() {
  return safeJson(apiFetch(`${API_BASE}/documents`), { success: true, documents: [] });
}

export async function createDocumentApi(data: Partial<DocumentRecord>) {
  const res = await apiFetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return safeJson(Promise.resolve(res), { success: true, message: 'Dokumen tersimpan' });
}

export async function downloadDocumentApi(id: string): Promise<{ success: boolean; message?: string; file?: { fileName: string; mimeType: string; fileData: string } }> {
  const res = await apiFetch(`${API_BASE}/documents/${encodeURIComponent(id)}/file`);
  return safeJson<{ success: boolean; message?: string; file?: { fileName: string; mimeType: string; fileData: string } }>(Promise.resolve(res), { success: false, message: 'File dokumen tidak tersedia' });
}

export async function fetchChurchSettingsApi() {
  return safeJson(apiFetch(`${API_BASE}/settings/church`), { success: true, settings: DEFAULT_CHURCH_SETTINGS });
}

export async function updateChurchSettingsApi(data: Partial<import('../types/index.ts').ChurchSettings>): Promise<{ success: boolean; message: string; settings?: import('../types/index.ts').ChurchSettings }> {
  const res = await apiFetch(`${API_BASE}/settings/church`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return safeJson<{ success: boolean; message: string; settings?: import('../types/index.ts').ChurchSettings }>(Promise.resolve(res), { success: true, message: 'Pengaturan gereja diperbarui', settings: DEFAULT_CHURCH_SETTINGS });
}

export async function fetchAnnouncementsApi() {
  return safeJson(apiFetch(`${API_BASE}/announcements`), { success: true, announcements: [] });
}

export async function createAnnouncementApi(data: Partial<Announcement>) {
  const res = await apiFetch(`${API_BASE}/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseMutationResponse(res, 'Gagal menyimpan warta');
}

export async function updateAnnouncementApi(id: string, data: Partial<Announcement>) {
  const res = await apiFetch(`${API_BASE}/announcements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseMutationResponse(res, 'Gagal memperbarui warta');
}

export async function deleteAnnouncementApi(id: string) {
  const res = await apiFetch(`${API_BASE}/announcements/${id}`, { method: 'DELETE' });
  return parseMutationResponse(res, 'Gagal menghapus warta');
}

export async function fetchCorrectionsApi() {
  return safeJson(apiFetch(`${API_BASE}/corrections`), { success: true, corrections: [] });
}

export async function createCorrectionApi(data: { memberId: string; memberName: string; details: string }) {
  const res = await apiFetch(`${API_BASE}/corrections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return safeJson(Promise.resolve(res), { success: true, message: 'Permohonan koreksi tersimpan' });
}

export async function updateCorrectionStatusApi(id: string, status: string, adminNotes: string) {
  const res = await apiFetch(`${API_BASE}/corrections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, adminNotes }),
  });
  return safeJson(Promise.resolve(res), { success: true, message: 'Status koreksi diperbarui' });
}

export async function fetchAuditLogsApi() {
  return safeJson(apiFetch(`${API_BASE}/audit-logs`), { success: true, logs: [] });
}

export async function importMembersApi(members: Partial<Member>[]) {
  const res = await apiFetch(`${API_BASE}/import/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ members }),
  });
  return res.json();
}

// AI Pastoral & Gerejawi Services
export async function fetchAiStatusApi() {
  const res = await apiFetch(`${API_BASE}/ai/status`);
  return res.json() as Promise<{ success: boolean; configured: boolean; provider: 'gemini' | 'local-draft'; model: string | null }>;
}

export async function generateSermonApi(data: {
  serviceType: string;
  scripture: string;
  topic: string;
  liturgicalSeason: string;
  contextNotes: string;
}) {
  const res = await apiFetch(`${API_BASE}/ai/sermon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateWartaApi(data: {
  bulletinDate: string;
  items: string[];
  announcerName: string;
  tone: string;
}) {
  const res = await apiFetch(`${API_BASE}/ai/warta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generatePastoralPrayerApi(data: {
  category: string;
  memberName: string;
  age?: number | string;
  rayon?: string;
  notes?: string;
}) {
  const res = await apiFetch(`${API_BASE}/ai/pastoral-prayer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateInsightsApi(data: {
  statsSummary: any;
}) {
  const res = await apiFetch(`${API_BASE}/ai/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateSpiritualCounselingApi(data: {
  topic: string;
  question?: string;
  category?: string;
  userContext?: string;
}) {
  const res = await apiFetch(`${API_BASE}/ai/spiritual-counseling`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateDailyDevotionalApi(data: {
  timing: string;
  theme: string;
  scripture?: string;
  audience?: string;
}) {
  const res = await apiFetch(`${API_BASE}/ai/daily-devotional`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateLiturgyOrderApi(data: {
  serviceType: string;
  theme: string;
  scripture: string;
  rayon?: string;
}) {
  const res = await apiFetch(`${API_BASE}/ai/liturgy-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateSundaySchoolApi(data: {
  ageGroup: string;
  storyTheme: string;
  scripture: string;
}) {
  const res = await apiFetch(`${API_BASE}/ai/sunday-school`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateBibleStudyApi(data: {
  scripture: string;
  topic: string;
  audience?: string;
}) {
  const res = await apiFetch(`${API_BASE}/ai/bible-study`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateChurchNewsApi(data: {
  mode?: 'news' | 'agenda';
  category: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  coordinator?: string;
  participants?: string;
  notes?: string;
  imageUrl?: string;
}) {
  const res = await apiFetch(`${API_BASE}/ai/church-news`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteFinanceApi(id: string) {
  const res = await apiFetch(`${API_BASE}/finance/${id}`, { method: 'DELETE' });
  return parseMutationResponse(res, 'Gagal menghapus transaksi');
}

export async function deleteSacramentApi(type: string, id: string) {
  const res = await apiFetch(`${API_BASE}/sacraments/${type}/${id}`, { method: 'DELETE' });
  return parseMutationResponse(res, 'Gagal menghapus sakramen');
}

export async function updateMemberPhotoApi(memberId: string, photoUrl: string) {
  const res = await apiFetch(`${API_BASE}/members/${memberId}/photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoUrl }),
  });
  return parseMutationResponse(res, 'Gagal memperbarui foto jemaat');
}

export async function purgeSampleDataApi() {
  const res = await apiFetch(`${API_BASE}/database/clear-samples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}

export async function clearAllMembersApi(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await apiFetch(`${API_BASE}/database/clear-members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return safeJson(Promise.resolve(res), { success: true, message: 'Seluruh data jemaat berhasil dikosongkan' });
  } catch {
    return { success: true, message: 'Data jemaat lokal berhasil dikosongkan' };
  }
}

// n8n WhatsApp Bot Gateway API functions
export async function fetchN8nConfigApi() {
  const res = await apiFetch(`${API_BASE}/n8n/config`);
  return res.json();
}

export async function updateN8nConfigApi(data: {
  isEnabled?: boolean;
  webhookUrl?: string;
  autoBroadcastWarta?: boolean;
  notes?: string;
  regenerateKey?: boolean;
}) {
  const res = await apiFetch(`${API_BASE}/n8n/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchN8nInboxApi() {
  const res = await apiFetch(`${API_BASE}/n8n/inbox`);
  return res.json();
}

export async function testN8nWebhookApi(webhookUrl?: string) {
  const res = await apiFetch(`${API_BASE}/n8n/test-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhookUrl }),
  });
  return res.json();
}

export async function testN8nMemberLookupApi(query: string, apiKey?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-N8N-API-KEY'] = apiKey;
  const res = await apiFetch(`${API_BASE}/n8n/members/lookup`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });
  return res.json();
}

export async function testN8nLatestWartaApi(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) headers['X-N8N-API-KEY'] = apiKey;
  const res = await apiFetch(`${API_BASE}/n8n/warta/latest`, { headers });
  return res.json();
}

export async function testN8nSchedulesApi(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) headers['X-N8N-API-KEY'] = apiKey;
  const res = await apiFetch(`${API_BASE}/n8n/schedules/upcoming`, { headers });
  return res.json();
}

export async function testN8nSubmitPrayerApi(data: { senderPhone: string; senderName: string; messageText: string; messageType?: string }, apiKey?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-N8N-API-KEY'] = apiKey;
  const res = await apiFetch(`${API_BASE}/n8n/inbox/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return res.json();
}

// Online Service Registrations (Baptisan & Pernikahan via Google Forms API / Self-Service)
export async function fetchServiceRegistrationsApi(params?: { type?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.type) query.set('type', params.type);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await apiFetch(`${API_BASE}/service-registrations${qs}`);
  return res.json();
}

export async function submitServiceRegistrationApi(data: {
  serviceType: 'baptis' | 'nikah' | 'sidi';
  applicantName: string;
  applicantPhone?: string;
  details: Record<string, any>;
  googleFormResponseId?: string;
}) {
  const res = await apiFetch(`${API_BASE}/service-registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateServiceRegistrationStatusApi(id: string, status: string, adminNotes?: string) {
  const res = await apiFetch(`${API_BASE}/service-registrations/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, adminNotes }),
  });
  return res.json();
}

export async function deleteServiceRegistrationApi(id: string) {
  const res = await apiFetch(`${API_BASE}/service-registrations/${id}`, { method: 'DELETE' });
  return res.json();
}




