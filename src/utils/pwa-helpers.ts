export const PRODUCTION_VERCEL_URL = 'https://gmit-betel-fuimelang.vercel.app';

export function getInstallTargetUrl(origin?: string): string {
  const cleanOrigin = (origin || '').trim().replace(/\/+$/, '');
  if (!cleanOrigin) return `${PRODUCTION_VERCEL_URL}/?install=1`;
  return `${cleanOrigin}/?install=1`;
}

export function isLocalOrEphemeralHost(hostname: string): boolean {
  const lower = (hostname || '').toLowerCase();
  return (
    !lower ||
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower.endsWith('.local') ||
    lower.startsWith('192.168.') ||
    lower.startsWith('10.')
  );
}

export function buildAndroidShareWhatsAppUrl(targetUrl: string): string {
  const cleanUrl = (targetUrl || PRODUCTION_VERCEL_URL).replace(/\?install=1$/, '');
  const message =
    `Shalom Majelis & Admin GMIT Betel Fuimelang.\n\n` +
    `Silakan buka & pasang aplikasi SYSJEGER V2.1 langsung di HP Android Anda melalui Google Chrome:\n` +
    `${cleanUrl}/?install=1\n\n` +
    `Cara pasang langsung di HP Android:\n` +
    `1. Buka tautan di atas memakai Google Chrome\n` +
    `2. Ketuk tombol "Pasang Sekarang" / "Instal Aplikasi" (atau titik tiga ⋮ > Instal Aplikasi)\n` +
    `3. Aplikasi terpasang di layar utama HP & tetap bisa dipakai secara Offline maupun Online.`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildPwaBuilderUrl(targetUrl: string): string {
  const base = (targetUrl || PRODUCTION_VERCEL_URL).replace(/\/?\?install=1$/, '');
  return `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(base)}`;
}
