import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CheckCircle2 } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (showReconnected) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-600/95 text-white text-xs font-semibold shadow-xl border border-emerald-400 backdrop-blur-md animate-bounce">
        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
        <span>Koneksi Kembali Online — Seluruh Sistem Terhubung</span>
      </div>
    );
  }

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-amber-600/95 text-white text-xs font-semibold shadow-2xl border border-amber-300 backdrop-blur-md">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
      </span>
      <WifiOff className="w-4 h-4 text-amber-200" />
      <span>Mode Offline Aktif — Menggunakan Data Tersimpan Lokal</span>
    </div>
  );
};
