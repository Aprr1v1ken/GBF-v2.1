import React, { useRef, useState } from 'react';
import {
  FolderArchive, Plus, Search, FileText, Download, ShieldCheck, Lock,
  Edit2, Trash2, X, UploadCloud, UserRound, HardDrive, AlertCircle,
} from 'lucide-react';
import type { DocumentRecord, Member } from '../../types/index.ts';
import { downloadDocumentApi } from '../../services/api.ts';
import { formatFileSize, MAX_DOCUMENT_FILE_BYTES, readFileAsDataUrl } from '../../utils/file-upload.ts';

interface DocumentsViewProps {
  documents: DocumentRecord[];
  members?: Member[];
  onAddDocument: (data: Partial<DocumentRecord>) => Promise<void>;
  onUpdateDocument?: (id: string, data: Partial<DocumentRecord>) => Promise<void>;
  onDeleteDocument?: (id: string) => Promise<void>;
}

const categories: DocumentRecord['category'][] = [
  'Surat Baptis', 'Surat Sidi', 'Surat Nikah Gerejawi', 'Surat Pindah',
  'Kartu Keluarga', 'Warta Jemaat', 'SK Majelis', 'Laporan Keuangan', 'Lainnya',
];
const acceptedTypes = [
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];
const emptyForm = {
  title: '', docNo: '', category: 'Surat Baptis' as DocumentRecord['category'],
  memberId: '', accessLevel: 'Admin' as DocumentRecord['accessLevel'],
};

function saveDataUrl(dataUrl: string, fileName: string) {
  const [header, payload] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
  const binary = window.atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'dokumen-gereja';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents, members = [], onAddDocument, onUpdateDocument, onDeleteDocument,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DocumentRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = documents.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    const memberName = members.find((member) => member.id === item.memberId)?.fullName || '';
    return `${item.title} ${item.docNo} ${item.fileName} ${memberName}`.toLowerCase().includes(query);
  });

  const openUpload = () => {
    setEditing(null);
    setForm(emptyForm);
    setSelectedFile(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (item: DocumentRecord) => {
    setEditing(item);
    setForm({
      title: item.title, docNo: item.docNo, category: item.category,
      memberId: item.memberId || '', accessLevel: item.accessLevel,
    });
    setSelectedFile(null);
    setError('');
    setShowModal(true);
  };

  const chooseFile = (file?: File) => {
    setError('');
    if (!file) return;
    if (file.size > MAX_DOCUMENT_FILE_BYTES) {
      setSelectedFile(null);
      setError('Ukuran berkas maksimal 2 MB. Kompres PDF/gambar atau unggah berkas yang lebih kecil.');
      return;
    }
    if (file.type && !acceptedTypes.includes(file.type)) {
      setSelectedFile(null);
      setError('Format tidak didukung. Gunakan PDF, gambar, DOC/DOCX, XLS/XLSX, atau TXT.');
      return;
    }
    setSelectedFile(file);
    if (!form.title.trim()) setForm((old) => ({ ...old, title: file.name.replace(/\.[^.]+$/, '') }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Judul dokumen wajib diisi.');
    setSaving(true);
    try {
      if (editing) {
        await onUpdateDocument?.(editing.id, {
          title: form.title.trim(), docNo: form.docNo.trim(), category: form.category,
          memberId: form.memberId || undefined, accessLevel: form.accessLevel,
        });
        setNotice('Metadata dokumen berhasil diperbarui dan disinkronkan.');
      } else {
        if (!selectedFile) throw new Error('Pilih berkas asli yang akan diunggah.');
        const fileData = await readFileAsDataUrl(selectedFile);
        await onAddDocument({
          ...form, title: form.title.trim(), docNo: form.docNo.trim(),
          memberId: form.memberId || undefined, fileName: selectedFile.name,
          fileSize: formatFileSize(selectedFile.size), mimeType: selectedFile.type || 'application/octet-stream', fileData,
        });
        setNotice(`Berkas “${selectedFile.name}” berhasil disimpan dan dapat diunduh kembali.`);
      }
      setShowModal(false);
      setSelectedFile(null);
    } catch (err: any) {
      setError(err?.message || 'Dokumen gagal disimpan. Periksa koneksi lalu coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (item: DocumentRecord) => {
    setError('');
    setNotice('');
    if (!item.hasFile) {
      setError('Arsip lama ini hanya memiliki metadata. Unggah berkas aslinya sebagai dokumen baru.');
      return;
    }
    setDownloadingId(item.id);
    try {
      const response = await downloadDocumentApi(item.id);
      if (!response?.file?.fileData) throw new Error('Isi berkas tidak ditemukan pada server.');
      saveDataUrl(response.file.fileData, response.file.fileName || item.fileName);
      setNotice(`Unduhan “${item.fileName}” dimulai.`);
    } catch (err: any) {
      setError(err?.message || 'Berkas gagal diunduh.');
    } finally {
      setDownloadingId('');
    }
  };

  const handleDelete = async (item: DocumentRecord) => {
    if (!window.confirm(`Hapus arsip “${item.title}” beserta berkas aslinya? Tindakan ini tidak dapat dibatalkan.`)) return;
    setError('');
    try {
      await onDeleteDocument?.(item.id);
      setNotice('Dokumen berhasil dihapus.');
    } catch (err: any) {
      setError(err?.message || 'Dokumen gagal dihapus.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="chroma-card p-5 sm:p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><FolderArchive className="w-6 h-6 text-cyan-300" />Arsip Dokumen Resmi & Sakramen</h2>
          <p className="text-xs text-slate-400 mt-1">Unggah berkas asli surat baptis, sidi, nikah, dan dokumen resmi lain. Maksimal 2 MB per berkas.</p>
        </div>
        <button onClick={openUpload} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg">
          <Plus className="w-4 h-4" />Unggah Dokumen
        </button>
      </div>

      {(error || notice) && (
        <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${error ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'}`}>
          {error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}<span>{error || notice}</span>
        </div>
      )}

      <div className="chroma-card p-4 rounded-2xl grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3">
        <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cari nomor, judul, nama jemaat, atau berkas…" className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-xs outline-none focus:border-cyan-400" /></label>
        <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-xs"><option value="all">Semua kategori</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
      </div>

      <div className="chroma-card rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between"><span className="text-xs font-bold text-slate-300">{filtered.length} dokumen</span><span className="text-[10px] text-slate-500 flex items-center gap-1"><Lock className="w-3 h-3" />Akses diperiksa server</span></div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center"><FileText className="w-10 h-10 mx-auto text-slate-700 mb-3" /><p className="text-sm text-slate-400">Belum ada dokumen yang sesuai.</p><button onClick={openUpload} className="mt-3 text-xs text-cyan-300 hover:text-cyan-200">Unggah berkas pertama</button></div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filtered.map((item) => {
              const member = members.find((entry) => entry.id === item.memberId);
              return (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center gap-4 hover:bg-slate-900/30">
                  <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-cyan-300" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-sm text-white break-words">{item.title}</h3><span className="px-2 py-0.5 rounded text-[9px] bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20">{item.category}</span></div>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">{item.docNo}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-500"><span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{item.fileName} · {item.fileSize}</span><span>{item.uploadDate}</span>{member && <span className="flex items-center gap-1 text-cyan-300"><UserRound className="w-3 h-3" />{member.fullName}</span>}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded-lg text-[10px] border flex items-center gap-1 ${item.accessLevel === 'Admin' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' : 'bg-slate-800 text-slate-300 border-slate-700'}`}><Lock className="w-3 h-3" />{item.accessLevel === 'Publik' ? 'Internal' : item.accessLevel}</span>
                    <button onClick={() => handleDownload(item)} disabled={downloadingId === item.id || !item.hasFile} title={item.hasFile ? 'Unduh berkas asli' : 'Berkas asli belum tersedia pada arsip lama'} className="px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"><Download className={`w-3.5 h-3.5 ${downloadingId === item.id ? 'animate-bounce' : ''}`} />{downloadingId === item.id ? 'Mengambil…' : item.hasFile ? 'Unduh' : 'Belum ada berkas'}</button>
                    {onUpdateDocument && <button onClick={() => openEdit(item)} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white" title="Ubah metadata"><Edit2 className="w-3.5 h-3.5" /></button>}
                    {onDeleteDocument && <button onClick={() => handleDelete(item)} className="p-2 rounded-lg bg-rose-950/50 text-rose-300 hover:bg-rose-900/60" title="Hapus dokumen"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm">
          <div className="chroma-card w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5"><div><h3 className="text-lg font-bold text-white">{editing ? 'Ubah Metadata Dokumen' : 'Unggah Berkas Resmi'}</h3><p className="text-xs text-slate-400 mt-1">{editing ? 'Berkas asli tetap tersimpan. Unggah dokumen baru untuk mengganti berkas.' : 'Berkas disimpan pada arsip privat dan disinkronkan otomatis.'}</p></div><button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Tutup"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {!editing && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full p-6 rounded-2xl border-2 border-dashed text-center transition ${selectedFile ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-400'}`}>
                  <UploadCloud className={`w-9 h-9 mx-auto mb-2 ${selectedFile ? 'text-emerald-300' : 'text-cyan-300'}`} />
                  <span className="block font-bold text-white">{selectedFile ? selectedFile.name : 'Pilih berkas dari PC atau HP'}</span>
                  <span className="block text-slate-400 mt-1">{selectedFile ? `${formatFileSize(selectedFile.size)} · siap diunggah` : 'PDF, JPG, PNG, WebP, DOC/DOCX, XLS/XLSX, TXT · maksimal 2 MB'}</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt" onChange={(event) => chooseFile(event.target.files?.[0])} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="sm:col-span-2"><span className="block text-slate-300 font-semibold mb-1.5">Judul dokumen *</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white" placeholder="Contoh: Surat Baptis Nama Jemaat" /></label>
                <label><span className="block text-slate-300 font-semibold mb-1.5">Nomor dokumen</span><input value={form.docNo} onChange={(event) => setForm({ ...form, docNo: event.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white" placeholder="Otomatis jika dikosongkan" /></label>
                <label><span className="block text-slate-300 font-semibold mb-1.5">Kategori</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as DocumentRecord['category'] })} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label><span className="block text-slate-300 font-semibold mb-1.5">Jemaat terkait (opsional)</span><select value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"><option value="">Tidak terkait jemaat tertentu</option>{members.map((member) => <option key={member.id} value={member.id}>{member.fullName} · {member.memberNo}</option>)}</select></label>
                <label><span className="block text-slate-300 font-semibold mb-1.5">Tingkat akses</span><select value={form.accessLevel} onChange={(event) => setForm({ ...form, accessLevel: event.target.value as DocumentRecord['accessLevel'] })} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"><option value="Publik">Internal pengurus</option><option value="Majelis">Majelis</option><option value="Admin">Khusus Admin</option></select></label>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">“Internal pengurus” tidak berarti berkas tampil di situs publik. Dokumen Admin hanya dapat diakses Super Admin dan Admin Gereja.</p>
              {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200">{error}</div>}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300">Batal</button><button type="submit" disabled={saving || (!editing && !selectedFile)} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-bold disabled:opacity-40">{saving ? 'Menyimpan & menyinkronkan…' : editing ? 'Simpan Metadata' : 'Unggah & Simpan'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
