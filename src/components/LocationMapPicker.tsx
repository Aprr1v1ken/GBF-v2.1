import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { ExternalLink, MapPin, Crosshair, Check, AlertCircle } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from '../utils/google-maps.ts';

// Center GMIT Betel Fuimelang, Desa Lembur Tengah, Alor, NTT
const DEFAULT_CENTER = { lat: -8.2384, lng: 124.5802 };

interface LocationMapPickerProps {
  latitude: string | number;
  longitude: string | number;
  onSelect: (latitude: number, longitude: number) => void;
  title?: string;
  pinColor?: string;
  pinBorderColor?: string;
  pinLabel?: string;
  heightClass?: string;
}

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  latitude,
  longitude,
  onSelect,
  title = 'Pilih Titik di Google Maps',
  pinColor = '#06b6d4',
  pinBorderColor = '#155e75',
  pinLabel = 'Lokasi Terpilih',
  heightClass = 'h-64 sm:h-72',
}) => {
  const apiKey = GOOGLE_MAPS_API_KEY;
  const mapId = GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
  const latNum = typeof latitude === 'number' ? latitude : Number(latitude);
  const lngNum = typeof longitude === 'number' ? longitude : Number(longitude);

  const isValid =
    latitude !== '' &&
    longitude !== '' &&
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180;

  const position = isValid ? { lat: latNum, lng: lngNum } : null;
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Perangkat tidak mendukung geolokasi GPS.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onSelect(lat, lng);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError('Gagal mendeteksi lokasi GPS: ' + (err.message || 'Izin ditolak'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const externalUrl = position
    ? `https://www.google.com/maps/search/?api=1&query=${latNum},${lngNum}`
    : `https://www.google.com/maps/@${DEFAULT_CENTER.lat},${DEFAULT_CENTER.lng},16z`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-cyan-300" />
          {title}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={gpsLoading}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 flex items-center gap-1 transition cursor-pointer"
            title="Gunakan koordinat GPS saat ini"
          >
            <Crosshair className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
            <span>{gpsLoading ? 'Mencari GPS…' : 'GPS Saya'}</span>
          </button>
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
          >
            Buka Peta Besar
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {gpsError && (
        <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>{gpsError}</span>
        </div>
      )}

      {apiKey ? (
        <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner relative">
          <div className={`${heightClass} w-full`}>
            <APIProvider apiKey={apiKey}>
              <Map
                defaultCenter={position || DEFAULT_CENTER}
                center={position || undefined}
                defaultZoom={position ? 17 : 15}
                mapId={mapId}
                gestureHandling="greedy"
                disableDefaultUI={false}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
                onClick={(event: any) => {
                  const point = event.detail?.latLng;
                  if (point && Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
                    const lat = Number(point.lat.toFixed(6));
                    const lng = Number(point.lng.toFixed(6));
                    onSelect(lat, lng);
                  }
                }}
              >
                {position && (
                  <AdvancedMarker position={position} title={pinLabel}>
                    <Pin background={pinColor} glyphColor="#ffffff" borderColor={pinBorderColor} />
                  </AdvancedMarker>
                )}
              </Map>
            </APIProvider>
          </div>

          <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              {position ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono text-cyan-300 font-semibold">
                    {position.lat}, {position.lng}
                  </span>
                </>
              ) : (
                <span className="text-slate-400">Klik langsung pada peta untuk menentukan titik koordinat</span>
              )}
            </div>
            {position && (
              <button
                type="button"
                onClick={() => onSelect(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng)}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Reset ke Titik Gereja
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 text-xs text-slate-400 leading-relaxed text-center">
          Peta interaktif Google Maps sedang disiapkan. Masukkan nilai koordinat latitude dan longitude secara manual atau buka Google Maps.
        </div>
      )}
    </div>
  );
};

export default LocationMapPicker;
