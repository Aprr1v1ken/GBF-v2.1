import React, { useState } from 'react';
import { X, Home, Save, AlertCircle, MapPin } from 'lucide-react';
import type { Family, Rayon } from '../types/index.ts';
import { LocationMapPicker } from './LocationMapPicker.tsx';

interface FamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Family>) => Promise<void>;
  rayons: Rayon[];
  family?: Family | null;
}

export const FamilyModal: React.FC<FamilyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  rayons,
  family,
}) => {
  const [headName, setHeadName] = useState(family?.headOfFamilyName || '');
  const [address, setAddress] = useState(family?.address || 'Desa Lembur Tengah');
  const [rayonId, setRayonId] = useState(family?.rayonId || rayons[0]?.id || 'r1');
  const [phone, setPhone] = useState(family?.phone || '');
  const [notes, setNotes] = useState(family?.notes || '');
  const [latitude, setLatitude] = useState(family?.latitude != null ? String(family.latitude) : '');
  const [longitude, setLongitude] = useState(family?.longitude != null ? String(family.longitude) : '');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (family) {
      setHeadName(family.headOfFamilyName || '');
      setAddress(family.address || 'Desa Lembur Tengah');
      setRayonId(family.rayonId || rayons[0]?.id || 'r1');
      setPhone(family.phone || '');
      setNotes(family.notes || '');
      setLatitude(family.latitude != null ? String(family.latitude) : '');
      setLongitude(family.longitude != null ? String(family.longitude) : '');
    } else {
      setHeadName('');
      setAddress('Desa Lembur Tengah');
      setRayonId(rayons[0]?.id || 'r1');
      setPhone('');
      setNotes('');
      setLatitude('');
      setLongitude('');
    }
  }, [family, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headName.trim()) {
      setError('Nama Kepala Keluarga wajib diisi');
      return;
    }

    const latVal = latitude.trim() !== '' ? Number(latitude) : null;
    const lngVal = longitude.trim() !== '' ? Number(longitude) : null;
    if ((latVal !== null && lngVal === null) || (latVal === null && lngVal !== null)) {
      setError('Latitude dan Longitude harus diisi bersamaan atau dikosongkan.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        ...(family ? { id: family.id, familyNo: family.familyNo } : {}),
        headOfFamilyName: headName,
        address,
        rayonId,
        phone,
        notes,
        latitude: latVal,
        longitude: lngVal,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan KK');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0b1226] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-amber-500/20 bg-[#070b18]">
          <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
            <Home className="w-5 h-5 text-amber-400" />
            <span>{family ? 'Ubah Data Kartu Keluarga (KK)' : 'Tambah Kartu Keluarga (KK) Baru'}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Nama Kepala Keluarga *
            </label>
            <input
              type="text"
              required
              value={headName}
              onChange={(e) => setHeadName(e.target.value)}
              placeholder="Contoh: Markus Doko"
              className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white focus:border-amber-400 outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Rayon Wilayah Pelayanan *
            </label>
            <select
              value={rayonId}
              onChange={(e) => setRayonId(e.target.value)}
              className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white focus:border-amber-400 outline-none"
            >
              {rayons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Alamat Keluarga
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Contoh: Kompleks SD Betel RT 03/RW 01"
              className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white focus:border-amber-400 outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Nomor Telepon / WhatsApp
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0812-xxxx-xxxx"
              className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white focus:border-amber-400 outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Catatan Keluarga
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keterangan tambahan..."
              className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white focus:border-amber-400 outline-none"
            />
          </div>

          {/* Lokasi Peta Google Maps Keluarga */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Titik Lokasi Rumah (Google Maps)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMapPicker(!showMapPicker)}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                {showMapPicker ? 'Tutup Peta' : 'Pilih di Peta'}
              </button>
            </div>

            {showMapPicker && (
              <div className="mb-3">
                <LocationMapPicker
                  latitude={latitude}
                  longitude={longitude}
                  onSelect={(lat, lng) => {
                    setLatitude(String(lat));
                    setLongitude(String(lng));
                  }}
                  title="Klik lokasi rumah keluarga di peta"
                  pinColor="#f59e0b"
                  pinBorderColor="#b45309"
                  pinLabel={headName ? `Rumah ${headName}` : 'Rumah Keluarga'}
                  heightClass="h-56"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Latitude</label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-8.2384..."
                  className="w-full px-2.5 py-1.5 bg-[#050811] border border-slate-800 rounded-lg text-white font-mono text-[11px] focus:border-amber-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Longitude</label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="124.5802..."
                  className="w-full px-2.5 py-1.5 bg-[#050811] border border-slate-800 rounded-lg text-white font-mono text-[11px] focus:border-amber-400 outline-none"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Koordinat akan disimpan ke database untuk pemetaan wilayah jemaat.</p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Kartu Keluarga'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
