import React, { useCallback, useEffect, useState } from 'react';
import { UserCog, Plus, Edit2, Trash2, X, Save, ShieldCheck, Users, KeyRound, AlertCircle } from 'lucide-react';
import type { Member, Rayon, User } from '../types/index.ts';
import { createUserApi, deleteUserApi, fetchUsersApi, updateUserApi } from '../services/admin-api.ts';

const roles: User['role'][] = ['Super Admin', 'Admin Gereja', 'Ketua Majelis/Pendeta', 'Majelis/Rayon', 'Jemaat'];
const emptyForm = {
  username: '', name: '', password: '', role: 'Admin Gereja' as User['role'],
  rayonId: '', memberId: '', phone: '', email: '', status: 'Aktif' as 'Aktif' | 'Nonaktif',
};

export const UserManagement: React.FC<{ currentUser: User; members: Member[]; rayons: Rayon[] }> = ({ currentUser, members, rayons }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchUsersApi();
      setUsers(response.users || []);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Daftar pengguna gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      username: user.username, name: user.name, password: '', role: user.role,
      rayonId: user.rayonId || '', memberId: user.memberId || '', phone: user.phone || '',
      email: user.email || '', status: user.status,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!editing && form.password.length < 8) return setError('Kata sandi awal minimal 8 karakter.');
    if (editing && form.password && form.password.length < 8) return setError('Kata sandi baru minimal 8 karakter.');
    if (form.role === 'Majelis/Rayon' && !form.rayonId) return setError('Pilih rayon untuk akun Majelis/Rayon.');
    if (form.role === 'Jemaat' && !form.memberId) return setError('Pilih data jemaat yang terhubung.');
    setSaving(true);
    try {
      const payload = { ...form, password: form.password || undefined };
      const response = editing
        ? await updateUserApi(editing.id, payload)
        : await createUserApi(payload);
      setNotice(response.message || 'Pengguna berhasil disimpan.');
      setModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      setError(err?.message || 'Pengguna gagal disimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Hapus akun “${user.name}” (${user.username})? Akses login akun ini akan dihentikan.`)) return;
    setError('');
    try {
      const response = await deleteUserApi(user.id);
      setNotice(response.message || 'Pengguna berhasil dihapus.');
      await loadUsers();
    } catch (err: any) {
      setError(err?.message || 'Pengguna gagal dihapus.');
    }
  };

  return (
    <section className="chroma-card rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h3 className="font-bold text-white flex items-center gap-2"><UserCog className="w-5 h-5 text-fuchsia-300" />Manajemen User & Admin</h3><p className="text-xs text-slate-400 mt-1">Khusus Super Admin. Tambahkan admin, majelis, pendeta, atau akun jemaat dengan peran yang sesuai.</p></div>
        <button onClick={openAdd} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Tambah User / Admin</button>
      </div>
      {(notice || (error && !modalOpen)) && <div className={`mx-5 mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${error ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'}`}>{error ? <AlertCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}{error || notice}</div>}
      <div className="p-5">
        {loading ? <div className="py-8 text-center text-xs text-slate-400">Memuat daftar pengguna…</div> : users.length === 0 ? <div className="py-8 text-center text-xs text-slate-400"><Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />Belum ada pengguna.</div> : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400"><tr><th className="p-3">Pengguna</th><th className="p-3">Username</th><th className="p-3">Peran</th><th className="p-3">Terhubung</th><th className="p-3">Status</th><th className="p-3 text-right">Aksi</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className="bg-slate-900/20">
                    <td className="p-3"><div className="font-semibold text-white">{user.name}{user.id === currentUser.id && <span className="ml-2 text-[9px] text-cyan-300">(Anda)</span>}</div><div className="text-[10px] text-slate-500">{user.email || user.phone || 'Kontak belum diisi'}</div></td>
                    <td className="p-3 font-mono text-slate-300">{user.username}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded border text-[10px] ${user.role === 'Super Admin' ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'}`}>{user.role}</span></td>
                    <td className="p-3 text-slate-400">{members.find((member) => member.id === user.memberId)?.fullName || rayons.find((rayon) => rayon.id === user.rayonId)?.name || '—'}</td>
                    <td className="p-3"><span className={user.status === 'Aktif' ? 'text-emerald-300' : 'text-rose-300'}>{user.status}</span></td>
                    <td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => openEdit(user)} className="p-2 rounded-lg bg-slate-800 text-cyan-300" title="Ubah pengguna"><Edit2 className="w-3.5 h-3.5" /></button>{user.id !== currentUser.id && user.id !== 'u1' && <button onClick={() => handleDelete(user)} className="p-2 rounded-lg bg-rose-950/50 text-rose-300" title="Hapus pengguna"><Trash2 className="w-3.5 h-3.5" /></button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm">
          <div className="chroma-card w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5"><div><h3 className="text-lg font-bold text-white">{editing ? 'Ubah Pengguna' : 'Tambah User / Admin'}</h3><p className="text-xs text-slate-400 mt-1">Perubahan langsung disimpan ke server dan disinkronkan.</p></div><button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800" aria-label="Tutup"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label><span className="block text-slate-300 font-semibold mb-1.5">Nama lengkap *</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white" /></label>
              <label><span className="block text-slate-300 font-semibold mb-1.5">Username *</span><input required disabled={Boolean(editing)} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} pattern="[A-Za-z0-9._-]{3,40}" autoComplete="username" className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white disabled:opacity-60" /></label>
              <label><span className="block text-slate-300 font-semibold mb-1.5">Peran *</span><select disabled={editing?.id === currentUser.id || editing?.id === 'u1'} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as User['role'], rayonId: '', memberId: '' })} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white disabled:opacity-60">{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
              <label><span className="block text-slate-300 font-semibold mb-1.5">Status</span><select disabled={editing?.id === currentUser.id || editing?.id === 'u1'} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'Aktif' | 'Nonaktif' })} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white disabled:opacity-60"><option>Aktif</option><option>Nonaktif</option></select></label>
              <label className="sm:col-span-2"><span className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" />{editing ? 'Kata sandi baru (opsional)' : 'Kata sandi awal *'}</span><input type="password" required={!editing} minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" placeholder={editing ? 'Kosongkan jika tidak diganti' : 'Minimal 8 karakter'} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white" /></label>
              {form.role === 'Majelis/Rayon' && <label className="sm:col-span-2"><span className="block text-slate-300 font-semibold mb-1.5">Rayon yang dikelola *</span><select required value={form.rayonId} onChange={(event) => setForm({ ...form, rayonId: event.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"><option value="">Pilih rayon</option>{rayons.map((rayon) => <option key={rayon.id} value={rayon.id}>{rayon.name}</option>)}</select></label>}
              {form.role === 'Jemaat' && <label className="sm:col-span-2"><span className="block text-slate-300 font-semibold mb-1.5">Data jemaat terhubung *</span><select required value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"><option value="">Pilih jemaat</option>{members.map((member) => <option key={member.id} value={member.id}>{member.fullName} · {member.memberNo}</option>)}</select></label>}
              <label><span className="block text-slate-300 font-semibold mb-1.5">Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="off" className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white" /></label>
              <label><span className="block text-slate-300 font-semibold mb-1.5">Telepon</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white" /></label>
              {error && <div className="sm:col-span-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200">{error}</div>}
              <div className="sm:col-span-2 flex justify-end gap-2 pt-4 border-t border-slate-800"><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300">Batal</button><button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-bold flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Menyimpan…' : 'Simpan Pengguna'}</button></div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
