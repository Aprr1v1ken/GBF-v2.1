import { apiFetch } from './api.ts';

// Cloud image storage through the authenticated API with offline retry.
// Images are also kept on the device so an upload made without internet is not lost.
export interface CloudActivityImage {
  id: string;
  url: string;
  title: string;
  category: string;
  description?: string;
  createdAt: string;
  syncedAt: string;
  pendingSync?: boolean;
}

const LOCAL_ACTIVITY_IMAGES_KEY = 'sysjeger_activity_images';

function readLocalActivityImages(): CloudActivityImage[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVITY_IMAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalActivityImages(images: CloudActivityImage[]) {
  try {
    // Keep the gallery bounded; member records and agendas still retain their URLs.
    localStorage.setItem(LOCAL_ACTIVITY_IMAGES_KEY, JSON.stringify(images.slice(0, 30)));
  } catch (error) {
    console.warn('[Offline] Device storage is full; image remains attached to the current form.', error);
  }
}

function saveActivityImageLocally(record: CloudActivityImage) {
  const images = readLocalActivityImages().filter((item) => item.id !== record.id);
  writeLocalActivityImages([record, ...images]);
}

async function saveActivityImageToServer(record: CloudActivityImage): Promise<CloudActivityImage> {
  const response = await apiFetch('/api/activity-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  const payload = await response.json().catch(() => ({ success: false, message: 'Respons server foto tidak valid.' }));
  if (!response.ok || !payload.success || !payload.image) {
    const error = new Error(payload.message || `Server foto menolak permintaan (${response.status}).`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return { ...payload.image, pendingSync: false };
}

export async function uploadActivityImageToCloud(
  dataUrl: string,
  meta: { title: string; category: string; description?: string }
): Promise<CloudActivityImage> {
  const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const record: CloudActivityImage = {
    id: imageId,
    url: dataUrl,
    title: meta.title || 'Foto Kegiatan Jemaat Betel',
    category: meta.category || 'Bakti Jumat & Gotong Royong',
    description: meta.description || '',
    createdAt: new Date().toISOString(),
    syncedAt: '',
    pendingSync: true,
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    saveActivityImageLocally(record);
    return record;
  }

  try {
    const saved = await saveActivityImageToServer(record);
    saveActivityImageLocally(saved);
    return saved;
  } catch (error: any) {
    const status = Number(error?.status || 0);
    const retryable = (typeof navigator !== 'undefined' && !navigator.onLine) || error instanceof TypeError || status === 0 || status >= 500;
    if (!retryable) throw error;
    console.warn('[CloudSync] Image queued on this device until the server returns:', error);
    saveActivityImageLocally(record);
    return record;
  }
}

export async function syncPendingActivityImages(): Promise<CloudActivityImage[]> {
  const localImages = readLocalActivityImages();
  if (typeof navigator !== 'undefined' && !navigator.onLine) return localImages;

  const updated: CloudActivityImage[] = [];
  for (const image of localImages) {
    if (!image.pendingSync) {
      updated.push(image);
      continue;
    }
    try {
      // POST is an upsert by ID, so reconnect retries never duplicate a photo.
      updated.push(await saveActivityImageToServer(image));
    } catch (error) {
      console.warn('[CloudSync] Pending activity image remains on this device:', error);
      updated.push(image);
    }
  }
  writeLocalActivityImages(updated);
  return updated;
}

export async function deleteActivityImageFromCloud(id: string): Promise<void> {
  const localImages = readLocalActivityImages();
  const localImage = localImages.find((image) => image.id === id);
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;

  // A never-uploaded device image can be discarded offline. Server-backed
  // images require an online confirmation so they cannot reappear later.
  if (offline && !localImage?.pendingSync) {
    throw new Error('Penghapusan foto cloud memerlukan koneksi internet.');
  }
  if (!offline) {
    const response = await apiFetch(`/api/activity-images/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 404) {
      const payload = await response.json().catch(() => ({ message: 'Foto gagal dihapus dari server.' }));
      throw new Error(payload.message || 'Foto gagal dihapus dari server.');
    }
  }
  writeLocalActivityImages(localImages.filter((image) => image.id !== id));
}

export async function fetchActivityImagesFromCloud(): Promise<CloudActivityImage[]> {
  const localImages = await syncPendingActivityImages();
  let serverImages: CloudActivityImage[] = [];
  try {
    const response = await apiFetch('/api/activity-images');
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Galeri server tidak tersedia.');
    serverImages = payload.images || [];
  } catch (err) {
    console.warn('[CloudSync] Could not fetch server activity images; using device gallery:', err);
  }

  const merged = new Map<string, CloudActivityImage>();
  [...serverImages, ...localImages].forEach((image) => merged.set(image.id, image));
  const images = [...merged.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  writeLocalActivityImages(images);
  return images;
}
