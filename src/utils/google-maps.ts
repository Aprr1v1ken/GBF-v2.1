const readClientEnv = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

/** Public browser key configured in Vercel/Vite; restrict it by HTTP referrer. */
export const GOOGLE_MAPS_API_KEY = readClientEnv(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

/** Optional production Map ID. Standard markers are used when this is absent. */
export const GOOGLE_MAPS_MAP_ID = readClientEnv(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID) || undefined;

/**
 * Lightweight SVG marker for Google Maps' standard Marker component.
 * This keeps maps functional without AdvancedMarker's mandatory Map ID.
 */
export function getStandardMarkerIcon(background: string, border: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48"><path d="M18 2C9.716 2 3 8.716 3 17c0 10.5 15 29 15 29s15-18.5 15-29C33 8.716 26.284 2 18 2Z" fill="${background}" stroke="${border}" stroke-width="2"/><circle cx="18" cy="17" r="6" fill="#ffffff"/></svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}` };
}
