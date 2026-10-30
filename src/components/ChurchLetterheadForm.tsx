import React, { useEffect, useRef, useState } from 'react';
import { Church, Upload, Save, Image, Stamp, Eye, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import type { ChurchSettings } from '../types/index.ts';
import { readImageForLetterhead } from '../utils/file-upload.ts';
import { OfficialLetterhead } from './OfficialLetterhead.tsx';

export const ChurchLetterheadForm: React.FC<{
  settings: ChurchSettings;
  onSave: (settings: ChurchSettings) => Promise<void>;
}> = ({ settings, onSave }) => {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'stamp' | ''>('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const logoInput = useRef<HTMLInputElement>(null);
  const stampInput = useRef<HTMLInputElement>(null);

  useEffect(() => setForm(settings), [settings]);

  const handleImage = async (kind: 'logo' | 'stamp', file?: File) => {
    if (!file) return;
    setError('');
    setUploading(kind);
    try {
      const dataUrl = await readImageForLetterhead(file);
      setForm((old) => ({ ...old, [kind === 'logo' ? 'logoUrl' : 'stampUrl']: dataUrl }));
      setNotice(`${kind === 'logo' ? 'Logo' : 'Cap'} siap disimpan. Klik “Simpan Kop Resmi” untuk menerapkannya.`);
    } catch (err: any) {
      setError(err?.message || 'Gambar gagal diproses.');
    } finally {
      setUploading('');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave(form);
      setNotice('Kop, logo, cap, dan penanda tangan berhasil disimpan serta disinkronkan.');
    } catch (err: any) {
      setError(err?.message || 'Pengaturan kop gagal disimpan.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-fuchsia-400';
  const set = (key: keyof ChurchSettings, value: string) => setForm((old) => ({ ...old, [key]: value }));

  return (
    <section className="chroma-card rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-slate-800"><h3 className="font-bold text-white flex items-center gap-2"><Church className="w-5 h-5 text-cyan-300" />Kop Surat, Logo & Cap Resmi</h3><p className="text-xs text-slate-400 mt-1">Pengaturan ini dipakai pada laporan dan warta PDF/cetak yang diterbitkan aplikasi. Berkas yang diunggah ke arsip tidak diubah.</p></div>
      <form onSubmit={handleSubmit} className="p-5 space-y-5 text-xs">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
          <div className="space-y-4">
            <label className="block"><span className="block text-slate-300 font-semibold mb-1.5">Nama gereja dan jemaat *</span><textarea required rows={2} value={form.churchName} onChange={(event) => set('churchName', event.target.value)} className={inputClass} /></label>
            <label className="block"><span className="block text-slate-300 font-semibold mb-1.5">Klasis *</span><input required value={form.klasis} onChange={(event) => set('klasis', event.target.value)} className={inputClass} /></label>
            <label className="block"><span className="block text-slate-300 font-semibold mb-1.5">Alamat pada kop</span><textarea rows={3} value={form.address} onChange={(event) => set('address', event.target.value)} className={inputClass} /></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label><span className="block text-slate-300 font-semibold mb-1.5">Telepon</span><input value={form.phone} onChange={(event) => set('phone', event.target.value)} className={inputClass} /></label><label><span className="block text-slate-300 font-semibold mb-1.5">Email</span><input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} className={inputClass} /></label></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(['logo', 'stamp'] as const).map((kind) => {
              const value = kind === 'logo' ? form.logoUrl : form.stampUrl;
              return <div key={kind} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3"><div className="h-28 flex items-center justify-center bg-white rounded-xl p-2">{value ? <img src={value} alt={kind === 'logo' ? 'Logo gereja' : 'Cap gereja'} className="max-h-full max-w-full object-contain" /> : <span className="text-slate-400">{kind === 'logo' ? <Image className="w-8 h-8" /> : <Stamp className="w-8 h-8" />}</span>}</div><div className="font-bold text-slate-200">{kind === 'logo' ? 'Logo Gereja' : 'Cap / Stempel'}</div><input ref={kind === 'logo' ? logoInput : stampInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => handleImage(kind, event.target.files?.[0])} /><button type="button" disabled={Boolean(uploading)} onClick={() => (kind === 'logo' ? logoInput : stampInput).current?.click()} className="w-full px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"><Upload className="w-3.5 h-3.5" />{uploading === kind ? 'Memproses…' : 'Unggah Gambar'}</button>{kind === 'stamp' && value && <button type="button" onClick={() => set('stampUrl', '')} className="text-rose-300 flex items-center justify-center gap-1 mx-auto"><Trash2 className="w-3 h-3" />Hapus cap</button>}</div>;
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
          <label><span className="block text-slate-300 font-semibold mb-1.5">Nama ketua / pendeta</span><input value={form.signerName} onChange={(event) => set('signerName', event.target.value)} className={inputClass} /></label>
          <label><span className="block text-slate-300 font-semibold mb-1.5">Jabatan ketua / pendeta</span><input value={form.signerRole} onChange={(event) => set('signerRole', event.target.value)} className={inputClass} /></label>
          <label><span className="block text-slate-300 font-semibold mb-1.5">Nama sekretaris</span><input value={form.secretaryName || ''} onChange={(event) => set('secretaryName', event.target.value)} className={inputClass} /></label>
          <label><span className="block text-slate-300 font-semibold mb-1.5">Jabatan sekretaris</span><input value={form.secretaryRole || ''} onChange={(event) => set('secretaryRole', event.target.value)} className={inputClass} /></label>
        </div>

        <div><h4 className="font-bold text-slate-300 mb-2 flex items-center gap-2"><Eye className="w-4 h-4" />Pratinjau kop pada dokumen</h4><div className="bg-white rounded-xl p-4 overflow-x-auto"><div className="min-w-[540px]"><OfficialLetterhead settings={form} compact /></div></div></div>
        {(error || notice) && <div className={`p-3 rounded-xl border flex items-center gap-2 ${error ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'}`}>{error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}{error || notice}</div>}
        <div className="flex justify-end"><button type="submit" disabled={saving || Boolean(uploading)} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-bold flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Menyimpan & menyinkronkan…' : 'Simpan Kop Resmi'}</button></div>
      </form>
    </section>
  );
};
