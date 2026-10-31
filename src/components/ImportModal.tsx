import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Users,
  Home,
  FileText,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import type { Member, Rayon, CategorialGroup, Family } from '../types/index.ts';
import {
  downloadExcelTemplate,
  exportCurrentDataToExcel,
  parseExcelOrCsvFile,
  type ParsedImportRow,
  type DetectedFamilyGroup,
} from '../utils/excel-import-export.ts';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    members: Partial<Member>[]
  ) => Promise<{ success: boolean; imported: number; familiesCreated?: number; failed: number; errors: string[] }>;
  rayons: Rayon[];
  categorials: CategorialGroup[];
  families?: Family[];
  members?: Member[];
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  rayons,
  categorials,
  families = [],
  members = [],
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'preview_members' | 'preview_families' | 'guide'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [previewRows, setPreviewRows] = useState<ParsedImportRow[]>([]);
  const [detectedFamilies, setDetectedFamilies] = useState<DetectedFamilyGroup[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    familiesCreated?: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setResult(null);

    try {
      const parsed = await parseExcelOrCsvFile(selectedFile, rayons, categorials, families);
      setPreviewRows(parsed.rows);
      setDetectedFamilies(parsed.detectedFamilies);

      if (parsed.rows.length > 0) {
        setActiveTab('preview_members');
      }
    } catch (err: any) {
      console.error('Error parsing file:', err);
      alert('Gagal membaca file: ' + (err.message || 'Format file tidak didukung'));
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleStartImport = async () => {
    const validRows = previewRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setImporting(true);
    setResult(null);

    try {
      // Map ParsedImportRow to Member partial objects
      const membersPayload: Partial<Member>[] = validRows.map((r) => ({
        familyCardNo: r.familyCardNo,
        familyName: r.headOfFamilyName,
        familyRole: r.familyRole as any,
        fullName: r.fullName,
        nickname: r.nickname,
        nik: r.nik,
        gender: r.gender,
        birthPlace: r.birthPlace,
        birthDate: r.birthDate,
        address: r.address,
        kelurahan: r.kelurahan,
        kecamatan: r.kecamatan,
        kabupaten: r.kabupaten,
        phone: r.phone,
        email: r.email,
        maritalStatus: r.maritalStatus,
        spouseName: r.spouseName,
        rayonId: r.rayonId,
        categorialGroupId: r.categorialGroupId,
        membershipStatus: r.membershipStatus,
        baptismStatus: r.baptismStatus,
        baptismDate: r.baptismDate,
        confirmationStatus: r.confirmationStatus,
        confirmationDate: r.confirmationDate,
        marriageChurchStatus: r.marriageChurchStatus,
        marriageDate: r.marriageDate,
        education: r.education,
        occupation: r.occupation,
        status: r.status,
        notes: r.notes || 'Diimpor via File Excel',
      }));

      const res = await onImport(membersPayload);
      setResult({
        imported: res.imported,
        familiesCreated: res.familiesCreated || 0,
        failed: res.failed,
        errors: res.errors || [],
      });
    } catch (err: any) {
      setResult({
        imported: 0,
        familiesCreated: 0,
        failed: validRows.length,
        errors: [err.message || 'Terjadi kesalahan saat memproses impor di server.'],
      });
    } finally {
      setImporting(false);
    }
  };

  const totalValid = previewRows.filter((r) => r.isValid).length;
  const totalInvalid = previewRows.filter((r) => !r.isValid).length;
  const newFamiliesCount = detectedFamilies.filter((f) => f.isNew).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-[#0a1024] border border-amber-500/30 rounded-3xl shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-[#070c1b]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Impor Data Jemaat & Kartu Keluarga (Excel / CSV)</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 rounded-md">
                  V2.1 PRO
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Unggah file Excel/CSV untuk menambahkan jemaat sekaligus membuat Kartu Keluarga secara otomatis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Quickbar: Template & Current Data Downloads */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/20 border-b border-amber-500/15 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Format kolom telah disesuaikan 100% dengan database GMIT Betel Fuimelang.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadExcelTemplate(rayons, categorials)}
              className="flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-xs cursor-pointer"
              title="Unduh template kosong beserta contoh data dan daftar pilihan valid"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template Excel (.xlsx)</span>
            </button>

            {members.length > 0 && (
              <button
                onClick={() => exportCurrentDataToExcel(members, families, rayons, categorials)}
                className="flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                title="Unduh seluruh data jemaat & KK saat ini ke format Excel yang siap diedit"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Unduh Data Saat Ini ({members.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-[#070b18] px-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-amber-400 text-amber-300 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>1. Unggah File</span>
          </button>

          <button
            onClick={() => setActiveTab('preview_members')}
            disabled={previewRows.length === 0}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'preview_members'
                ? 'border-amber-400 text-amber-300 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Data Jemaat ({previewRows.length})</span>
            {totalInvalid > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                {totalInvalid} salah
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('preview_families')}
            disabled={detectedFamilies.length === 0}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'preview_families'
                ? 'border-amber-400 text-amber-300 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>3. Kartu Keluarga Otomatis ({detectedFamilies.length})</span>
            {newFamiliesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                +{newFamiliesCount} KK Baru
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'guide'
                ? 'border-amber-400 text-amber-300 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Petunjuk Kolom</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: UPLOAD ZONE */}
          {activeTab === 'upload' && (
            <div className="space-y-5">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                    : file
                    ? 'border-emerald-500/50 bg-emerald-950/20'
                    : 'border-slate-700 hover:border-amber-400/60 bg-[#070b18]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>

                <div className="text-sm font-bold text-white">
                  {file ? file.name : 'Pilih atau Tarik File Excel / CSV ke sini'}
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Mendukung file <span className="text-emerald-400 font-mono">.xlsx</span>,{' '}
                  <span className="text-emerald-400 font-mono">.xls</span>, atau{' '}
                  <span className="text-emerald-400 font-mono">.csv</span>.
                </p>

                {file && (
                  <div className="mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    File terpilih ({(file.size / 1024).toFixed(1)} KB) — Klik untuk mengganti file
                  </div>
                )}
              </div>

              {isParsing && (
                <div className="flex items-center justify-center gap-2 p-4 text-xs text-amber-300 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Sedang membaca dan memetakan struktur jemaat & kartu keluarga dari file Excel...</span>
                </div>
              )}

              {/* Step By Step Guide Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#070b18] border border-slate-800 space-y-1.5">
                  <div className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-[10px]">
                      1
                    </span>
                    <span>Unduh Template</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Klik tombol hijau di atas untuk mengunduh template Excel resmi GMIT Betel Fuimelang dengan contoh data.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#070b18] border border-slate-800 space-y-1.5">
                  <div className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>Isi No KK & Anggota</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Ketik nomor KK yang sama untuk anggota satu keluarga. Tandai satu orang sebagai Kepala Keluarga.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#070b18] border border-slate-800 space-y-1.5">
                  <div className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-[10px]">
                      3
                    </span>
                    <span>Otomatisasi KK & Jemaat</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Unggah kembali file tersebut. Sistem akan otomatis membuat Kartu Keluarga dan menghubungkan semua anggota!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PREVIEW MEMBERS */}
          {activeTab === 'preview_members' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#070b18] border border-slate-800 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">Total: {previewRows.length} Jemaat</span>
                  <span className="text-emerald-400 font-semibold">✓ {totalValid} Siap Diimpor</span>
                  {totalInvalid > 0 && (
                    <span className="text-rose-400 font-semibold">✗ {totalInvalid} Tidak Lengkap / Error</span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-amber-400 hover:text-amber-300 font-medium"
                >
                  Ganti File Excel
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-[11px] text-slate-300">
                  <thead className="bg-[#070b18] text-amber-300 font-bold border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5">No</th>
                      <th className="p-2.5">Nama Lengkap</th>
                      <th className="p-2.5">No KK / Hubungan</th>
                      <th className="p-2.5">NIK</th>
                      <th className="p-2.5">Gender</th>
                      <th className="p-2.5">Tgl Lahir</th>
                      <th className="p-2.5">Rayon</th>
                      <th className="p-2.5">Kategorial</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {previewRows.map((r, i) => (
                      <tr key={i} className={r.isValid ? 'hover:bg-slate-800/40' : 'bg-rose-950/20'}>
                        <td className="p-2.5 text-slate-400 font-mono">{i + 1}</td>
                        <td className="p-2.5 font-bold text-white">
                          <div>{r.fullName}</div>
                          {r.nickname && <div className="text-[10px] text-slate-400">({r.nickname})</div>}
                        </td>
                        <td className="p-2.5 font-mono text-[10px]">
                          <div className="text-amber-300">{r.familyCardNo || '-'}</div>
                          <div className="text-slate-400">{r.familyRole}</div>
                        </td>
                        <td className="p-2.5 font-mono text-[10px]">{r.nik || '-'}</td>
                        <td className="p-2.5">{r.gender === 'Laki-laki' ? 'L' : 'P'}</td>
                        <td className="p-2.5 font-mono">{r.birthDate}</td>
                        <td className="p-2.5">{r.rayonName}</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono">
                            {r.categorialGroupName}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-rose-400 text-[10px] font-bold"
                              title={r.errors.join(', ')}
                            >
                              <AlertCircle className="w-3 h-3" />
                              <span>{r.errors[0]}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PREVIEW AUTOMATIC FAMILIES */}
          {activeTab === 'preview_families' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Terdeteksi <strong>{detectedFamilies.length} Kartu Keluarga</strong> dari file yang Anda unggah.
                    {newFamiliesCount > 0 && ` (${newFamiliesCount} Kartu Keluarga baru akan otomatis dibuat).`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {detectedFamilies.map((fam, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#070b18] border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        {fam.familyNo}
                      </span>
                      {fam.isNew ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          + KK Baru (Otomatis Dibuat)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          KK Terdaftar di Database
                        </span>
                      )}
                    </div>

                    <div className="font-bold text-white text-sm">
                      Kel. {fam.headOfFamilyName}
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <div>Wilayah: {fam.rayonName}</div>
                      <div>Alamat: {fam.address}</div>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Anggota Keluarga ({fam.members.length} Jiwa):
                      </div>
                      <div className="space-y-0.5">
                        {fam.members.map((m, mIdx) => (
                          <div
                            key={mIdx}
                            className="flex items-center justify-between text-[11px] bg-slate-900/60 px-2 py-1 rounded"
                          >
                            <span className="font-medium text-slate-200">{m.fullName}</span>
                            <span className="text-amber-400 text-[10px]">{m.familyRole}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PETUNJUK & PANDUAN */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-[#070b18] border border-amber-500/20 space-y-2">
                <h4 className="font-bold text-amber-300 text-sm">
                  Panduan Pengisian Data & Otomatisasi Kartu Keluarga
                </h4>
                <p className="leading-relaxed">
                  Fitur ini dirancang khusus agar Anda dapat menginput data ratusan jemaat dan kartu keluarga sekaligus
                  cukup menggunakan Microsoft Excel atau Google Spreadsheet.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-white">Ketentuan Kolom Wajib:</h5>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>
                    <strong className="text-amber-400">Nama_Lengkap</strong>: Wajib diisi minimal 2 karakter sesuai KTP
                    atau Akte Kelahiran.
                  </li>
                  <li>
                    <strong className="text-amber-400">Tanggal_Lahir</strong>: Wajib diisi dalam format{' '}
                    <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono">YYYY-MM-DD</code>{' '}
                    (contoh: <code className="text-emerald-400 font-mono">1985-04-12</code>).
                  </li>
                  <li>
                    <strong className="text-amber-400">No_KK</strong>: Isi nomor KK yang sama untuk anggota dalam 1
                    rumah tangga (contoh: <code className="text-emerald-400 font-mono">KK-BF-001</code> atau 16 angka
                    Disdukcapil). Jika nomor KK belum ada, sistem akan otomatis membuat Kartu Keluarga baru di database.
                  </li>
                  <li>
                    <strong className="text-amber-400">Hubungan_Keluarga</strong>: Pilihan:{' '}
                    <em>Kepala Keluarga, Istri, Anak, Orang Tua, Famili Lain</em>. Baris dengan Kepala Keluarga otomatis
                    diangkat sebagai penanggung jawab KK.
                  </li>
                  <li>
                    <strong className="text-amber-400">Rayon</strong>: Tuliskan nama rayon (contoh:{' '}
                    <em>Rayon I, Rayon II, Rayon III, Rayon IV</em>).
                  </li>
                  <li>
                    <strong className="text-amber-400">Kategorial</strong>: Pilihan:{' '}
                    <em>PAR, PEMUDA, PKP, PKB, LANSIA</em>. Jika dikosongkan, sistem akan mengelompokkan secara otomatis
                    berdasarkan umur dan jenis kelamin.
                  </li>
                  <li>
                    <strong className="text-amber-400">NIK</strong>: Jika diisi harus tepat 16 angka. Boleh
                    dikosongkan jika anak belum memiliki NIK.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* HASIL IMPOR NOTIFIKASI */}
          {result && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                result.failed === 0
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-amber-950/60 border-amber-500/50 text-amber-200'
              }`}
            >
              <div className="font-bold text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>
                  Proses Selesai: {result.imported} Data Jemaat Berhasil Disimpan ke Database!
                </span>
              </div>
              {result.familiesCreated !== undefined && result.familiesCreated > 0 && (
                <div className="text-emerald-300 font-semibold pl-7">
                  ✓ {result.familiesCreated} Kartu Keluarga (KK) baru berhasil dibuat dan ditautkan secara otomatis.
                </div>
              )}
              {result.failed > 0 && (
                <div className="text-amber-300 pl-7 space-y-1">
                  <div className="font-bold">{result.failed} baris ditolak karena format tidak lengkap:</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] max-h-32 overflow-y-auto">
                    {result.errors.map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 px-6 border-t border-slate-800 bg-[#070c1b]">
          <div className="text-xs text-slate-400">
            {previewRows.length > 0 && (
              <span>
                Siap memproses: <strong className="text-emerald-400">{totalValid} jemaat</strong> &amp;{' '}
                <strong className="text-amber-400">{detectedFamilies.length} Kartu Keluarga</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
            >
              Tutup
            </button>

            {previewRows.length > 0 && (
              <button
                type="button"
                disabled={importing || totalValid === 0}
                onClick={handleStartImport}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Mulai Impor ({totalValid} Jemaat &amp; KK)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
