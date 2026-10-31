import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Heart,
  ClipboardList,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Send,
  RefreshCw,
  Share2,
  Calendar,
  User,
  Users,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  FileText,
  Clock,
  Printer,
  ChevronRight,
} from 'lucide-react';
import type { Rayon, ServiceRegistration } from '../types/index.ts';
import {
  getWorkspaceAccessToken,
  createGoogleForm,
  fetchFormResponses,
} from '../services/workspace.ts';
import {
  fetchServiceRegistrationsApi,
  submitServiceRegistrationApi,
  updateServiceRegistrationStatusApi,
  deleteServiceRegistrationApi,
  createBaptismApi,
  createMarriageApi,
} from '../services/api.ts';
import { getWhatsAppShareUrl } from '../utils/whatsapp-warta.ts';

interface OnlineServiceFormsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'baptis' | 'nikah' | 'queue';
  rayons?: Rayon[];
  onRefreshSacraments?: () => void;
}

export const OnlineServiceFormsModal: React.FC<OnlineServiceFormsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'baptis',
  rayons = [],
  onRefreshSacraments,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'baptis' | 'nikah' | 'queue'>(initialTab);
  const [subMode, setSubMode] = useState<'direct' | 'google_form'>('direct');

  // Google Workspace Token
  const token = getWorkspaceAccessToken();

  // Feedback notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // ==========================================
  // Form State: Baptisan Kudus
  // ==========================================
  const [baptisChildName, setBaptisChildName] = useState('');
  const [baptisBirthPlace, setBaptisBirthPlace] = useState('Fuimelang');
  const [baptisBirthDate, setBaptisBirthDate] = useState('');
  const [baptisGender, setBaptisGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [baptisFatherName, setBaptisFatherName] = useState('');
  const [baptisMotherName, setBaptisMotherName] = useState('');
  const [baptisFamilyCardNo, setBaptisFamilyCardNo] = useState('');
  const [baptisAddress, setBaptisAddress] = useState('Desa Lembur Tengah, Alor Tengah Utara');
  const [baptisRayon, setBaptisRayon] = useState(rayons[0]?.name || 'Rayon I');
  const [baptisParentPhone, setBaptisParentPhone] = useState('');
  const [baptisWitnesses, setBaptisWitnesses] = useState('');
  const [baptisNotes, setBaptisNotes] = useState('');
  const [baptisSubmitting, setBaptisSubmitting] = useState(false);

  // ==========================================
  // Form State: Pernikahan Kudus
  // ==========================================
  const [groomName, setGroomName] = useState('');
  const [groomBirthPlace, setGroomBirthPlace] = useState('');
  const [groomBirthDate, setGroomBirthDate] = useState('');
  const [groomChurch, setGroomChurch] = useState('GMIT Betel Fuimelang');
  const [groomParents, setGroomParents] = useState('');
  const [groomPhone, setGroomPhone] = useState('');

  const [brideName, setBrideName] = useState('');
  const [brideBirthPlace, setBrideBirthPlace] = useState('');
  const [brideBirthDate, setBrideBirthDate] = useState('');
  const [brideChurch, setBrideChurch] = useState('GMIT Betel Fuimelang');
  const [brideParents, setBrideParents] = useState('');
  const [bridePhone, setBridePhone] = useState('');

  const [marriageDate, setMarriageDate] = useState('');
  const [marriagePlace, setMarriagePlace] = useState('Gedung Gereja GMIT Betel Fuimelang');
  const [marriageWitnesses, setMarriageWitnesses] = useState('');
  const [marriageNotes, setMarriageNotes] = useState('');
  const [marriageSubmitting, setMarriageSubmitting] = useState(false);

  // ==========================================
  // Google Forms API State
  // ==========================================
  const [generatingGForm, setGeneratingGForm] = useState(false);
  const [googleForms, setGoogleForms] = useState<Record<string, { formId: string; responderUri: string; editUri: string; title: string }>>(() => {
    try {
      const saved = localStorage.getItem('gmit_service_google_forms');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [fetchingGFormResponses, setFetchingGFormResponses] = useState(false);

  // ==========================================
  // Queue / Submissions Management State
  // ==========================================
  const [registrations, setRegistrations] = useState<ServiceRegistration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [selectedReg, setSelectedReg] = useState<ServiceRegistration | null>(null);

  const loadRegistrations = async () => {
    setLoadingRegistrations(true);
    try {
      const res = await fetchServiceRegistrationsApi();
      if (res?.success && res.registrations) {
        setRegistrations(res.registrations);
      }
    } catch (err: any) {
      console.error('Failed to load registrations', err);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  // Save created Google Form references to localStorage
  const saveGoogleFormReference = (type: string, data: any) => {
    const updated = { ...googleForms, [type]: data };
    setGoogleForms(updated);
    try {
      localStorage.setItem('gmit_service_google_forms', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // 1. Submit Direct Online Baptism Registration
  const handleSubmitBaptism = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baptisChildName.trim() || !baptisFatherName.trim() || !baptisMotherName.trim()) {
      showToast('Harap lengkapi nama calon baptis dan nama kedua orang tua.', 'error');
      return;
    }

    setBaptisSubmitting(true);
    try {
      const res = await submitServiceRegistrationApi({
        serviceType: 'baptis',
        applicantName: baptisChildName.trim(),
        applicantPhone: baptisParentPhone.trim(),
        details: {
          childName: baptisChildName.trim(),
          birthPlace: baptisBirthPlace.trim(),
          birthDate: baptisBirthDate,
          gender: baptisGender,
          fatherName: baptisFatherName.trim(),
          motherName: baptisMotherName.trim(),
          familyCardNo: baptisFamilyCardNo.trim(),
          address: baptisAddress.trim(),
          rayon: baptisRayon,
          parentPhone: baptisParentPhone.trim(),
          witnesses: baptisWitnesses.trim(),
          notes: baptisNotes.trim(),
        },
      });

      if (res?.success) {
        showToast('Pendaftaran Baptisan Kudus berhasil diajukan! Sekretariat Majelis akan segera memverifikasi.', 'success');
        // Reset form
        setBaptisChildName('');
        setBaptisBirthDate('');
        setBaptisFatherName('');
        setBaptisMotherName('');
        setBaptisWitnesses('');
        setBaptisNotes('');
        await loadRegistrations();
        setActiveTab('queue');
      } else {
        showToast(res?.message || 'Gagal mengajukan pendaftaran.', 'error');
      }
    } catch (err: any) {
      showToast(`Gagal mengajukan: ${err?.message}`, 'error');
    } finally {
      setBaptisSubmitting(false);
    }
  };

  // 2. Submit Direct Online Marriage Registration
  const handleSubmitMarriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groomName.trim() || !brideName.trim() || !marriageDate) {
      showToast('Harap lengkapi nama kedua calon mempelai dan rencana tanggal pernikahan.', 'error');
      return;
    }

    setMarriageSubmitting(true);
    try {
      const res = await submitServiceRegistrationApi({
        serviceType: 'nikah',
        applicantName: `${groomName.trim()} & ${brideName.trim()}`,
        applicantPhone: groomPhone.trim() || bridePhone.trim(),
        details: {
          groomName: groomName.trim(),
          groomBirthPlace: groomBirthPlace.trim(),
          groomBirthDate,
          groomChurch: groomChurch.trim(),
          groomParents: groomParents.trim(),
          groomPhone: groomPhone.trim(),

          brideName: brideName.trim(),
          brideBirthPlace: brideBirthPlace.trim(),
          brideBirthDate,
          brideChurch: brideChurch.trim(),
          brideParents: brideParents.trim(),
          bridePhone: bridePhone.trim(),

          marriageDate,
          marriagePlace: marriagePlace.trim(),
          witnesses: marriageWitnesses.trim(),
          notes: marriageNotes.trim(),
        },
      });

      if (res?.success) {
        showToast('Pendaftaran Pernikahan Gerejawi berhasil diajukan! Sekretariat Majelis akan segera memproses berkas.', 'success');
        // Reset form
        setGroomName('');
        setGroomParents('');
        setGroomPhone('');
        setBrideName('');
        setBrideParents('');
        setBridePhone('');
        setMarriageWitnesses('');
        setMarriageNotes('');
        await loadRegistrations();
        setActiveTab('queue');
      } else {
        showToast(res?.message || 'Gagal mengajukan pendaftaran.', 'error');
      }
    } catch (err: any) {
      showToast(`Gagal mengajukan: ${err?.message}`, 'error');
    } finally {
      setMarriageSubmitting(false);
    }
  };

  // 3. Create Google Form via Google Forms API
  const handleGenerateGoogleForm = async (type: 'baptis' | 'nikah') => {
    if (!token) {
      showToast('Koneksi Google Workspace diperlukan untuk membuat Google Form. Hubungkan akun di menu Google Workspace.', 'error');
      return;
    }

    setGeneratingGForm(true);
    try {
      if (type === 'baptis') {
        const formResult = await createGoogleForm(
          token,
          'Pendaftaran Sakramen Baptisan Kudus — GMIT Betel Fuimelang',
          'Formulir pendaftaran resmi Sakramen Baptisan Kudus bagi anak/anggota jemaat GMIT Betel Fuimelang, Klasis Alor Tengah Utara. Mohon isi data sesuai Akta Kelahiran dan Kartu Keluarga.',
          [
            { title: 'Nama Lengkap Calon Baptis (Sesuai Akta Kelahiran)', type: 'TEXT', required: true },
            { title: 'Tempat & Tanggal Lahir Calon Baptis', type: 'TEXT', required: true },
            { title: 'Jenis Kelamin', type: 'CHOICE', options: ['Laki-laki', 'Perempuan'], required: true },
            { title: 'Nama Lengkap Ayah Kandung', type: 'TEXT', required: true },
            { title: 'Nama Lengkap Ibu Kandung', type: 'TEXT', required: true },
            { title: 'Nomor Kartu Keluarga (KK) & Alamat Rumah', type: 'TEXT', required: true },
            {
              title: 'Rayon Pelayanan GMIT Betel Fuimelang',
              type: 'CHOICE',
              options: ['Rayon I', 'Rayon II', 'Rayon III', 'Rayon IV', 'Warga Jemaat Tamu / Pindahan'],
              required: true,
            },
            { title: 'Nomor WhatsApp / HP Orang Tua yang Dapat Dihubungi', type: 'TEXT', required: true },
            { title: 'Nama Saksi-saksi Baptis', type: 'PARAGRAPH', required: false },
            { title: 'Catatan Khusus / Permohonan Jadwal Khusus', type: 'PARAGRAPH', required: false },
          ]
        );
        saveGoogleFormReference('baptis', formResult);
        showToast('Google Form Pendaftaran Baptisan Kudus berhasil dibuat secara otomatis!', 'success');
      } else {
        const formResult = await createGoogleForm(
          token,
          'Pendaftaran Pemberkatan Pernikahan Kudus — GMIT Betel Fuimelang',
          'Formulir pendaftaran pemberkatan nikah gerejawi jemaat GMIT Betel Fuimelang, Klasis Alor Tengah Utara. Mohon isi identitas kedua calon mempelai dengan lengkap dan benar.',
          [
            { title: 'Nama Lengkap Calon Mempelai Pria', type: 'TEXT', required: true },
            { title: 'Tempat, Tanggal Lahir & Pekerjaan Calon Mempelai Pria', type: 'TEXT', required: true },
            { title: 'Asal Gereja / Rayon Calon Mempelai Pria', type: 'TEXT', required: true },
            { title: 'Nama Orang Tua Calon Mempelai Pria', type: 'TEXT', required: true },
            { title: 'Nomor WhatsApp / HP Calon Mempelai Pria', type: 'TEXT', required: true },
            { title: 'Nama Lengkap Calon Mempelai Wanita', type: 'TEXT', required: true },
            { title: 'Tempat, Tanggal Lahir & Pekerjaan Calon Mempelai Wanita', type: 'TEXT', required: true },
            { title: 'Asal Gereja / Rayon Calon Mempelai Wanita', type: 'TEXT', required: true },
            { title: 'Nama Orang Tua Calon Mempelai Wanita', type: 'TEXT', required: true },
            { title: 'Nomor WhatsApp / HP Calon Mempelai Wanita', type: 'TEXT', required: true },
            { title: 'Rencana Tanggal & Jam Pemberkatan Nikah yang Dimohonkan', type: 'TEXT', required: true },
            { title: 'Nama Saksi Pernikahan (Minimal 2 Orang)', type: 'PARAGRAPH', required: true },
            { title: 'Catatan Khusus / Catatan Pastoral Tambahan', type: 'PARAGRAPH', required: false },
          ]
        );
        saveGoogleFormReference('nikah', formResult);
        showToast('Google Form Pendaftaran Pernikahan Kudus berhasil dibuat secara otomatis!', 'success');
      }
    } catch (err: any) {
      showToast(`Gagal membuat Google Form: ${err?.message}`, 'error');
    } finally {
      setGeneratingGForm(false);
    }
  };

  // 4. Pull live responses from Google Forms into system
  const handlePullGoogleFormResponses = async (type: 'baptis' | 'nikah') => {
    const formMeta = googleForms[type];
    if (!formMeta || !formMeta.formId) {
      showToast('Google Form untuk jenis ini belum dibuat. Klik tombol Buat Form terlebih dahulu.', 'error');
      return;
    }
    if (!token) {
      showToast('Koneksi Google Workspace diperlukan.', 'error');
      return;
    }

    setFetchingGFormResponses(true);
    try {
      const data = await fetchFormResponses(token, formMeta.formId);
      const responsesList = data.responses || [];

      if (responsesList.length === 0) {
        showToast('Belum ada respon yang diisi oleh jemaat pada Google Form ini.', 'info');
      } else {
        let importedCount = 0;
        for (const r of responsesList) {
          // Extract answers map
          const answers: Record<string, string> = {};
          if (r.answers) {
            Object.keys(r.answers).forEach((qId) => {
              const ansObj = r.answers[qId];
              const textVal = ansObj.textAnswers?.answers?.[0]?.value || '';
              answers[qId] = textVal;
            });
          }

          // Check if already imported
          const alreadyExists = registrations.some((reg) => reg.googleFormResponseId === r.responseId);
          if (!alreadyExists) {
            const firstValues = Object.values(answers);
            const applicantName = firstValues[0] || 'Respon Google Form';
            const applicantPhone = firstValues.find((v) => /\d{8,}/.test(v)) || '';

            await submitServiceRegistrationApi({
              serviceType: type,
              applicantName,
              applicantPhone,
              details: {
                googleFormId: formMeta.formId,
                rawAnswers: answers,
                submittedAt: r.createTime || r.lastSubmittedTime,
              },
              googleFormResponseId: r.responseId,
            });
            importedCount++;
          }
        }

        await loadRegistrations();
        showToast(`Berhasil menarik respon! ${importedCount} pendaftaran baru disinkronkan ke database antrean.`, 'success');
        setActiveTab('queue');
      }
    } catch (err: any) {
      showToast(`Gagal menarik respon: ${err?.message}`, 'error');
    } finally {
      setFetchingGFormResponses(false);
    }
  };

  // 5. Approve & Automatically Insert into Official Church Sacrament Database
  const handleApproveRegistration = async (reg: ServiceRegistration) => {
    const confirmed = window.confirm(
      `Setujui pendaftaran ${reg.serviceType === 'baptis' ? 'Baptisan' : 'Pernikahan'} untuk "${reg.applicantName}" dan masukkan langsung ke Buku Registrasi Sakramen resmi?`
    );
    if (!confirmed) return;

    try {
      if (reg.serviceType === 'baptis') {
        const d = reg.details || {};
        await createBaptismApi({
          registerNo: 'BAP-' + Date.now().toString().slice(-6),
          memberId: '',
          memberName: d.childName || reg.applicantName,
          birthDate: d.birthDate || '',
          parentNames: `${d.fatherName || ''} & ${d.motherName || ''}`,
          baptismDate: new Date().toISOString().substring(0, 10),
          churchPlace: 'Gedung Gereja GMIT Betel Fuimelang',
          ministerName: 'Pdt. Sonya W. Isu, S.Th',
          certificateNo: 'SURAT-BAP-' + Date.now().toString().slice(-5),
          witnesses: d.witnesses || '',
          notes: `Didaftarkan mandiri via Form Online. Alamat: ${d.address || '-'}, Rayon: ${d.rayon || '-'}`,
        });
      } else if (reg.serviceType === 'nikah') {
        const d = reg.details || {};
        await createMarriageApi({
          registerNo: 'NIK-' + Date.now().toString().slice(-6),
          groomName: d.groomName || reg.applicantName.split('&')[0]?.trim(),
          brideName: d.brideName || reg.applicantName.split('&')[1]?.trim(),
          blessingDate: d.marriageDate || new Date().toISOString().substring(0, 10),
          churchPlace: d.marriagePlace || 'Gedung Gereja GMIT Betel Fuimelang',
          ministerName: 'Pdt. Sonya W. Isu, S.Th',
          certificateNo: 'SURAT-NIK-' + Date.now().toString().slice(-5),
          witnessNames: d.witnesses || '',
          notes: `Didaftarkan mandiri via Form Online. Kontak: ${reg.applicantPhone || '-'}`,
        });
      }

      await updateServiceRegistrationStatusApi(reg.id, 'Disetujui', 'Telah diverifikasi dan dimasukkan ke buku registrasi sakramen resmi.');
      await loadRegistrations();
      if (onRefreshSacraments) onRefreshSacraments();
      showToast(`Pendaftaran "${reg.applicantName}" berhasil disetujui dan dicatat ke buku sakramen resmi!`, 'success');
    } catch (err: any) {
      showToast(`Gagal menyetujui: ${err?.message}`, 'error');
    }
  };

  // 6. Share Form Link to WhatsApp
  const handleShareFormWhatsApp = (type: 'baptis' | 'nikah') => {
    const meta = googleForms[type];
    if (!meta || !meta.responderUri) {
      showToast('Formulir Google belum dibuat.', 'error');
      return;
    }
    const text = `*GMIT BETEL FUIMELANG · KLASIS ALOR TENGAH UTARA*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 *PENDAFTARAN ${type === 'baptis' ? 'SAKRAMEN BAPTISAN KUDUS' : 'PEMBERKATAN NIKAH KUDUS'} ONLINE*\n\nShalom Bapak/Ibu/Saudara-i warga jemaat,\nBagi anggota jemaat yang berkerinduan mendaftarkan ${type === 'baptis' ? 'anak untuk dibaptis' : 'pemberkatan pernikahan gerejawi'}, silakan mengisi formulir resmi secara mandiri melalui tautan Google Form berikut:\n\n🔗 *Link Pendaftaran:* ${meta.responderUri}\n\nSetelah mengisi, data Anda akan langsung masuk ke Sekretariat Majelis Jemaat untuk verifikasi pastoral.\n\nTuhan Yesus Memberkati Kita Sekalian. 🙏`;
    const waUrl = getWhatsAppShareUrl(text);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#0b1226] border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-950/80 via-[#0a1e2b] to-[#0c1329] border-b border-cyan-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Form Pelayanan Online Jemaat</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Google Forms API
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Memudahkan jemaat mendaftarkan Sakramen Baptisan Kudus & Pernikahan secara mandiri
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Tutup form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`mx-4 mt-3 p-3 rounded-xl border text-xs flex items-center justify-between shadow-lg animate-in fade-in ${
              toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-red-950/80 border-red-500/50 text-red-200'
                : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="p-1 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Main Tab Controls */}
        <div className="p-3 bg-[#070c1a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('baptis')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'baptis'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>1. Pendaftaran Baptisan Kudus</span>
            </button>

            <button
              onClick={() => setActiveTab('nikah')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'nikah'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>2. Pendaftaran Pernikahan Kudus</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer relative ${
                activeTab === 'queue'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>3. Antrean Pendaftaran Masuk</span>
              {registrations.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-900 text-amber-300 ml-1">
                  {registrations.length}
                </span>
              )}
            </button>
          </div>

          {activeTab !== 'queue' && (
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setSubMode('direct')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  subMode === 'direct' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Isi Langsung di Aplikasi
              </button>
              <button
                type="button"
                onClick={() => setSubMode('google_form')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                  subMode === 'google_form' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ClipboardList className="w-3 h-3" />
                <span>Google Forms API</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: BAPTISAN KUDUS */}
          {activeTab === 'baptis' && (
            <div>
              {subMode === 'direct' ? (
                <form onSubmit={handleSubmitBaptism} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200">
                    <p className="font-semibold flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <span>Formulir Pendaftaran Sakramen Baptisan Kudus (Anak / Dewasa)</span>
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Data ini akan langsung terkirim ke Sekretariat Majelis Jemaat untuk verifikasi dan penjadwalan kebaktian sakramen.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nama Lengkap Calon Baptis *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Samuel Daniel Banamtuan"
                        value={baptisChildName}
                        onChange={(e) => setBaptisChildName(e.target.value)}
                        className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Jenis Kelamin *</label>
                      <div className="flex gap-4 pt-1 text-xs text-slate-300">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="baptisGender"
                            checked={baptisGender === 'Laki-laki'}
                            onChange={() => setBaptisGender('Laki-laki')}
                            className="text-cyan-500"
                          />
                          <span>Laki-laki</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="baptisGender"
                            checked={baptisGender === 'Perempuan'}
                            onChange={() => setBaptisGender('Perempuan')}
                            className="text-cyan-500"
                          />
                          <span>Perempuan</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Tempat Lahir</label>
                      <input
                        type="text"
                        value={baptisBirthPlace}
                        onChange={(e) => setBaptisBirthPlace(e.target.value)}
                        className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Tanggal Lahir *</label>
                      <input
                        type="date"
                        required
                        value={baptisBirthDate}
                        onChange={(e) => setBaptisBirthDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nama Ayah Kandung *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Yulius Banamtuan"
                        value={baptisFatherName}
                        onChange={(e) => setBaptisFatherName(e.target.value)}
                        className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nama Ibu Kandung *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Maria Banamtuan-Kase"
                        value={baptisMotherName}
                        onChange={(e) => setBaptisMotherName(e.target.value)}
                        className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Rayon Pelayanan GMIT Betel Fuimelang
                      </label>
                      <select
                        value={baptisRayon}
                        onChange={(e) => setBaptisRayon(e.target.value)}
                        className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        {rayons.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name} {r.coverageArea ? `(${r.coverageArea})` : ''}
                          </option>
                        ))}
                        <option value="Rayon I">Rayon I</option>
                        <option value="Rayon II">Rayon II</option>
                        <option value="Rayon III">Rayon III</option>
                        <option value="Rayon IV">Rayon IV</option>
                        <option value="Warga Tamu / Titipan">Warga Tamu / Titipan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        No. WhatsApp / HP Orang Tua *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 082144556677"
                        value={baptisParentPhone}
                        onChange={(e) => setBaptisParentPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Saksi-saksi Baptisan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Pnt. Soleman Malaikosa & Dkn. Elisabeth Lopo"
                      value={baptisWitnesses}
                      onChange={(e) => setBaptisWitnesses(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Catatan Tambahan / Alamat
                    </label>
                    <textarea
                      rows={2}
                      value={baptisAddress}
                      onChange={(e) => setBaptisAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={baptisSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition cursor-pointer disabled:opacity-60"
                    >
                      {baptisSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Kirim Pendaftaran Baptisan Kudus</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Google Forms API Mode */
                <div className="p-6 rounded-2xl bg-slate-900/70 border border-purple-500/30 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-purple-400" />
                        <span>Integrasi Google Forms API — Pendaftaran Baptisan Kudus</span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                        Buat formulir resmi yang langsung terhubung ke akun Google Drive gereja, bagikan link form ke WhatsApp jemaat, dan tarik otomatis respon formulir yang telah diisi warga jemaat.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGenerateGoogleForm('baptis')}
                      disabled={generatingGForm}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md cursor-pointer shrink-0 disabled:opacity-60"
                    >
                      {generatingGForm ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>Generate Google Form</span>
                    </button>
                  </div>

                  {googleForms['baptis'] ? (
                    <div className="p-4 rounded-xl bg-[#050811] border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Google Form Aktif</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          ID: {googleForms['baptis'].formId}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 text-xs font-mono text-slate-300 truncate">
                        {googleForms['baptis'].responderUri}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <a
                          href={googleForms['baptis'].responderUri}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <span>Buka Form (Tampilan Jemaat)</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <a
                          href={googleForms['baptis'].editUri}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <span>Edit Pertanyaan di Google</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(googleForms['baptis'].responderUri);
                            showToast('Tautan Google Form berhasil disalin ke clipboard!', 'success');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Link</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareFormWhatsApp('baptis')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Bagikan ke WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePullGoogleFormResponses('baptis')}
                          disabled={fetchingGFormResponses}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer ml-auto"
                        >
                          {fetchingGFormResponses ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          <span>Tarik Respon dari Google Form</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center rounded-xl bg-[#050811] border border-dashed border-slate-800 text-xs text-slate-400">
                      Belum ada Google Form Baptisan yang digenerate. Klik tombol "Generate Google Form" di atas untuk membuat form resmi otomatis.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PERNIKAHAN KUDUS */}
          {activeTab === 'nikah' && (
            <div>
              {subMode === 'direct' ? (
                <form onSubmit={handleSubmitMarriage} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-200">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-emerald-400" />
                      <span>Formulir Pendaftaran Pemberkatan Pernikahan Kudus</span>
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Isi data kedua calon mempelai untuk pendaftaran pastoral pra-nikah dan pencatatan buku registrasi nikah gerejawi.
                    </p>
                  </div>

                  {/* Mempelai Pria */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      <span>Data Calon Mempelai Pria</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Nama Lengkap Pria *</label>
                        <input
                          type="text"
                          required
                          value={groomName}
                          onChange={(e) => setGroomName(e.target.value)}
                          placeholder="Contoh: Johanis Lopo"
                          className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Asal Gereja / Rayon</label>
                        <input
                          type="text"
                          value={groomChurch}
                          onChange={(e) => setGroomChurch(e.target.value)}
                          className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Nama Orang Tua Pria</label>
                        <input
                          type="text"
                          value={groomParents}
                          onChange={(e) => setGroomParents(e.target.value)}
                          placeholder="Ayah & Ibu"
                          className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">No. WhatsApp Pria *</label>
                        <input
                          type="text"
                          required
                          value={groomPhone}
                          onChange={(e) => setGroomPhone(e.target.value)}
                          placeholder="082144556677"
                          className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-400 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mempelai Wanita */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      <span>Data Calon Mempelai Wanita</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Nama Lengkap Wanita *</label>
                        <input
                          type="text"
                          required
                          value={brideName}
                          onChange={(e) => setBrideName(e.target.value)}
                          placeholder="Contoh: Sarah Lopo-Mone"
                          className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Asal Gereja / Rayon</label>
                        <input
                          type="text"
                          value={brideChurch}
                          onChange={(e) => setBrideChurch(e.target.value)}
                          className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Nama Orang Tua Wanita</label>
                        <input
                          type="text"
                          value={brideParents}
                          onChange={(e) => setBrideParents(e.target.value)}
                          placeholder="Ayah & Ibu"
                          className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">No. WhatsApp Wanita</label>
                        <input
                          type="text"
                          value={bridePhone}
                          onChange={(e) => setBridePhone(e.target.value)}
                          placeholder="081234567890"
                          className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-400 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acara & Saksi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Rencana Tanggal Pemberkatan Nikah *
                      </label>
                      <input
                        type="date"
                        required
                        value={marriageDate}
                        onChange={(e) => setMarriageDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Lokasi Gedung Gereja</label>
                      <input
                        type="text"
                        value={marriagePlace}
                        onChange={(e) => setMarriagePlace(e.target.value)}
                        className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Saksi-saksi Pernikahan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Pnt. Simon Malaipada & Dkn. Soleman Malaikosa"
                      value={marriageWitnesses}
                      onChange={(e) => setMarriageWitnesses(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={marriageSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition cursor-pointer disabled:opacity-60"
                    >
                      {marriageSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Kirim Pendaftaran Pernikahan Kudus</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Google Forms API Mode for Marriage */
                <div className="p-6 rounded-2xl bg-slate-900/70 border border-purple-500/30 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-purple-400" />
                        <span>Integrasi Google Forms API — Pendaftaran Pernikahan Kudus</span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                        Buat formulir resmi pendaftaran nikah gerejawi di Google Forms, bagikan link kepada calon mempelai, dan tarik data pendaftaran yang sudah terisi.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGenerateGoogleForm('nikah')}
                      disabled={generatingGForm}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md cursor-pointer shrink-0 disabled:opacity-60"
                    >
                      {generatingGForm ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>Generate Google Form</span>
                    </button>
                  </div>

                  {googleForms['nikah'] ? (
                    <div className="p-4 rounded-xl bg-[#050811] border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Google Form Aktif</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          ID: {googleForms['nikah'].formId}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 text-xs font-mono text-slate-300 truncate">
                        {googleForms['nikah'].responderUri}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <a
                          href={googleForms['nikah'].responderUri}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <span>Buka Form (Tampilan Jemaat)</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <a
                          href={googleForms['nikah'].editUri}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <span>Edit Pertanyaan di Google</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(googleForms['nikah'].responderUri);
                            showToast('Tautan Google Form berhasil disalin ke clipboard!', 'success');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Link</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareFormWhatsApp('nikah')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Bagikan ke WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePullGoogleFormResponses('nikah')}
                          disabled={fetchingGFormResponses}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer ml-auto"
                        >
                          {fetchingGFormResponses ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          <span>Tarik Respon dari Google Form</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center rounded-xl bg-[#050811] border border-dashed border-slate-800 text-xs text-slate-400">
                      Belum ada Google Form Pernikahan yang digenerate. Klik tombol "Generate Google Form" di atas.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUEUE / ANTREAN PENDAFTARAN */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-amber-400" />
                    <span>Daftar Permohonan Pendaftaran Masuk ({registrations.length})</span>
                  </h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Permohonan mandiri dari warga jemaat via form online dan respon yang ditarik dari Google Forms
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadRegistrations}
                  disabled={loadingRegistrations}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingRegistrations ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {registrations.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-[#050811] border border-dashed border-slate-800 space-y-2">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">Belum ada permohonan pendaftaran yang masuk.</p>
                  <p className="text-[11px] text-slate-500">
                    Gunakan tab "Pendaftaran Baptisan" atau "Pernikahan" untuk mengajukan pendaftaran pertama.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {registrations.map((reg) => (
                    <div
                      key={reg.id}
                      className="p-4 rounded-2xl bg-[#050811] border border-slate-800 hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              reg.serviceType === 'baptis'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {reg.serviceType === 'baptis' ? 'Baptisan Kudus' : 'Pernikahan Kudus'}
                          </span>
                          <span className="font-bold text-white text-sm">{reg.applicantName}</span>
                          {reg.applicantPhone && (
                            <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-400" />
                              {reg.applicantPhone}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              reg.status === 'Disetujui'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : reg.status === 'Ditolak'
                                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {reg.status}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">{reg.createdAt}</span>
                        </div>
                      </div>

                      {/* Details summary */}
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {reg.details?.birthDate && (
                          <div>
                            <span className="text-slate-500">Tgl Lahir:</span>{' '}
                            <strong>{reg.details.birthDate}</strong>
                          </div>
                        )}
                        {reg.details?.fatherName && (
                          <div>
                            <span className="text-slate-500">Ayah:</span>{' '}
                            <strong>{reg.details.fatherName}</strong>
                          </div>
                        )}
                        {reg.details?.motherName && (
                          <div>
                            <span className="text-slate-500">Ibu:</span>{' '}
                            <strong>{reg.details.motherName}</strong>
                          </div>
                        )}
                        {reg.details?.rayon && (
                          <div>
                            <span className="text-slate-500">Rayon:</span>{' '}
                            <strong>{reg.details.rayon}</strong>
                          </div>
                        )}
                        {reg.details?.marriageDate && (
                          <div>
                            <span className="text-slate-500">Tgl Pemberkatan:</span>{' '}
                            <strong>{reg.details.marriageDate}</strong>
                          </div>
                        )}
                        {reg.details?.witnesses && (
                          <div>
                            <span className="text-slate-500">Saksi:</span>{' '}
                            <strong>{reg.details.witnesses}</strong>
                          </div>
                        )}
                        {reg.googleFormResponseId && (
                          <div className="col-span-2 text-[10px] text-purple-300 font-mono">
                            ⚡ Ditarik dari respon Google Form ID: {reg.googleFormResponseId}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[11px] text-slate-400">
                          {reg.adminNotes && <span>Catatan: {reg.adminNotes}</span>}
                        </div>

                        <div className="flex items-center gap-2">
                          {reg.status === 'Menunggu Verifikasi' && (
                            <button
                              type="button"
                              onClick={() => handleApproveRegistration(reg)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition shadow-sm cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Setujui & Catat ke Buku Sakramen</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Hapus permohonan pendaftaran untuk "${reg.applicantName}"?`)) {
                                await deleteServiceRegistrationApi(reg.id);
                                await loadRegistrations();
                                showToast('Permohonan berhasil dihapus.', 'info');
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                            title="Hapus pendaftaran"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Terhubung ke Google Workspace & Database Jemaat Betel Fuimelang</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
