import { uploadActivityImageToCloud } from './cloud-sync.ts';

/**
 * Compresses an image file client-side to 3x4 portrait aspect ratio (ideal for KAJ Card)
 * Returns a high quality, low-payload dataURL string (~30-50KB).
 */
export async function compressMemberPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file foto jemaat.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format file gambar tidak valid.'));
      img.onload = () => {
        const targetWidth = 400;
        const targetHeight = 533; // 3:4 portrait ratio

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve(img.src);
        }

        // Center-crop to 3:4
        const imgAspect = img.width / img.height;
        const targetAspect = targetWidth / targetHeight;

        let sx = 0;
        let sy = 0;
        let sw = img.width;
        let sh = img.height;

        if (imgAspect > targetAspect) {
          // Image is wider than 3:4, crop sides
          sw = img.height * targetAspect;
          sx = (img.width - sw) / 2;
        } else {
          // Image is taller than 3:4, crop top/bottom
          sh = img.width / targetAspect;
          sy = (img.height - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve(compressedDataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export interface UploadMemberPhotoResult {
  url: string;
  source: 'cloud_server' | 'device_queue' | 'compressed_data';
  storagePath?: string;
}

/**
 * Compress and save a member photo through the authenticated API. Offline
 * uploads stay in the bounded device gallery and are retried on reconnection.
 */
export async function uploadMemberPhoto(
  file: File,
  memberIdOrName?: string
): Promise<UploadMemberPhotoResult> {
  const compressedDataUrl = await compressMemberPhoto(file);

  try {
    const cloudRecord = await uploadActivityImageToCloud(compressedDataUrl, {
      title: `Foto Jemaat: ${memberIdOrName || 'Anggota Jemaat'}`,
      category: 'Foto Anggota Jemaat',
      description: 'Pas Foto 3x4 Kartu Anggota Jemaat GMIT Betel Fuimelang',
    });
    return {
      url: cloudRecord.url,
      source: cloudRecord.pendingSync ? 'device_queue' : 'cloud_server',
      storagePath: cloudRecord.pendingSync
        ? `local:activity_images/${cloudRecord.id}`
        : `api:activity_images/${cloudRecord.id}`,
    };
  } catch (error) {
    // The member form can still submit this compressed photo with the member
    // record. Detail-view updates perform their own offline photo retry.
    console.warn('[Photo API] Using compressed photo with the member record:', error);
    return {
      url: compressedDataUrl,
      source: 'compressed_data',
    };
  }
}
