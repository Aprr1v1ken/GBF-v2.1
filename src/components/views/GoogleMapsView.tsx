import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Layers,
  Compass,
  Phone,
  ExternalLink,
  Church,
  AlertTriangle,
  Crosshair,
  PlusCircle,
  Save,
  Trash2,
  Check,
  Home,
  X,
  Search,
  Sparkles,
} from 'lucide-react';
import type { Member, Rayon, Family, ChurchLocation } from '../../types/index.ts';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from '../../utils/google-maps.ts';
import * as api from '../../services/api.ts';
import { updateRayonApi } from '../../services/admin-api.ts';

interface GoogleMapsViewProps {
  members: Member[];
  families?: Family[];
  rayons: Rayon[];
  canManage?: boolean;
  onUpdateRayonLocation?: (rayonId: string, lat: number, lng: number) => Promise<void>;
  onUpdateFamilyLocation?: (familyId: string, lat: number, lng: number) => Promise<void>;
  onSaveChurchLocation?: (data: Partial<ChurchLocation>) => Promise<void>;
  onDeleteChurchLocation?: (id: string) => Promise<void>;
}

interface ChurchPoint {
  id: string;
  name: string;
  category: 'church' | 'pastori' | 'rayon' | 'family' | 'pos_pelayanan' | 'pos_par' | 'other';
  position: { lat: number; lng: number };
  description: string;
  leader?: string;
  phone?: string;
  memberCount?: number;
  rawType: 'church_location' | 'rayon' | 'family';
  rawId: string;
}

// Center coordinate: GMIT Betel Fuimelang, Desa Lembur Tengah, Alor Tengah Utara, NTT
const DEFAULT_CENTER = { lat: -8.2384, lng: 124.5802 };

export const GoogleMapsView: React.FC<GoogleMapsViewProps> = ({
  members,
  families = [],
  rayons,
  canManage = true,
  onUpdateRayonLocation,
  onUpdateFamilyLocation,
  onSaveChurchLocation,
  onDeleteChurchLocation,
}) => {
  const apiKey = GOOGLE_MAPS_API_KEY;
  const mapId = GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

  const [churchLocations, setChurchLocations] = useState<ChurchLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<ChurchPoint | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [mapZoom, setMapZoom] = useState(15);
  const [center, setCenter] = useState(DEFAULT_CENTER);

  // Interactive Pin Picking Mode
  const [isPickMode, setIsPickMode] = useState(false);
  const [pickedPosition, setPickedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [saveTargetType, setSaveTargetType] = useState<'rayon' | 'family' | 'custom'>('rayon');
  const [selectedRayonToUpdate, setSelectedRayonToUpdate] = useState<string>(rayons[0]?.id || '');
  const [selectedFamilyToUpdate, setSelectedFamilyToUpdate] = useState<string>(families[0]?.id || '');
  const [customPointName, setCustomPointName] = useState('');
  const [customPointCategory, setCustomPointCategory] = useState<'church' | 'pastori' | 'pos_pelayanan' | 'pos_par' | 'other'>('pos_pelayanan');
  const [customPointDesc, setCustomPointDesc] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const loadLocations = async () => {
    try {
      setLoadingLocations(true);
      const res = await api.fetchLocationsApi();
      if (res?.success && Array.isArray(res.locations)) {
        setChurchLocations(res.locations);
      }
    } catch (err) {
      console.warn('Gagal memuat titik lokasi gereja:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  // Sync default selection if props change
  useEffect(() => {
    if (!selectedRayonToUpdate && rayons.length > 0) setSelectedRayonToUpdate(rayons[0].id);
    if (!selectedFamilyToUpdate && families.length > 0) setSelectedFamilyToUpdate(families[0].id);
  }, [rayons, families]);

  // Handle GPS detection
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setStatusMessage({ type: 'error', text: 'Perangkat tidak mendukung geolokasi GPS.' });
      return;
    }
    setGpsLoading(true);
    setStatusMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCenter({ lat, lng });
        setMapZoom(17);
        setPickedPosition({ lat, lng });
        setIsPickMode(true);
        setStatusMessage({
          type: 'success',
          text: `Lokasi GPS terdeteksi (${lat}, ${lng}). Pilih tujuan penyimpanan di bawah untuk menyimpan ke database.`,
        });
      },
      (err) => {
        setGpsLoading(false);
        setStatusMessage({ type: 'error', text: 'Gagal mendeteksi GPS: ' + (err.message || 'Izin ditolak') });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Compile all points from the database
  const mappedRayons = rayons.filter(
    (rayon) =>
      typeof rayon.latitude === 'number' &&
      Number.isFinite(rayon.latitude) &&
      typeof rayon.longitude === 'number' &&
      Number.isFinite(rayon.longitude)
  );

  const mappedFamilies = families.filter(
    (f) =>
      typeof f.latitude === 'number' &&
      Number.isFinite(f.latitude) &&
      typeof f.longitude === 'number' &&
      Number.isFinite(f.longitude)
  );

  const allPoints: ChurchPoint[] = [
    // 1. Church Locations from church_locations table
    ...churchLocations.map((loc) => ({
      id: `loc_${loc.id}`,
      name: loc.name,
      category: loc.category,
      position: { lat: loc.latitude, lng: loc.longitude },
      description: loc.notes || loc.address || 'Titik fasilitas GMIT Betel Fuimelang',
      leader: loc.leaderName,
      phone: loc.phone,
      rawType: 'church_location' as const,
      rawId: loc.id,
    })),

    // Fallback default church if church_locations table is still empty
    ...(churchLocations.length === 0
      ? [
          {
            id: 'church_main_default',
            name: 'Gedung Gereja GMIT Betel Fuimelang',
            category: 'church' as const,
            position: DEFAULT_CENTER,
            description: 'Pusat Ibadah Raya, Kantor Majelis Jemaat, dan Gedung Kebaktian Utama.',
            leader: 'Pdt. Sonya W. Isu, S.Th',
            phone: '085173095482',
            memberCount: members.length,
            rawType: 'church_location' as const,
            rawId: 'default-main',
          },
        ]
      : []),

    // 2. Mapped Rayons
    ...mappedRayons.map((rayon) => ({
      id: `rayon_${rayon.id}`,
      name: `Pos ${rayon.name}`,
      category: 'rayon' as const,
      position: { lat: rayon.latitude as number, lng: rayon.longitude as number },
      description: rayon.coverageArea || 'Wilayah pelayanan rayon GMIT Betel Fuimelang.',
      leader: rayon.leaderName || 'Koordinator Rayon',
      phone: rayon.leaderPhone || '',
      memberCount: members.filter((m) => m.rayonId === rayon.id).length,
      rawType: 'rayon' as const,
      rawId: rayon.id,
    })),

    // 3. Mapped Families
    ...mappedFamilies.map((fam) => ({
      id: `family_${fam.id}`,
      name: `Keluarga ${fam.headOfFamilyName}`,
      category: 'family' as const,
      position: { lat: fam.latitude as number, lng: fam.longitude as number },
      description: `Alamat: ${fam.address || 'Fuimelang'} — Rayon: ${fam.rayonName || 'Belum diisi'}`,
      leader: fam.headOfFamilyName,
      phone: fam.phone || '',
      memberCount: fam.memberCount,
      rawType: 'family' as const,
      rawId: fam.id,
    })),
  ];

  const filteredPoints = allPoints.filter((pt) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'church' && (pt.category === 'church' || pt.category === 'pastori' || pt.category === 'pos_pelayanan')) return true;
    if (filterCategory === 'rayon' && pt.category === 'rayon') return true;
    if (filterCategory === 'family' && pt.category === 'family') return true;
    return false;
  });

  // Handle map click
  const handleMapClick = (event: any) => {
    const point = event.detail?.latLng;
    if (point && Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
      const lat = Number(point.lat.toFixed(6));
      const lng = Number(point.lng.toFixed(6));
      setPickedPosition({ lat, lng });
      setIsPickMode(true);
      setStatusMessage(null);
    }
  };

  // Handle Save Location to Database
  const handleSavePickedLocation = async () => {
    if (!pickedPosition) return;
    setSavingLocation(true);
    setStatusMessage(null);

    try {
      if (saveTargetType === 'rayon') {
        const rayon = rayons.find((r) => r.id === selectedRayonToUpdate);
        if (!rayon) throw new Error('Pilih rayon terlebih dahulu');
        if (onUpdateRayonLocation) {
          await onUpdateRayonLocation(rayon.id, pickedPosition.lat, pickedPosition.lng);
        } else {
          await updateRayonApi(rayon.id, { latitude: pickedPosition.lat, longitude: pickedPosition.lng });
        }
        setStatusMessage({
          type: 'success',
          text: `Koordinat ${rayon.name} (${pickedPosition.lat}, ${pickedPosition.lng}) berhasil disimpan ke database!`,
        });
      } else if (saveTargetType === 'family') {
        const fam = families.find((f) => f.id === selectedFamilyToUpdate);
        if (!fam) throw new Error('Pilih keluarga terlebih dahulu');
        if (onUpdateFamilyLocation) {
          await onUpdateFamilyLocation(fam.id, pickedPosition.lat, pickedPosition.lng);
        } else {
          await api.updateFamilyApi(fam.id, { latitude: pickedPosition.lat, longitude: pickedPosition.lng });
        }
        setStatusMessage({
          type: 'success',
          text: `Lokasi rumah Keluarga ${fam.headOfFamilyName} berhasil disimpan ke database!`,
        });
      } else {
        // Custom Landmark/Location
        if (!customPointName.trim()) throw new Error('Nama titik lokasi wajib diisi');
        const payload: Partial<ChurchLocation> = {
          name: customPointName.trim(),
          category: customPointCategory,
          latitude: pickedPosition.lat,
          longitude: pickedPosition.lng,
          notes: customPointDesc.trim(),
        };
        if (onSaveChurchLocation) {
          await onSaveChurchLocation(payload);
        } else {
          await api.createLocationApi(payload);
        }
        await loadLocations();
        setCustomPointName('');
        setCustomPointDesc('');
        setStatusMessage({
          type: 'success',
          text: `Titik lokasi "${payload.name}" berhasil disimpan ke database!`,
        });
      }
      setPickedPosition(null);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menyimpan lokasi ke database' });
    } finally {
      setSavingLocation(false);
    }
  };

  // Handle Delete Point
  const handleDeletePoint = async (pt: ChurchPoint) => {
    if (!window.confirm(`Hapus titik lokasi "${pt.name}" dari peta database?`)) return;
    try {
      if (pt.rawType === 'church_location') {
        if (onDeleteChurchLocation) {
          await onDeleteChurchLocation(pt.rawId);
        } else {
          await api.deleteLocationApi(pt.rawId);
        }
        await loadLocations();
      } else if (pt.rawType === 'rayon') {
        if (onUpdateRayonLocation) {
          await onUpdateRayonLocation(pt.rawId, null as any, null as any);
        } else {
          await updateRayonApi(pt.rawId, { latitude: null, longitude: null });
        }
      } else if (pt.rawType === 'family') {
        if (onUpdateFamilyLocation) {
          await onUpdateFamilyLocation(pt.rawId, null as any, null as any);
        } else {
          await api.updateFamilyApi(pt.rawId, { latitude: null, longitude: null });
        }
      }
      setSelectedPoint(null);
      setStatusMessage({ type: 'success', text: `Titik lokasi "${pt.name}" berhasil dihapus dari database.` });
    } catch (err: any) {
      alert('Gagal menghapus titik: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0a182c] via-[#09152b] to-[#122240] border border-blue-500/30 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                <Compass className="w-3 h-3 text-blue-400" />
                Peta Google Maps Real-Time
              </span>
              <span className="text-xs text-slate-400">GMIT BETEL FUIMELANG — PERIODE 2026-2029</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Peta Lokasi & Pemetaan Wilayah Jemaat
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Pilih lokasi langsung dengan mengklik tampilan Google Maps untuk menyimpan koordinat Gedung Gereja, Pos Pelayanan Rayon, maupun rumah keluarga jemaat ke database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleDetectGPS}
              disabled={gpsLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 transition shadow-md cursor-pointer"
            >
              <Crosshair className={`w-4 h-4 ${gpsLoading ? 'animate-spin text-cyan-300' : ''}`} />
              <span>{gpsLoading ? 'Mendeteksi GPS…' : 'GPS Lokasi Saya'}</span>
            </button>

            <button
              onClick={() => {
                setIsPickMode(!isPickMode);
                if (!isPickMode) {
                  setStatusMessage({
                    type: 'success',
                    text: 'Mode Pemilih Peta Aktif! Klik langsung di mana saja pada peta untuk menentukan koordinat dan menyimpannya ke database.',
                  });
                } else {
                  setPickedPosition(null);
                  setStatusMessage(null);
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition shadow-md cursor-pointer ${
                isPickMode
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isPickMode ? 'Selesai Pilih Peta' : 'Input Lokasi dari Peta'}</span>
            </button>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${DEFAULT_CENTER.lat},${DEFAULT_CENTER.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-md"
            >
              <Navigation className="w-4 h-4" />
              <span>Rute Gereja</span>
            </a>
          </div>
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs leading-relaxed ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0c1329] border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Filter Tampilan:
          </span>
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 ${
              filterCategory === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Semua Titik ({allPoints.length})
          </button>
          <button
            onClick={() => setFilterCategory('church')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 ${
              filterCategory === 'church'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Gereja & Pos Pelayanan ({churchLocations.length || 1})
          </button>
          <button
            onClick={() => setFilterCategory('rayon')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 ${
              filterCategory === 'rayon'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Pos Rayon Terpetakan ({mappedRayons.length}/{rayons.length})
          </button>
          <button
            onClick={() => setFilterCategory('family')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 ${
              filterCategory === 'family'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Rumah Jemaat ({mappedFamilies.length})
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
          <span>Pusat: Lembur Tengah (-8.2384, 124.5802)</span>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map Area */}
        <div className={isPickMode || pickedPosition ? 'lg:col-span-8' : 'lg:col-span-8'}>
          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl relative h-[560px]">
            {/* Top Prompt Overlay when Picking */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-xs text-cyan-200">
                <MapPin className="w-4 h-4 text-cyan-400 animate-bounce" />
                <span>Klik di mana saja pada peta untuk menentukan titik koordinat</span>
              </div>
              <div className="pointer-events-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCenter(DEFAULT_CENTER);
                    setMapZoom(16);
                  }}
                  className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 text-xs shadow-md transition cursor-pointer"
                >
                  Pusat Gereja
                </button>
              </div>
            </div>

            {apiKey ? (
              <APIProvider apiKey={apiKey}>
                <Map
                  id="church-live-map"
                  mapId={mapId}
                  defaultCenter={DEFAULT_CENTER}
                  center={center}
                  defaultZoom={15}
                  zoom={mapZoom}
                  onZoomChanged={(e) => setMapZoom(e.detail.zoom)}
                  onCenterChanged={(e) => setCenter(e.detail.center)}
                  onClick={handleMapClick}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                  gestureHandling="greedy"
                  fullscreenControl={true}
                >
                  {/* Saved Points from Database */}
                  {filteredPoints.map((pt) => {
                    const isChurch = pt.category === 'church' || pt.category === 'pastori';
                    const isRayon = pt.category === 'rayon';
                    const isFamily = pt.category === 'family';

                    const background = isChurch
                      ? '#f59e0b'
                      : isRayon
                      ? '#10b981'
                      : isFamily
                      ? '#06b6d4'
                      : '#8b5cf6';
                    const borderColor = isChurch
                      ? '#b45309'
                      : isRayon
                      ? '#047857'
                      : isFamily
                      ? '#0e7490'
                      : '#6d28d9';

                    return (
                      <AdvancedMarker
                        key={pt.id}
                        position={pt.position}
                        title={pt.name}
                        onClick={() => setSelectedPoint(pt)}
                      >
                        <Pin background={background} borderColor={borderColor} glyphColor="#ffffff" />
                      </AdvancedMarker>
                    );
                  })}

                  {/* Temporary Pick Marker */}
                  {pickedPosition && (
                    <AdvancedMarker position={pickedPosition} title="Titik yang Sedang Dipilih">
                      <Pin background="#ec4899" borderColor="#be185d" glyphColor="#ffffff" scale={1.25} />
                    </AdvancedMarker>
                  )}

                  {/* InfoWindow for Selected Saved Point */}
                  {selectedPoint && (
                    <InfoWindow
                      position={selectedPoint.position}
                      onCloseClick={() => setSelectedPoint(null)}
                    >
                      <div className="p-1.5 max-w-xs text-slate-900 font-sans">
                        <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                          {selectedPoint.category === 'church' || selectedPoint.category === 'pastori' ? (
                            <Church className="w-4 h-4 text-amber-600" />
                          ) : selectedPoint.category === 'family' ? (
                            <Home className="w-4 h-4 text-cyan-600" />
                          ) : (
                            <MapPin className="w-4 h-4 text-emerald-600" />
                          )}
                          <span className="font-semibold">{selectedPoint.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-snug">{selectedPoint.description}</p>
                        {selectedPoint.leader && (
                          <p className="text-[11px] text-slate-800 font-semibold mt-1">
                            PIC/Koordinator: {selectedPoint.leader}
                          </p>
                        )}
                        {selectedPoint.phone && (
                          <p className="text-[11px] text-slate-600 mt-0.5">Kontak: {selectedPoint.phone}</p>
                        )}
                        <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] gap-2">
                          <span className="font-mono text-slate-500 text-[10px]">
                            {selectedPoint.position.lat.toFixed(4)}, {selectedPoint.position.lng.toFixed(4)}
                          </span>
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPoint.position.lat},${selectedPoint.position.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              <span>Rute</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            {canManage && (
                              <button
                                onClick={() => handleDeletePoint(selectedPoint)}
                                className="text-rose-600 hover:text-rose-800 p-0.5 cursor-pointer"
                                title="Hapus titik dari peta database"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
                <p className="text-sm font-bold text-white">Google Maps API Key Sedang Dimuat</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
                  Menghubungkan ke layanan Google Maps Platform untuk GMIT Betel Fuimelang...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Point Input Form OR Point Directory */}
        <div className="lg:col-span-4 space-y-4">
          {pickedPosition ? (
            /* Input Form Panel to Save Directly to Database */
            <div className="p-5 rounded-2xl bg-[#0c1329] border border-pink-500/40 shadow-xl flex flex-col space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Input Lokasi ke Database</h3>
                    <p className="text-[10px] text-pink-300 font-mono">
                      Lat: {pickedPosition.lat}, Lng: {pickedPosition.lng}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPickedPosition(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Simpan Sebagai Jenis Data:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSaveTargetType('rayon')}
                      className={`py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
                        saveTargetType === 'rayon'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Pos Rayon
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveTargetType('family')}
                      className={`py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
                        saveTargetType === 'family'
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Rumah KK
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveTargetType('custom')}
                      className={`py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
                        saveTargetType === 'custom'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Fasilitas Baru
                    </button>
                  </div>
                </div>

                {saveTargetType === 'rayon' && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Pilih Rayon yang Diperbarui:</label>
                    <select
                      value={selectedRayonToUpdate}
                      onChange={(e) => setSelectedRayonToUpdate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-emerald-500"
                    >
                      {rayons.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code}) — {r.coverageArea || 'Wilayah Rayon'}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Koordinat titik yang Anda klik akan menggantikan posisi pos pelayanan rayon ini di database.
                    </p>
                  </div>
                )}

                {saveTargetType === 'family' && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Pilih Kartu Keluarga (KK):</label>
                    <select
                      value={selectedFamilyToUpdate}
                      onChange={(e) => setSelectedFamilyToUpdate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-cyan-500"
                    >
                      {families.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.headOfFamilyName} ({f.familyNo}) — {f.address || 'Lembur Tengah'}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Koordinat ini akan disimpan pada data Kartu Keluarga tersebut untuk pemetaan tempat tinggal jemaat.
                    </p>
                  </div>
                )}

                {saveTargetType === 'custom' && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Nama Fasilitas / Tempat:</label>
                      <input
                        type="text"
                        value={customPointName}
                        onChange={(e) => setCustomPointName(e.target.value)}
                        placeholder="Contoh: Pastori GMIT / Pos PAR Fuimelang"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Kategori:</label>
                      <select
                        value={customPointCategory}
                        onChange={(e) => setCustomPointCategory(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-purple-500"
                      >
                        <option value="church">Gedung Gereja</option>
                        <option value="pastori">Pastori / Rumah Pendeta</option>
                        <option value="pos_pelayanan">Pos Pelayanan Ibadah</option>
                        <option value="pos_par">Pos Pelayanan Anak & Remaja (PAR)</option>
                        <option value="other">Fasilitas / Landmark Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Keterangan Tambahan:</label>
                      <input
                        type="text"
                        value={customPointDesc}
                        onChange={(e) => setCustomPointDesc(e.target.value)}
                        placeholder="Catatan rute atau penanggung jawab..."
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPickedPosition(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePickedLocation}
                    disabled={savingLocation}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:brightness-110 shadow-lg shadow-pink-500/20 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingLocation ? 'Menyimpan...' : 'Simpan ke Database'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Points Directory Sidebar */
            <div className="p-5 rounded-2xl bg-[#0c1329] border border-slate-800 shadow-md flex flex-col h-[560px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span>Daftar Titik Pelayanan ({filteredPoints.length})</span>
                </h3>
                <span className="text-[10px] text-slate-400">Klik titik untuk zoom</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredPoints.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    Belum ada titik koordinat yang tersimpan untuk filter ini. Klik pada peta untuk menambahkan titik pertama ke database!
                  </div>
                ) : (
                  filteredPoints.map((pt) => {
                    const isSelected = selectedPoint?.id === pt.id;
                    const isChurch = pt.category === 'church' || pt.category === 'pastori';
                    const isRayon = pt.category === 'rayon';
                    const isFamily = pt.category === 'family';

                    return (
                      <div
                        key={pt.id}
                        onClick={() => {
                          setSelectedPoint(pt);
                          setCenter(pt.position);
                          setMapZoom(17);
                        }}
                        className={`p-3 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-950/70 border-cyan-400 shadow-md ring-1 ring-cyan-500/50'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isChurch
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : isRayon
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : isFamily
                                  ? 'bg-cyan-500/20 text-cyan-400'
                                  : 'bg-purple-500/20 text-purple-400'
                              }`}
                            >
                              {isChurch ? (
                                <Church className="w-4 h-4" />
                              ) : isFamily ? (
                                <Home className="w-4 h-4" />
                              ) : (
                                <MapPin className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">{pt.name}</h4>
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{pt.description}</p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-300 font-mono">
                                <span>{pt.position.lat.toFixed(4)}, {pt.position.lng.toFixed(4)}</span>
                                {pt.memberCount ? (
                                  <span className="text-cyan-300">({pt.memberCount} Jiwa)</span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPickMode(true);
                    setStatusMessage({
                      type: 'success',
                      text: 'Silakan klik posisi di peta untuk memilih lokasi baru.',
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 transition cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Tambah Titik Baru via Peta</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsView;
