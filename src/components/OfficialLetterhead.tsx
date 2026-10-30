import React from 'react';
import type { ChurchSettings } from '../types/index.ts';
import { DEFAULT_CHURCH_SETTINGS } from '../utils/church-settings.ts';

export const OfficialLetterhead: React.FC<{ settings?: ChurchSettings; compact?: boolean }> = ({ settings = DEFAULT_CHURCH_SETTINGS, compact = false }) => {
  const value = { ...DEFAULT_CHURCH_SETTINGS, ...settings };
  return (
    <div className={`flex items-center justify-between border-b-2 border-slate-900 ${compact ? 'pb-3 mb-4' : 'pb-4 mb-6'} text-slate-900`}>
      <div className={`${compact ? 'w-16 h-16' : 'w-20 h-20'} shrink-0 flex items-center justify-center`}>
        {value.logoUrl ? <img src={value.logoUrl} alt="Logo resmi gereja" className="w-full h-full object-contain" /> : <span className="font-serif font-black">GMIT</span>}
      </div>
      <div className="flex-1 px-3 sm:px-4 text-center font-sans">
        <div className={`${compact ? 'text-xs' : 'text-sm'} font-extrabold uppercase tracking-wide leading-snug`}>{value.churchName}</div>
        <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold uppercase mt-0.5`}>{value.klasis}</div>
        {value.address && <div className="text-[9px] text-slate-600 mt-1 leading-snug">{value.address}</div>}
        {(value.phone || value.email) && <div className="text-[9px] text-slate-600 mt-0.5">{[value.phone, value.email].filter(Boolean).join(' · ')}</div>}
      </div>
      <div className={`${compact ? 'w-16 h-16' : 'w-20 h-20'} shrink-0 flex items-center justify-center`}>
        {value.stampUrl && <img src={value.stampUrl} alt="Cap resmi gereja" className="w-full h-full object-contain" />}
      </div>
    </div>
  );
};
