import type { Member } from '../types/index.ts';

const OFFLINE_QUEUE_KEY = 'sysjeger_offline_members_queue';
const CACHED_MEMBERS_KEY = 'sysjeger_cached_members';

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
