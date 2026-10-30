import React, { useState } from 'react';
import { Award, UserCheck, Plus, Phone, Mail, CheckCircle2, Trash2, Edit2, AlertCircle, X } from 'lucide-react';
import type { ChurchStaff } from '../../types/index.ts';

interface StaffViewProps {
  staff: ChurchStaff[];
  onAddStaff: (data: Partial<ChurchStaff>) => Promise<void>;
  onUpdateStaff?: (id: string, data: Partial<ChurchStaff>) => Promise<void>;
  onDeleteStaff?: (id: string) => Promise<void>;
  onClearAllStaff?: () => Promise<void>;
}

export const StaffView: React.FC<StaffViewProps> = ({
  staff,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onClearAllStaff,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<ChurchStaff | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [position, setPosition] = useState<any>('Penatua Rayon');
  const [period, setPeriod] = useState('2026 - 2029');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif' | 'Cuti'>('Aktif');
  const [saving, setSaving] = useState(false);

  const openAddModal = () => {
    setEditingStaff(null);
    setName('');
    setPosition('Penatua Rayon');
    setPeriod('2026 - 2029');
    setPhone('');
    setEmail('');
    setStatus('Aktif');
    setShowAddModal(true);
  };

  const openEditModal = (s: ChurchStaff) => {
    setEditingStaff(s);
    setName(s.name);
    setPosition(s.position);
    setPeriod(s.period);
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setStatus(s.status as any || 'Aktif');
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingStaff && onUpdateStaff) {
        await onUpdateStaff(editingStaff.id, {
          name,
          position,
          period,
          phone,
          email,
          status,
        });
      } else {
        await onAddStaff({
          name,
          position,
          period,
          phone,
          email,
          status,
        });
      }
      setShowAddModal(false);
      setEditingStaff(null);
      setName('');
      setPhone('');
      setEmail('');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Apakah Anda yakin ingin mengosongkan seluruh data pelayan/majelis agar dapat menginput data riil dari awal?')) return;
    if (onClearAllStaff) {
      await onClearAllStaff();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 shadow-md">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Presbiter Majelis Jemaat & Pendeta</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pelayan Firman dan Tata Kelola Gerejawi GMIT Betel Fuimelang Periode 2026 - 2029 · Akses Manajemen Super Admin
          </p>
        </div>

        <div className="flex items-center gap-2">
          {staff.length > 0 && onClearAllStaff && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Semua</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Pelayan Majelis</span>
          </button>
        </div>
      </div>

      {/* Staff Grid or Empty State */}
      {staff.length === 0 ? (
        <div className="py-16 px-6 rounded-2xl bg-[#0c1329]/60 border border-dashed border-amber-500/30 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Award className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Data Pelayan & Majelis Siap Diinput Mandiri
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              Nama-nama lama bawaan sistem telah dikosongkan seluruhnya. Silakan mulai menginput nama-nama riil Pendeta, Penatua, Diaken, dan Pengajar GMIT Betel Fuimelang saat ini.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Input Data Majelis & Pelayan Riil</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 hover:border-amber-400/40 transition-all space-y-3 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 text-[10px] uppercase">
                    {s.position}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {s.period}
                    </span>
                    {onUpdateStaff && (
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-1 text-slate-400 hover:text-amber-300 transition cursor-pointer"
                        title="Edit data pelayan ini"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteStaff && (
                      <button
                        onClick={() => {
                          if (confirm(`Hapus data ${s.name}?`)) onDeleteStaff(s.id);
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 transition cursor-pointer"
                        title="Hapus pelayan ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mt-1">{s.name}</h3>
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-mono">{s.phone || '-'}</span>
                  </div>
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{s.status}</span>
                </span>
                <span className="text-[10px] text-slate-400">Klasis Alor Tengah Utara</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b1226] border border-amber-500/30 rounded-3xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-amber-300">
                {editingStaff ? 'Edit Data Pelayan / Majelis' : 'Tambah Pelayan Majelis Jemaat'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nama Lengkap beserta Gelar *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Pnt. Daniel Malaipada, S.Pd"
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Jabatan Pelayanan *
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                >
                  <option value="Ketua Majelis Jemaat / Pendeta">Ketua Majelis Jemaat / Pendeta</option>
                  <option value="Pendeta Pelayan">Pendeta Pelayan</option>
                  <option value="Wakil Ketua Majelis">Wakil Ketua Majelis</option>
                  <option value="Sekretaris">Sekretaris</option>
                  <option value="Bendahara">Bendahara</option>
                  <option value="Penatua Rayon">Penatua Rayon</option>
                  <option value="Diaken Rayon">Diaken Rayon</option>
                  <option value="Pengajar / Katekis">Pengajar / Katekis</option>
                  <option value="Pembina Remaja & PAR">Pembina Remaja & PAR</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Periode Pelayanan
                </label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="2026 - 2029"
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@gmit.or.id"
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Status Pelayanan
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                  <option value="Cuti">Cuti</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  {saving ? 'Menyimpan...' : editingStaff ? 'Perbarui Data Majelis' : 'Simpan Majelis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
