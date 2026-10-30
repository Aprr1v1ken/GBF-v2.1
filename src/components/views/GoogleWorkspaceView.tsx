import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Presentation,
  CheckSquare,
  ClipboardList,
  Sparkles,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  Check,
  AlertCircle,
  LogOut,
  FolderOpen,
} from 'lucide-react';
import type { Member, FinancialTransaction, Rayon } from '../../types/index.ts';
import {
  initWorkspaceAuth,
  signInWithWorkspace,
  getWorkspaceAccessToken,
  disconnectWorkspace,
  exportMembersToGoogleSheets,
  exportFinanceToGoogleSheets,
  createGoogleDoc,
  listGoogleDocs,
  type GoogleDocFile,
  createGooglePresentation,
  createGoogleForm,
  fetchTaskLists,
  fetchTasks,
  createGoogleTask,
  updateGoogleTaskStatus,
  deleteGoogleTask,
  listUserDriveFiles,
  type ChurchTask,
} from '../../services/workspace.ts';

interface GoogleWorkspaceViewProps {
  members: Member[];
  transactions: FinancialTransaction[];
  rayons: Rayon[];
}

export const GoogleWorkspaceView: React.FC<GoogleWorkspaceViewProps> = ({
  members,
  transactions,
  rayons,
}) => {
  const [token, setToken] = useState<string | null>(getWorkspaceAccessToken());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sheets' | 'docs' | 'slides' | 'forms' | 'tasks' | 'drive'>('sheets');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sheets state
  const [lastSheetUrl, setLastSheetUrl] = useState<string | null>(null);

  // Docs state
  const [docTemplate, setDocTemplate] = useState<'warta' | 'surat' | 'notulen' | 'khotbah'>('warta');
  const [docTitle, setDocTitle] = useState('Draf Warta Jemaat Mingguan GMIT Betel Fuimelang');
  const [docContent, setDocContent] = useState(
    'WARTA JEMAAT GMIT BETEL FUIMELANG\nKlasis Alor Tengah Utara - Nusa Tenggara Timur\n\n1. Ibadah Minggu Pagi pkl 08.00 WITA\n2. Ibadah Rayon 1-4 dilaksanakan Rabu pkl 17.00 WITA\n3. Perjamuan Kudus triwulan bulan depan\n\nPokok Doa Syafaat:\n- Mendoakan warga jemaat yang sakit dan lansia\n- Kehidupan bertani jemaat di Lembur Tengah Alor\n- Damai sejahtera bagi bangsa dan gereja Tuhan.'
  );
  const [lastDocUrl, setLastDocUrl] = useState<string | null>(null);
  const [existingDocs, setExistingDocs] = useState<GoogleDocFile[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Slides state
  const [slideTitle, setSlideTitle] = useState('Liturgi Ibadah Minggu — GMIT Betel Fuimelang');
  const [lastSlideUrl, setLastSlideUrl] = useState<string | null>(null);

  // Forms state
  const [formType, setFormType] = useState<'baptis' | 'sidi' | 'nikah' | 'sensus'>('baptis');
  const [lastFormEditUrl, setLastFormEditUrl] = useState<string | null>(null);
  const [lastFormResponderUrl, setLastFormResponderUrl] = useState<string | null>(null);

  // Tasks state
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [taskDeletingId, setTaskDeletingId] = useState<string | null>(null);

  // Drive state
  const [driveFiles, setDriveFiles] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = initWorkspaceAuth(
      (user, tok) => {
        setToken(tok);
        setUserEmail(user.email);
      },
      () => {
        setToken(null);
        setUserEmail(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await signInWithWorkspace();
      if (res) {
        setToken(res.accessToken);
        setUserEmail(res.user.email);
        setSuccessMsg(`Berhasil terhubung ke akun Google: ${res.user.email}`);
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk dengan akun Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await disconnectWorkspace();
    setToken(null);
    setUserEmail(null);
    setTasks([]);
    setDriveFiles([]);
  };

  // 1. Export Sheets
  const handleExportMembersSheet = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await exportMembersToGoogleSheets(token, members);
      setLastSheetUrl(res.url);
      setSuccessMsg(`Berhasil mengekspor ${members.length} data jemaat ke Google Sheets!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengekspor data ke Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportFinanceSheet = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await exportFinanceToGoogleSheets(token, transactions);
      setLastSheetUrl(res.url);
      setSuccessMsg(`Berhasil mengekspor ${transactions.length} transaksi kas ke Google Sheets!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengekspor kas ke Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Create Doc
  const handleCreateDoc = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await createGoogleDoc(token, docTitle, docContent);
      setLastDocUrl(res.url);
      setSuccessMsg(`Dokumen "${docTitle}" berhasil dibuat di Google Docs!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      loadDocsList();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat dokumen Google Docs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDocTemplate = (type: 'warta' | 'surat' | 'notulen' | 'khotbah') => {
    setDocTemplate(type);
    if (type === 'warta') {
      setDocTitle(`Warta Jemaat GMIT Betel Fuimelang — ${new Date().toISOString().substring(0, 10)}`);
      setDocContent(
        'WARTA JEMAAT GMIT BETEL FUIMELANG\nKlasis Alor Tengah Utara - Nusa Tenggara Timur\n\nI. JADWAL PELAYANAN IBADAH\n1. Ibadah Utama Hari Minggu: Pkl 08.00 WITA di Gedung Kebaktian Betel Fuimelang\n2. Ibadah Pemuda & PAR: Hari Sabtu pkl 16.00 WITA\n3. Ibadah Kaum Bapak & Perempuan: Hari Jumat pkl 17.00 WITA\n4. Ibadah Rumah Tangga Rayon 1 - 4: Hari Rabu pkl 17.00 WITA\n\nII. PEMBERITAHUAN PELAYANAN SAKRAMEN\n- Katekisasi calon Sidi dibuka untuk anak-anak jemaat yang telah berusia 15 tahun ke atas.\n- Pelayanan Baptisan Kudus Anak dilaksanakan pada minggu pertama bulan depan.\n\nIII. POKOK-POKOK DOA SYAFAAT\n1. Mendoakan keselamatan dan kedamaian jemaat di Desa Lembur Tengah Alor.\n2. Para petani jemaat di ladang, sawah, dan kebun kemiri/vanili.\n3. Warga jemaat yang sakit dan lansia agar beroleh pemulihan dari Tuhan Yesus Kristus.'
      );
    } else if (type === 'surat') {
      setDocTitle('Surat Keterangan Keanggotaan Jemaat — GMIT Betel Fuimelang');
      setDocContent(
        'MAJELIS JEMAAT GMIT BETEL FUIMELANG\nKLASIS ALOR TENGAH UTARA\nJl. Raya Fuimelang - Moru, Desa Lembur Tengah, Kec. Alor Tengah Utara, Kab. Alor, NTT\n\nSURAT KETERANGAN KEANGGOTAAN GEREJA\nNomor: ..... / K-ATU / MJBF / 2026\n\nYang bertanda tangan di bawah ini, Majelis Jemaat GMIT Betel Fuimelang, menerangkan dengan sebenarnya bahwa:\n\nNama Lengkap       : .....................................................\nTempat / Tgl Lahir : .....................................................\nJenis Kelamin      : Laki-laki / Perempuan\nStatus Sakramen    : Baptis (Sudah) / Sidi (Sudah) / Nikah (Sudah)\nAlamat Asal        : Rayon ....., Desa Lembur Tengah, Kab. Alor\n\nAdalah benar-benar anggota jemaat GMIT Betel Fuimelang yang terdaftar aktif dalam Buku Induk Registrasi SYSJEGER V2.1 Pro.\n\nDemikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.\n\nFuimelang, .................... 2026\nKetua Majelis Jemaat GMIT Betel Fuimelang,\n\n\n( Pdt. Sonya W. Isu, S.Th )'
      );
    } else if (type === 'notulen') {
      setDocTitle(`Notulen Sidang Majelis Jemaat GMIT Betel Fuimelang — ${new Date().toISOString().substring(0, 10)}`);
      setDocContent(
        'NOTULEN SIDANG MAJELIS JEMAAT GMIT BETEL FUIMELANG\nKlasis Alor Tengah Utara - Nusa Tenggara Timur\n\nHari / Tanggal : ..................................\nWaktu          : Pkl 19.00 - 21.30 WITA\nTempat         : Konsistori Gedung Kebaktian Betel Fuimelang\nPemimpin Sidang: Pdt. Sonya W. Isu, S.Th\nJumlah Hadir   : ..... Orang Presbiter (Penatua, Diaken, Pengajar)\n\nAGENDA SIDANG:\n1. Pembacaan dan evaluasi warta pelayanan sepekan\n2. Laporan pembukuan kas bendahara jemaat\n3. Persiapan pelayanan sakramen perjamuan kudus triwulan\n4. Penataan batas wilayah 4 Rayon dan pemetaan Google Maps\n\nKEPUTUSAN SIDANG:\n1. Menyetujui pelaksanaan perkunjungan pastoral serentak di 4 rayon.\n2. Pembaruan data sensus keluarga berbasis digital SYSJEGER V2.1 Pro.\n\nNotulis Sidang: Dkn. Elisabeth Lopo'
      );
    } else {
      setDocTitle('Draf Khotbah & Renungan Pelayanan — GMIT Betel Fuimelang');
      setDocContent(
        'DRAF KHOTBAH & RENUNGAN PELAYANAN\nGMIT Jemaat Betel Fuimelang — Klasis Alor Tengah Utara\n\nTema Khotbah   : "Setia Menabur dalam Kasih Karunia Tuhan"\nNas Alkitab    : Galatia 6 : 9\nPelayan Firman : Pdt. Sonya W. Isu, S.Th\n\nI. PENDAHULUAN\n- Konteks kehidupan masyarakat agraris jemaat di Lembur Tengah Alor\n- Tantangan musim panen, kekeringan, dan ketabahan iman warga jemaat\n\nII. PENJELASAN TEKS & PESAN UTAMA\n1. Jangan jemu-jemu berbuat baik: konsistensi iman dalam kehidupan bergereja\n2. Waktu menuai pasti tiba sesuai ketetapan Tuhan\n3. Saling menopang antar sesama anggota keluarga dan rayon pelayanan\n\nIII. APLIKASI PRAKTIS UNTUK JEMAAT\n- Menjaga keutuhan persekutuan doa di lingkungan rayon 1-4\n- Pengelolaan berkat Tuhan dengan rasa syukur dan sukacita\n\nIV. KESIMPULAN & DOA PENUTUP'
      );
    }
  };

  const loadDocsList = async () => {
    if (!token) return;
    setLoadingDocs(true);
    try {
      const docs = await listGoogleDocs(token);
      setExistingDocs(docs);
    } catch (err: any) {
      console.warn('Gagal memuat daftar Google Docs:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // 3. Create Slides
  const handleCreateSlides = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const sampleSlides = [
        {
          title: 'Ibadah Minggu Jemaat GMIT Betel Fuimelang',
          subtitle: 'Klasis Alor Tengah Utara - Nusa Tenggara Timur',
          points: ['Selamat Beribadah', 'Tuhan Yesus Memberkati'],
        },
        {
          title: 'Votum & Salam',
          points: [
            'Pertolongan kita adalah dalam nama TUHAN yang menjadikan langit dan bumi.',
            'Kasih karunia dan damai sejahtera menyertai saudara sekalian.',
          ],
        },
        {
          title: 'Pemberitaan Firman Tuhan',
          subtitle: 'Khotbah & Renungan Pastoral',
          points: ['Doa Epiklese', 'Pembacaan Alkitab', 'Renungan & Aplikasi Hidup'],
        },
        {
          title: 'Persembahan Syukur & Warta Jemaat',
          points: ['Pemberian Persembahan', 'Doa Persembahan', 'Warta Pelayanan Sepekan'],
        },
        {
          title: 'Berkat Tuhan & Pengutusan',
          points: ['Tuhan memberkati engkau dan melindungi engkau...', 'Amin, Haleluya!'],
        },
      ];

      const res = await createGooglePresentation(token, slideTitle, sampleSlides);
      setLastSlideUrl(res.url);
      setSuccessMsg(`Presentasi slide proyektor berhasil dibuat di Google Slides!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat Google Slides.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Create Forms
  const handleCreateForm = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      let title = '';
      let desc = '';
      let questions: any[] = [];

      if (formType === 'baptis') {
        title = 'Formulir Pendaftaran Sakramen Baptisan Kudus — GMIT Betel Fuimelang';
        desc = 'Pendaftaran pelayanan Sakramen Baptisan Kudus Anak bagi jemaat GMIT Betel Fuimelang.';
        questions = [
          { title: 'Nama Lengkap Anak', type: 'TEXT', required: true },
          { title: 'Tempat & Tanggal Lahir Anak', type: 'TEXT', required: true },
          { title: 'Nama Ayah Kandung', type: 'TEXT', required: true },
          { title: 'Nama Ibu Kandung', type: 'TEXT', required: true },
          {
            title: 'Rayon Pelayanan',
            type: 'CHOICE',
            options: ['Rayon I', 'Rayon II', 'Rayon III', 'Rayon IV'],
            required: true,
          },
          { title: 'Nomor WhatsApp / HP Orang Tua', type: 'TEXT', required: true },
        ];
      } else if (formType === 'sidi') {
        title = 'Formulir Pendaftaran Katekisasi & Peneguhan Sidi — GMIT Betel Fuimelang';
        desc = 'Pendaftaran peserta katekisasi dan peneguhan sidi jemaat GMIT Betel Fuimelang.';
        questions = [
          { title: 'Nama Lengkap Calon Anggota Sidi', type: 'TEXT', required: true },
          { title: 'Tanggal Lahir', type: 'TEXT', required: true },
          { title: 'Surat Baptis / Gereja Asal Baptis', type: 'TEXT', required: true },
          {
            title: 'Rayon Pelayanan',
            type: 'CHOICE',
            options: ['Rayon I', 'Rayon II', 'Rayon III', 'Rayon IV'],
            required: true,
          },
          { title: 'Nomor WhatsApp / HP', type: 'TEXT', required: true },
        ];
      } else if (formType === 'nikah') {
        title = 'Formulir Permohonan Pemberkatan Pernikahan Kudus — GMIT Betel Fuimelang';
        desc = 'Pendaftaran pemberkatan nikah kudus di gedung gereja GMIT Betel Fuimelang.';
        questions = [
          { title: 'Nama Lengkap Mempelai Pria', type: 'TEXT', required: true },
          { title: 'Nama Lengkap Mempelai Wanita', type: 'TEXT', required: true },
          { title: 'Rencana Tanggal & Jam Pemberkatan', type: 'TEXT', required: true },
          { title: 'Alamat & Kontak Keluarga', type: 'PARAGRAPH', required: true },
        ];
      } else {
        title = 'Sensus Pendaftaran Anggota Jemaat Baru — GMIT Betel Fuimelang';
        desc = 'Pendataan warga jemaat pindahan / anggota keluarga baru GMIT Betel Fuimelang.';
        questions = [
          { title: 'Nama Kepala Keluarga', type: 'TEXT', required: true },
          { title: 'Jumlah Anggota Keluarga (Jiwa)', type: 'TEXT', required: true },
          { title: 'Alamat Lengkap di Desa Lembur Tengah', type: 'PARAGRAPH', required: true },
          {
            title: 'Rayon Pelayanan yang Dituju',
            type: 'CHOICE',
            options: ['Rayon I', 'Rayon II', 'Rayon III', 'Rayon IV'],
            required: true,
          },
          { title: 'Nomor Telepon / WhatsApp', type: 'TEXT', required: true },
        ];
      }

      const res = await createGoogleForm(token, title, desc, questions);
      setLastFormEditUrl(res.editUri);
      setLastFormResponderUrl(res.responderUri);
      setSuccessMsg(`Google Form berhasil dibuat! Siap dibagikan kepada jemaat.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat Google Form.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Tasks management
  const loadGoogleTasks = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchTasks(token);
      setTasks(res.items || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat Google Tasks.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newTaskTitle.trim()) return;
    setLoading(true);
    try {
      await createGoogleTask(token, '@default', {
        title: newTaskTitle.trim(),
        notes: newTaskNotes.trim() || 'Tugas Pelayanan GMIT Betel Fuimelang',
      });
      setNewTaskTitle('');
      setNewTaskNotes('');
      await loadGoogleTasks();
      setSuccessMsg('Tugas pelayanan berhasil ditambahkan ke Google Tasks!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambah tugas.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (task: any) => {
    if (!token) return;
    const isCompleted = task.status === 'completed';
    try {
      await updateGoogleTaskStatus(token, '@default', task.id, !isCompleted);
      await loadGoogleTasks();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah status tugas.');
    }
  };

  const handleDeleteTaskConfirmed = async (taskId: string, title: string) => {
    if (!token) return;
    // Mandatory confirmation for destructive operation
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus tugas pelayanan: "${title}" dari Google Tasks? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    try {
      await deleteGoogleTask(token, '@default', taskId);
      await loadGoogleTasks();
      setSuccessMsg('Tugas berhasil dihapus dari Google Tasks.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus tugas.');
    }
  };

  // 6. Drive files
  const loadDriveFiles = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await listUserDriveFiles(token);
      setDriveFiles(res.files || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membaca berkas Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      if (activeTab === 'tasks') {
        loadGoogleTasks();
      } else if (activeTab === 'drive') {
        loadDriveFiles();
      } else if (activeTab === 'docs') {
        loadDocsList();
      }
    }
  }, [token, activeTab]);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0d1633] via-[#0b122b] to-[#121c3b] border border-sky-500/30 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400" />
                Integrasi Resmi Google Workspace
              </span>
              <span className="text-xs text-slate-400">GMIT BETEL FUIMELANG</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Google Workspace Gerejawi
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Sinkronisasi data jemaat ke Google Sheets, pembuatan dokumen warta & liturgi di Google Docs, slide proyektor ibadah di Google Slides, formulir pendaftaran di Google Forms, dan agenda pelayanan di Google Tasks.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {token ? (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-emerald-500/40">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block leading-none">Terhubung ke Google:</span>
                  <span className="text-xs font-semibold text-emerald-300 font-mono truncate max-w-[180px] block">
                    {userEmail || 'Akun Aktif'}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg cursor-pointer ml-1"
                  title="Putuskan koneksi Google"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md transition cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Hubungkan Google Workspace</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 font-bold px-1 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Workspace Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('sheets')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'sheets'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Google Sheets</span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'docs'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span>Google Docs</span>
        </button>

        <button
          onClick={() => setActiveTab('slides')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'slides'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Presentation className="w-4 h-4 text-amber-400" />
          <span>Google Slides</span>
        </button>

        <button
          onClick={() => setActiveTab('forms')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'forms'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-purple-400" />
          <span>Google Forms</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'tasks'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-indigo-400" />
          <span>Google Tasks</span>
        </button>

        <button
          onClick={() => setActiveTab('drive')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
            activeTab === 'drive'
              ? 'bg-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FolderOpen className="w-4 h-4 text-teal-400" />
          <span>Google Drive</span>
        </button>
      </div>

      {!token && (
        <div className="p-8 rounded-2xl bg-[#0c1329] border border-slate-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Hubungkan Akun Google Anda</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Untuk mengekspor data ke Google Sheets, menyusun dokumen di Google Docs, membuat slide liturgi di Google Slides, formulir Google Forms, dan agenda Google Tasks, silakan hubungkan akun Google Anda dengan aman.
            </p>
          </div>
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md transition cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Masuk dengan Google</span>
          </button>
        </div>
      )}

      {/* 1. SHEETS TAB */}
      {token && activeTab === 'sheets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-[#0c1329] border border-emerald-500/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Ekspor Database Jemaat ke Google Sheets</h3>
                <p className="text-xs text-slate-400">Sinkronkan seluruh data warga jemaat, kategorial & rayon</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <div className="flex justify-between">
                <span>Total Jiwa Terdaftar:</span>
                <span className="font-bold text-emerald-400">{members.length} Jiwa</span>
              </div>
              <div className="flex justify-between">
                <span>Kolom yang diekspor:</span>
                <span className="text-slate-400">No Anggota, Nama, TTL, Rayon, Sakramen, dsb</span>
              </div>
            </div>

            <button
              onClick={handleExportMembersSheet}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              <span>Ekspor Data Jemaat ke Google Sheets</span>
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[#0c1329] border border-emerald-500/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Ekspor Kas Keuangan ke Google Sheets</h3>
                <p className="text-xs text-slate-400">Sinkronkan pembukuan penerimaan & pengeluaran kas gereja</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <div className="flex justify-between">
                <span>Total Transaksi Kas:</span>
                <span className="font-bold text-emerald-400">{transactions.length} Transaksi</span>
              </div>
              <div className="flex justify-between">
                <span>Kolom yang diekspor:</span>
                <span className="text-slate-400">Tanggal, Jenis, Kategori, Nominal, Catatan</span>
              </div>
            </div>

            <button
              onClick={handleExportFinanceSheet}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              <span>Ekspor Buku Kas ke Google Sheets</span>
            </button>
          </div>

          {lastSheetUrl && (
            <div className="md:col-span-2 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-200">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Spreadsheet Google berhasil dibuat dan disinkronkan!</span>
              </div>
              <a
                href={lastSheetUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
              >
                <span>Buka di Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* 2. DOCS TAB */}
      {token && activeTab === 'docs' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0c1329] border border-blue-500/30 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Buat Dokumen Pelayanan Baru di Google Docs</h3>
                  <p className="text-xs text-slate-400">Susun dan sinkronkan dokumen gereja langsung ke Google Docs resmi</p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 text-[11px] font-semibold">
                <Sparkles className="w-3 h-3 text-blue-400" />
                Google Docs API v1
              </span>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Pilih Format / Template Dokumen Gerejawi:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'warta', label: 'Warta Jemaat', desc: 'Jadwal & Doa Syafaat' },
                  { id: 'surat', label: 'Surat Keterangan', desc: 'Keanggotaan & Sakramen' },
                  { id: 'notulen', label: 'Notulen Sidang', desc: 'Keputusan Majelis' },
                  { id: 'khotbah', label: 'Draf Khotbah', desc: 'Bahan Renungan Firman' },
                ].map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectDocTemplate(tmpl.id as any)}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      docTemplate === tmpl.id
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold">{tmpl.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{tmpl.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Dokumen Google Docs</label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Isi Teks Dokumen</label>
              <textarea
                rows={9}
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono focus:outline-none focus:border-blue-400 leading-relaxed"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <button
                onClick={handleCreateDoc}
                disabled={loading}
                className="py-2.5 px-5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                <span>Simpan & Buka di Google Docs</span>
              </button>

              {lastDocUrl && (
                <a
                  href={lastDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-bold transition"
                >
                  <span>Buka Dokumen Terakhir di Google Docs</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* List of Existing Google Docs in User's Google Drive */}
          <div className="p-6 rounded-2xl bg-[#0c1329] border border-blue-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Berkas Google Docs di Akun Anda ({existingDocs.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={loadDocsList}
                disabled={loadingDocs}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 text-xs"
                title="Segarkan daftar dokumen Google Docs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? 'animate-spin' : ''}`} />
                <span className="text-[11px] hidden sm:inline">Segarkan</span>
              </button>
            </div>

            {loadingDocs ? (
              <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Memuat dokumen dari Google Drive...</span>
              </div>
            ) : existingDocs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Belum ada berkas Google Docs yang ditemukan di akun Anda. Gunakan form di atas untuk membuat dokumen pertama.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {existingDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 transition flex items-start justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 group-hover:text-blue-300 transition-colors truncate">
                          {doc.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {doc.modifiedTime ? `Diperbarui: ${new Date(doc.modifiedTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Google Doc'}
                        </p>
                      </div>
                    </div>

                    <a
                      href={doc.webViewLink || `https://docs.google.com/document/d/${doc.id}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-semibold flex items-center gap-1 shrink-0 transition"
                    >
                      <span>Buka</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SLIDES TAB */}
      {token && activeTab === 'slides' && (
        <div className="p-6 rounded-2xl bg-[#0c1329] border border-amber-500/30 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Presentation className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Generate Slide Proyektor Ibadah di Google Slides</h3>
              <p className="text-xs text-slate-400">Buat slide presentasi LCD resmi tata ibadah GMIT Betel Fuimelang</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Presentasi</label>
            <input
              type="text"
              value={slideTitle}
              onChange={(e) => setSlideTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2">
            <span className="font-semibold text-amber-300">Struktur Slide Otomatis:</span>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Slide 1: Pembuka & Ucapan Selamat Datang Ibadah Minggu</li>
              <li>Slide 2: Votum & Salam Presbiter</li>
              <li>Slide 3: Pembacaan Firman & Khotbah Pelayan</li>
              <li>Slide 4: Persembahan Syukur & Warta Jemaat</li>
              <li>Slide 5: Berkat Tuhan & Pengutusan Jemaat</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleCreateSlides}
              disabled={loading}
              className="py-2.5 px-5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
              <span>Buat Slide di Google Slides</span>
            </button>

            {lastSlideUrl && (
              <a
                href={lastSlideUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition"
              >
                <span>Buka di Google Slides</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* 4. FORMS TAB */}
      {token && activeTab === 'forms' && (
        <div className="p-6 rounded-2xl bg-[#0c1329] border border-purple-500/30 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Buat Formulir Online di Google Forms</h3>
              <p className="text-xs text-slate-400">Buat formulir pendaftaran jemaat yang bisa dibagikan langsung ke WhatsApp</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Pilih Jenis Formulir Pelayanan</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'baptis', title: 'Pendaftaran Baptisan Kudus', desc: 'Nama anak, orang tua, rayon & kontak' },
                { id: 'sidi', title: 'Pendaftaran Katekisasi & Sidi', desc: 'Nama calon, asal gereja baptis & rayon' },
                { id: 'nikah', title: 'Pemberkatan Nikah Kudus', desc: 'Nama kedua mempelai & jadwal' },
                { id: 'sensus', title: 'Sensus Anggota / Keluarga Baru', desc: 'Data jemaat baru di Lembur Tengah' },
              ].map((f) => (
                <div
                  key={f.id}
                  onClick={() => setFormType(f.id as any)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    formType === f.id
                      ? 'bg-purple-950/40 border-purple-500 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-200">{f.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={handleCreateForm}
              disabled={loading}
              className="py-2.5 px-5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
              <span>Buat Formulir di Google Forms</span>
            </button>

            {lastFormEditUrl && (
              <div className="flex items-center gap-2">
                <a
                  href={lastFormResponderUrl || lastFormEditUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >
                  <span>Link Isi Formulir Jemaat</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href={lastFormEditUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition"
                >
                  <span>Edit Pertanyaan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TASKS TAB */}
      {token && activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleCreateTask} className="p-5 rounded-2xl bg-[#0c1329] border border-indigo-500/30 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Tambah Tugas Pelayanan di Google Tasks</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Agenda / Tugas</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Contoh: Kunjungan pastoral Rayon 2"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={3}
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  placeholder="Keluarga Bapak ..., jam 17.00 WITA"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Simpan ke Google Tasks</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7">
            <div className="p-5 rounded-2xl bg-[#0c1329] border border-indigo-500/30 min-h-[380px] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                    <span>Daftar Tugas Pelayanan Aktif (Google Tasks)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Tersinkronisasi otomatis dengan aplikasi Google Tasks di HP Anda</p>
                </div>
                <button
                  onClick={loadGoogleTasks}
                  disabled={loading}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="Segarkan daftar"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto max-h-[420px]">
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
                    <CheckSquare className="w-10 h-10 text-slate-700 mb-2 stroke-[1.5]" />
                    <p className="text-xs">Belum ada tugas pelayanan di Google Tasks</p>
                  </div>
                ) : (
                  tasks.map((t) => {
                    const isDone = t.status === 'completed';
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition ${
                          isDone
                            ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => handleToggleTask(t)}
                            className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p
                              className={`text-xs font-semibold text-slate-200 truncate ${
                                isDone ? 'line-through text-slate-400' : ''
                              }`}
                            >
                              {t.title}
                            </p>
                            {t.notes && <p className="text-[11px] text-slate-400 mt-0.5">{t.notes}</p>}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteTaskConfirmed(t.id, t.title)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded transition cursor-pointer shrink-0"
                          title="Hapus tugas dari Google Tasks"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. DRIVE TAB */}
      {token && activeTab === 'drive' && (
        <div className="p-6 rounded-2xl bg-[#0c1329] border border-teal-500/30 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Berkas Pelayanan di Google Drive</h3>
                <p className="text-xs text-slate-400">Berkas spreadsheet, dokumen, dan presentasi milik Anda di Google Drive</p>
              </div>
            </div>
            <button
              onClick={loadDriveFiles}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Segarkan daftar berkas"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {driveFiles.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p className="text-xs">Tidak ditemukan berkas atau memuat data...</p>
              </div>
            ) : (
              driveFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{file.mimeType}</p>
                  </div>
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold transition"
                    >
                      <span>Buka</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
