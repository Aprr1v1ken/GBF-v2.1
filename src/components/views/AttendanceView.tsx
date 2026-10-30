import React, { useState } from 'react';
import { CheckSquare, Plus, Users, Printer, Edit2, Trash2, X } from 'lucide-react';
import type { AttendanceRecord } from '../../types/index.ts';

interface AttendanceViewProps {
  attendance: AttendanceRecord[];
  onAddAttendance: (data: Partial<AttendanceRecord>) => Promise<void>;
  onUpdateAttendance?: (id: string, data: Partial<AttendanceRecord>) => Promise<void>;
  onDeleteAttendance?: (id: string) => Promise<void>;
  onOpenPrintReport: () => void;
}

const today = () => new Date().toLocaleDateString('id-ID').split('/').join('-');

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  attendance,
  onAddAttendance,
  onUpdateAttendance,
  onDeleteAttendance,
  onOpenPrintReport,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [date, setDate] = useState(today());
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totalCalculated = Number(maleCount) + Number(femaleCount) + Number(childrenCount);

  const openAdd = () => {
    setEditing(null);
    setEventTitle('');
    setDate(today());
    setMaleCount(0);
    setFemaleCount(0);
    setChildrenCount(0);
    setNotes('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (record: AttendanceRecord) => {
    setEditing(record);
    setEventTitle(record.eventTitle);
    setDate(record.date);
    setMaleCount(record.maleCount);
    setFemaleCount(record.femaleCount);
    setChildrenCount(record.childrenCount);
    setNotes(record.notes || '');
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || totalCalculated < 0) return;
    setSaving(true);
    setError('');
    const payload: Partial<AttendanceRecord> = {
      eventId: editing?.eventId,
      eventTitle: eventTitle.trim(),
      date,
      maleCount: Number(maleCount),
      femaleCount: Number(femaleCount),
      childrenCount: Number(childrenCount),
      totalCount: totalCalculated,
      notes,
      recordedBy: editing?.recordedBy || 'Tata Usaha GMIT Betel Fuimelang',
    };
    try {
      if (editing && onUpdateAttendance) await onUpdateAttendance(editing.id, payload);
      else await onAddAttendance(payload);
      setShowModal(false);
      setEditing(null);
    } catch (err: any) {
      setError(err?.message || 'Absensi tidak dapat disimpan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: AttendanceRecord) => {
    if (!onDeleteAttendance || !window.confirm(`Hapus absensi "${record.eventTitle}" tanggal ${record.date}?`)) return;
    try {
      await onDeleteAttendance(record.id);
    } catch (err: any) {
      setError(err?.message || 'Absensi tidak dapat dihapus.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="chroma-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl shadow-md">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><CheckSquare className="w-5 h-5 text-cyan-300" /><span>Pencatatan Absensi & Statistik Kehadiran Ibadah</span></h2>
          <p className="text-xs text-slate-400 mt-0.5">Merekam data kehadiran jemaat pria, wanita, dan anak-anak sekolah minggu PAR</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white hover:brightness-110 cursor-pointer"><Plus className="w-4 h-4" /><span>Catat Absensi</span></button>
          <button onClick={onOpenPrintReport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"><Printer className="w-3.5 h-3.5 text-cyan-300" /><span>Cetak Rekap</span></button>
        </div>
      </div>

      {error && <div role="alert" className="p-3 rounded-xl bg-rose-950/70 border border-rose-400/40 text-rose-200 text-xs">{error}</div>}

      {attendance.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-cyan-400/30 bg-slate-950/30">
          <Users className="w-10 h-10 mx-auto text-cyan-300/50 mb-3" />
          <h3 className="font-bold text-white">Belum ada catatan absensi</h3>
          <p className="text-xs text-slate-400 mt-1">Tambahkan kehadiran ibadah yang sebenarnya melalui tombol Catat Absensi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attendance.map((att) => (
            <div key={att.id} className="chroma-card p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2"><span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">{att.date}</span><span className="text-xs text-slate-400">GMIT Betel</span></div>
              <h3 className="text-base font-bold text-white">{att.eventTitle}</h3>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div><span className="text-[11px] text-slate-400 block">Total Kehadiran</span><span className="text-2xl font-mono font-bold text-fuchsia-300 tabular-nums">{att.totalCount} Jiwa</span></div>
                <div className="text-right text-xs space-y-0.5 text-slate-300"><div>Laki-laki: <span className="font-mono text-white">{att.maleCount}</span></div><div>Perempuan: <span className="font-mono text-white">{att.femaleCount}</span></div><div>Anak/PAR: <span className="font-mono text-cyan-300">{att.childrenCount}</span></div></div>
              </div>
              <div className="text-xs text-slate-400 pt-1">Catatan: <span className="text-slate-300 italic">{att.notes || '-'}</span></div>
              <div className="text-[10px] text-slate-500">Dicatat oleh {att.recordedBy || 'Tata Usaha'}</div>
              {(onUpdateAttendance || onDeleteAttendance) && <div className="flex gap-2 pt-2 border-t border-slate-800">
                {onUpdateAttendance && <button onClick={() => openEdit(att)} className="flex-1 py-1.5 rounded-lg bg-slate-800 text-cyan-300 text-xs flex items-center justify-center gap-1"><Edit2 className="w-3 h-3" />Ubah</button>}
                {onDeleteAttendance && <button onClick={() => void remove(att)} className="flex-1 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 text-xs flex items-center justify-center gap-1"><Trash2 className="w-3 h-3" />Hapus</button>}
              </div>}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="chroma-card w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between"><h3 className="text-base font-bold text-white">{editing ? 'Ubah Absensi Ibadah' : 'Input Absensi Kehadiran Ibadah'}</h3><button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Tutup"><X className="w-4 h-4" /></button></div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block font-semibold text-slate-300 mb-1">Nama Ibadah / Kebaktian *</label><input type="text" required value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Contoh: Kebaktian Minggu Pagi" className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none" /></div>
              <div><label className="block font-semibold text-slate-300 mb-1">Tanggal Ibadah (DD-MM-YYYY) *</label><input type="text" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none" /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block font-semibold text-slate-300 mb-1">Pria (L)</label><input type="number" min="0" value={maleCount} onChange={(e) => setMaleCount(Math.max(0, parseInt(e.target.value) || 0))} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none font-mono" /></div>
                <div><label className="block font-semibold text-slate-300 mb-1">Wanita (P)</label><input type="number" min="0" value={femaleCount} onChange={(e) => setFemaleCount(Math.max(0, parseInt(e.target.value) || 0))} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none font-mono" /></div>
                <div><label className="block font-semibold text-slate-300 mb-1">Anak / PAR</label><input type="number" min="0" value={childrenCount} onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value) || 0))} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none font-mono" /></div>
              </div>
              <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between"><span className="font-semibold text-slate-300">Total Jiwa Terhitung:</span><span className="text-base font-bold font-mono text-cyan-300">{totalCalculated} Orang</span></div>
              <div><label className="block font-semibold text-slate-300 mb-1">Catatan Ibadah</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Keterangan cuaca, perjamuan kudus, dll..." className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none" /></div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white">Batal</button><button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-bold disabled:opacity-50">{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Simpan Absensi'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
