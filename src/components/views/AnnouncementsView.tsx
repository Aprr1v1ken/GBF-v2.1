import React, { useState } from 'react';
import { FileText, Plus, Calendar, User, Pin, CheckCircle2, Edit2, Trash2, X, Image as ImageIcon, Upload, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import type { Announcement } from '../../types/index.ts';
import { getWorkspaceAccessToken, createGoogleDoc } from '../../services/workspace.ts';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  onAddAnnouncement: (data: Partial<Announcement>) => Promise<void>;
  onUpdateAnnouncement?: (id: string, data: Partial<Announcement>) => Promise<void>;
  onDeleteAnnouncement?: (id: string) => Promise<void>;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  announcements,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<any>('Warta Ibadah');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('Sekretariat Majelis Jemaat');
  const [imageUrl, setImageUrl] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [saving, setSaving] = useState(false);

  // Google Docs export state
  const [exportingDocId, setExportingDocId] = useState<string | null>(null);
  const [exportedDocLinks, setExportedDocLinks] = useState<Record<string, string>>({});
  const [docNotification, setDocNotification] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingAnnouncement(null);
    setTitle('');
    setCategory('Warta Ibadah');
    setContent('');
    setAuthor('Sekretariat Majelis Jemaat');
    setImageUrl('');
    setIsImportant(false);
    setShowModal(true);
  };

  const openEditModal = (a: Announcement) => {
    setEditingAnnouncement(a);
    setTitle(a.title);
    setCategory(a.category);
    setContent(a.content);
    setAuthor(a.author);
    setImageUrl(a.imageUrl || '');
    setIsImportant(a.isImportant || false);
    setShowModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 800;
        const maxH = 600;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          if (w > h) {
            h = Math.round((h * maxW) / w);
            w = maxW;
          } else {
            w = Math.round((w * maxH) / h);
            h = maxH;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setImageUrl(compressed);
        }
      };
      if (readerEvent.target?.result) {
        img.src = readerEvent.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      if (editingAnnouncement && onUpdateAnnouncement) {
        await onUpdateAnnouncement(editingAnnouncement.id, {
          title,
          category,
          content,
          author,
          imageUrl,
          isImportant,
        });
      } else {
        await onAddAnnouncement({
          title,
          category,
          content,
          author,
          imageUrl,
          isImportant,
        });
      }
      setShowModal(false);
      setEditingAnnouncement(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportToGoogleDoc = async (a: Announcement) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      setDocNotification(
        'Akun Google belum terhubung. Buka menu "Google Workspace" di bilah samping untuk menghubungkan akun Google Anda terlebih dahulu.'
      );
      setTimeout(() => setDocNotification(null), 5000);
      return;
    }

    setExportingDocId(a.id);
    try {
      const doc = await createGoogleDoc(
        token,
        `Warta Jemaat — ${a.title}`,
        `${a.title.toUpperCase()}\nGMIT Betel Fuimelang · Klasis Alor Tengah Utara\nKategori: ${a.category} | Penulis: ${a.author}\nTanggal: ${a.date || new Date().toISOString().substring(0, 10)}\n\n${a.content}`
      );
      setExportedDocLinks((prev) => ({ ...prev, [a.id]: doc.url }));
      setDocNotification(`Warta "${a.title}" berhasil diekspor ke Google Docs!`);
      setTimeout(() => setDocNotification(null), 4500);
    } catch (err: any) {
      setDocNotification(`Gagal mengekspor: ${err?.message || 'Terjadi kesalahan'}`);
      setTimeout(() => setDocNotification(null), 5000);
    } finally {
      setExportingDocId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {docNotification && (
        <div className="p-3.5 rounded-xl bg-blue-950/70 border border-blue-500/40 text-blue-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{docNotification}</span>
          </div>
          <button
            onClick={() => setDocNotification(null)}
            className="text-blue-400 hover:text-white p-1 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 shadow-md">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <span>Penerbitan Warta Jemaat & Informasi Pelayanan</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Publikasi warta mingguan, bakti jumat, kegiatan diakonia, dan dokumentasi foto kegiatan jemaat
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Terbitkan Warta Baru</span>
        </button>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0c1329] border border-dashed border-amber-500/20 space-y-3">
          <FileText className="w-10 h-10 text-amber-400/40 mx-auto" />
          <h3 className="text-base font-bold text-white">Belum Ada Warta Jemaat yang Diterbitkan</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Daftar warta dan pengumuman jemaat saat ini kosong. Anda dapat menambahkan warta baru sekarang atau mengenerate menggunakan Asisten AI Berita & Bakti Jumat.
          </p>
          <button
            onClick={openAddModal}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Terbitkan Warta Baru</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`p-5 rounded-2xl bg-[#0c1329] border transition-all space-y-3 flex flex-col justify-between group overflow-hidden ${
                a.isImportant ? 'border-amber-400/60 shadow-amber-500/10 shadow-lg' : 'border-amber-500/20'
              }`}
            >
              <div>
                {/* Photo Banner if Available */}
                {a.imageUrl && (
                  <div className="w-full h-44 rounded-xl overflow-hidden mb-3 border border-slate-700/60 relative bg-slate-950">
                    <img
                      src={a.imageUrl}
                      alt={a.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] text-amber-300 font-semibold border border-amber-500/30">
                      Foto Dokumentasi
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30 text-[10px]">
                    {a.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[11px] font-mono">{a.date}</span>
                    {onUpdateAnnouncement && (
                      <button
                        onClick={() => openEditModal(a)}
                        className="p-1 text-slate-400 hover:text-amber-300 transition cursor-pointer"
                        title="Edit warta ini"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteAnnouncement && (
                      <button
                        onClick={() => {
                          if (confirm(`Hapus warta "${a.title}"?`)) onDeleteAnnouncement(a.id);
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 transition cursor-pointer"
                        title="Hapus warta ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {a.isImportant && <Pin className="w-4 h-4 text-amber-400 shrink-0" />}
                  <span>{a.title}</span>
                </h3>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-line line-clamp-5">
                  {a.content}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>Oleh: <strong className="text-slate-200">{a.author}</strong></span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[10px]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Warta Publik</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {exportedDocLinks[a.id] ? (
                    <a
                      href={exportedDocLinks[a.id]}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[10px] font-bold flex items-center gap-1 transition"
                    >
                      <span>Buka Google Doc</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <button
                      onClick={() => handleExportToGoogleDoc(a)}
                      disabled={exportingDocId === a.id}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white border border-slate-700 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Salin warta ini ke Google Docs baru"
                    >
                      {exportingDocId === a.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                      ) : (
                        <FileText className="w-3 h-3 text-blue-400" />
                      )}
                      <span>{exportingDocId === a.id ? 'Mengekspor...' : 'Ekspor ke Docs'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Announcement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0b1226] border border-amber-500/30 rounded-3xl shadow-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-amber-300">
                {editingAnnouncement ? 'Edit Warta Jemaat' : 'Terbitkan Warta Jemaat Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Judul Warta *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Aksi Bakti Jumat Pembersihan Halaman Gereja"
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kategori *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                  >
                    <option value="Warta Ibadah">Warta Ibadah</option>
                    <option value="Bakti Jumat & Gotong Royong">Bakti Jumat & Gotong Royong</option>
                    <option value="Diakonia & Kasih">Diakonia & Kasih</option>
                    <option value="Pemuda & Remaja">Pemuda & Remaja</option>
                    <option value="Sekolah Minggu & PAR">Sekolah Minggu & PAR</option>
                    <option value="Pernikahan Gerejawi">Pernikahan Gerejawi</option>
                    <option value="Dukacita / Penghiburan">Dukacita / Penghiburan</option>
                    <option value="Keuangan & Pembangunan">Keuangan & Pembangunan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Penanggung Jawab / Penulis</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Sekretariat Majelis Jemaat"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Isi Berita / Warta Jemaat *</label>
                <textarea
                  required
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tuliskan isi pengumuman atau warta pelayanan jemaat..."
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400 leading-relaxed font-sans"
                />
              </div>

              {/* Activity Image Attachment */}
              <div className="space-y-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span>Foto Dokumentasi Kegiatan (Opsional)</span>
                  </span>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[10px] text-red-400 hover:underline cursor-pointer"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>

                {imageUrl ? (
                  <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-700 relative">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-slate-700 rounded-lg hover:border-amber-400/50 cursor-pointer text-slate-400 hover:text-white transition">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Pilih Foto Kegiatan dari Komputer / HP</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isImportant"
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                />
                <label htmlFor="isImportant" className="text-slate-300 font-semibold cursor-pointer">
                  Tandai sebagai Warta Sangat Penting (Sematkan di Atas)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  {saving ? 'Menyimpan...' : editingAnnouncement ? 'Perbarui Warta' : 'Terbitkan Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
