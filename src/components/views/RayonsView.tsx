import React, { useEffect, useState } from 'react';
import { MapPin, Users, Layers, Edit2, Trash2, Plus, X, Save, Phone } from 'lucide-react';
import type { Rayon, CategorialGroup, Member } from '../../types/index.ts';

interface RayonsViewProps {
  rayons: Rayon[];
  categorials: CategorialGroup[];
  members: Member[];
  onSelectMember: (member: Member) => void;
  initialTab?: 'rayons' | 'categorials';
  canManage?: boolean;
  onSaveRayon?: (data: Partial<Rayon>, id?: string) => Promise<void>;
  onDeleteRayon?: (id: string) => Promise<void>;
  onSaveCategorial?: (data: Partial<CategorialGroup>, id?: string) => Promise<void>;
  onDeleteCategorial?: (id: string) => Promise<void>;
}

type ManagerKind = 'rayon' | 'categorial';
type ManagerState = { kind: ManagerKind; item?: Rayon | CategorialGroup } | null;

const RayonMapPicker = React.lazy(() => import('../RayonMapPicker.tsx'));

const emptyForm = {
  code: '', name: '', leaderName: '', leaderPhone: '', coverageArea: '', notes: '', targetAgeDesc: '', coordinator: '',
  latitude: '', longitude: '',
};

export const RayonsView: React.FC<RayonsViewProps> = ({
  rayons,
  categorials,
  members,
  onSelectMember,
  initialTab = 'rayons',
  canManage = false,
  onSaveRayon,
  onDeleteRayon,
  onSaveCategorial,
  onDeleteCategorial,
}) => {
  const [activeTab, setActiveTab] = useState<'rayons' | 'categorials'>(initialTab);
  const [selectedRayonId, setSelectedRayonId] = useState<string>(rayons[0]?.id || 'r1');
  const [selectedCatId, setSelectedCatId] = useState<string>(categorials[0]?.id || 'c1');
  const [manager, setManager] = useState<ManagerState>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setActiveTab(initialTab), [initialTab]);

  const selectedRayon = rayons.find((r) => r.id === selectedRayonId) || rayons[0];
  const rayonMembers = members.filter((m) => m.rayonId === selectedRayon?.id);
  const selectedCat = categorials.find((c) => c.id === selectedCatId) || categorials[0];
  const catMembers = members.filter((m) => m.categorialGroupId === selectedCat?.id);

  const openManager = (kind: ManagerKind, item?: Rayon | CategorialGroup) => {
    setError('');
    setManager({ kind, item });
    if (kind === 'rayon') {
      const rayon = item as Rayon | undefined;
      setForm({
        ...emptyForm,
        code: rayon?.code || '', name: rayon?.name || '', leaderName: rayon?.leaderName || '',
        leaderPhone: rayon?.leaderPhone || '', coverageArea: rayon?.coverageArea || '', notes: rayon?.notes || '',
        latitude: rayon?.latitude == null ? '' : String(rayon.latitude),
        longitude: rayon?.longitude == null ? '' : String(rayon.longitude),
      });
    } else {
      const cat = item as CategorialGroup | undefined;
      setForm({
        ...emptyForm,
        code: cat?.code || '', name: cat?.name || '', targetAgeDesc: cat?.targetAgeDesc || '', coordinator: cat?.coordinator || '',
      });
    }
  };

  const updateForm = (key: keyof typeof emptyForm, value: string) => setForm((old) => ({ ...old, [key]: value }));

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!manager || !form.name.trim()) return;
    if (manager.kind === 'rayon') {
      const hasLatitude = form.latitude.trim() !== '';
      const hasLongitude = form.longitude.trim() !== '';
      const latitude = Number(form.latitude);
      const longitude = Number(form.longitude);
      if (hasLatitude !== hasLongitude || (hasLatitude && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180))) {
        setError('Isi latitude dan longitude bersama dengan nilai yang valid, atau kosongkan keduanya.');
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      if (manager.kind === 'rayon' && onSaveRayon) {
        await onSaveRayon({
          code: form.code.trim(), name: form.name.trim(), leaderName: form.leaderName.trim(),
          leaderPhone: form.leaderPhone.trim(), coverageArea: form.coverageArea.trim(), notes: form.notes.trim(),
          latitude: form.latitude.trim() === '' ? null : Number(form.latitude),
          longitude: form.longitude.trim() === '' ? null : Number(form.longitude),
        }, manager.item?.id);
      } else if (manager.kind === 'categorial' && onSaveCategorial) {
        await onSaveCategorial({
          code: form.code.trim(), name: form.name.trim(), targetAgeDesc: form.targetAgeDesc.trim(), coordinator: form.coordinator.trim(),
        }, manager.item?.id);
      }
      setManager(null);
    } catch (err: any) {
      setError(err?.message || 'Data tidak dapat disimpan. Periksa koneksi dan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (kind: ManagerKind, item: Rayon | CategorialGroup) => {
    const label = kind === 'rayon' ? 'rayon' : 'kategorial';
    if (!window.confirm(`Hapus ${label} "${item.name}"? Data yang masih digunakan jemaat tidak akan dihapus.`)) return;
    setError('');
    try {
      if (kind === 'rayon') await onDeleteRayon?.(item.id);
      else await onDeleteCategorial?.(item.id);
    } catch (err: any) {
      setError(err?.message || `Gagal menghapus ${label}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="chroma-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl shadow-md">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-300" />
            <span>Rayon Pelayanan & Kategorial GMIT</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Wilayah pelayanan struktural GMIT Betel Fuimelang</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <button
              onClick={() => openManager(activeTab === 'rayons' ? 'rayon' : 'categorial')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white hover:brightness-110 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah {activeTab === 'rayons' ? 'Rayon' : 'Kategorial'}</span>
            </button>
          )}
          <div className="flex items-center p-1 bg-slate-950/70 border border-slate-700 rounded-xl">
            <button onClick={() => setActiveTab('rayons')} className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'rayons' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}>
              Rayon Pelayanan
            </button>
            <button onClick={() => setActiveTab('categorials')} className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'categorials' ? 'bg-fuchsia-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
              Kelompok Kategorial
            </button>
          </div>
        </div>
      </div>

      {error && <div role="alert" className="p-3 rounded-xl bg-rose-950/70 border border-rose-400/40 text-rose-200 text-xs">{error}</div>}

      {activeTab === 'rayons' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 px-1">Daftar Rayon Pelayanan</h3>
            <div className="space-y-2">
              {rayons.length === 0 && <div className="p-5 text-center text-xs text-slate-400 rounded-xl border border-dashed border-slate-700">Belum ada rayon. Super Admin dapat menambahkan rayon pertama.</div>}
              {rayons.map((r) => {
                const count = members.filter((m) => m.rayonId === r.id).length;
                const isSelected = r.id === selectedRayon?.id;
                return (
                  <div key={r.id} className={`relative rounded-xl border transition-all ${isSelected ? 'bg-cyan-500/15 border-cyan-300 text-white shadow-md' : 'bg-[#0c1329]/90 border-slate-800 text-slate-300 hover:border-slate-600'}`}>
                    <button onClick={() => setSelectedRayonId(r.id)} className="w-full p-4 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-cyan-300">{r.code}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{count} Jiwa</span>
                      </div>
                      <div className="font-bold text-sm text-white">{r.name}</div>
                      <div className="text-xs text-slate-400 mt-1 truncate">Koordinator: {r.leaderName || 'Belum diisi'}</div>
                    </button>
                    {canManage && (
                      <div className="flex gap-1 absolute top-2 right-2">
                        <button onClick={() => openManager('rayon', r)} className="p-1.5 rounded-md bg-slate-950/70 text-cyan-300 hover:bg-cyan-500/20" title="Ubah rayon"><Edit2 className="w-3 h-3" /></button>
                        <button onClick={() => handleDelete('rayon', r)} className="p-1.5 rounded-md bg-slate-950/70 text-rose-300 hover:bg-rose-500/20" title="Hapus rayon"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {selectedRayon ? (
              <>
                <div className="chroma-card p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div><span className="font-mono text-xs text-cyan-300 font-bold">{selectedRayon.code}</span><h3 className="text-lg font-bold text-white">{selectedRayon.name}</h3></div>
                    <div className="text-right"><span className="text-2xl font-mono font-bold text-fuchsia-300">{rayonMembers.length}</span><span className="text-xs text-slate-400 block">Jiwa Jemaat</span></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                    <div><span className="text-slate-400 block text-[11px]">Penatua Koordinator:</span><span className="font-semibold text-white">{selectedRayon.leaderName || 'Belum diisi'}</span><div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-1">{selectedRayon.leaderPhone && <Phone className="w-3 h-3" />}{selectedRayon.leaderPhone || '-'}</div></div>
                    <div><span className="text-slate-400 block text-[11px]">Wilayah Cakupan Pelayanan:</span><span className="text-white">{selectedRayon.coverageArea || 'Belum diisi'}</span></div>
                  </div>
                  <div className="pt-3 border-t border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-slate-400 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-cyan-300" />{selectedRayon.latitude != null && selectedRayon.longitude != null ? `${selectedRayon.latitude}, ${selectedRayon.longitude}` : 'Koordinat lokasi belum diisi'}</span>
                    {selectedRayon.latitude != null && selectedRayon.longitude != null && <a href={`https://www.google.com/maps/search/?api=1&query=${selectedRayon.latitude},${selectedRayon.longitude}`} target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200 font-semibold">Lihat di Google Maps →</a>}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#0c1329]/90 border border-slate-800 overflow-hidden">
                  <div className="p-4 bg-[#070b18]/90 border-b border-slate-800 flex items-center justify-between text-xs"><span className="font-bold text-white">Daftar Warga Jemaat di {selectedRayon.name}</span><span className="text-slate-400">{rayonMembers.length} Anggota</span></div>
                  <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
                    {rayonMembers.length === 0 ? <div className="p-6 text-center text-xs text-slate-500">Belum ada anggota terdaftar di rayon ini.</div> : rayonMembers.map((m) => (
                      <button key={m.id} onClick={() => onSelectMember(m)} className="w-full p-3 px-4 flex items-center justify-between text-xs hover:bg-slate-800/50 cursor-pointer transition-colors text-left">
                        <div><div className="font-semibold text-white">{m.fullName}</div><div className="text-[11px] text-slate-400">{m.memberNo} · {m.familyRole} · {m.gender}</div></div>
                        <div className="text-right"><span className="text-cyan-300 text-[11px] block">{m.categorialGroupName}</span><span className="text-[10px] text-slate-400">{m.status}</span></div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : <div className="p-10 text-center text-slate-400 text-sm">Pilih atau tambahkan rayon untuk melihat detail.</div>}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {categorials.length === 0 && <div className="md:col-span-2 lg:col-span-3 p-8 text-center text-sm text-slate-400 rounded-2xl border border-dashed border-slate-700">Belum ada kelompok kategorial.</div>}
          {categorials.map((cat) => {
            const catMembersList = members.filter((m) => m.categorialGroupId === cat.id);
            return (
              <div key={cat.id} className="chroma-card p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2"><span className="font-mono font-bold text-fuchsia-300 bg-fuchsia-500/10 px-2 py-0.5 rounded border border-fuchsia-500/30">{cat.code}</span><span className="text-xs font-mono font-bold text-white">{catMembersList.length} Jiwa</span></div>
                  <h3 className="text-base font-bold text-white">{cat.name}</h3>
                  <div className="text-xs text-cyan-300 mt-1 font-medium">Target: {cat.targetAgeDesc || 'Belum diisi'}</div>
                  <div className="text-xs text-slate-400 mt-2">Koordinator: <span className="text-slate-200">{cat.coordinator || 'Belum diisi'}</span></div>
                </div>
                <div className="pt-3 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-2 font-medium">Anggota Terdaftar:</span>
                  <div className="space-y-1">{catMembersList.slice(0, 3).map((cm) => <button key={cm.id} onClick={() => onSelectMember(cm)} className="block text-xs text-slate-300 hover:text-cyan-300 cursor-pointer truncate">· {cm.fullName} ({cm.rayonName || 'Rayon'})</button>)}{catMembersList.length === 0 && <span className="text-xs text-slate-500">Belum ada anggota</span>}</div>
                  {canManage && <div className="flex gap-2 mt-4"><button onClick={() => openManager('categorial', cat)} className="flex-1 py-1.5 rounded-lg bg-slate-800 text-cyan-300 text-xs flex items-center justify-center gap-1"><Edit2 className="w-3 h-3" />Ubah</button><button onClick={() => handleDelete('categorial', cat)} className="flex-1 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 text-xs flex items-center justify-center gap-1"><Trash2 className="w-3 h-3" />Hapus</button></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {manager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="chroma-card w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between"><h3 className="text-base font-bold text-white">{manager.item ? 'Ubah' : 'Tambah'} {manager.kind === 'rayon' ? 'Rayon Pelayanan' : 'Kelompok Kategorial'}</h3><button onClick={() => setManager(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Tutup"><X className="w-4 h-4" /></button></div>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="block mb-1 text-slate-300">Kode</label><input value={form.code} onChange={(e) => updateForm('code', e.target.value)} placeholder={manager.kind === 'rayon' ? 'RY-05' : 'CAT-BARU'} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white" /></div><div className="sm:col-span-2"><label className="block mb-1 text-slate-300">Nama *</label><input required value={form.name} onChange={(e) => updateForm('name', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white" /></div></div>
              {manager.kind === 'rayon' ? <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block mb-1 text-slate-300">Koordinator / Penatua</label><input value={form.leaderName} onChange={(e) => updateForm('leaderName', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white" /></div><div><label className="block mb-1 text-slate-300">Telepon</label><input value={form.leaderPhone} onChange={(e) => updateForm('leaderPhone', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white" /></div></div>
                <div><label className="block mb-1 text-slate-300">Wilayah Cakupan</label><input value={form.coverageArea} onChange={(e) => updateForm('coverageArea', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white" /></div>
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                  <React.Suspense fallback={<div className="h-64 rounded-xl bg-slate-950 border border-slate-800 grid place-items-center text-slate-400">Memuat peta…</div>}>
                    <RayonMapPicker latitude={form.latitude} longitude={form.longitude} onSelect={(latitude, longitude) => {
                      updateForm('latitude', latitude.toFixed(7));
                      updateForm('longitude', longitude.toFixed(7));
                    }} />
                  </React.Suspense>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="block mb-1 text-slate-300">Latitude</label><input type="number" step="any" min={-90} max={90} value={form.latitude} onChange={(e) => updateForm('latitude', e.target.value)} placeholder="-8.2384000" className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono" /></div>
                    <div><label className="block mb-1 text-slate-300">Longitude</label><input type="number" step="any" min={-180} max={180} value={form.longitude} onChange={(e) => updateForm('longitude', e.target.value)} placeholder="124.6942000" className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono" /></div>
                  </div>
                </div>
                <div><label className="block mb-1 text-slate-300">Catatan</label><textarea rows={2} value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white" /></div>
              </> : <>
                <div><label className="block mb-1 text-slate-300">Target Usia / Peserta</label><input value={form.targetAgeDesc} onChange={(e) => updateForm('targetAgeDesc', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white" /></div>
                <div><label className="block mb-1 text-slate-300">Koordinator</label><input value={form.coordinator} onChange={(e) => updateForm('coordinator', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white" /></div>
              </>}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800"><button type="button" onClick={() => setManager(null)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300">Batal</button><button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-bold flex items-center gap-1.5 disabled:opacity-50"><Save className="w-3.5 h-3.5" />{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
