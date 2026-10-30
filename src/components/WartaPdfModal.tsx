import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FileText,
  Download,
  Share2,
  Printer,
  Sparkles,
  Check,
  Copy,
  Calendar,
  MessageCircle,
  Plus,
  Trash2,
  BookOpen,
  DollarSign,
  Users,
  Heart,
  ChevronRight,
  Eye,
  Edit3,
  ExternalLink,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';
import type { FinancialTransaction, Member, Rayon, ChurchSettings } from '../types/index.ts';
import { OfficialLetterhead } from './OfficialLetterhead.tsx';
import { DEFAULT_CHURCH_SETTINGS } from '../utils/church-settings.ts';
import { getWorkspaceAccessToken, createGoogleDoc } from '../services/workspace.ts';

interface WartaPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions?: FinancialTransaction[];
  members?: Member[];
  rayons?: Rayon[];
  churchSettings?: ChurchSettings;
}

export const WartaPdfModal: React.FC<WartaPdfModalProps> = ({
  isOpen,
  onClose,
  transactions = [],
  members = [],
  rayons = [],
  churchSettings = DEFAULT_CHURCH_SETTINGS,
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'whatsapp'>('preview');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);

  // Google Docs export state
  const [exportingDoc, setExportingDoc] = useState(false);
  const [docExportUrl, setDocExportUrl] = useState<string | null>(null);
  const [docFeedback, setDocFeedback] = useState<string | null>(null);

  // Warta Jemaat Content State
  const [wartaTitle, setWartaTitle] = useState('WARTA JEMAAT MINGGU');
  const [wartaEdition, setWartaEdition] = useState('');
  const [wartaDate, setWartaDate] = useState(() => {
    const today = new Date();
    // Default to coming Sunday or today
    const day = today.getDay();
    const diff = today.getDate() + (day === 0 ? 0 : 7 - day);
    const sunday = new Date(today.setDate(diff));
    return sunday.toISOString().substring(0, 10);
  });

  const [scriptureTheme, setScriptureTheme] = useState('');
  const [scriptureText, setScriptureText] = useState('');
  
  // Officers
  const [preacher, setPreacher] = useState('');
  const [liturgist, setLiturgist] = useState('');
  const [dutyElders, setDutyElders] = useState('');
  const [dutyDeacons, setDutyDeacons] = useState('');
  const [musicians, setMusicians] = useState('');
  const [songLeader, setSongLeader] = useState('');

  // Bulletin Points
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  // Rayon rows are based on live administrative data, not sample schedules.
  const [rayonSchedules, setRayonSchedules] = useState<Array<{ rayon: string; day: string; host: string; leader: string }>>([]);

  useEffect(() => {
    if (rayonSchedules.length === 0 && rayons.length > 0) {
      setRayonSchedules(rayons.map((rayon) => ({
        rayon: `${rayon.name}${rayon.coverageArea ? ` (${rayon.coverageArea})` : ''}`,
        day: '',
        host: '',
        leader: rayon.leaderName || '',
      })));
    }
  }, [rayons, rayonSchedules.length]);

  // Financial Summary
  const [incomeAmount, setIncomeAmount] = useState('0');
  const [expenseAmount, setExpenseAmount] = useState('0');
  const [endingBalance, setEndingBalance] = useState('0');

  useEffect(() => {
    const income = transactions.filter((tx) => tx.type === 'Pemasukan').reduce((sum, tx) => sum + tx.amount, 0);
    const expense = transactions.filter((tx) => tx.type === 'Pengeluaran').reduce((sum, tx) => sum + tx.amount, 0);
    const formatNumber = (value: number) => new Intl.NumberFormat('id-ID').format(value);
    setIncomeAmount(formatNumber(income));
    setExpenseAmount(formatNumber(expense));
    setEndingBalance(formatNumber(income - expense));
  }, [isOpen, transactions]);

  // Ref for PDF Capture
  const pdfPrintRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Add announcement
  const handleAddAnnouncement = () => {
    if (!newAnnouncement.trim()) return;
    setAnnouncements([...announcements, newAnnouncement.trim()]);
    setNewAnnouncement('');
  };

  const handleRemoveAnnouncement = (index: number) => {
    setAnnouncements(announcements.filter((_, i) => i !== index));
  };

  // Generate PDF Document
  const handleDownloadPdf = async () => {
    if (!pdfPrintRef.current) return;
    setDownloadingPdf(true);

    try {
      const element = pdfPrintRef.current;
      
      // html-to-image uses the browser renderer, which supports the modern
      // CSS colors used by the application (html2canvas rejects oklch).
      await Promise.all(Array.from(element.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined)));
      const canvas = await toCanvas(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
      });
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const sliceHeight = Math.ceil(canvas.width * pdfPageHeight / pdfWidth);
      // Long warta must continue onto additional pages rather than being cut off.
      for (let offset = 0; offset < canvas.height; offset += sliceHeight) {
        const height = Math.min(sliceHeight, canvas.height - offset);
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = height;
        const context = slice.getContext('2d');
        if (!context) throw new Error('Tidak dapat menyiapkan halaman PDF.');
        context.drawImage(canvas, 0, offset, canvas.width, height, 0, 0, canvas.width, height);
        if (offset > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, height * pdfWidth / canvas.width);
      }
      
      const fileName = `WARTA_JEMAAT_GMIT_BETEL_${wartaDate}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Gagal membuat PDF:', err);
      // Fallback to window.print
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Native Print
  const handlePrint = () => {
    window.print();
  };

  // Compile WhatsApp Text
  const generateWhatsAppMessage = () => {
    const formattedDate = new Date(wartaDate).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let msg = `*WARTA JEMAAT GMIT BETEL FUIMELANG*\n`;
    msg += `_Klasis Alor Tengah Utara · Desa Lembur Tengah_\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📅 *${formattedDate}*\n`;
    msg += `🕊️ *Edisi:* ${wartaEdition}\n\n`;
    
    msg += `📖 *Tema Firman:* ${scriptureTheme}\n`;
    msg += `📜 *Bacaan Alkitab:* ${scriptureText}\n`;
    msg += `🎙️ *Pelayan Firman:* ${preacher}\n`;
    msg += `👤 *Liturgos:* ${liturgist}\n\n`;

    msg += `📢 *POKOK WARTA & KEGIATAN MINGGU INI:*\n`;
    announcements.forEach((a, idx) => {
      msg += `${idx + 1}. ${a}\n`;
    });
    msg += `\n`;

    msg += `🏠 *JADWAL IBADAH RAYON:*\n`;
    if (rayonSchedules.length === 0) msg += `Belum ada jadwal rayon yang dicatat.\n`;
    rayonSchedules.forEach((r) => {
      msg += `• *${r.rayon}*\n   Tempat: ${r.host} (Pelayan: ${r.leader})\n`;
    });
    msg += `\n`;

    msg += `💰 *KAS JEMAAT MINGGU LALU:*\n`;
    msg += `• Pemasukan: Rp ${incomeAmount}\n`;
    msg += `• Pengeluaran: Rp ${expenseAmount}\n`;
    msg += `• Saldo Kas: Rp ${endingBalance}\n\n`;

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🙏 _Tuhan Yesus Kepala Gereja Memberkati Seluruh Warga Jemaat GMIT Betel Fuimelang._\n`;
    msg += `📄 *Catatan:* File PDF resmi Warta Jemaat dapat diunduh melalui pengurus Rayon/Majelis Jemaat.`;

    return msg;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2500);
  };

  const handleOpenWhatsAppShare = () => {
    const text = generateWhatsAppMessage();
    const encoded = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleExportWartaToGoogleDoc = async () => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      setDocFeedback('Silakan hubungkan akun Google Anda di menu "Google Workspace" terlebih dahulu.');
      setTimeout(() => setDocFeedback(null), 4500);
      return;
    }
    setExportingDoc(true);
    try {
      const compiledText = `${wartaTitle.toUpperCase()} — ${wartaEdition}\nGMIT Betel Fuimelang · Klasis Alor Tengah Utara\nTanggal: ${new Date(wartaDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n\nI. FIRMAN & BACAAN ALKITAB\nTema: ${scriptureTheme}\nNats: ${scriptureText}\n\nII. PELAYAN KEBAKTIAN\nPelayan Firman : ${preacher}\nLiturgos       : ${liturgist}\nMajelis Bertugas : ${dutyElders}\nDiaken Bertugas  : ${dutyDeacons}\nPemusik / Kantor : ${musicians} / ${songLeader}\n\nIII. WARTA PELAYANAN & KEGIATAN JEMAAT\n${announcements.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nIV. JADWAL IBADAH RAYON\n${rayonSchedules.map((r) => `• ${r.rayon}: ${r.day} di Keluarga ${r.host} (Pelayan: ${r.leader})`).join('\n')}\n\nV. KEUANGAN KAS JEMAAT\n- Pemasukan  : Rp ${incomeAmount}\n- Pengeluaran: Rp ${expenseAmount}\n- Saldo Kas  : Rp ${endingBalance}\n\nKetua Majelis Jemaat : ${churchSettings.signerName}\nSekretaris Majelis   : ${churchSettings.secretaryName}`;

      const res = await createGoogleDoc(token, `${wartaTitle} - ${wartaEdition || 'Mingguan'}`, compiledText);
      setDocExportUrl(res.url);
      setDocFeedback('Warta jemaat berhasil diekspor ke Google Docs!');
      setTimeout(() => setDocFeedback(null), 4500);
    } catch (err: any) {
      setDocFeedback(`Gagal ekspor: ${err?.message || 'Terjadi kesalahan'}`);
      setTimeout(() => setDocFeedback(null), 4500);
    } finally {
      setExportingDoc(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-5xl bg-[#090e1d] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-amber-500/20 bg-[#060a16]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold shadow-inner">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Penyusunan & Publikasi Warta Jemaat (PDF & WhatsApp)
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Resmi GMIT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                GMIT Betel Fuimelang · Klasis Alor Tengah Utara · Siap Cetak A4 & Share Grup Rayon
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#070c18] px-4 sm:px-6 text-xs">
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-4 font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'preview'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>1. Pratinjau Dokumen PDF A4</span>
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`py-3 px-4 font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'edit'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>2. Sunting Isi Warta</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`py-3 px-4 font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>3. Publikasi ke WhatsApp Jemaat</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: PREVIEW & DOWNLOAD PDF */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* Quick Actions Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0c142b] border border-amber-500/25">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="font-bold text-white">Format Cetak:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-mono">
                    Standar A4 (210 x 297 mm)
                  </span>
                  <span>·</span>
                  <span className="text-amber-300">{wartaEdition}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 transition cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloadingPdf ? 'Membuat PDF...' : 'Unduh PDF (.pdf)'}</span>
                  </button>

                  {docExportUrl ? (
                    <a
                      href={docExportUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                    >
                      <span>Buka Google Doc</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <button
                      onClick={handleExportWartaToGoogleDoc}
                      disabled={exportingDoc}
                      className="py-2 px-3.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
                      title="Ekspor seluruh warta ini ke Google Docs"
                    >
                      {exportingDoc ? (
                        <span className="w-3.5 h-3.5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-300" />
                      )}
                      <span>{exportingDoc ? 'Mengekspor...' : 'Ekspor ke Docs'}</span>
                    </button>
                  )}

                  <button
                    onClick={handlePrint}
                    className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-sky-400" />
                    <span>Cetak</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('whatsapp')}
                    className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {docFeedback && (
                <div className="p-3 rounded-xl bg-blue-950/70 border border-blue-500/40 text-blue-200 text-xs flex items-center justify-between">
                  <span>{docFeedback}</span>
                  <button onClick={() => setDocFeedback(null)} className="text-blue-400 hover:text-white p-1">✕</button>
                </div>
              )}

              {/* A4 Paper Document Preview Container */}
              <div className="flex justify-center bg-slate-950/80 p-2 sm:p-6 rounded-2xl border border-slate-800 overflow-x-auto">
                <div
                  ref={pdfPrintRef}
                  className="w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 shadow-2xl flex flex-col justify-between font-sans text-xs leading-relaxed"
                  style={{ boxSizing: 'border-box' }}
                >
                  {/* Kop Surat Gereja */}
                  <div>
                    <OfficialLetterhead settings={churchSettings} compact />

                    {/* Banner Warta Jemaat */}
                    <div className="bg-slate-100 border border-slate-300 p-2.5 rounded-lg mb-4 text-center">
                      <h3 className="text-xs font-black tracking-widest uppercase text-slate-950">
                        {wartaTitle}
                      </h3>
                      <p className="text-[11px] font-bold text-slate-800">
                        {wartaEdition} · Tanggal: {new Date(wartaDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Section 1: Tema & Petugas Kebaktian */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {/* Firman */}
                      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
                          FIRMAN & BACAAN ALKITAB
                        </span>
                        <p className="font-bold text-slate-900 text-[11px]">
                          {scriptureTheme}
                        </p>
                        <p className="text-[10px] text-slate-700 mt-0.5 italic">
                          Nats: {scriptureText}
                        </p>
                      </div>

                      {/* Petugas */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                          PELAYAN KEBAKTIAN MINGGU
                        </span>
                        <div><strong>Pelayan Firman:</strong> {preacher}</div>
                        <div><strong>Liturgos:</strong> {liturgist}</div>
                        <div><strong>Majelis Bertugas:</strong> {dutyElders}</div>
                        <div><strong>Diaken Bertugas:</strong> {dutyDeacons}</div>
                        <div><strong>Pemusik & Kantoria:</strong> {musicians} / {songLeader}</div>
                      </div>
                    </div>

                    {/* Section 2: Pokok-Pokok Warta Jemaat */}
                    <div className="mb-4">
                      <div className="border-b border-slate-800 pb-1 mb-2 flex items-center justify-between">
                        <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-900">
                          I. WARTA PELAYANAN & KEGIATAN JEMAAT
                        </h4>
                        <span className="text-[9px] text-slate-500">Pemberitahuan Resmi</span>
                      </div>
                      <ol className="list-decimal pl-4 space-y-1 text-[10px] text-slate-800 leading-normal">
                        {announcements.map((item, i) => (
                          <li key={i} className="pl-1">
                            {item}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Section 3: Jadwal Ibadah Rayon */}
                    <div className="mb-4">
                      <div className="border-b border-slate-800 pb-1 mb-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-900">
                          II. JADWAL IBADAH RAYON (PERSEKUTUAN DOA)
                        </h4>
                      </div>
                      <table className="w-full text-left text-[9.5px] border-collapse">
                        <thead>
                          <tr className="bg-slate-200 text-slate-900 border-b border-slate-400">
                            <th className="py-1 px-2 font-bold">Wilayah Pelayanan</th>
                            <th className="py-1 px-2 font-bold">Waktu</th>
                            <th className="py-1 px-2 font-bold">Tempat Ibadah (Keluarga)</th>
                            <th className="py-1 px-2 font-bold">Pelayan / Penatua</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {rayonSchedules.length === 0 && <tr><td colSpan={4} className="py-2 px-2 text-slate-500 italic">Belum ada jadwal rayon yang dicatat.</td></tr>}
                          {rayonSchedules.map((r, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="py-1 px-2 font-semibold text-slate-900">{r.rayon}</td>
                              <td className="py-1 px-2">{r.day}</td>
                              <td className="py-1 px-2 font-medium">{r.host}</td>
                              <td className="py-1 px-2">{r.leader}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Section 4: Ringkasan Kas & Keuangan */}
                    <div className="mb-4 p-2.5 bg-slate-50 border border-slate-300 rounded-lg">
                      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-900 mb-1">
                        III. LAPORAN KEUANGAN KAS JEMAAT MINGGU LALU
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="p-1.5 bg-white border border-slate-200 rounded">
                          <span className="text-[8.5px] text-slate-500 uppercase block">Total Pemasukan</span>
                          <span className="font-bold text-emerald-700">Rp {incomeAmount}</span>
                        </div>
                        <div className="p-1.5 bg-white border border-slate-200 rounded">
                          <span className="text-[8.5px] text-slate-500 uppercase block">Total Pengeluaran</span>
                          <span className="font-bold text-rose-700">Rp {expenseAmount}</span>
                        </div>
                        <div className="p-1.5 bg-white border border-slate-200 rounded">
                          <span className="text-[8.5px] text-slate-500 uppercase block">Saldo Kas Saat Ini</span>
                          <span className="font-bold text-slate-900">Rp {endingBalance}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Tanda Tangan */}
                  <div className="pt-4 border-t border-slate-300 mt-4 text-[10px]">
                    <div className="flex justify-between items-end">
                      <div className="text-center w-48">
                        <p className="text-slate-600">Mengetahui,</p>
                        <p className="font-bold text-slate-900">{churchSettings.signerRole}</p>
                        <div className="h-12 flex items-center justify-center text-[9px] text-slate-400 italic">
                          {churchSettings.stampUrl ? <img src={churchSettings.stampUrl} alt="Cap resmi" className="max-h-full max-w-20 object-contain" /> : '(Tanda Tangan & Cap)'}
                        </div>
                        <p className="font-bold underline text-slate-950">{churchSettings.signerName || '............................'}</p>
                      </div>

                      <div className="text-center text-[9px] text-slate-500 max-w-[200px]">
                        <p className="italic">&quot;Layanilah seorang akan yang lain, sesuai dengan karunia yang telah diperoleh tiap-tiap orang sebagai pengurus yang baik dari kasih karunia Allah.&quot;</p>
                        <p className="font-bold mt-0.5">— 1 Petrus 4:10</p>
                      </div>

                      <div className="text-center w-48">
                        <p className="text-slate-600">Fuimelang, {new Date(wartaDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p className="font-bold text-slate-900">{churchSettings.secretaryRole || 'Sekretaris Majelis Jemaat'}</p>
                        <div className="h-12 flex items-center justify-center text-[9px] text-slate-400 italic">
                          (Tanda Tangan)
                        </div>
                        <p className="font-bold underline text-slate-950">{churchSettings.secretaryName || '............................'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT WARTA FORM */}
          {activeTab === 'edit' && (
            <div className="space-y-5 text-xs text-slate-200">
              {/* Form 1: Informasi Pokok */}
              <div className="p-5 rounded-2xl bg-[#0c142b] border border-slate-800 space-y-4">
                <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Informasi Edisi & Waktu Kebaktian</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Judul Dokumen</label>
                    <input
                      type="text"
                      value={wartaTitle}
                      onChange={(e) => setWartaTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Edisi / Minggu Liturgi</label>
                    <input
                      type="text"
                      value={wartaEdition}
                      onChange={(e) => setWartaEdition(e.target.value)}
                      placeholder="Contoh: Minggu XXI Setelah Pentakosta"
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tanggal Ibadah Minggu</label>
                    <input
                      type="date"
                      value={wartaDate}
                      onChange={(e) => setWartaDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Form 2: Tema & Nats Firman */}
              <div className="p-5 rounded-2xl bg-[#0c142b] border border-slate-800 space-y-4">
                <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Tema Khotbah & Pelayan Firman</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tema Khotbah Minggu</label>
                    <input
                      type="text"
                      value={scriptureTheme}
                      onChange={(e) => setScriptureTheme(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Nats Bacaan Alkitab</label>
                    <input
                      type="text"
                      value={scriptureText}
                      onChange={(e) => setScriptureText(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Pelayan Firman (Pengkhotbah)</label>
                    <input
                      type="text"
                      value={preacher}
                      onChange={(e) => setPreacher(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Liturgos (Penatua Tugas)</label>
                    <input
                      type="text"
                      value={liturgist}
                      onChange={(e) => setLiturgist(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Form 3: Poin-Poin Warta Jemaat */}
              <div className="p-5 rounded-2xl bg-[#0c142b] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Daftar Poin Pengumuman Warta</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">{announcements.length} Poin Terdaftar</span>
                </div>

                <div className="space-y-2">
                  {announcements.map((a, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-[#050811] border border-slate-800">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-slate-200">{a}</span>
                      <button
                        onClick={() => handleRemoveAnnouncement(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAnnouncement()}
                    placeholder="Ketik poin warta / kegiatan baru..."
                    className="flex-1 px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleAddAnnouncement}
                    className="py-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Poin</span>
                  </button>
                </div>
              </div>

              {/* Form 4: Jadwal Ibadah Rayon */}
              <div className="p-5 rounded-2xl bg-[#0c142b] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2"><Users className="w-4 h-4" /><span>Jadwal Ibadah Rayon</span></h4>
                  <button onClick={() => setRayonSchedules((rows) => [...rows, { rayon: '', day: '', host: '', leader: '' }])} className="py-1.5 px-3 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center gap-1 text-[11px]"><Plus className="w-3.5 h-3.5" /> Tambah</button>
                </div>
                {rayonSchedules.length === 0 && <p className="text-slate-500 text-xs">Belum ada jadwal rayon. Tambahkan hanya jadwal yang telah disahkan.</p>}
                {rayonSchedules.map((row, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                    {(['rayon', 'day', 'host', 'leader'] as const).map((field) => (
                      <input key={field} value={row[field]} onChange={(event) => setRayonSchedules((rows) => rows.map((item, i) => i === index ? { ...item, [field]: event.target.value } : item))} placeholder={{ rayon: 'Rayon / wilayah', day: 'Hari & waktu', host: 'Keluarga / tempat', leader: 'Pelayan' }[field]} className="px-2.5 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400" />
                    ))}
                  </div>
                ))}
              </div>

              {/* Form 5: Ringkasan Kas */}
              <div className="p-5 rounded-2xl bg-[#0c142b] border border-slate-800 space-y-4">
                <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Ringkasan Keuangan Kas Jemaat (Warta Lisan)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Total Pemasukan (Rp)</label>
                    <input
                      type="text"
                      value={incomeAmount}
                      onChange={(e) => setIncomeAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Total Pengeluaran (Rp)</label>
                    <input
                      type="text"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-rose-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Saldo Kas Terakhir (Rp)</label>
                    <input
                      type="text"
                      value={endingBalance}
                      onChange={(e) => setEndingBalance(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setActiveTab('preview')}
                  className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-2 cursor-pointer transition shadow-md"
                >
                  <Eye className="w-4 h-4" />
                  <span>Lihat Hasil Pratinjau Dokumen PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: WHATSAPP SHARE */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">
                    Publikasi Warta Jemaat ke Grup WhatsApp Warga GMIT Betel
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Pesan di bawah ini telah diformat otomatis lengkap dengan ringkasan nats khotbah, jadwal persekutuan Rayon I s/d IV, serta laporan kas gereja. Anda dapat langsung membuka WhatsApp atau menyalin pesan untuk disebar ke grup WhatsApp Majelis dan Rayon.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleOpenWhatsAppShare}
                  className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/50 transition cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Buka WhatsApp Web / Aplikasi (Kirim Otomatis)</span>
                </button>

                <button
                  onClick={handleCopyWhatsApp}
                  className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer"
                >
                  {copiedWa ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-amber-400" />}
                  <span>{copiedWa ? 'Tersalin ke Clipboard!' : 'Salin Seluruh Teks Warta WhatsApp'}</span>
                </button>
              </div>

              {/* Live WhatsApp Bubble Preview */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#050811] p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Pratinjau Format Pesan WhatsApp:
                  </span>
                  <span className="text-[11px] text-slate-400">Siap Bagikan ke Rayon I - IV</span>
                </div>

                <div className="bg-[#0b141a] p-4 rounded-xl border border-emerald-900/40 text-emerald-100 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-text max-h-96 overflow-y-auto shadow-inner">
                  {generateWhatsAppMessage()}
                </div>
              </div>

              {/* WhatsApp Distribution Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#0a1228] border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-1">Langkah 1</span>
                  <p className="text-slate-400 text-[11px]">
                    Klik <strong>Unduh PDF</strong> di tab Pratinjau untuk menyimpan file warta resmi di laptop / HP Anda.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0a1228] border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-1">Langkah 2</span>
                  <p className="text-slate-400 text-[11px]">
                    Klik <strong>Buka WhatsApp</strong> atau <strong>Salin Teks</strong> untuk mem-paste teks ringkasan ke grup jemaat.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0a1228] border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-1">Langkah 3</span>
                  <p className="text-slate-400 text-[11px]">
                    Lampirkan file PDF dokumen warta ke pesan WhatsApp agar jemaat dapat membaca versi cetak resminya.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#060a16] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Publikasi digital GMIT Betel Fuimelang · Terintegrasi PDF A4 & WhatsApp Gateway
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
