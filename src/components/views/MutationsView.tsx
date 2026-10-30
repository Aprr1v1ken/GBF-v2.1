import React, { useState } from 'react';
import { ArrowLeftRight, Plus, Search, MapPin, FileText, Edit2, Trash2, X } from 'lucide-react';
import type { MutationRecord, Member, Rayon } from '../../types/index.ts';

interface MutationsViewProps {
  mutations: MutationRecord[];
  members: Member[];
  rayons: Rayon[];
  onAddMutation: (data: Partial<MutationRecord>) => Promise<void>;
  onUpdateMutation?: (id: string, data: Partial<MutationRecord>) => Promise<void>;
  onDeleteMutation?: (id: string) => Promise<void>;
}

const today = () => new Date().toLocaleDateString('id-ID').split('/').join('-');
const mutationTypes: MutationRecord['mutationType'][] = ['Pindah Masuk', 'Pindah Keluar', 'Pindah Rayon', 'Meninggal Dunia'];

export const MutationsView: React.FC<MutationsViewProps> = ({ mutations, members, rayons, onAddMutation, onUpdateMutation, onDeleteMutation }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MutationRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [memberId, setMemberId] = useState('');
  const [mutationType, setMutationType] = useState<MutationRecord['mutationType']>('Pindah Rayon');
  const [requestDate, setRequestDate] = useState(today());
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [fromRayonId, setFromRayonId] = useState('');
  const [toRayonId, setToRayonId] = useState('');
  const [fromChurch, setFromChurch] = useState('GMIT Betel Fuimelang');
  const [toChurch, setToChurch] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const rayonName = (id?: string) => rayons.find((r) => r.id === id)?.name || '';
  const filtered = mutations.filter((m) => !searchTerm || `${m.memberName} ${m.mutationType} ${m.fromChurch} ${m.toChurch} ${m.mutationNo}`.toLowerCase().includes(searchTerm.toLowerCase()));

  const fillMember = (id: string) => {
    setMemberId(id);
    const member = members.find((m) => m.id === id);
    if (member) setFromRayonId(member.rayonId || '');
  };

  const openAdd = () => {
    setEditing(null); setMemberId(''); setMutationType('Pindah Rayon'); setRequestDate(today()); setEffectiveDate(today());
    setFromRayonId(''); setToRayonId(''); setFromChurch('GMIT Betel Fuimelang'); setToChurch(''); setReason(''); setNotes(''); setError(''); setShowModal(true);
  };
  const openEdit = (record: MutationRecord) => {
    setEditing(record); setMemberId(record.memberId); setMutationType(record.mutationType); setRequestDate(record.requestDate); setEffectiveDate(record.effectiveDate);
    setFromRayonId(record.fromRayonId || ''); setToRayonId(record.toRayonId || ''); setFromChurch(record.fromChurch || ''); setToChurch(record.toChurch || ''); setReason(record.reason || ''); setNotes(record.notes || ''); setError(''); setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find((m) => m.id === memberId);
    if (!member) { setError('Pilih anggota jemaat terlebih dahulu.'); return; }
    setSaving(true); setError('');
    const payload: Partial<MutationRecord> = {
      memberId: member.id, memberName: member.fullName, mutationType, requestDate, effectiveDate,
      fromRayonId: fromRayonId || undefined, toRayonId: toRayonId || undefined,
      fromChurch: fromChurch.trim() || 'GMIT Betel Fuimelang', toChurch: toChurch.trim(),
      reason: reason.trim(), notes,
    };
    try {
      if (editing && onUpdateMutation) await onUpdateMutation(editing.id, payload);
      else await onAddMutation(payload);
      setShowModal(false); setEditing(null);
    } catch (err: any) {
      setError(err?.message || 'Mutasi tidak dapat disimpan.');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="chroma-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl shadow-md">
        <div><h2 className="text-lg font-bold text-white flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-fuchsia-300" /><span>Mutasi & Administrasi Perpindahan Jemaat</span></h2><p className="text-xs text-slate-400 mt-0.5">Atestasi masuk/keluar, perpindahan rayon internal, dan penyelesaian status jemaat</p></div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white"><Plus className="w-4 h-4" /><span>Catat Mutasi Jemaat</span></button>
      </div>
      {error && <div role="alert" className="p-3 rounded-xl bg-rose-950/70 border border-rose-400/40 text-rose-200 text-xs">{error}</div>}
      <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari nama, nomor surat, atau tujuan..." className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-cyan-400" /></div>
      <div className="space-y-4">
        {filtered.map((m) => (
          <div key={m.id} className="chroma-card p-5 rounded-2xl">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="space-y-2"><div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.status === 'Disetujui' ? 'bg-emerald-950 text-emerald-300' : m.status === 'Ditolak' ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-300'}`}>{m.status}</span><span className="text-xs text-slate-400">{m.requestDate} · {m.mutationNo}</span></div><h3 className="font-bold text-white">{m.memberName}</h3><p className="text-xs text-cyan-300">{m.mutationType}</p><div className="flex items-center gap-2 text-xs text-slate-300"><MapPin className="w-3.5 h-3.5 text-fuchsia-300" /><span>{m.fromChurch || rayonName(m.fromRayonId) || 'Asal belum diisi'}</span><ArrowLeftRight className="w-3.5 h-3.5" /><span>{m.toChurch || rayonName(m.toRayonId) || 'Tujuan belum diisi'}</span></div><p className="text-[11px] text-slate-400">Berlaku {m.effectiveDate} · {m.reason || 'Tanpa alasan tambahan'}{m.notes ? ` · ${m.notes}` : ''}</p></div>
              {(onUpdateMutation || onDeleteMutation) && <div className="flex gap-2">{onUpdateMutation && <button onClick={() => openEdit(m)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-cyan-300 text-xs flex items-center gap-1"><Edit2 className="w-3 h-3" />Ubah</button>}{onDeleteMutation && <button onClick={() => { if (window.confirm(`Hapus mutasi ${m.memberName}?`)) void onDeleteMutation(m.id).catch((err: any) => setError(err?.message || 'Mutasi tidak dapat dihapus.')); }} className="px-3 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 text-xs flex items-center gap-1"><Trash2 className="w-3 h-3" />Hapus</button>}</div>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="chroma-card p-10 rounded-2xl text-center text-slate-400 text-sm"><FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />Belum ada catatan mutasi yang sesuai.</div>}
      </div>
      {showModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"><div className="chroma-card w-full max-w-lg rounded-3xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between"><h3 className="text-base font-bold text-white">{editing ? 'Ubah Mutasi Jemaat' : 'Registrasi Mutasi Jemaat'}</h3><button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white" aria-label="Tutup"><X className="w-4 h-4" /></button></div><form onSubmit={handleSave} className="space-y-3">
        <div><label className="block text-slate-300 mb-1">Jemaat *</label><select required value={memberId} onChange={(e) => fillMember(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"><option value="">Pilih anggota jemaat</option>{members.map((m) => <option key={m.id} value={m.id}>{m.fullName} — {m.memberNo}</option>)}</select></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-slate-300 mb-1">Jenis Mutasi</label><select value={mutationType} onChange={(e) => setMutationType(e.target.value as MutationRecord['mutationType'])} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white">{mutationTypes.map((type) => <option key={type}>{type}</option>)}</select></div><div><label className="block text-slate-300 mb-1">Tanggal Pengajuan</label><input required value={requestDate} onChange={(e) => setRequestDate(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white" /></div></div>
        <div><label className="block text-slate-300 mb-1">Tanggal Berlaku</label><input required value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-slate-300 mb-1">Rayon Asal</label><select value={fromRayonId} onChange={(e) => setFromRayonId(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"><option value="">Tidak ada / di luar jemaat</option>{rayons.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div><div><label className="block text-slate-300 mb-1">Rayon Tujuan</label><select value={toRayonId} onChange={(e) => setToRayonId(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"><option value="">Tidak ada / di luar jemaat</option>{rayons.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div></div>
        <div><label className="block text-slate-300 mb-1">Gereja Asal</label><input value={fromChurch} onChange={(e) => setFromChurch(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white" /></div>
        <div><label className="block text-slate-300 mb-1">Gereja Tujuan</label><input value={toChurch} onChange={(e) => setToChurch(e.target.value)} placeholder="Kosongkan jika pindah rayon internal" className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white" /></div>
        <div><label className="block text-slate-300 mb-1">Alasan Mutasi</label><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white" /></div>
        <div><label className="block text-slate-300 mb-1">Catatan</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white" /></div>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300">Batal</button><button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-bold disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Mutasi'}</button></div>
      </form></div></div>}
    </div>
  );
};
