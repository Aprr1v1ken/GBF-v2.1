import type {
  Member,
  Family,
  FinancialTransaction,
  ChurchEvent,
  ServiceSchedule,
  Announcement,
  AttendanceRecord,
} from '../types/index.ts';

const OFFLINE_QUEUE_KEY = 'sysjeger_offline_members_queue';
const CACHED_MEMBERS_KEY = 'sysjeger_cached_members';
const UNIVERSAL_MUTATION_QUEUE_KEY = 'sysjeger_offline_mutations_v2';

export type OfflineMutationEntity =
  | 'member'
  | 'family'
  | 'finance'
  | 'event'
  | 'schedule'
  | 'announcement'
  | 'attendance';

export type OfflineMutationAction = 'create' | 'update' | 'delete';

export interface OfflineMutationItem {
  id: string;
  entity: OfflineMutationEntity;
  action: OfflineMutationAction;
  targetId?: string;
  payload?: Record<string, any>;
  label?: string;
  createdAt: string;
  attempts: number;
}

export interface UniversalSyncHandlers {
  createMember?: (data: Partial<Member>) => Promise<any>;
  updateMember?: (id: string, data: Partial<Member>) => Promise<any>;
  deleteMember?: (id: string) => Promise<any>;
  createFamily?: (data: Partial<Family>) => Promise<any>;
  updateFamily?: (id: string, data: Partial<Family>) => Promise<any>;
  deleteFamily?: (id: string) => Promise<any>;
  createFinance?: (data: Partial<FinancialTransaction>) => Promise<any>;
  updateFinance?: (id: string, data: Partial<FinancialTransaction>) => Promise<any>;
  deleteFinance?: (id: string) => Promise<any>;
  createEvent?: (data: Partial<ChurchEvent>) => Promise<any>;
  updateEvent?: (id: string, data: Partial<ChurchEvent>) => Promise<any>;
  deleteEvent?: (id: string) => Promise<any>;
  createSchedule?: (data: Partial<ServiceSchedule>) => Promise<any>;
  updateSchedule?: (id: string, data: Partial<ServiceSchedule>) => Promise<any>;
  deleteSchedule?: (id: string) => Promise<any>;
  createAnnouncement?: (data: Partial<Announcement>) => Promise<any>;
  updateAnnouncement?: (id: string, data: Partial<Announcement>) => Promise<any>;
  deleteAnnouncement?: (id: string) => Promise<any>;
  createAttendance?: (data: Partial<AttendanceRecord>) => Promise<any>;
  deleteAttendance?: (id: string) => Promise<any>;
}

// Get current pending offline items
export function getOfflineMembersQueue(): Partial<Member>[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Error reading offline queue:', err);
    return [];
  }
}

// Add member to offline queue with optimistic local representation
export function addMemberToOfflineQueue(memberData: Partial<Member>): Member {
  const queue = getOfflineMembersQueue();
  const tempId = 'offline-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const optimisticMember: Member = {
    id: tempId,
    memberNo: 'OFFLINE-' + Math.floor(1000 + Math.random() * 9000),
    fullName: memberData.fullName || '',
    nickname: memberData.nickname || '',
    nik: memberData.nik || '',
    familyCardNo: memberData.familyCardNo || '',
    familyId: memberData.familyId || '',
    familyName: memberData.familyName || '',
    familyRole: memberData.familyRole || 'Anak',
    gender: memberData.gender || 'Laki-laki',
    birthPlace: memberData.birthPlace || '',
    birthDate: memberData.birthDate || '',
    address: memberData.address || '',
    kelurahan: memberData.kelurahan || '',
    kecamatan: memberData.kecamatan || '',
    kabupaten: memberData.kabupaten || '',
    phone: memberData.phone || '',
    email: memberData.email || '',
    maritalStatus: memberData.maritalStatus || 'Belum Menikah',
    spouseName: memberData.spouseName || '',
    rayonId: memberData.rayonId || '',
    rayonName: memberData.rayonName || '',
    categorialGroupId: memberData.categorialGroupId || '',
    categorialGroupName: memberData.categorialGroupName || '',
    membershipStatus: memberData.membershipStatus || 'Tetap',
    baptismStatus: memberData.baptismStatus || 'Belum',
    baptismDate: memberData.baptismDate || '',
    confirmationStatus: memberData.confirmationStatus || 'Belum',
    confirmationDate: memberData.confirmationDate || '',
    marriageChurchStatus: memberData.marriageChurchStatus || 'Belum',
    marriageDate: memberData.marriageDate || '',
    education: memberData.education || '',
    occupation: memberData.occupation || '',
    joinDate: memberData.joinDate || now.substring(0, 10),
    status: memberData.status || 'Aktif',
    notes: memberData.notes ? `${memberData.notes} [Diinput Offline]` : 'Diinput Offline',
    photoUrl: memberData.photoUrl || '',
    createdAt: now,
    updatedAt: now,
    isOfflinePending: true,
  };

  queue.push({
    ...memberData,
    id: tempId,
    isOfflinePending: true,
  });

  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save to offline queue:', err);
  }

  // Also update local cached members
  const cached = getCachedMembersLocally();
  cached.unshift(optimisticMember);
  cacheMembersLocally(cached);

  return optimisticMember;
}

// Remove item from queue
export function removeMemberFromOfflineQueue(tempId: string) {
  try {
    const queue = getOfflineMembersQueue();
    const updated = queue.filter((item) => item.id !== tempId);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error removing from queue:', err);
  }
}

// Clear entire queue
export function clearOfflineQueue() {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (err) {
    console.warn('Error clearing offline queue:', err);
  }
}

// Universal Offline Mutation Queue (supports create/update/delete across all core entities)
export function getUniversalOfflineMutations(): OfflineMutationItem[] {
  try {
    const raw = localStorage.getItem(UNIVERSAL_MUTATION_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUniversalOfflineMutations(items: OfflineMutationItem[]) {
  try {
    localStorage.setItem(UNIVERSAL_MUTATION_QUEUE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('Failed to persist universal offline mutation queue:', err);
  }
}

export function clearUniversalOfflineMutations() {
  try {
    localStorage.removeItem(UNIVERSAL_MUTATION_QUEUE_KEY);
  } catch {
    // ignore
  }
}

export function enqueueUniversalOfflineMutation(
  entry: Omit<OfflineMutationItem, 'id' | 'createdAt' | 'attempts'>
): OfflineMutationItem {
  const queue = getUniversalOfflineMutations();
  const mutation: OfflineMutationItem = {
    ...entry,
    id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  // Compact redundant operations on the same offline-created entity before sync
  if (entry.targetId && entry.targetId.startsWith('offline-')) {
    const pendingCreateIndex = queue.findIndex(
      (q) => q.entity === entry.entity && q.action === 'create' && q.targetId === entry.targetId
    );
    if (pendingCreateIndex >= 0) {
      if (entry.action === 'update') {
        queue[pendingCreateIndex] = {
          ...queue[pendingCreateIndex],
          payload: { ...queue[pendingCreateIndex].payload, ...entry.payload },
        };
        writeUniversalOfflineMutations(queue);
        return queue[pendingCreateIndex];
      }
      if (entry.action === 'delete') {
        queue.splice(pendingCreateIndex, 1);
        writeUniversalOfflineMutations(queue);
        return mutation;
      }
    }
  }

  // Also compact multiple updates to the same server record
  if (entry.action === 'update' && entry.targetId) {
    const existingUpdateIndex = queue.findIndex(
      (q) => q.entity === entry.entity && q.action === 'update' && q.targetId === entry.targetId
    );
    if (existingUpdateIndex >= 0) {
      queue[existingUpdateIndex] = {
        ...queue[existingUpdateIndex],
        payload: { ...queue[existingUpdateIndex].payload, ...entry.payload },
        createdAt: mutation.createdAt,
      };
      writeUniversalOfflineMutations(queue);
      return queue[existingUpdateIndex];
    }
  }

  queue.push(mutation);
  writeUniversalOfflineMutations(queue);
  return mutation;
}

export async function syncUniversalOfflineMutations(
  handlers: UniversalSyncHandlers
): Promise<{ syncedCount: number; failedCount: number; errors: string[] }> {
  const queue = getUniversalOfflineMutations();
  if (queue.length === 0) {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  const remaining: OfflineMutationItem[] = [];

  for (const item of queue) {
    try {
      let res: any = null;
      const p = item.payload || {};
      const tid = item.targetId || '';

      if (item.entity === 'member') {
        if (item.action === 'create' && handlers.createMember) res = await handlers.createMember(p);
        else if (item.action === 'update' && handlers.updateMember) res = await handlers.updateMember(tid, p);
        else if (item.action === 'delete' && handlers.deleteMember) res = await handlers.deleteMember(tid);
      } else if (item.entity === 'family') {
        if (item.action === 'create' && handlers.createFamily) res = await handlers.createFamily(p);
        else if (item.action === 'update' && handlers.updateFamily) res = await handlers.updateFamily(tid, p);
        else if (item.action === 'delete' && handlers.deleteFamily) res = await handlers.deleteFamily(tid);
      } else if (item.entity === 'finance') {
        if (item.action === 'create' && handlers.createFinance) res = await handlers.createFinance(p);
        else if (item.action === 'update' && handlers.updateFinance) res = await handlers.updateFinance(tid, p);
        else if (item.action === 'delete' && handlers.deleteFinance) res = await handlers.deleteFinance(tid);
      } else if (item.entity === 'event') {
        if (item.action === 'create' && handlers.createEvent) res = await handlers.createEvent(p);
        else if (item.action === 'update' && handlers.updateEvent) res = await handlers.updateEvent(tid, p);
        else if (item.action === 'delete' && handlers.deleteEvent) res = await handlers.deleteEvent(tid);
      } else if (item.entity === 'schedule') {
        if (item.action === 'create' && handlers.createSchedule) res = await handlers.createSchedule(p);
        else if (item.action === 'update' && handlers.updateSchedule) res = await handlers.updateSchedule(tid, p);
        else if (item.action === 'delete' && handlers.deleteSchedule) res = await handlers.deleteSchedule(tid);
      } else if (item.entity === 'announcement') {
        if (item.action === 'create' && handlers.createAnnouncement) res = await handlers.createAnnouncement(p);
        else if (item.action === 'update' && handlers.updateAnnouncement) res = await handlers.updateAnnouncement(tid, p);
        else if (item.action === 'delete' && handlers.deleteAnnouncement) res = await handlers.deleteAnnouncement(tid);
      } else if (item.entity === 'attendance') {
        if (item.action === 'create' && handlers.createAttendance) res = await handlers.createAttendance(p);
        else if (item.action === 'delete' && handlers.deleteAttendance) res = await handlers.deleteAttendance(tid);
      }

      if (res && res.success !== false) {
        syncedCount++;
      } else {
        failedCount++;
        errors.push(`${item.label || item.entity}: ${res?.message || 'Gagal sinkron ke server'}`);
        remaining.push({ ...item, attempts: item.attempts + 1 });
      }
    } catch (err: any) {
      failedCount++;
      errors.push(`${item.label || item.entity}: ${err?.message || 'Koneksi server belum tersedia'}`);
      remaining.push({ ...item, attempts: item.attempts + 1 });
    }
  }

  writeUniversalOfflineMutations(remaining);
  return { syncedCount, failedCount, errors };
}

export function getTotalPendingOfflineCount(): number {
  return (
    getOfflineMembersQueue().length +
    getUniversalOfflineMutations().length +
    Object.keys(getOfflineMemberPhotos()).length
  );
}

// Cache all members for offline view
export function cacheMembersLocally(members: Member[]) {
  try {
    localStorage.setItem(CACHED_MEMBERS_KEY, JSON.stringify(members));
  } catch (err) {
    console.warn('Failed to cache members locally:', err);
  }
}

export function getCachedMembersLocally(): Member[] {
  try {
    const raw = localStorage.getItem(CACHED_MEMBERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to load cached members:', err);
    return [];
  }
}

// Clear locally cached members
export function clearCachedMembersLocally() {
  try {
    localStorage.removeItem(CACHED_MEMBERS_KEY);
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    localStorage.removeItem(UNIVERSAL_MUTATION_QUEUE_KEY);
  } catch (err) {
    console.warn('Failed to clear cached members locally:', err);
  }
}

// Sync all queued items to server
export async function syncOfflineQueueToServer(
  createMemberApi: (data: Partial<Member>) => Promise<any>
): Promise<{ syncedCount: number; failedCount: number; errors: string[] }> {
  const queue = getOfflineMembersQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  const remainingQueue: Partial<Member>[] = [];

  for (const item of queue) {
    try {
      // Keep the temporary ID as an idempotency key. The server recognizes
      // this offline-prefixed ID and returns the existing row on a retry.
      const payload: Partial<Member> = { ...item };
      delete payload.isOfflinePending;

      const res = await createMemberApi(payload);
      if (res && res.success) {
        syncedCount++;
      } else {
        failedCount++;
        errors.push(`${item.fullName || 'Jemaat'}: ${res?.message || 'Gagal tersinkron'}`);
        remainingQueue.push(item);
      }
    } catch (err: any) {
      failedCount++;
      errors.push(`${item.fullName || 'Jemaat'}: ${err.message || 'Koneksi terputus'}`);
      remainingQueue.push(item);
    }
  }

  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  } catch {
    // ignore
  }

  return { syncedCount, failedCount, errors };
}

const OFFLINE_MEMBER_PHOTOS_KEY = 'sysjeger_offline_member_photos';

export function getOfflineMemberPhotos(): Record<string, string> {
  try {
    const raw = localStorage.getItem(OFFLINE_MEMBER_PHOTOS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function cacheMemberPhotoOffline(memberId: string, photoUrl: string) {
  try {
    const photos = getOfflineMemberPhotos();
    photos[memberId] = photoUrl;
    localStorage.setItem(OFFLINE_MEMBER_PHOTOS_KEY, JSON.stringify(photos));
  } catch (error) {
    console.warn('Could not queue member photo for offline sync:', error);
  }
}

export function removeOfflineMemberPhoto(memberId: string) {
  try {
    const photos = getOfflineMemberPhotos();
    delete photos[memberId];
    localStorage.setItem(OFFLINE_MEMBER_PHOTOS_KEY, JSON.stringify(photos));
  } catch {
    // Ignore storage cleanup failures; the next sync can retry safely.
  }
}

export async function syncOfflineMemberPhotos(
  updatePhotoApi: (memberId: string, photoUrl: string) => Promise<any>,
): Promise<{ syncedCount: number; remainingCount: number }> {
  const photos = getOfflineMemberPhotos();
  let syncedCount = 0;
  for (const [memberId, photoUrl] of Object.entries(photos)) {
    try {
      const result = await updatePhotoApi(memberId, photoUrl);
      if (result?.success === false) continue;
      removeOfflineMemberPhoto(memberId);
      syncedCount++;
    } catch {
      // Keep the photo queued until a server is reachable.
    }
  }
  return { syncedCount, remainingCount: Object.keys(getOfflineMemberPhotos()).length };
}

const OFFLINE_DATA_KEY = 'sysjeger_offline_data_snapshot';

export function getOfflineDataSnapshot<T extends Record<string, any> = Record<string, any>>(): T | null {
  try {
    const raw = localStorage.getItem(OFFLINE_DATA_KEY);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

export function cacheOfflineDataSnapshot(data: Record<string, any>) {
  try {
    localStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    // Large data URLs should not prevent the rest of the church data from
    // being available offline. Photos have their own offline cache/queue.
    try {
      const lightweight = JSON.parse(JSON.stringify(data, (key, value) => {
        if ((key === 'photoUrl' || key === 'imageUrl' || key === 'url') && typeof value === 'string' && value.startsWith('data:')) return '';
        return value;
      }));
      localStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(lightweight));
    } catch (fallbackError) {
      console.warn('Could not cache offline data snapshot:', fallbackError);
    }
  }
}
