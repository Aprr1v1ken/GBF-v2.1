import { apiFetch } from './api.ts';
import type {
  AttendanceRecord,
  CategorialGroup,
  DocumentRecord,
  FinancialTransaction,
  MutationRecord,
  Rayon,
  User,
} from '../types/index.ts';

const API_BASE = '/api';

async function request(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: unknown) {
  const res = await apiFetch(`${API_BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({ success: false, message: 'Server mengembalikan respons yang tidak valid' }));
  if (!res.ok || payload.success === false) {
    throw new Error(payload.message || `Permintaan gagal (${res.status})`);
  }
  return payload;
}

export const fetchUsersApi = () => request('/users', 'GET');
export const createUserApi = (data: Partial<User> & { password?: string }) => request('/users', 'POST', data);
export const updateUserApi = (id: string, data: Partial<User> & { password?: string }) => request(`/users/${id}`, 'PUT', data);
export const deleteUserApi = (id: string) => request(`/users/${id}`, 'DELETE');

export const createRayonApi = (data: Partial<Rayon>) => request('/rayons', 'POST', data);
export const updateRayonApi = (id: string, data: Partial<Rayon>) => request(`/rayons/${id}`, 'PUT', data);
export const deleteRayonApi = (id: string) => request(`/rayons/${id}`, 'DELETE');

export const createCategorialApi = (data: Partial<CategorialGroup>) => request('/categorials', 'POST', data);
export const updateCategorialApi = (id: string, data: Partial<CategorialGroup>) => request(`/categorials/${id}`, 'PUT', data);
export const deleteCategorialApi = (id: string) => request(`/categorials/${id}`, 'DELETE');

export const updateAttendanceApi = (id: string, data: Partial<AttendanceRecord>) => request(`/attendance/${id}`, 'PUT', data);
export const deleteAttendanceApi = (id: string) => request(`/attendance/${id}`, 'DELETE');

export const updateFinanceApi = (id: string, data: Partial<FinancialTransaction>) => request(`/finance/${id}`, 'PUT', data);

export const updateDocumentApi = (id: string, data: Partial<DocumentRecord>) => request(`/documents/${id}`, 'PUT', data);
export const deleteDocumentApi = (id: string) => request(`/documents/${id}`, 'DELETE');

export const updateSacramentApi = (type: 'baptis' | 'sidi' | 'nikah', id: string, data: any) => request(`/sacraments/${type}/${id}`, 'PUT', data);

export const updateMutationApi = (id: string, data: Partial<MutationRecord>) => request(`/mutations/${id}`, 'PUT', data);
export const deleteMutationApi = (id: string) => request(`/mutations/${id}`, 'DELETE');
