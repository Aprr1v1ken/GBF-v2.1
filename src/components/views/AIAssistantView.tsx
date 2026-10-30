import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  FileText,
  HeartHandshake,
  TrendingUp,
  Copy,
  Check,
  Send,
  Printer,
  Calendar,
  Users,
  AlertCircle,
  RefreshCw,
  Share2,
  Lightbulb,
  ShieldCheck,
  Compass,
  CheckCircle2,
  ChevronRight,
  Zap,
  Sun,
  Smile,
  Baby,
  HelpCircle,
  Heart,
  MessageSquare,
  Music,
  Flame,
  Newspaper,
  Image as ImageIcon,
  Upload,
  Cloud,
  CalendarPlus,
  CheckCheck,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import type { Member, Rayon, ChurchEvent } from '../../types/index.ts';
import { getWorkspaceAccessToken, createGoogleDoc } from '../../services/workspace.ts';
import {
  generateSermonApi,
  generateWartaApi,
  generatePastoralPrayerApi,
  generateInsightsApi,
  generateSpiritualCounselingApi,
  generateDailyDevotionalApi,
  generateLiturgyOrderApi,
  generateSundaySchoolApi,
  generateBibleStudyApi,
  generateChurchNewsApi,
  fetchAiStatusApi,
} from '../../services/api.ts';
import {
  uploadActivityImageToCloud,
  fetchActivityImagesFromCloud,
  deleteActivityImageFromCloud,
  type CloudActivityImage,
} from '../../services/cloud-sync.ts';

interface AIAssistantViewProps {
  members: Member[];
  rayons: Rayon[];
  stats: any;
  onAddAnnouncement?: (data: any) => Promise<void>;
  onAddEvent?: (data: Partial<ChurchEvent>) => Promise<void>;
  initialTab?: AITabType;
}

export type AITabType =
  | 'church-news'
  | 'counseling'
  | 'devotional'
  | 'liturgy'
  | 'sunday-school'
  | 'bible-study'
  | 'sermon'
  | 'prayer'
  | 'warta'
  | 'insights'
  | 'recommendations';

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  members,
  rayons,
  stats,
  onAddAnnouncement,
  onAddEvent,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<AITabType>(initialTab || 'counseling');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [loading, setLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAiStatusApi()
      .then((status) => setAiConfigured(Boolean(status.configured)))
      .catch(() => setAiConfigured(false));
  }, []);
  const [copied, setCopied] = useState(false);
  const [savedToWarta, setSavedToWarta] = useState(false);

  // Tab 0 / Tab 11: AI Berita & Agenda Kegiatan Gereja (Dual Mode)
  const [newsMode, setNewsMode] = useState<'news' | 'agenda'>('news');
  const [newsCategory, setNewsCategory] = useState('Bakti Jumat & Gotong Royong');
  const [newsTitle, setNewsTitle] = useState('');
  const [newsDate, setNewsDate] = useState(new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'));
  const [newsStartTime, setNewsStartTime] = useState('07:30');
  const [newsEndTime, setNewsEndTime] = useState('11:30');
  const [newsLocation, setNewsLocation] = useState('Kompleks Gedung Gereja Betel Fuimelang & Pastori');
  const [newsCoordinator, setNewsCoordinator] = useState('');
  const [newsParticipants, setNewsParticipants] = useState('');
  const [newsNotes, setNewsNotes] = useState('');
  const [newsImageUrl, setNewsImageUrl] = useState('');
  const [newsResult, setNewsResult] = useState('');
  const [savedNewsToWarta, setSavedNewsToWarta] = useState(false);
  const [savedAgendaToCalendar, setSavedAgendaToCalendar] = useState(false);
  const [cloudUploading, setCloudUploading] = useState(false);
  const [cloudSavedImageId, setCloudSavedImageId] = useState('');
  const [imageSyncPending, setImageSyncPending] = useState(false);
  const [recentCloudImages, setRecentCloudImages] = useState<CloudActivityImage[]>([]);
  const [deletingCloudImageId, setDeletingCloudImageId] = useState('');
  const [showCloudGallery, setShowCloudGallery] = useState(false);

  // Fetch recent activity images and retry pending uploads when internet returns.
  useEffect(() => {
    let mounted = true;
    const refreshGallery = () => {
      fetchActivityImagesFromCloud()
        .then((imgs) => { if (mounted) setRecentCloudImages(imgs || []); })
        .catch((err) => console.warn('Could not load cloud images:', err));
    };
    refreshGallery();
    window.addEventListener('online', refreshGallery);
    return () => {
      mounted = false;
      window.removeEventListener('online', refreshGallery);
    };
  }, []);

  const handleDeleteCloudImage = async (image: CloudActivityImage) => {
    if (!window.confirm(`Hapus permanen foto "${image.title}" dari galeri?`)) return;
    setDeletingCloudImageId(image.id);
    setErrorMsg(null);
    try {
      await deleteActivityImageFromCloud(image.id);
      setRecentCloudImages((prev) => prev.filter((item) => item.id !== image.id));
      if (cloudSavedImageId === image.id) {
        setCloudSavedImageId('');
        setNewsImageUrl('');
        setImageSyncPending(false);
      }
    } catch (error: any) {
      setErrorMsg(error?.message || 'Foto gagal dihapus.');
    } finally {
      setDeletingCloudImageId('');
    }
  };

  // Tab 1: AI Konseling & Bimbingan Iman Rohani
  const [counselingCategory, setCounselingCategory] = useState('pergumulan-hidup');
  const [counselingTopic, setCounselingTopic] = useState('');
  const [counselingQuestion, setCounselingQuestion] = useState('');
  const [counselingContext, setCounselingContext] = useState('');
  const [counselingResult, setCounselingResult] = useState('');

  // Tab 2: AI Santapan Rohani Harian
  const [devotionalTiming, setDevotionalTiming] = useState('Renungan Pagi Hari');
  const [devotionalTheme, setDevotionalTheme] = useState('');
  const [devotionalScripture, setDevotionalScripture] = useState('');
  const [devotionalAudience, setDevotionalAudience] = useState('Keluarga Kristen GMIT');
  const [devotionalResult, setDevotionalResult] = useState('');

  // Tab 3: AI Penuntun Liturgi Khusus
  const [liturgyServiceType, setLiturgyServiceType] = useState('Ibadah Rumah Tangga / Persekutuan Rayon');
  const [liturgyTheme, setLiturgyTheme] = useState('');
  const [liturgyScripture, setLiturgyScripture] = useState('');
  const [liturgyRayon, setLiturgyRayon] = useState('');
  const [liturgyResult, setLiturgyResult] = useState('');

  // Tab 4: AI Sekolah Minggu & Pembina PAR GMIT
  const [ssAgeGroup, setSsAgeGroup] = useState('Anak Tanggung (Usia 7-10 Tahun / SD)');
  const [ssStoryTheme, setSsStoryTheme] = useState('');
  const [ssScripture, setSsScripture] = useState('');
  const [sundaySchoolResult, setSundaySchoolResult] = useState('');

  // Tab 5: AI Penelaahan Alkitab (PA Rayon)
  const [paScripture, setPaScripture] = useState('');
  const [paTopic, setPaTopic] = useState('');
  const [paAudience, setPaAudience] = useState('Persekutuan Doa Rayon I s/d IV GMIT Betel Fuimelang');
  const [paResult, setPaResult] = useState('');

  // Tab 6: Sermon State
  const [serviceType, setServiceType] = useState('Ibadah Minggu');
  const [scripture, setScripture] = useState('');
  const [topic, setTopic] = useState('');
  const [liturgicalSeason, setLiturgicalSeason] = useState('Umum / Trinitas');
  const [contextNotes, setContextNotes] = useState('');
  const [sermonResult, setSermonResult] = useState('');
  const [sermonDocUrl, setSermonDocUrl] = useState<string | null>(null);
  const [exportingSermonDoc, setExportingSermonDoc] = useState(false);

  // Tab 7: Pastoral Prayer State
  const [prayerCategory, setPrayerCategory] = useState<'ulang-tahun' | 'sakit' | 'kunjungan-rumah' | 'duka' | 'syukuran'>('ulang-tahun');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customAge, setCustomAge] = useState('');
  const [customRayon, setCustomRayon] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [prayerResult, setPrayerResult] = useState('');

  // Tab 8: Warta State
  const [bulletinDate, setBulletinDate] = useState(new Date().toISOString().substring(0, 10));
  const [bulletinItems, setBulletinItems] = useState<string[]>([]);
  const [newItemInput, setNewItemInput] = useState('');
  const [bulletinTone, setBulletinTone] = useState('Hangat dan Menghidupkan Persekutuan');
  const [wartaResult, setWartaResult] = useState('');

  // Tab 9: Insights State
  const [insightsResult, setInsightsResult] = useState('');

  // Birthday members
  const currentMonth = new Date().getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

  const birthdayMembers = members.filter((m) => {
    if (!m.birthDate) return false;
    const parts = m.birthDate.split('-');
    if (parts.length >= 2) {
      const month = parseInt(parts[1], 10);
      return month === currentMonth || month === nextMonth;
    }
    return false;
  });

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    if (!memberId) {
      setCustomName('');
      setCustomAge('');
      setCustomRayon('');
      return;
    }
    const m = members.find((item) => item.id === memberId);
    if (m) {
      setCustomName(m.fullName);
      if (m.birthDate) {
        const birthYear = parseInt(m.birthDate.substring(0, 4), 10);
        if (!isNaN(birthYear)) {
          setCustomAge(String(new Date().getFullYear() - birthYear));
        }
      }
      const r = rayons.find((item) => item.id === m.rayonId);
      setCustomRayon(r ? r.name : '');
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareToWhatsApp = (text: string) => {
    if (!text) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // 11. Generate Church News & Agenda Kegiatan Gereja (Gemini AI)
  const handleGenerateChurchNews = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await generateChurchNewsApi({
        mode: newsMode,
        category: newsCategory,
        title: newsTitle,
        date: newsDate,
        startTime: newsStartTime,
        endTime: newsEndTime,
        location: newsLocation,
        coordinator: newsCoordinator,
        participants: newsParticipants,
        notes: newsNotes,
        imageUrl: newsImageUrl,
      });
      if (res.success && res.text) {
        setNewsResult(res.text);
      } else {
        setErrorMsg(res.message || 'Gagal menghasilkan berita/agenda gereja.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke asisten AI gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewsImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('File harus berupa gambar JPG, PNG, atau WEBP.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setErrorMsg('Ukuran foto maksimal 12 MB agar dapat diproses dengan aman.');
      return;
    }

    setCloudUploading(true);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onerror = () => {
      setCloudUploading(false);
      setErrorMsg('Foto tidak dapat dibaca dari perangkat.');
    };
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => {
        setCloudUploading(false);
        setErrorMsg('Format gambar tidak valid atau file rusak.');
      };
      img.onload = async () => {
        try {
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
          if (!ctx) throw new Error('Browser tidak dapat memproses gambar.');
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setNewsImageUrl(compressed);

          // Save immediately, with a device copy and pending retry when offline.
          const record = await uploadActivityImageToCloud(compressed, {
            title: newsTitle || (newsMode === 'agenda' ? 'Dokumentasi Agenda Kegiatan' : 'Dokumentasi Berita Kegiatan'),
            category: newsCategory,
            description: newsNotes,
          });
          setCloudSavedImageId(record.id);
          setImageSyncPending(Boolean(record.pendingSync));
          setRecentCloudImages((prev) => [record, ...prev.filter((item) => item.id !== record.id)]);
        } catch (cloudErr: any) {
          console.warn('[Cloud] Warning uploading activity image:', cloudErr);
          setErrorMsg(cloudErr?.message || 'Foto tersimpan di formulir, tetapi galeri cloud belum dapat diperbarui.');
        } finally {
          setCloudUploading(false);
        }
      };
      if (readerEvent.target?.result) img.src = readerEvent.target.result as string;
    };
    reader.readAsDataURL(file);
    e.currentTarget.value = '';
  };

  const handleSaveNewsToAnnouncements = async () => {
    if (!newsResult || !onAddAnnouncement) return;
    setLoading(true);
    try {
      await onAddAnnouncement({
        title: newsTitle,
        category: newsCategory,
        content: newsResult,
        imageUrl: newsImageUrl,
        isImportant: true,
        author: newsCoordinator || 'Sekretariat Majelis',
      });
      setSavedNewsToWarta(true);
      setTimeout(() => setSavedNewsToWarta(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menerbitkan warta berita ke sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAgendaToCalendar = async () => {
    if (!newsResult || !onAddEvent) return;
    setLoading(true);
    try {
      let mappedCategory: any = 'Lainnya';
      if (newsCategory.includes('Bakti')) mappedCategory = 'Pelayanan Diakonia';
      else if (newsCategory.includes('Minggu') || newsCategory.includes('Ibadah')) mappedCategory = 'Ibadah Minggu';
      else if (newsCategory.includes('Diakonia')) mappedCategory = 'Pelayanan Diakonia';
      else if (newsCategory.includes('Pemuda') || newsCategory.includes('Remaja') || newsCategory.includes('Perempuan') || newsCategory.includes('Bapak')) mappedCategory = 'Ibadah Kategorial';
      else if (newsCategory.includes('Sekolah')) mappedCategory = 'Ibadah Kategorial';

      await onAddEvent({
        title: newsTitle,
        category: mappedCategory,
        startTime: `${newsDate} ${newsStartTime}:00`,
        endTime: `${newsDate} ${newsEndTime}:00`,
        location: newsLocation,
        picName: newsCoordinator || 'Majelis GMIT Betel Fuimelang',
        description: newsResult,
        status: 'Terjadwal',
        imageUrl: newsImageUrl,
      });
      setSavedAgendaToCalendar(true);
      setTimeout(() => setSavedAgendaToCalendar(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan agenda kegiatan ke kalender.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Generate Spiritual Counseling
  const handleGenerateCounseling = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await generateSpiritualCounselingApi({
        topic: counselingTopic,
        question: counselingQuestion,
        category: counselingCategory,
        userContext: counselingContext,
      });
      if (res.success && res.text) {
        setCounselingResult(res.text);
      } else {
        setErrorMsg(res.message || 'Gagal menghasilkan bimbingan rohani.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke asisten AI gagal.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Generate Daily Devotional
  const handleGenerateDevotional = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await generateDailyDevotionalApi({
        timing: devotionalTiming,
        theme: devotionalTheme,
        scripture: devotionalScripture,
        audience: devotionalAudience,
      });
      if (res.success && res.text) {
        setDevotionalResult(res.text);
      } else {
        setErrorMsg(res.message || 'Gagal menyusun santapan rohani harian.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke asisten AI gagal.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Generate Liturgy Order
  const handleGenerateLiturgy = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await generateLiturgyOrderApi({
        serviceType: liturgyServiceType,
        theme: liturgyTheme,
        scripture: liturgyScripture,
        rayon: liturgyRayon,
      });
      if (res.success && res.text) {
        setLiturgyResult(res.text);
      } else {
        setErrorMsg(res.message || 'Gagal menyusun tata ibadah khusus.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke asisten AI gagal.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Generate Sunday School Material
  const handleGenerateSundaySchool = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await generateSundaySchoolApi({
        ageGroup: ssAgeGroup,
        storyTheme: ssStoryTheme,
        scripture: ssScripture,
      });
      if (res.success && res.text) {
        setSundaySchoolResult(res.text);
      } else {
        setErrorMsg(res.message || 'Gagal menyusun bahan ajar Sekolah Minggu.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke asisten AI gagal.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Generate Bible Study (PA)
  const handleGenerateBibleStudy = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await generateBibleStudyApi({
        scripture: paScripture,
        topic: paTopic,
        audience: paAudience,
      });
      if (res.success && res.text) {
        setPaResult(res.text);
      } else {
        setErrorMsg(res.message || 'Gagal menyusun panduan PA Alkitab.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke asisten AI gagal.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Generate Sermon
  const handleGenerateSermon = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSermonDocUrl(null);
    try {
      const res = await generateSermonApi({
        serviceType,
        scripture,
        topic,
        liturgicalSeason,
        contextNotes,
      });
      if (res.success && res.text) {
        setSermonResult(res.text);
      } else {
        setErrorMsg(res.message || 'Gagal menyusun draf khotbah dengan AI.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke asisten AI gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSermonToGoogleDoc = async () => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      setErrorMsg('Akun Google belum terhubung. Buka menu "Google Workspace" untuk menghubungkan akun Google Anda terlebih dahulu.');
      return;
    }
    setExportingSermonDoc(true);
    try {
      const doc = await createGoogleDoc(
        token,
        `Draf Khotbah GMIT — ${topic || scripture || 'Pelayanan Firman'}`,
        `DRAF KHOTBAH & PELAYANAN FIRMAN\nGMIT Betel Fuimelang · Klasis Alor Tengah Utara\n\nNats Bacaan : ${scripture}\nTema / Judul: ${topic}\nJenis Kebaktian: ${serviceType}\nKalender Liturgi: ${liturgicalSeason}\n\n${sermonResult}`
      );
      setSermonDocUrl(doc.url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengekspor khotbah ke Google Docs.');
    } finally {
      setExportingSermonDoc(false);
    }
  };

  // 7. Generate Prayer
  const handleGeneratePrayer = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await generatePastoralPrayerApi({
        category: prayerCategory,
        memberName: customName || 'Saudara Seiman',
        age: customAge,
        rayon: customRayon,
        notes: customNotes,
      });
      if (res.success && res.text) {
        setPrayerResult(res.text);
      } else {
        setErrorMsg(res.message || 'Gagal menghasilkan doa pastoral dengan AI.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke asisten AI gagal.');
    } finally {
      setLoading(false);
    }
  };

  // 8. Generate Warta
  const handleGenerateWarta = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await generateWartaApi({
        bulletinDate,
        items: bulletinItems,
        announcerName: 'Majelis Jemaat GMIT Betel Fuimelang',
        tone: bulletinTone,
      });
      if (res.success && res.text) {
        setWartaResult(res.text);
      } else {
        setErrorMsg(res.message || 'Gagal menyusun warta jemaat dengan AI.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke asisten AI gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToAnnouncements = async () => {
    if (!wartaResult || !onAddAnnouncement) return;
    setLoading(true);
    try {
      await onAddAnnouncement({
        title: `Warta Jemaat — ${bulletinDate}`,
        category: 'Warta Ibadah',
        content: wartaResult,
        isImportant: true,
        author: 'Asisten AI Majelis Jemaat',
      });
      setSavedToWarta(true);
      setTimeout(() => setSavedToWarta(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan warta ke sistem.');
    } finally {
      setLoading(false);
    }
  };

  // 9. Generate Insights
  const handleGenerateInsights = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const statsSummary = {
        totalMembers: members.length,
        totalFamilies: stats?.totalFamily ?? stats?.totalFamilies ?? 0,
        activeMembers: members.filter((m) => m.status === 'Aktif').length,
        baptized: members.filter((m) => m.baptismStatus === 'Sudah').length,
        sidi: members.filter((m) => m.confirmationStatus === 'Sudah').length,
        marriedChurch: members.filter((m) => m.marriageChurchStatus === 'Sudah').length,
        rayonsCount: rayons.length,
        location: 'Desa Lembur Tengah, Klasis Alor Tengah Utara, Kab. Alor, NTT',
      };

      const res = await generateInsightsApi({ statsSummary });
      if (res.success && res.text) {
        setInsightsResult(res.text);
      } else {
        setErrorMsg(res.message || 'Gagal menganalisis data jemaat dengan AI.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke asisten AI gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0d1630] via-[#101b3b] to-[#1e1338] border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pusat Kecerdasan Rohani & Pastoral GMIT Betel Fuimelang</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded ${aiConfigured ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`}>
                {aiConfigured === null ? 'Memeriksa AI…' : aiConfigured ? 'Gemini Online' : 'Draf Lokal / Offline Siap'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              AI Rohani Kristen & Asisten Pelayanan Jemaat
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Koleksi asisten AI terintegrasi untuk bimbingan iman kristiani, santapan rohani harian, tata liturgi ibadah, bahan mengajar Sekolah Minggu (PAR), penelaahan Alkitab (PA), khotbah, dan lawatan pastoral.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Cetak Hasil AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            Pilih Modul AI Rohani & Pastoral
          </span>
          <span className="text-[10px] text-slate-400">Total 11 Modul Siap Pakai</span>
        </div>

        {/* Tab Buttons Grid / Scrollable Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pb-1">
          {/* 0. Berita & Bakti Jumat */}
          <button
            onClick={() => setActiveTab('church-news')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'church-news'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold border-emerald-300 shadow-md shadow-emerald-500/30'
                : 'bg-[#0b1226] text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'church-news' ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/10 text-emerald-400'}`}>
              <Newspaper className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Berita & Bakti Jumat</span>
              <span className={`text-[10px] block truncate ${activeTab === 'church-news' ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>Auto-Generate + Foto</span>
            </div>
          </button>

          {/* 1. Konseling Rohani */}
          <button
            onClick={() => setActiveTab('counseling')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'counseling'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#0b1226] text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'counseling' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/10 text-amber-400'}`}>
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">1. Konseling Iman</span>
              <span className={`text-[10px] block truncate ${activeTab === 'counseling' ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>Bimbingan & Tanya Jawab</span>
            </div>
          </button>

          {/* 2. Santapan Rohani Harian */}
          <button
            onClick={() => setActiveTab('devotional')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'devotional'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#0b1226] text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'devotional' ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/10 text-emerald-400'}`}>
              <Sun className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">2. Santapan Rohani</span>
              <span className={`text-[10px] block truncate ${activeTab === 'devotional' ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>Renungan Pagi/Malam</span>
            </div>
          </button>

          {/* 3. Penuntun Liturgi Khusus */}
          <button
            onClick={() => setActiveTab('liturgy')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'liturgy'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#0b1226] text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'liturgy' ? 'bg-slate-950/20 text-slate-950' : 'bg-sky-500/10 text-sky-400'}`}>
              <Music className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">3. Liturgi Ibadah</span>
              <span className={`text-[10px] block truncate ${activeTab === 'liturgy' ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>Ibadah Rayon & Syukur</span>
            </div>
          </button>

          {/* 4. Guru Sekolah Minggu (PAR) */}
          <button
            onClick={() => setActiveTab('sunday-school')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'sunday-school'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#0b1226] text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'sunday-school' ? 'bg-slate-950/20 text-slate-950' : 'bg-pink-500/10 text-pink-400'}`}>
              <Baby className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">4. Sekolah Minggu</span>
              <span className={`text-[10px] block truncate ${activeTab === 'sunday-school' ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>Bahan PAR & Cerita</span>
            </div>
          </button>

          {/* 5. Panduan PA Rayon */}
          <button
            onClick={() => setActiveTab('bible-study')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'bible-study'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#0b1226] text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'bible-study' ? 'bg-slate-950/20 text-slate-950' : 'bg-indigo-500/10 text-indigo-400'}`}>
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">5. PA Alkitab Rayon</span>
              <span className={`text-[10px] block truncate ${activeTab === 'bible-study' ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>Diskusi & Pemahaman</span>
            </div>
          </button>

          {/* 6. Asisten Khotbah */}
          <button
            onClick={() => setActiveTab('sermon')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'sermon'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#0b1226] text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'sermon' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/10 text-amber-400'}`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">6. Draf Khotbah</span>
              <span className={`text-[10px] block truncate ${activeTab === 'sermon' ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>Eksegesis Nats Alor</span>
            </div>
          </button>

          {/* 7. Doa Pastoral & Kunjungan */}
          <button
            onClick={() => setActiveTab('prayer')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'prayer'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#0b1226] text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'prayer' ? 'bg-slate-950/20 text-slate-950' : 'bg-rose-500/10 text-rose-400'}`}>
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">7. Doa Pastoral</span>
              <span className={`text-[10px] block truncate ${activeTab === 'prayer' ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>Kunjungan & Doa Sakit</span>
            </div>
          </button>

          {/* 8. Warta Jemaat */}
          <button
            onClick={() => setActiveTab('warta')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'warta'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#0b1226] text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'warta' ? 'bg-slate-950/20 text-slate-950' : 'bg-cyan-500/10 text-cyan-400'}`}>
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">8. Draf Warta</span>
              <span className={`text-[10px] block truncate ${activeTab === 'warta' ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>Teks Liturgis Mingguan</span>
            </div>
          </button>

          {/* 9. Analisis Pelayanan */}
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'insights'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#0b1226] text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'insights' ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/10 text-emerald-400'}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">9. Analisis Majelis</span>
              <span className={`text-[10px] block truncate ${activeTab === 'insights' ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>Strategi Pelayanan</span>
            </div>
          </button>

          {/* 10. Etika & Panduan */}
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'recommendations'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#0b1226] text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${activeTab === 'recommendations' ? 'bg-slate-950/20 text-slate-950' : 'bg-violet-500/10 text-violet-400'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">10. Etika Rohani</span>
              <span className={`text-[10px] block truncate ${activeTab === 'recommendations' ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>Pedoman AI Gereja</span>
            </div>
          </button>
        </div>
      </div>

      {/* Error Message if any */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-300">Terjadi Kendala Asisten AI:</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-white text-xs cursor-pointer font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 0: AI PEMBUAT BERITA & AGENDA KEGIATAN GEREJA */}
      {/* ==================================================== */}
      {activeTab === 'church-news' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-emerald-500/30 space-y-4 shadow-lg shadow-emerald-950/20">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    {newsMode === 'news' ? <Newspaper className="w-5 h-5" /> : <CalendarPlus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      {newsMode === 'news' ? 'AI Berita Gereja & Bakti Jumat' : 'AI Agenda & Rundown Kegiatan'}
                    </h3>
                    <p className="text-[10px] text-slate-400">Klasis Alor Tengah Utara · GMIT Betel Fuimelang</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    <span>Cloud Sync</span>
                  </span>
                </div>
              </div>

              {/* Mode Switcher: Berita vs Agenda Kegiatan */}
              <div className="p-1 rounded-xl bg-[#050811] border border-slate-800 grid grid-cols-2 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setNewsMode('news');
                    setNewsTitle('Aksi Bakti Bersih Lingkungan Gereja dan Penataan Pekarangan');
                    setNewsNotes('Pembersihan selokan air jelang musim hujan, perbaikan pagar bambu, penanaman bunga pekarangan gereja, dan ditutup dengan perjamuan kasih ubi rebus dan kopi jahe Alor.');
                  }}
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    newsMode === 'news'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Newspaper className="w-3.5 h-3.5" />
                  <span>📰 Berita / Warta</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewsMode('agenda');
                    setNewsTitle('Ibadah Padang & Persekutuan Kategorial Pemuda GMIT Betel Fuimelang');
                    setNewsNotes('Bawa Alkitab, alat tulis, bekal ubi/jagung rebus bersama, dan pakaian sopan lapangan.');
                  }}
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    newsMode === 'agenda'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>📅 Agenda Kegiatan</span>
                </button>
              </div>

              {/* Quick Preset Buttons tailored by Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Pilihan Topik Cepat ({newsMode === 'news' ? 'Liputan Berita' : 'Rundown Agenda'}):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {newsMode === 'news'
                    ? [
                        { label: 'Bakti Bersih Lingkungan', cat: 'Bakti Jumat & Gotong Royong', title: 'Aksi Bersih Lingkungan Gereja & Penataan Pekarangan Betel', notes: 'Pembersihan saluran air selokan, pengecatan pagar, pemangkasan dahan pohon, ditutup jamuan ubi rebus bersama.' },
                        { label: 'Diakonia Kasih Lansia', cat: 'Diakonia & Kasih', title: 'Pelayanan Diakonia Kasih Bagi Lansia & Janda Duda Fuimelang', notes: 'Pemberian paket sembako beras gula minyak dan doa berkat lawatan pastoral di rumah-rumah warga sepuh.' },
                        { label: 'Gotong Royong Pembangunan', cat: 'Bakti Jumat & Gotong Royong', title: 'Gotong Royong Angkat Pasir & Pengecoran Pondasi Pastori', notes: 'Kerja bakti bersama Kaum Bapak dan Pemuda mengangkut material batu pasir untuk kelanjutan renovasi gereja.' },
                        { label: 'Ibadah Padang Pemuda', cat: 'Pemuda & Remaja', title: 'Ibadah Padang & Persekutuan Kreatif Pemuda GMIT Betel', notes: 'Penyalaan api unggun persekutuan, pujian akustik, renungan alam terbuka, dan penanaman pohon buah di Fuimelang.' },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setNewsCategory(preset.cat);
                            setNewsTitle(preset.title);
                            setNewsNotes(preset.notes);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-900/40 text-[11px] text-slate-300 hover:text-emerald-300 border border-slate-700 transition cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))
                    : [
                        { label: 'Rundown Ibadah Padang', cat: 'Pemuda & Remaja', title: 'Ibadah Padang & Persekutuan Pemuda GMIT Betel', startTime: '07:30', endTime: '13:00', notes: 'Ibadah alam terbuka, games keakraban kristiani, penanaman pohon peneduh, santap kasih persaudaraan.' },
                        { label: 'Agenda Bakti Jumat', cat: 'Bakti Jumat & Gotong Royong', title: 'Kerja Bakti Jumat Bersih Selokan & Halaman Gedung Gereja', startTime: '07:00', endTime: '11:00', notes: 'Seluruh warga Rayon 1-4 wajib bawa cangkul, parang, sapu lidi, dan karung sampah.' },
                        { label: 'Rapat Majelis Jemaat', cat: 'Warta Ibadah', title: 'Sidang Pleno Majelis Jemaat Evaluasi Triwulan Betel Fuimelang', startTime: '16:00', endTime: '19:30', notes: 'Evaluasi program pelayanan rayon, administrasi jemaat, dan penetapan panitia paskah/natal.' },
                        { label: 'Katekisasi Sidi Baru', cat: 'Sekolah Minggu & PAR', title: 'Pertemuan Perdana Katekisasi Sidi Angkatan 2026/2027', startTime: '15:00', endTime: '17:00', notes: 'Pembagian kurikulum pengajaran iman GMIT dan perkenalan pendeta pengajar.' },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setNewsCategory(preset.cat);
                            setNewsTitle(preset.title);
                            setNewsNotes(preset.notes);
                            if (preset.startTime) setNewsStartTime(preset.startTime);
                            if (preset.endTime) setNewsEndTime(preset.endTime);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-900/40 text-[11px] text-slate-300 hover:text-emerald-300 border border-slate-700 transition cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kategori Kegiatan *</label>
                  <select
                    value={newsCategory}
                    onChange={(e) => setNewsCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-400"
                  >
                    <option value="Bakti Jumat & Gotong Royong">Bakti Jumat & Gotong Royong</option>
                    <option value="Warta Ibadah">Warta Ibadah & Kebaktian</option>
                    <option value="Diakonia & Kasih">Diakonia & Kasih Sesama</option>
                    <option value="Pemuda & Remaja">Pemuda & Remaja GMIT</option>
                    <option value="Sekolah Minggu & PAR">Sekolah Minggu & PAR</option>
                    <option value="Kaum Perempuan (PKP)">Kaum Perempuan (PKP)</option>
                    <option value="Kaum Bapak (PKB)">Kaum Bapak (PKB)</option>
                    <option value="Pembangunan & Perbendaharaan">Pembangunan & Sarana Gedung</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    {newsMode === 'news' ? 'Judul Berita / Aksi Pelayanan *' : 'Nama Agenda / Tema Acara *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                    placeholder={newsMode === 'news' ? 'Contoh: Aksi Bakti Bersih Selokan & Penataan Pekarangan' : 'Contoh: Ibadah Padang & Persekutuan Kreatif Pemuda'}
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-400 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Hari & Tanggal</label>
                    <input
                      type="text"
                      value={newsDate}
                      onChange={(e) => setNewsDate(e.target.value)}
                      placeholder="DD-MM-YYYY"
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Koordinator / Penanggung Jawab</label>
                    <input
                      type="text"
                      value={newsCoordinator}
                      onChange={(e) => setNewsCoordinator(e.target.value)}
                      placeholder="BPPJ / Seksi Pemuda"
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Additional Time Inputs for Agenda Mode */}
                {newsMode === 'agenda' && (
                  <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div>
                      <label className="block font-semibold text-amber-300 mb-1">Jam Mulai (WITA)</label>
                      <input
                        type="text"
                        value={newsStartTime}
                        onChange={(e) => setNewsStartTime(e.target.value)}
                        placeholder="07:30"
                        className="w-full px-3 py-1.5 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-amber-300 mb-1">Jam Selesai (WITA)</label>
                      <input
                        type="text"
                        value={newsEndTime}
                        onChange={(e) => setNewsEndTime(e.target.value)}
                        placeholder="11:30"
                        className="w-full px-3 py-1.5 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400 font-mono"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Lokasi Kegiatan</label>
                  <input
                    type="text"
                    value={newsLocation}
                    onChange={(e) => setNewsLocation(e.target.value)}
                    placeholder="Kompleks Gedung Gereja Betel Fuimelang"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    {newsMode === 'news' ? 'Unsur Peserta yang Terlibat' : 'Sasaran Peserta Jemaat'}
                  </label>
                  <input
                    type="text"
                    value={newsParticipants}
                    onChange={(e) => setNewsParticipants(e.target.value)}
                    placeholder="Presbiter, Pemuda, dan Seluruh Anggota Rayon 1 - 4"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    {newsMode === 'news' ? 'Poin-poin Hasil / Suasana Lapangan' : 'Perlengkapan & Catatan Khusus'}
                  </label>
                  <textarea
                    rows={3}
                    value={newsNotes}
                    onChange={(e) => setNewsNotes(e.target.value)}
                    placeholder={
                      newsMode === 'news'
                        ? 'Jelaskan hal-hal yang dilakukan, suasana kekeluargaan, hidangan ubi/teh...'
                        : 'Daftar alat yang harus dibawa peserta, susunan pembagian seksi, konsumsi...'
                    }
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-400 resize-none leading-relaxed"
                  />
                </div>

                {/* Upload Foto Kegiatan - Langsung Tersimpan di Cloud SYSJEGER */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span>Foto Kegiatan (Cloud + Offline)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {recentCloudImages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowCloudGallery(!showCloudGallery)}
                          className="text-[10px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
                        >
                          {showCloudGallery ? 'Tutup Galeri' : `Galeri Cloud (${recentCloudImages.length})`}
                        </button>
                      )}
                      {newsImageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewsImageUrl('');
                            setCloudSavedImageId('');
                            setImageSyncPending(false);
                          }}
                          className="text-[10px] text-red-400 hover:underline cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cloud Synced Notification Badge */}
                  {cloudSavedImageId && (
                    <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-between text-[11px] text-emerald-300">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{imageSyncPending ? '🟡 Foto tersimpan di perangkat · akan disinkronkan saat online' : '🟢 Tersimpan Langsung di Cloud SYSJEGER'}</span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 truncate max-w-[100px]">
                        ID: {cloudSavedImageId}
                      </span>
                    </div>
                  )}

                  {/* Cloud Gallery Quick Picker */}
                  {showCloudGallery && recentCloudImages.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-[#050811] border border-amber-500/30 space-y-2">
                      <span className="text-[10px] font-bold text-amber-300 block">
                        Pilih Dari Foto Dokumentasi Cloud:
                      </span>
                      <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                        {recentCloudImages.map((img) => (
                          <div
                            key={img.id}
                            onClick={() => {
                              setNewsImageUrl(img.url);
                              setCloudSavedImageId(img.id);
                              setImageSyncPending(Boolean(img.pendingSync));
                              setShowCloudGallery(false);
                            }}
                            className="aspect-square rounded-lg overflow-hidden border border-slate-700 hover:border-emerald-400 cursor-pointer relative group transition"
                          >
                            <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              aria-label={`Hapus foto ${img.title}`}
                              title="Hapus foto dari galeri"
                              disabled={deletingCloudImageId === img.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDeleteCloudImage(img);
                              }}
                              className="absolute top-1 right-1 z-10 p-1.5 rounded-lg bg-slate-950/85 text-rose-300 border border-rose-400/40 hover:bg-rose-950 disabled:opacity-50"
                            >
                              {deletingCloudImageId === img.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </button>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] text-white text-center p-1 pointer-events-none">
                              Pilih
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {newsImageUrl ? (
                    <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-700 relative group">
                      <img
                        src={newsImageUrl}
                        alt="Dokumentasi Kegiatan"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold cursor-pointer transition">
                        <span>Ganti Foto (Otomatis Upload ke Cloud)</span>
                        <input type="file" accept="image/*" onChange={handleNewsImageUpload} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-3.5 border border-dashed border-slate-700 rounded-lg hover:border-emerald-400/50 cursor-pointer text-slate-400 hover:text-white transition">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>{cloudUploading ? 'Mengompresi & Menyimpan ke Cloud...' : 'Unggah Foto Baru dari HP / Laptop'}</span>
                      <input type="file" accept="image/*" onChange={handleNewsImageUpload} className="hidden" />
                    </label>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGenerateChurchNews}
                  disabled={loading || !newsTitle.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>
                    {loading
                      ? 'AI Sedang Menyusun Naskah...'
                      : newsMode === 'news'
                      ? `Hasilkan Berita dengan ${aiConfigured ? 'AI Gemini' : 'AI / Draf Lokal'}`
                      : `Hasilkan Agenda & Rundown dengan ${aiConfigured ? 'AI Gemini' : 'AI / Draf Lokal'}`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Result Preview & Actions */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-2xl bg-[#0b1226] border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    {newsMode === 'news' ? <FileText className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      {newsMode === 'news' ? 'Hasil Liputan Berita & Warta Publik' : 'Hasil Agenda & Rundown Pelayanan'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {newsMode === 'news' ? 'Format Resmi Jemaat & Siap Siar WhatsApp' : 'Rundown Lengkap & Format Undangan Jemaat'}
                    </p>
                  </div>
                </div>

                {newsResult && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Action 1: Terbitkan ke Warta Publik */}
                    <button
                      onClick={handleSaveNewsToAnnouncements}
                      disabled={loading || savedNewsToWarta}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                      title="Terbitkan ke Warta Publik dan Cloud SYSJEGER"
                    >
                      {savedNewsToWarta ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{savedNewsToWarta ? 'Telah Diterbitkan!' : 'Terbitkan ke Warta (Cloud)'}</span>
                    </button>

                    {/* Action 2: Jadwalkan ke Kalender Kegiatan (Cloud) */}
                    {onAddEvent && (
                      <button
                        onClick={handleSaveAgendaToCalendar}
                        disabled={loading || savedAgendaToCalendar}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                        title="Simpan langsung ke Kalender Kegiatan dan Cloud SYSJEGER"
                      >
                        {savedAgendaToCalendar ? <CheckCheck className="w-3.5 h-3.5" /> : <CalendarPlus className="w-3.5 h-3.5" />}
                        <span>{savedAgendaToCalendar ? 'Terjadwal di Kalender!' : 'Simpan ke Kalender (Cloud)'}</span>
                      </button>
                    )}

                    {/* Action 3: Salin Format WA */}
                    <button
                      onClick={() => copyToClipboard(newsResult)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copied ? 'Tersalin' : 'Salin Format WA'}</span>
                    </button>

                    {/* Action 4: Share ke WhatsApp */}
                    <button
                      onClick={() => shareToWhatsApp(newsResult)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WA</span>
                    </button>

                    {/* Action 5: Cetak Naskah */}
                    <button
                      onClick={() => window.print()}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cetak</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Display Area */}
              {newsResult ? (
                <div className="space-y-4">
                  {/* Photo Preview if attached with Cloud badge */}
                  {newsImageUrl && (
                    <div className="w-full h-56 rounded-2xl overflow-hidden border border-emerald-500/30 relative shadow-xl">
                      <img
                        src={newsImageUrl}
                        alt="Foto Kegiatan"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-emerald-300 border border-emerald-400/40 flex items-center gap-1.5 shadow-md">
                        <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{imageSyncPending ? 'Dokumentasi tersimpan di perangkat' : 'Dokumentasi Cloud SYSJEGER'}</span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-3.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between text-xs text-slate-200">
                        <span className="font-semibold text-emerald-300">{newsTitle}</span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {newsDate} {newsMode === 'agenda' && `· ${newsStartTime}-${newsEndTime} WITA`}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-5 rounded-2xl bg-[#070b18] border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line space-y-2 select-text">
                    {newsResult}
                  </div>
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    {newsMode === 'news' ? <Newspaper className="w-8 h-8" /> : <CalendarPlus className="w-8 h-8" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-300">
                      {newsMode === 'news'
                        ? 'Belum Ada Berita yang Dihasilkan'
                        : 'Belum Ada Agenda Kegiatan yang Disusun'}
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {newsMode === 'news'
                        ? 'Pilih kategori kegiatan seperti Bakti Jumat, Diakonia, atau Gotong Royong di panel kiri, lampirkan foto kegiatan, lalu klik "Hasilkan Berita dengan AI".'
                        : 'Masukkan nama acara, waktu mulai-selesai, lokasi, dan sasaran jemaat di panel kiri, lalu klik "Hasilkan Agenda & Rundown dengan AI".'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 1: AI KONSELING & BIMBINGAN IMAN ROHANI */}
      {/* ==================================================== */}
      {activeTab === 'counseling' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-amber-300">
                <MessageSquare className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Konseling & Bimbingan Iman Kristen</h3>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Pertanyaan / Pergumulan Populer Jemaat:
                </label>
                <div className="space-y-1.5">
                  {[
                    {
                      topic: 'Mengatasi Kekhawatiran Hidup & Rezeki Keluarga',
                      q: 'Bagaimana menghadapi saat hasil panen berkurang dan biaya sekolah anak mendesak tanpa kehilangan damai sejahtera?',
                      cat: 'pergumulan-hidup',
                    },
                    {
                      topic: 'Makna Peneguhan Sidi & Tanggung Jawab Orang Muda',
                      q: 'Apa arti rohani dari peneguhan Sidi bagi orang muda GMIT dan bagaimana menjaga komitmen hidup kudus?',
                      cat: 'sakramen-sidi',
                    },
                    {
                      topic: 'Mengampuni Orang yang Melukai Hati',
                      q: 'Bagaimana cara tulus mengampuni sesama atau keluarga yang menyakiti hati kita menurut ajaran Kristus?',
                      cat: 'pengampunan',
                    },
                    {
                      topic: 'Menghadapi Kedukaan & Kehilangan Orang Terkasih',
                      q: 'Ayat firman Tuhan dan penghiburan rohani saat kehilangan anggota keluarga yang sangat dicintai.',
                      cat: 'kedukaan',
                    },
                    {
                      topic: 'Membina Mezbah Doa di Rumah Tangga Kristen',
                      q: 'Langkah praktis membiasakan anak-anak dan suami-istri bersekutu membaca Alkitab tiap malam di rumah.',
                      cat: 'keluarga',
                    },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCounselingTopic(p.topic);
                        setCounselingQuestion(p.q);
                        setCounselingCategory(p.cat);
                      }}
                      className="w-full text-left p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 text-[11px] text-slate-300 hover:text-amber-300 transition cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">{p.topic}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kategori Pergumulan:
                </label>
                <select
                  value={counselingCategory}
                  onChange={(e) => setCounselingCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="pergumulan-hidup">Pergumulan Hidup & Kekhawatiran</option>
                  <option value="keluarga">Keluarga & Rumah Tangga Kristen</option>
                  <option value="sakramen-sidi">Sakramen, Sidi & Ajaran Iman</option>
                  <option value="pengampunan">Pengampunan & Kerukunan Sesama</option>
                  <option value="kedukaan">Kedukaan & Penghiburan Iman</option>
                  <option value="anak-muda">Pergaulan & Masa Depan Anak Muda</option>
                  <option value="pekerjaan-kebun">Etika Kerja, Hasil Bumi & Integritas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Topik / Pokok Bahasan:
                </label>
                <input
                  type="text"
                  value={counselingTopic}
                  onChange={(e) => setCounselingTopic(e.target.value)}
                  placeholder="Misal: Kekhawatiran masa depan, mendidik anak..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Uraian Pertanyaan / Keluhan Pribadi:
                </label>
                <textarea
                  rows={3}
                  value={counselingQuestion}
                  onChange={(e) => setCounselingQuestion(e.target.value)}
                  placeholder="Tuliskan pertanyaan rohani yang sedang Anda atau warga jemaat gumuli..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Konteks Pelayanan / Warga:
                </label>
                <input
                  type="text"
                  value={counselingContext}
                  onChange={(e) => setCounselingContext(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleGenerateCounseling}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{loading ? 'Menyusun Jawaban Rohani...' : 'Dapatkan Bimbingan Rohani AI'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 min-h-[500px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-white text-sm">Naskah Bimbingan & Doa Rohani</h4>
                  </div>
                  {counselingResult && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyToClipboard(counselingResult)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copied ? 'Tersalin' : 'Salin'}</span>
                      </button>
                      <button
                        onClick={() => shareToWhatsApp(counselingResult)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
                      </button>
                    </div>
                  )}
                </div>

                {counselingResult ? (
                  <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line select-text">
                    {counselingResult}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500">
                    <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">Pusat Konseling Iman Kristen</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Pilih salah satu pergumulan iman atau masukkan pertanyaan pribadi Anda, lalu klik "Dapatkan Bimbingan Rohani AI" untuk menerima penghiburan Alkitabiah dan doa penyerahan.
                    </p>
                  </div>
                )}
              </div>

              {counselingResult && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Berakar pada doktrin Alkitabiah & kasih pastoral GMIT.</span>
                  <span className="text-amber-400 font-semibold">{aiConfigured ? 'Gemini AI Rohani' : 'Draf Lokal Rohani'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: AI SANTAPAN ROHANI HARIAN */}
      {/* ==================================================== */}
      {activeTab === 'devotional' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-emerald-400">
                <Sun className="w-5 h-5" />
                <h3 className="font-bold text-white text-sm">Santapan Rohani Harian GMIT</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Waktu & Suasana Renungan:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Renungan Pagi Hari', 'Renungan Malam Hari', 'Renungan Mezbah Keluarga', 'Renungan Tengah Hari'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDevotionalTiming(t)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer text-center ${
                        devotionalTiming === t
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tema Renungan Hari Ini:
                </label>
                <input
                  type="text"
                  value={devotionalTheme}
                  onChange={(e) => setDevotionalTheme(e.target.value)}
                  placeholder="Misal: Rahmat Baru di Setiap Fajar, Damai di Tengah Badai..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ayat / Nats Alkitab (Rujukan):
                </label>
                <input
                  type="text"
                  value={devotionalScripture}
                  onChange={(e) => setDevotionalScripture(e.target.value)}
                  placeholder="Misal: Ratapan 3:22-23, Filipi 4:6-7, Mazmur 91:1-2"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sasaran Pembaca:
                </label>
                <select
                  value={devotionalAudience}
                  onChange={(e) => setDevotionalAudience(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Keluarga Kristen GMIT">Keluarga Kristen GMIT (Umum)</option>
                  <option value="Pemuda & Remaja GMIT">Pemuda & Remaja (Generasi Penerus)</option>
                  <option value="Warga Lanjut Usia (Lansia)">Warga Lanjut Usia (Lansia)</option>
                  <option value="Kaum Ibu & Perempuan">Kaum Ibu & Perempuan GMIT</option>
                  <option value="Kaum Bapak & Petani/Nelayan">Kaum Bapak & Pekerja Ladang/Laut</option>
                  <option value="Persekutuan Rayon I s/d IV">Anggota Rayon I–IV Betel Fuimelang</option>
                </select>
              </div>

              <button
                onClick={handleGenerateDevotional}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sun className="w-4 h-4" />}
                <span>{loading ? 'Menulis Santapan Rohani...' : 'Buat Santapan Rohani Hari Ini'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 min-h-[500px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-white text-sm">Santapan Rohani & Format WhatsApp</h4>
                  </div>
                  {devotionalResult && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyToClipboard(devotionalResult)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copied ? 'Tersalin' : 'Salin'}</span>
                      </button>
                      <button
                        onClick={() => shareToWhatsApp(devotionalResult)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Kirim WA Rayon</span>
                      </button>
                    </div>
                  )}
                </div>

                {devotionalResult ? (
                  <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line select-text">
                    {devotionalResult}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500">
                    <Sun className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">Santapan Rohani Pagi & Malam</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Susun renungan harian yang menyegarkan jiwa untuk keluarga jemaat, lengkap dengan ayat emas, refleksi praktis, dan format siap kirim ke WhatsApp Rayon.
                    </p>
                  </div>
                )}
              </div>

              {devotionalResult && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Siap dibagikan ke jemaat Rayon I–IV Fuimelang</span>
                  <span className="text-emerald-400 font-semibold">1-Klik WhatsApp Ready</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: AI PENUNTUN LITURGI & TATA IBADAH KHUSUS */}
      {/* ==================================================== */}
      {activeTab === 'liturgy' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-sky-400">
                <Music className="w-5 h-5" />
                <h3 className="font-bold text-white text-sm">Penuntun Tata Ibadah & Liturgi Khusus</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jenis Ibadah Khusus:
                </label>
                <select
                  value={liturgyServiceType}
                  onChange={(e) => setLiturgyServiceType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="Ibadah Rumah Tangga / Persekutuan Rayon">Ibadah Rumah Tangga / Persekutuan Rayon</option>
                  <option value="Ibadah Syukur Rumah Baru / Penyerahan Rumah">Ibadah Syukur Rumah Baru / Tempat Tinggal</option>
                  <option value="Ibadah Syukur Panen / Hasil Bumi (Jagung & Kemiri)">Ibadah Syukur Panen & Hasil Bumi Alor</option>
                  <option value="Ibadah Penghiburan / Malam Kedukaan">Ibadah Penghiburan / Kedukaan</option>
                  <option value="Ibadah Syukur Ulang Tahun / Ulang Tahun Pernikahan">Ibadah Syukur Hari Ulang Tahun / Nikah</option>
                  <option value="Ibadah Persekutuan Pemuda GMIT (GP)">Ibadah Persekutuan Pemuda GMIT</option>
                  <option value="Ibadah Kaum Perempuan GMIT">Ibadah Persekutuan Kaum Perempuan</option>
                  <option value="Ibadah Kaum Bapak GMIT">Ibadah Persekutuan Kaum Bapak</option>
                  <option value="Ibadah Peletakan Batu Pertama / Pembangunan">Ibadah Peletakan Batu Pertama Bangunan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tema Ibadah:
                </label>
                <input
                  type="text"
                  value={liturgyTheme}
                  onChange={(e) => setLiturgyTheme(e.target.value)}
                  placeholder="Misal: Keluarga yang Berakar dan Berbuah..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nats Alkitab:
                </label>
                <input
                  type="text"
                  value={liturgyScripture}
                  onChange={(e) => setLiturgyScripture(e.target.value)}
                  placeholder="Misal: Yosua 24:15, Mazmur 128:1-6..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Rayon / Tempat Ibadah:
                </label>
                <input
                  type="text"
                  value={liturgyRayon}
                  onChange={(e) => setLiturgyRayon(e.target.value)}
                  placeholder="Misal: Rumah Kel. Banamtuan - Rayon I Betel Fuimelang"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                onClick={handleGenerateLiturgy}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
                <span>{loading ? 'Menyusun Liturgi...' : 'Susun Tata Ibadah Khusus'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 min-h-[500px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-sky-400" />
                    <h4 className="font-bold text-white text-sm">Tata Ibadah Resmi GMIT</h4>
                  </div>
                  {liturgyResult && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyToClipboard(liturgyResult)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copied ? 'Tersalin' : 'Salin'}</span>
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Cetak</span>
                      </button>
                    </div>
                  )}
                </div>

                {liturgyResult ? (
                  <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line select-text">
                    {liturgyResult}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500">
                    <Music className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">Tata Ibadah Liturgis Lengkap</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Hasilkan tata kebaktian rumah tangga rayon, syukur panen, atau malam kedukaan lengkap dengan rujukan kidung (KJ/PKJ), votum, salam, berita anugerah, dan berkat rasuli.
                    </p>
                  </div>
                )}
              </div>

              {liturgyResult && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Pedoman Liturgis Tata Gereja Sinode GMIT</span>
                  <span className="text-sky-400 font-semibold">Siap Digunakan Majelis / Liturgos</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: AI SEKOLAH MINGGU & PEMBINA PAR GMIT */}
      {/* ==================================================== */}
      {activeTab === 'sunday-school' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-pink-400">
                <Baby className="w-5 h-5" />
                <h3 className="font-bold text-white text-sm">Sekolah Minggu & Pembina PAR GMIT</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kelompok Usia Anak:
                </label>
                <select
                  value={ssAgeGroup}
                  onChange={(e) => setSsAgeGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="Anak Kecil (Usia 3 - 6 Tahun / Balita & TK)">Anak Kecil (Usia 3 - 6 Tahun / Balita & TK)</option>
                  <option value="Anak Tanggung (Usia 7 - 10 Tahun / SD Kelas 1-4)">Anak Tanggung (Usia 7 - 10 Tahun / SD 1-4)</option>
                  <option value="Anak Remaja (Usia 11 - 14 Tahun / SD 5-6 & SMP)">Anak Remaja (Usia 11 - 14 Tahun / SMP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Judul / Cerita Alkitab:
                </label>
                <input
                  type="text"
                  value={ssStoryTheme}
                  onChange={(e) => setSsStoryTheme(e.target.value)}
                  placeholder="Misal: Yesus Meredakan Angin Ribut, Daud dan Goliat..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nats Alkitab:
                </label>
                <input
                  type="text"
                  value={ssScripture}
                  onChange={(e) => setSsScripture(e.target.value)}
                  placeholder="Misal: Markus 4:35-41, 1 Samuel 17..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Story presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Preset Cerita Sekolah Minggu Favorit:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { t: 'Yesus Meredakan Badai', s: 'Markus 4:35-41' },
                    { t: 'Daud Melawan Goliat', s: '1 Samuel 17:40-50' },
                    { t: '5 Roti dan 2 Ikan', s: 'Yohanes 6:1-14' },
                    { t: 'Orang Samaria Murah Hati', s: 'Lukas 10:25-37' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSsStoryTheme(preset.t);
                        setSsScripture(preset.s);
                      }}
                      className="text-left p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-pink-300 transition truncate cursor-pointer"
                    >
                      {preset.t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateSundaySchool}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Baby className="w-4 h-4" />}
                <span>{loading ? 'Menyusun Cerita PAR...' : 'Buat Bahan Ajar Sekolah Minggu'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 min-h-[500px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Baby className="w-4 h-4 text-pink-400" />
                    <h4 className="font-bold text-white text-sm">Bahan Ajar & Alat Peraga PAR GMIT</h4>
                  </div>
                  {sundaySchoolResult && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyToClipboard(sundaySchoolResult)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copied ? 'Tersalin' : 'Salin'}</span>
                      </button>
                      <button
                        onClick={() => shareToWhatsApp(sundaySchoolResult)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Kirim ke Pengasuh</span>
                      </button>
                    </div>
                  )}
                </div>

                {sundaySchoolResult ? (
                  <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line select-text">
                    {sundaySchoolResult}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500">
                    <Baby className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">Sahabat Pengasuh PAR & Guru Sekolah Minggu</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Menghasilkan naskah cerita Alkitab yang interaktif, peraga ramah lingkungan (daun, batu, biji jagung), lagu anak, ayat hafalan bergaya gerak tubuh, dan kuis ceria.
                    </p>
                  </div>
                )}
              </div>

              {sundaySchoolResult && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Dirancang khusus bagi Pengasuh PAR di pedesaan Alor</span>
                  <span className="text-pink-400 font-semibold">Ramah Anak & Kontekstual</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: AI PENELAAHAN ALKITAB (PA RAYON) */}
      {/* ==================================================== */}
      {activeTab === 'bible-study' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-indigo-400">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-bold text-white text-sm">Panduan Penelaahan Alkitab (PA Rayon)</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nats Alkitab:
                </label>
                <input
                  type="text"
                  value={paScripture}
                  onChange={(e) => setPaScripture(e.target.value)}
                  placeholder="Misal: Yakobus 2:14-26, Matius 6:25-34..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Topik Bahasan:
                </label>
                <input
                  type="text"
                  value={paTopic}
                  onChange={(e) => setPaTopic(e.target.value)}
                  placeholder="Misal: Iman Tanpa Perbuatan Adalah Mati..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Peserta / Sasaran Kelompok:
                </label>
                <input
                  type="text"
                  value={paAudience}
                  onChange={(e) => setPaAudience(e.target.value)}
                  placeholder="Misal: Persekutuan Doa Rayon I s/d IV..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* PA Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Preset Bahan PA Rayon:
                </label>
                <div className="space-y-1.5">
                  {[
                    { s: 'Yakobus 2:14-26', t: 'Iman Tanpa Perbuatan Adalah Mati' },
                    { s: 'Matius 6:25-34', t: 'Mengatasi Kekhawatiran Soal Rezeki' },
                    { s: 'Mazmur 133:1-3', t: 'Indahnya Hidup Rukun Bersaudara' },
                    { s: 'Galatia 5:22-26', t: 'Buah-Buah Roh Kudus di Tengah Jemaat' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPaScripture(preset.s);
                        setPaTopic(preset.t);
                      }}
                      className="w-full text-left p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-indigo-300 transition flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-semibold">{preset.s}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{preset.t}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateBibleStudy}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
                <span>{loading ? 'Menyusun Bahan PA...' : 'Susun Panduan Diskusi PA Rayon'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 min-h-[500px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-bold text-white text-sm">Panduan Diskusi & Bahan PA Rayon</h4>
                  </div>
                  {paResult && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyToClipboard(paResult)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copied ? 'Tersalin' : 'Salin'}</span>
                      </button>
                      <button
                        onClick={() => shareToWhatsApp(paResult)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Kirim WA Rayon</span>
                      </button>
                    </div>
                  )}
                </div>

                {paResult ? (
                  <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line select-text">
                    {paResult}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500">
                    <HelpCircle className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">Panduan PA Interaktif Rayon I–IV</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Menghasilkan latar belakang teologis, tafsiran ayat pokok, 4 pertanyaan diskusi kelompok yang menghidupkan percakapan, komitmen iman, dan doa penutup.
                    </p>
                  </div>
                )}
              </div>

              {paResult && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Mempererat persekutuan dan pendalaman firman di Rayon</span>
                  <span className="text-indigo-400 font-semibold">Fasilitator Guide Ready</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 6: ASISTEN KHOTBAH & RENUNGAN GMIT */}
      {/* ==================================================== */}
      {activeTab === 'sermon' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-amber-300">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Parameter Kerangka Khotbah</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jenis Ibadah:
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Ibadah Minggu">Ibadah Minggu Jemaat</option>
                  <option value="Ibadah Rayon (Rumah Tangga)">Ibadah Rayon (Rumah Tangga)</option>
                  <option value="Ibadah Pemuda (GP)">Ibadah Pemuda GMIT (GP)</option>
                  <option value="Ibadah Kaum Perempuan">Ibadah Kaum Perempuan GMIT</option>
                  <option value="Ibadah Kaum Bapak">Ibadah Kaum Bapak GMIT</option>
                  <option value="Ibadah Pengucapan Syukur Panen/Keluarga">Ibadah Pengucapan Syukur Panen</option>
                  <option value="Ibadah Penghiburan / Kedukaan">Ibadah Penghiburan / Kedukaan</option>
                  <option value="Ibadah Baptisan Kudus">Ibadah Sakramen Baptisan Kudus</option>
                  <option value="Ibadah Peneguhan Sidi">Ibadah Sakramen Peneguhan Sidi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nats Bacaan Alkitab:
                </label>
                <input
                  type="text"
                  value={scripture}
                  onChange={(e) => setScripture(e.target.value)}
                  placeholder="Misal: Mazmur 23:1-6, Yohanes 15:1-8"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tema / Judul Khotbah:
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Misal: Tuhan Gembala yang Memelihara Umat-Nya"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Masa / Kalender Gerejawi GMIT:
                </label>
                <select
                  value={liturgicalSeason}
                  onChange={(e) => setLiturgicalSeason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Minggu-minggu Biasa / Trinitas">Minggu-minggu Biasa / Trinitas</option>
                  <option value="Adven (Menanti Kedatangan Kristus)">Adven (Menanti Kedatangan Kristus)</option>
                  <option value="Natal & Epifania">Natal & Epifania</option>
                  <option value="Pra-Paskah & Minggu Sengsara">Pra-Paskah & Minggu Sengsara</option>
                  <option value="Paskah (Kebangkitan Kristus)">Paskah (Kebangkitan Kristus)</option>
                  <option value="Kenaikan & Pentakosta">Kenaikan & Pentakosta (Roh Kudus)</option>
                  <option value="Bulan Bahasa & Budaya Alor NTT">Bulan Bahasa & Budaya Alor NTT</option>
                  <option value="Bulan Keluarga & Lingkungan Hidup">Bulan Keluarga & Lingkungan Hidup</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Konteks Kehidupan Jemaat & Catatan Khusus:
                </label>
                <textarea
                  rows={3}
                  value={contextNotes}
                  onChange={(e) => setContextNotes(e.target.value)}
                  placeholder="Kondisi riil jemaat pedesaan di Alor Tengah Utara..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <button
                onClick={handleGenerateSermon}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{loading ? 'Menyusun Kerangka Khotbah...' : 'Hasilkan Draf Khotbah GMIT'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 min-h-[500px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-white text-sm">Draf Kerangka Khotbah Kontekstual</h4>
                  </div>
                  {sermonResult && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {sermonDocUrl ? (
                        <a
                          href={sermonDocUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <span>Buka di Google Docs</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <button
                          onClick={handleExportSermonToGoogleDoc}
                          disabled={exportingSermonDoc}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                          title="Simpan draf khotbah ini ke Google Docs baru"
                        >
                          {exportingSermonDoc ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                          )}
                          <span>{exportingSermonDoc ? 'Mengekspor...' : 'Ekspor ke Docs'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => copyToClipboard(sermonResult)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Cetak</span>
                      </button>
                    </div>
                  )}
                </div>

                {sermonResult ? (
                  <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line select-text">
                    {sermonResult}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500">
                    <BookOpen className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">Belum ada Draf Khotbah</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Pilih nats Alkitab dan tema di sebelah kiri, lalu tekan tombol "Hasilkan Draf Khotbah GMIT".
                    </p>
                  </div>
                )}
              </div>

              {sermonResult && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Draf khotbah siap dikembangkan oleh Pendeta / Majelis Jemaat.</span>
                  <span className="text-amber-400 font-semibold">{aiConfigured ? 'Gemini AI Reformed' : 'Draf Lokal Reformed'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 7: DOA PASTORAL & KUNJUNGAN */}
      {/* ==================================================== */}
      {activeTab === 'prayer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-amber-300">
                <HeartHandshake className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Data Kunjungan & Sasaran Doa</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kategori Pelayanan Pastoral:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ulang-tahun', label: 'Ulang Tahun / Syukur' },
                    { id: 'sakit', label: 'Orang Sakit / Pemulihan' },
                    { id: 'kunjungan-rumah', label: 'Lawatan Rumah Tangga' },
                    { id: 'duka', label: 'Penghiburan Kedukaan' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPrayerCategory(cat.id as any)}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition cursor-pointer ${
                        prayerCategory === cat.id
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {birthdayMembers.length > 0 && prayerCategory === 'ulang-tahun' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                    Jemaat Ulang Tahun Bulan Ini / Mendatang:
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => handleSelectMember(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Pilih dari Database Jemaat --</option>
                    {birthdayMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.birthDate || 'Tgl Lahir'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Warga Jemaat / Keluarga:
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Nama jemaat atau keluarga"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Usia / Umur:
                  </label>
                  <input
                    type="text"
                    value={customAge}
                    onChange={(e) => setCustomAge(e.target.value)}
                    placeholder="Misal: 72"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Rayon Pelayanan:
                  </label>
                  <input
                    type="text"
                    value={customRayon}
                    onChange={(e) => setCustomRayon(e.target.value)}
                    placeholder="Misal: Rayon 1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan Khusus / Kondisi Nyata:
                </label>
                <textarea
                  rows={3}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Misal: Sudah 2 minggu terbaring sakit di rumah, memohon pemulihan kesehatan dan penghiburan bagi keluarga..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <button
                onClick={handleGeneratePrayer}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HeartHandshake className="w-4 h-4" />}
                <span>{loading ? 'Menyusun Doa & Pesan Pastoral...' : 'Hasilkan Doa & Materi Pastoral'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 min-h-[500px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-white text-sm">Materi Lawatan Pastoral & Doa Khusus</h4>
                  </div>
                  {prayerResult && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyToClipboard(prayerResult)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
                      </button>
                      <button
                        onClick={() => shareToWhatsApp(prayerResult)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
                      </button>
                    </div>
                  )}
                </div>

                {prayerResult ? (
                  <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line select-text">
                    {prayerResult}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500">
                    <HeartHandshake className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">Belum ada Doa Pastoral</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Pilih kategori pelayanan di samping, masukkan nama jemaat, dan klik tombol untuk menghasilkan materi lawatan dan naskah doa.
                    </p>
                  </div>
                )}
              </div>

              {prayerResult && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Dilengkapi naskah doa dan pesan ringkas WhatsApp.</span>
                  <span className="text-emerald-400 font-semibold">{aiConfigured ? 'Gemini AI Pastoral' : 'Draf Lokal Pastoral'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 8: GENERATOR WARTA JEMAAT */}
      {/* ==================================================== */}
      {activeTab === 'warta' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-amber-300">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Penyusunan Butir-butir Warta</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tanggal Ibadah:
                  </label>
                  <input
                    type="date"
                    value={bulletinDate}
                    onChange={(e) => setBulletinDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Gaya Bahasa Warta:
                  </label>
                  <select
                    value={bulletinTone}
                    onChange={(e) => setBulletinTone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Hangat dan Menghidupkan Persekutuan">Hangat & Menghidupkan</option>
                    <option value="Formal Liturgis Resmi">Formal Liturgis Resmi</option>
                    <option value="Ringkas dan Informatif">Ringkas & Informatif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Daftar Pengumuman / Pokok Warta:
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {bulletinItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-2"
                    >
                      <span className="text-amber-400 font-bold shrink-0">{idx + 1}.</span>
                      <span className="flex-1 leading-relaxed">{item}</span>
                      <button
                        onClick={() => setBulletinItems(bulletinItems.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-red-400 text-xs font-bold px-1 transition cursor-pointer"
                        title="Hapus poin"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={newItemInput}
                    onChange={(e) => setNewItemInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newItemInput.trim()) {
                        setBulletinItems([...bulletinItems, newItemInput.trim()]);
                        setNewItemInput('');
                      }
                    }}
                    placeholder="Tambah pengumuman baru lalu tekan Enter..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => {
                      if (newItemInput.trim()) {
                        setBulletinItems([...bulletinItems, newItemInput.trim()]);
                        setNewItemInput('');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 transition cursor-pointer shrink-0"
                  >
                    Tambah
                  </button>
                </div>
              </div>

              <button
                onClick={handleGenerateWarta}
                disabled={loading || bulletinItems.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                <span>{loading ? 'Menyusun Warta Jemaat...' : 'Susun Warta Jemaat Lengkap'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="p-5 rounded-2xl bg-[#0b1226] border border-slate-800 min-h-[500px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-white text-sm">Naskah Warta Jemaat Siap Baca & Cetak</h4>
                  </div>
                  {wartaResult && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyToClipboard(wartaResult)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
                      </button>
                      <button
                        onClick={handleSaveToAnnouncements}
                        disabled={loading}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        {savedToWarta ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{savedToWarta ? 'Tersimpan!' : 'Publikasi ke Sistem'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {wartaResult ? (
                  <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line select-text">
                    {wartaResult}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500">
                    <FileText className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">Belum ada Naskah Warta</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Ketikkan pengumuman mingguan di sebelah kiri, lalu tekan tombol "Susun Warta Jemaat Lengkap" untuk merapikannya.
                    </p>
                  </div>
                )}
              </div>

              {wartaResult && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Warta tersusun rapi dengan salam pembuka, jadwal rayon, doa syafaat & salam berkat.</span>
                  <span className="text-amber-400 font-semibold">{aiConfigured ? 'Gemini AI Warta' : 'Draf Lokal Warta'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 9: ANALISIS PELAYANAN MAJELIS */}
      {/* ==================================================== */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0b1226] border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Analisis Strategis & Rekomendasi Pelayanan Majelis</h3>
                  <p className="text-xs text-slate-400">
                    Evaluasi otomatis terhadap komposisi jemaat, status sakramen (baptis/sidi), rayon, dan kategorial GMIT Betel Fuimelang.
                  </p>
                </div>
              </div>
              <button
                onClick={handleGenerateInsights}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{loading ? 'Menganalisis Data...' : 'Mulai Analisis AI Sekarang'}</span>
              </button>
            </div>

            {/* Quick Stats Summary for context */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block">Total Jiwa Jemaat</span>
                <span className="text-lg font-black text-amber-400">{members.length} Jiwa</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block">Sudah Dibaptis</span>
                <span className="text-lg font-black text-emerald-400">
                  {members.filter((m) => m.baptismStatus === 'Sudah').length} Jiwa
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block">Sudah Mengaku Sidi</span>
                <span className="text-lg font-black text-sky-400">
                  {members.filter((m) => m.confirmationStatus === 'Sudah').length} Jiwa
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block">Jumlah Rayon</span>
                <span className="text-lg font-black text-purple-400">{rayons.length} Rayon</span>
              </div>
            </div>

            {/* Analysis Result */}
            {insightsResult ? (
              <div className="mt-4 p-5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line select-text">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Laporan Rekomendasi Pelayanan Majelis Jemaat
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(insightsResult)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copied ? 'Tersalin' : 'Salin Laporan'}</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cetak</span>
                    </button>
                  </div>
                </div>
                {insightsResult}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center text-slate-500">
                <TrendingUp className="w-12 h-12 text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-400">Belum ada Analisis Pelayanan</p>
                <p className="text-xs text-slate-500 max-w-md mt-1">
                  Klik tombol "Mulai Analisis AI Sekarang" di atas untuk menganalisis data jemaat Anda dan mendapatkan rekomendasi pastoral bagi kepemimpinan Majelis GMIT Betel Fuimelang.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 10: ETIKA & PANDUAN PENGGUNAAN AI GEREJA */}
      {/* ==================================================== */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0b1226] border border-slate-800 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Pedoman Teologis & Etika Rohani Penggunaan AI di Gereja</h3>
                <p className="text-xs text-slate-400">
                  Memastikan teknologi kecerdasan buatan tetap menjadi sarana penopang pelayanan yang kudus, beretika, dan tidak menggantikan persekutuan pribadi dengan Tuhan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-[#0c1328] border border-slate-800 space-y-2">
                <span className="font-bold text-amber-300 block text-sm">1. AI adalah Alat, Bukan Gembala</span>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Urapan Roh Kudus, doa penumpangan tangan, air mata simpati bagi orang yang berduka, serta sentuhan pastoral pribadi tidak dapat digantikan oleh mesin. AI hanya membantu mempercepat persiapan bahan ajar, draf tulisan, dan kerapian administrasi kantor gereja.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0c1328] border border-slate-800 space-y-2">
                <span className="font-bold text-amber-300 block text-sm">2. Kerahasiaan Penggembalaan</span>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Pokok pengakuan dosa, nama korban kekerasan, pergumulan intim rumah tangga, atau rahasia konsistori gereja tidak boleh dimasukkan ke dalam sistem AI publik. Selalu hormati privasi dan kehormatan warga jemaat sebagai bait Allah yang kudus.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0c1328] border border-slate-800 space-y-2">
                <span className="font-bold text-amber-300 block text-sm">3. Verifikasi Teologis Alkitabiah</span>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Setiap draf khotbah, renungan harian, dan tata ibadah yang dihasilkan wajib diteliti kembali oleh Pendeta atau Presbiter bertugas agar selaras dengan Kitab Suci (TB LAI), Tata Gereja GMIT, dan tradisi Reformasi Injili.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
