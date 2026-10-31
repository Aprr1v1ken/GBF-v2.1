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

const API_BASE = '/api';
const TOKEN_KEY = 'sysjeger_session_token';

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

export async function loginApi(username: string, password: string): Promise<{ success: boolean; user?: User; token?: string; message?: string }> {
  const res = await apiFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function googleLoginApi(idToken: string): Promise<{ success: boolean; user?: User; token?: string; message?: string }> {
  const res = await apiFetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  return res.json();
}

export async function fetchSessionApi(): Promise<{ success: boolean; user?: User; token?: string; message?: string }> {
  const res = await apiFetch(`${API_BASE}/auth/session`);
  return res.json();
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
  const res = await apiFetch(`${API_BASE}/stats`);
  return res.json();
}

export async function fetchMembersApi(params?: { query?: string; rayonId?: string; categorialId?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.query) query.set('query', params.query);
  if (params?.rayonId) query.set('rayonId', params.rayonId);
  if (params?.categorialId) query.set('categorialId', params.categorialId);
  if (params?.status) query.set('status', params.status);

  const res = await apiFetch(`${API_BASE}/members?${query.toString()}`);
  return res.json();
}

export async function createMemberApi(data: Partial<Member>) {
  const res = await apiFetch(`${API_BASE}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateMemberApi(id: string, data: Partial<Member>) {
  const res = await apiFetch(`${API_BASE}/members/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteMemberApi(id: string) {
  const res = await apiFetch(`${API_BASE}/members/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function fetchFamiliesApi() {
  const res = await apiFetch(`${API_BASE}/families`);
  return res.json();
}

export async function createFamilyApi(data: Partial<Family>) {
  const res = await apiFetch(`${API_BASE}/families`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateFamilyApi(id: string, data: Partial<Family>) {
  const res = await apiFetch(`${API_BASE}/families/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteFamilyApi(id: string) {
  const res = await apiFetch(`${API_BASE}/families/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchLocationsApi() {
  const res = await apiFetch(`${API_BASE}/locations`);
  return res.json();
}

export async function createLocationApi(data: Partial<ChurchLocation>) {
  const res = await apiFetch(`${API_BASE}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateLocationApi(id: string, data: Partial<ChurchLocation>) {
  const res = await apiFetch(`${API_BASE}/locations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteLocationApi(id: string) {
  const res = await apiFetch(`${API_BASE}/locations/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchRayonsApi() {
  const res = await apiFetch(`${API_BASE}/rayons`);
  return res.json();
}

export async function fetchCategorialsApi() {
  const res = await apiFetch(`${API_BASE}/categorials`);
  return res.json();
}

export async function fetchStaffApi() {
  const res = await apiFetch(`${API_BASE}/staff`);
  return res.json();
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
  const res = await apiFetch(`${API_BASE}/sacraments`);
  return res.json();
}

export async function createBaptismApi(data: Partial<BaptismRecord>) {
  const res = await apiFetch(`${API_BASE}/sacraments/baptisms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createConfirmationApi(data: Partial<ConfirmationRecord>) {
  const res = await apiFetch(`${API_BASE}/sacraments/confirmations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createMarriageApi(data: Partial<MarriageRecord>) {
  const res = await apiFetch(`${API_BASE}/sacraments/marriages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchMutationsApi() {
  const res = await apiFetch(`${API_BASE}/mutations`);
  return res.json();
}

export async function createMutationApi(data: Partial<MutationRecord>) {
  const res = await apiFetch(`${API_BASE}/mutations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchEventsApi() {
  const res = await apiFetch(`${API_BASE}/events`);
  return res.json();
}

export async function createEventApi(data: Partial<ChurchEvent>) {
  const res = await apiFetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateEventApi(id: string, data: Partial<ChurchEvent>) {
  const res = await apiFetch(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteEventApi(id: string) {
  const res = await apiFetch(`${API_BASE}/events/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchSchedulesApi() {
  const res = await apiFetch(`${API_BASE}/schedules`);
  return res.json();
}

export async function createScheduleApi(data: Partial<ServiceSchedule>) {
  const res = await apiFetch(`${API_BASE}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateScheduleApi(id: string, data: Partial<ServiceSchedule>) {
  const res = await apiFetch(`${API_BASE}/schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteScheduleApi(id: string) {
  const res = await apiFetch(`${API_BASE}/schedules/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function clearAllSchedulesApi() {
  const res = await apiFetch(`${API_BASE}/schedules`, { method: 'DELETE' });
  return res.json();
}

export async function fetchAttendanceApi() {
  const res = await apiFetch(`${API_BASE}/attendance`);
  return res.json();
}

export async function createAttendanceApi(data: Partial<AttendanceRecord>) {
  const res = await apiFetch(`${API_BASE}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchFinanceApi() {
  const res = await apiFetch(`${API_BASE}/finance`);
  return res.json();
}

export async function createFinanceApi(data: Partial<FinancialTransaction>) {
  const res = await apiFetch(`${API_BASE}/finance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchDocumentsApi() {
  const res = await apiFetch(`${API_BASE}/documents`);
  return res.json();
}

export async function createDocumentApi(data: Partial<DocumentRecord>) {
  const res = await apiFetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function downloadDocumentApi(id: string) {
  const res = await apiFetch(`${API_BASE}/documents/${encodeURIComponent(id)}/file`);
  return res.json();
}

export async function fetchChurchSettingsApi() {
  const res = await apiFetch(`${API_BASE}/settings/church`);
  return res.json();
}

export async function updateChurchSettingsApi(data: Partial<import('../types/index.ts').ChurchSettings>) {
  const res = await apiFetch(`${API_BASE}/settings/church`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchAnnouncementsApi() {
  const res = await apiFetch(`${API_BASE}/announcements`);
  return res.json();
}

export async function createAnnouncementApi(data: Partial<Announcement>) {
  const res = await apiFetch(`${API_BASE}/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateAnnouncementApi(id: string, data: Partial<Announcement>) {
  const res = await apiFetch(`${API_BASE}/announcements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteAnnouncementApi(id: string) {
  const res = await apiFetch(`${API_BASE}/announcements/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchCorrectionsApi() {
  const res = await apiFetch(`${API_BASE}/corrections`);
  return res.json();
}

export async function createCorrectionApi(data: { memberId: string; memberName: string; details: string }) {
  const res = await apiFetch(`${API_BASE}/corrections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateCorrectionStatusApi(id: string, status: string, adminNotes: string) {
  const res = await apiFetch(`${API_BASE}/corrections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, adminNotes }),
  });
  return res.json();
}

export async function fetchAuditLogsApi() {
  const res = await apiFetch(`${API_BASE}/audit-logs`);
  return res.json();
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
  return res.json();
}

export async function deleteSacramentApi(type: string, id: string) {
  const res = await apiFetch(`${API_BASE}/sacraments/${type}/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function updateMemberPhotoApi(memberId: string, photoUrl: string) {
  const res = await apiFetch(`${API_BASE}/members/${memberId}/photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoUrl }),
  });
  return res.json();
}

export async function purgeSampleDataApi() {
  const res = await apiFetch(`${API_BASE}/database/clear-samples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
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




