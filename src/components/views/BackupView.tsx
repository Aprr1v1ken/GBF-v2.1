import React, { useState } from 'react';
import { Database, Download, Upload, Shield, RefreshCw, CheckCircle2, AlertTriangle, FileCode } from 'lucide-react';
import { apiFetch } from '../../services/api.ts';

interface BackupViewProps {
  onOpenImport: () => void;
}

export const BackupView: React.FC<BackupViewProps> = ({ onOpenImport }) => {
  const [downloading, setDownloading] = useState(false);
  const [backedUp, setBackedUp] = useState(false);

  const handleDownloadBackup = async () => {
    setDownloading(true);
    try {
      const res = await apiFetch('/api/backup');
      if (!res.ok) throw new Error('Sesi tidak memiliki izin untuk mengunduh backup.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sysjeger_backup_gmit_betel_${new Date().toISOString().substring(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setBackedUp(true);
      setTimeout(() => setBackedUp(false), 6000);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 shadow-md">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-400" />
          <span>Pencadangan, Pemulihan & Ekspor Database</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Fasilitas backup berkala database SQLite SYSJEGER V2.0 GMIT Betel Fuimelang
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="p-6 rounded-2xl bg-[#0c1329] border border-amber-500/20 space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              Unduh Cadangan Database Lengkap (JSON Snapshot)
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Menghasilkan berkas arsip lengkap seluruh tabel: data jemaat, kartu keluarga, rayon, sakramen baptis/sidi/nikah, mutasi, kas keuangan, dan catatan audit trail.
            </p>
            {backedUp && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Berkas backup database berhasil diunduh ke komputer Anda.</span>
              </div>
            )}
          </div>

          <button
            onClick={handleDownloadBackup}
            disabled={downloading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Membuat Cadangan...' : 'Unduh Berkas Backup (.json)'}</span>
          </button>
        </div>

        {/* Import & Restore Card */}
        <div className="p-6 rounded-2xl bg-[#0c1329] border border-amber-500/20 space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              Impor Data Jemaat dari Format CSV / Excel
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Fasilitas migrasi massal dari arsip Microsoft Excel gereja lama atau formulir pendaftaran jemaat baru dengan validasi otomatis dan deteksi kemungkinan data ganda.
            </p>
          </div>

          <button
            onClick={onOpenImport}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Buka Wizard Impor CSV</span>
          </button>
        </div>
      </div>

      {/* Database Security Info Box */}
      <div className="p-5 rounded-2xl bg-[#090e1e] border border-slate-800 flex items-start gap-3.5 text-xs">
        <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-white">
            Keamanan Data & Prinsip Perlindungan Data Pribadi (PDP)
          </h4>
          <p className="text-slate-400 leading-relaxed">
            Database menggunakan SQLite untuk kerja lokal dan snapshot Postgres untuk penyimpanan cloud di Vercel. Data NIK, kontak, catatan pastoral, dan arsip dokumen dilindungi oleh sesi bertanda tangan dan Role-Based Access Control (RBAC). Lakukan pencadangan database secara berkala setiap akhir bulan atau setelah ibadah raya.
          </p>
        </div>
      </div>
    </div>
  );
};
