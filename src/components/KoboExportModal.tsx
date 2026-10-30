import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileCode,
  FileText,
  CheckCircle2,
  ExternalLink,
  Layers,
  HelpCircle,
  Copy,
  Check,
  Send,
  AlertCircle,
  Filter,
} from 'lucide-react';
import type { Member, Rayon } from '../types/index.ts';
import {
  generateKoboCsv,
  generateKoboJson,
  generateKoboSurveySchema,
  downloadFile,
} from '../utils/kobo-export.ts';

interface KoboExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  rayons: Rayon[];
}

export const KoboExportModal: React.FC<KoboExportModalProps> = ({
  isOpen,
  onClose,
  members,
  rayons,
}) => {
  const [activeTab, setActiveTab] = useState<'data' | 'schema' | 'api'>('data');
  const [selectedRayon, setSelectedRayon] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [copied, setCopied] = useState<boolean>(false);
  const [apiServer, setApiServer] = useState<string>('https://kf.kobotoolbox.org');
  const [apiToken, setApiToken] = useState<string>('');
  const [assetUid, setAssetUid] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });

  if (!isOpen) return null;

  // Filter members based on user selection
  const filtered = members.filter((m) => {
    if (selectedRayon !== 'all' && m.rayonId !== selectedRayon) return false;
    if (selectedStatus !== 'all' && m.status !== selectedStatus) return false;
    return true;
  });

  const handleDownloadCsv = () => {
    const csv = generateKoboCsv(filtered);
    const dateStr = new Date().toISOString().substring(0, 10);
    const fileName = `KoboToolbox_Jemaat_GMIT_Betel_${selectedRayon === 'all' ? 'SemuaRayon' : selectedRayon}_${dateStr}.csv`;
    downloadFile(csv, fileName, 'text/csv;charset=utf-8;');
  };

  const handleDownloadJson = () => {
    const jsonStr = generateKoboJson(filtered);
    const dateStr = new Date().toISOString().substring(0, 10);
    const fileName = `KoboToolbox_Jemaat_GMIT_Betel_${dateStr}.json`;
    downloadFile(jsonStr, fileName, 'application/json;charset=utf-8;');
  };

  const handleDownloadSchema = () => {
    const schema = generateKoboSurveySchema();
    const fileName = `XLSForm_Pendataan_GMIT_Betel_Fuimelang_2026.csv`;
    downloadFile(schema, fileName, 'text/csv;charset=utf-8;');
  };

  const handleCopySchema = () => {
    const schema = generateKoboSurveySchema();
    navigator.clipboard.writeText(schema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopySampleJson = () => {
    const sample = generateKoboJson(filtered.slice(0, 2));
    navigator.clipboard.writeText(sample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-[#090e1d] border border-teal-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-teal-500/20 bg-[#060a16]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 font-bold text-lg shadow-inner">
              K
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Ekspor Database Jemaat ke KoboToolbox
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  XLSForm / Kobo v2
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                GMIT Betel Fuimelang · Desa Lembur Tengah, Klasis Alor Tengah Utara
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

        {/* Filter Controls Bar */}
        <div className="p-4 bg-[#0a1228] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Filter className="w-4 h-4 text-teal-400" />
              <span>Filter Data:</span>
            </div>

            <select
              value={selectedRayon}
              onChange={(e) => setSelectedRayon(e.target.value)}
              className="px-3 py-1.5 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-teal-400"
            >
              <option value="all">Semua Rayon (Rayon I - IV)</option>
              {rayons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-teal-400"
            >
              <option value="all">Semua Status</option>
              <option value="Aktif">Hanya Jemaat Aktif</option>
              <option value="Pindah">Jemaat Pindah</option>
              <option value="Meninggal">Jemaat Meninggal</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-semibold">
              {filtered.length} dari {members.length} Jemaat Terpilih
            </span>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-[#070b18] px-6 text-xs">
          <button
            onClick={() => setActiveTab('data')}
            className={`py-3 px-4 font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'data'
                ? 'border-teal-400 text-teal-300 bg-teal-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Unduh Data Submisi (CSV & JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 px-4 font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'schema'
                ? 'border-teal-400 text-teal-300 bg-teal-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Skema Formulir Kobo (XLSForm)</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`py-3 px-4 font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'api'
                ? 'border-teal-400 text-teal-300 bg-teal-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>Panduan & REST API KoboToolbox</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300">
          {/* TAB 1: DATA EXPORT */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-teal-950/30 border border-teal-500/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-teal-200 text-sm">
                    Format Siap Impor ke KoboToolbox / Excel
                  </h4>
                  <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                    Data yang diekspor telah diformat lengkap dengan header standar KoboToolbox (
                    <code className="bg-slate-900 px-1 py-0.5 rounded text-teal-300">_id</code>,{' '}
                    <code className="bg-slate-900 px-1 py-0.5 rounded text-teal-300">_uuid</code>,{' '}
                    <code className="bg-slate-900 px-1 py-0.5 rounded text-teal-300">_submission_time</code>,{' '}
                    <code className="bg-slate-900 px-1 py-0.5 rounded text-teal-300">member_no</code>, dll) serta encoding UTF-8 dengan BOM agar terbaca sempurna di Microsoft Excel, KoboToolbox Web, dan aplikasi analisis statistik.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#0e162e] border border-slate-800 hover:border-teal-500/40 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                        <span className="font-bold text-white text-sm">KoboToolbox CSV</span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        Paling Populer
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mb-4">
                      File spreadsheet CSV berisi data lengkap {filtered.length} jemaat siap di-upload ke menu Data KoboToolbox atau dibuka di Excel / Google Sheets.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadCsv}
                    disabled={filtered.length === 0}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh CSV KoboToolbox ({filtered.length} Data)</span>
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-[#0e162e] border border-slate-800 hover:border-teal-500/40 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-sky-400" />
                        <span className="font-bold text-white text-sm">Kobo REST API JSON</span>
                      </div>
                      <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full">
                        Developer & Sync
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mb-4">
                      Array payload JSON standar struktur KoboToolbox v2 REST API (<code className="text-sky-300">/api/v2/assets/</code>) untuk integrasi webhook atau database luar.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadJson}
                    disabled={filtered.length === 0}
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30 disabled:opacity-50 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Payload JSON ({filtered.length} Data)</span>
                  </button>
                </div>
              </div>

              {/* Data Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-200">
                    Pratinjau Kolom KoboToolbox (5 Data Pertama):
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Menampilkan variabel yang dikirim ke Kobo
                  </span>
                </div>
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#050811]">
                  <div className="overflow-x-auto max-h-60">
                    <table className="w-full text-left text-[11px] whitespace-nowrap">
                      <thead className="bg-[#0b1226] text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold text-teal-300">_id</th>
                          <th className="py-2.5 px-3 font-semibold">member_no</th>
                          <th className="py-2.5 px-3 font-semibold">full_name</th>
                          <th className="py-2.5 px-3 font-semibold">gender</th>
                          <th className="py-2.5 px-3 font-semibold">birth_date</th>
                          <th className="py-2.5 px-3 font-semibold">rayon_id</th>
                          <th className="py-2.5 px-3 font-semibold">baptism_status</th>
                          <th className="py-2.5 px-3 font-semibold">confirmation_status</th>
                          <th className="py-2.5 px-3 font-semibold">phone</th>
                          <th className="py-2.5 px-3 font-semibold">address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-6 text-center text-slate-500">
                              Tidak ada data jemaat yang sesuai dengan filter.
                            </td>
                          </tr>
                        ) : (
                          filtered.slice(0, 5).map((m, i) => (
                            <tr key={m.id} className="hover:bg-slate-800/40">
                              <td className="py-2 px-3 font-mono text-teal-400">{i + 1}</td>
                              <td className="py-2 px-3 font-mono text-amber-300">{m.memberNo}</td>
                              <td className="py-2 px-3 font-medium text-white">{m.fullName}</td>
                              <td className="py-2 px-3">{m.gender}</td>
                              <td className="py-2 px-3 font-mono">{m.birthDate}</td>
                              <td className="py-2 px-3">{m.rayonName || m.rayonId}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                  m.baptismStatus === 'Sudah' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {m.baptismStatus}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                  m.confirmationStatus === 'Sudah' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {m.confirmationStatus}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono">{m.phone || '-'}</td>
                              <td className="py-2 px-3 truncate max-w-[200px]">{m.address || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: XLSFORM SURVEY SCHEMA */}
          {activeTab === 'schema' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
                <Layers className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-200 text-sm">
                    XLSForm Schema Standar Survei Lapangan GMIT Betel Fuimelang
                  </h4>
                  <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                    Gunakan skema ini untuk membuat formulir digital baru di akun KoboToolbox gereja. Formulir ini kompatibel 100% dengan aplikasi Android <strong>KoboCollect</strong> untuk sensus jemaat door-to-door oleh Majelis Rayon I, II, III, dan IV tanpa internet.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-bold text-white text-sm">
                  Struktur Skema Survey, Choices, & Settings:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySchema}
                    className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-2 border border-slate-700 transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Tersalin!' : 'Salin Skema'}</span>
                  </button>
                  <button
                    onClick={handleDownloadSchema}
                    className="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-teal-900/30 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh File XLSForm (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Code display */}
              <div className="bg-[#050811] border border-slate-800 rounded-2xl p-4 font-mono text-[11px] overflow-x-auto max-h-80 text-teal-300 leading-relaxed">
                <pre>{generateKoboSurveySchema()}</pre>
              </div>

              {/* Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0a1024] border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-1">Langkah 1</span>
                  <p className="text-slate-400 text-[11px]">
                    Buka situs <strong>kobotoolbox.org</strong> dan masuk ke akun sekretariat gereja GMIT Betel.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0a1024] border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-1">Langkah 2</span>
                  <p className="text-slate-400 text-[11px]">
                    Klik <strong>New Project</strong> → <strong>Upload an XLSForm</strong> lalu pilih file yang diunduh.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0a1024] border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-1">Langkah 3</span>
                  <p className="text-slate-400 text-[11px]">
                    Klik <strong>Deploy</strong>. Bagikan QR Code form ke tim Majelis Rayon untuk diisi di HP.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REST API & SYNC */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/30 flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sky-200 text-sm">
                    Sinkronisasi Langsung ke Server KoboToolbox via REST API v2
                  </h4>
                  <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                    KoboToolbox menyediakan REST API v2 publik untuk mengirimkan formulir submisi secara langsung dari aplikasi SYSJEGER.
                  </p>
                </div>
              </div>

              {/* API Form */}
              <div className="p-5 rounded-2xl bg-[#0a1228] border border-slate-800 space-y-4">
                <h4 className="font-bold text-white text-xs">
                  Konfigurasi Kredensial Server KoboToolbox:
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      URL Server KoboToolbox
                    </label>
                    <select
                      value={apiServer}
                      onChange={(e) => setApiServer(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-teal-400"
                    >
                      <option value="https://kf.kobotoolbox.org">
                        Kobo Global Server (kf.kobotoolbox.org)
                      </option>
                      <option value="https://eu.kobotoolbox.org">
                        European Union Server (eu.kobotoolbox.org)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Asset UID Formulir Kobo
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: aXkY79mPqL2"
                      value={assetUid}
                      onChange={(e) => setAssetUid(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-teal-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 font-semibold mb-1">
                      Kobo API Token (Bisa didapat di Kobo Account Settings → Security)
                    </label>
                    <input
                      type="password"
                      placeholder="Token API rahasia KoboToolbox Anda"
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                {apiStatus.message && (
                  <div className={`p-3 rounded-xl flex items-center gap-2 text-xs ${
                    apiStatus.type === 'success' 
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200' 
                      : 'bg-red-950/60 border border-red-500/40 text-red-200'
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{apiStatus.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleCopySampleJson}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Sampel Payload JSON</span>
                  </button>

                  <a
                    href="https://support.kobotoolbox.org/api.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 text-teal-400 hover:underline flex items-center gap-1.5"
                  >
                    <span>Dokumentasi API Kobo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#060a16] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Database Jemaat SYSJEGER terintegrasi dengan KoboToolbox standard.
          </span>
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
