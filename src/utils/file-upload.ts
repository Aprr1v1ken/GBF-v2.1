export const MAX_DOCUMENT_FILE_BYTES = 2 * 1024 * 1024;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Berkas tidak dapat dibaca dari perangkat.'));
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Resize logo/stamp images without cropping so their original proportions remain intact. */
export async function readImageForLetterhead(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Logo/cap harus berupa PNG, JPG, atau WebP.');
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('Berkas gambar maksimal 5 MB sebelum diperkecil.');
  const source = await readFileAsDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Gambar tidak valid atau rusak.'));
    element.src = source;
  });
  const maxDimension = 700;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Browser tidak dapat memproses gambar.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const result = canvas.toDataURL('image/png');
  if (result.length > 1_500_000) {
    throw new Error('Ukuran logo/cap masih terlalu besar. Gunakan gambar yang lebih sederhana atau beresolusi lebih kecil.');
  }
  return result;
}
