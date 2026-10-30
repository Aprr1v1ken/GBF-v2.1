import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  User,
  CheckCircle,
  FileText,
  Music,
  Mic,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Cloud,
} from 'lucide-react';
import type { ChurchEvent, ServiceSchedule } from '../../types/index.ts';
import { uploadActivityImageToCloud } from '../../services/cloud-sync.ts';

function defaultEventDateTime(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(hour)}:00:00`;
}

interface EventsViewProps {
  events: ChurchEvent[];
  schedules: ServiceSchedule[];
  onAddEvent: (data: Partial<ChurchEvent>) => Promise<void>;
  onUpdateEvent?: (id: string, data: Partial<ChurchEvent>) => Promise<void>;
  onDeleteEvent?: (id: string) => Promise<void>;
  onAddSchedule: (data: Partial<ServiceSchedule>) => Promise<void>;
  onUpdateSchedule?: (id: string, data: Partial<ServiceSchedule>) => Promise<void>;
  onDeleteSchedule?: (id: string) => Promise<void>;
  onClearAllSchedules?: () => Promise<void>;
  onOpenAIAgendaGenerator?: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  schedules,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onClearAllSchedules,
  onOpenAIAgendaGenerator,
}) => {
  const [activeTab, setActiveTab] = useState<'schedules' | 'events'>('schedules');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ServiceSchedule | null>(null);
  const [editingEvent, setEditingEvent] = useState<ChurchEvent | null>(null);

  // Schedule form states
  const [serviceDate, setServiceDate] = useState('25-10-2026');
  const [serviceName, setServiceName] = useState('Kebaktian Minggu Pagi (08.00 WITA)');
  const [preacher, setPreacher] = useState('');
  const [liturgist, setLiturgist] = useState('');
  const [elderDuty, setElderDuty] = useState('');
  const [deaconDuty, setDeaconDuty] = useState('');
  const [songLeader, setSongLeader] = useState('');
  const [musicians, setMusicians] = useState('');
  const [multimedia, setMultimedia] = useState('');
  const [usher, setUsher] = useState('');
  const [bibleReader, setBibleReader] = useState('');
  const [notes, setNotes] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Event form states
  const [eventTitle, setEventTitle] = useState('');
  const [eventCat, setEventCat] = useState<any>('Ibadah Minggu');
  const [eventStart, setEventStart] = useState(defaultEventDateTime(8));
  const [eventEnd, setEventEnd] = useState(defaultEventDateTime(10));
  const [eventLocation, setEventLocation] = useState('Gedung Kebaktian Utama Betel');
  const [eventPic, setEventPic] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventImageUrl, setEventImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cloudSyncedImage, setCloudSyncedImage] = useState(false);
  const [imageSyncPending, setImageSyncPending] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

  const openAddScheduleModal = () => {
    setEditingSchedule(null);
    setServiceDate(new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'));
    setServiceName('Kebaktian Minggu Pagi (08.00 WITA)');
    setPreacher('');
    setLiturgist('');
    setElderDuty('');
    setDeaconDuty('');
    setSongLeader('');
    setMusicians('');
    setMultimedia('');
    setUsher('');
    setBibleReader('');
    setNotes('');
    setShowScheduleModal(true);
  };

  const openEditScheduleModal = (sch: ServiceSchedule) => {
    setEditingSchedule(sch);
    setServiceDate(sch.serviceDate);
    setServiceName(sch.serviceName);
    setPreacher(sch.preacher || '');
    setLiturgist(sch.liturgist || '');
    setElderDuty(sch.elderDuty || '');
    setDeaconDuty(sch.deaconDuty || '');
    setSongLeader(sch.songLeader || '');
    setMusicians(sch.musicians || '');
    setMultimedia(sch.multimediaOperator || '');
    setUsher(sch.usher || '');
    setBibleReader(sch.bibleReader || '');
    setNotes(sch.notes || '');
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchedule(true);
    try {
      if (editingSchedule && onUpdateSchedule) {
        await onUpdateSchedule(editingSchedule.id, {
          serviceDate,
          serviceName,
          preacher,
          liturgist,
          elderDuty,
          deaconDuty,
          songLeader,
          musicians,
          multimediaOperator: multimedia,
          usher,
          bibleReader,
          notes,
        });
      } else {
        await onAddSchedule({
          serviceDate,
          serviceName,
          preacher,
          liturgist,
          elderDuty,
          deaconDuty,
          songLeader,
          musicians,
          multimediaOperator: multimedia,
          usher,
          bibleReader,
          notes,
        });
      }
      setShowScheduleModal(false);
      setEditingSchedule(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleClearLiturgos = async (sch: ServiceSchedule) => {
    if (!onUpdateSchedule) return;
    if (confirm(`Kosongkan nama liturgos untuk ${sch.serviceName}?`)) {
      await onUpdateSchedule(sch.id, {
        ...sch,
        liturgist: '',
      });
    }
  };

  const handleClearAllSchedules = async () => {
    if (!confirm('Apakah Anda yakin ingin mengosongkan seluruh jadwal ibadah dan petugas?')) return;
    if (onClearAllSchedules) {
      await onClearAllSchedules();
    }
  };

  const openAddEventModal = () => {
    setEditingEvent(null);
    setEventTitle('');
    setEventCat('Ibadah Minggu');
    setEventStart(defaultEventDateTime(8));
    setEventEnd(defaultEventDateTime(10));
    setEventLocation('Gedung Kebaktian Utama Betel');
    setEventPic('');
    setEventDesc('');
    setEventImageUrl('');
    setCloudSyncedImage(false);
    setImageSyncPending(false);
    setShowEventModal(true);
  };

  const openEditEventModal = (event: ChurchEvent) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventCat(event.category);
    setEventStart(event.startTime);
    setEventEnd(event.endTime);
    setEventLocation(event.location);
    setEventPic(event.picName);
    setEventDesc(event.description || '');
    setEventImageUrl(event.imageUrl || '');
    setCloudSyncedImage(Boolean(event.imageUrl));
    setImageSyncPending(false);
    setShowEventModal(true);
  };

  const handleEventImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = async () => {
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
          setEventImageUrl(compressed);

          // Upload directly to Cloud Firestore activity_images
          try {
            const record = await uploadActivityImageToCloud(compressed, {
              title: eventTitle || 'Dokumentasi Acara Jemaat',
              category: eventCat,
              description: eventDesc,
            });
            setCloudSyncedImage(!record.pendingSync);
            setImageSyncPending(Boolean(record.pendingSync));
          } catch (cloudErr) {
            console.warn('Gagal sync gambar ke cloud Firestore:', cloudErr);
          }
        }
        setUploadingImage(false);
      };
      if (readerEvent.target?.result) {
        img.src = readerEvent.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    setSavingEvent(true);
    try {
      const payload: Partial<ChurchEvent> = {
        title: eventTitle,
        category: eventCat,
        startTime: eventStart,
        endTime: eventEnd,
        location: eventLocation,
        picName: eventPic,
        description: eventDesc,
        status: editingEvent?.status || 'Terjadwal',
        imageUrl: eventImageUrl,
      };
      if (editingEvent && onUpdateEvent) {
        await onUpdateEvent(editingEvent.id, payload);
      } else {
        await onAddEvent(payload);
      }
      setShowEventModal(false);
      setEditingEvent(null);
      setEventTitle('');
      setEventDesc('');
      setEventImageUrl('');
      setCloudSyncedImage(false);
      setImageSyncPending(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEvent(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 shadow-md">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            <span>Ibadah, Petugas Pelayanan & Kalender Kegiatan</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pengaturan jadwal presbiter bertugas, pelayan liturgis, dan seluruh kalender pelayanan gereja · Super Admin Mode
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'schedules' ? (
            <>
              {schedules.length > 0 && onClearAllSchedules && (
                <button
                  onClick={handleClearAllSchedules}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan Jadwal</span>
                </button>
              )}
              <button
                onClick={openAddScheduleModal}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Jadwal Petugas Ibadah</span>
              </button>
            </>
          ) : (
            <>
              {onOpenAIAgendaGenerator && (
                <button
                  type="button"
                  onClick={onOpenAIAgendaGenerator}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>✨ Susun Agenda dengan AI (Cloud)</span>
                </button>
              )}
              <button
                onClick={openAddEventModal}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Acara Baru</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'schedules'
              ? 'border-amber-400 text-amber-300 bg-amber-500/10'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Jadwal Petugas & Liturgis ({schedules.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'events'
              ? 'border-amber-400 text-amber-300 bg-amber-500/10'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-400" />
          <span>Kalender Acara & Kegiatan ({events.length})</span>
        </button>
      </div>

      {activeTab === 'schedules' ? (
        schedules.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#0c1329] border border-dashed border-amber-500/20 space-y-3">
            <User className="w-10 h-10 text-amber-400/40 mx-auto" />
            <h3 className="text-base font-bold text-white">Belum Ada Jadwal Petugas Pelayanan</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Silakan buat jadwal petugas kebaktian minggu, pengkhotbah, liturgos, presbiter bertugas, dan pemain musik.
            </p>
            <button
              onClick={openAddScheduleModal}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Jadwal Petugas Ibadah</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map((sch) => (
              <div
                key={sch.id}
                className="p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 hover:border-amber-400/40 transition-all space-y-4 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
                      {sch.serviceDate}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5">{sch.serviceName}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      GMIT BETEL FUIMELANG
                    </span>
                    {onUpdateSchedule && (
                      <button
                        onClick={() => openEditScheduleModal(sch)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Edit jadwal & petugas ibadah ini"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Petugas</span>
                      </button>
                    )}
                    {sch.liturgist && onUpdateSchedule && (
                      <button
                        onClick={() => handleClearLiturgos(sch)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 text-xs flex items-center gap-1 cursor-pointer"
                        title="Kosongkan nama liturgos"
                      >
                        <span>Kosongkan Liturgos</span>
                      </button>
                    )}
                    {onDeleteSchedule && (
                      <button
                        onClick={() => {
                          if (confirm(`Hapus jadwal ${sch.serviceName}?`)) onDeleteSchedule(sch.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Hapus jadwal ibadah ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                      <Mic className="w-3 h-3" />
                      <span>Pelayan Firman & Liturgi:</span>
                    </span>
                    <div className="font-bold text-white">
                      {sch.preacher || <span className="text-slate-500 italic">Belum diisi</span>}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Liturgos: {sch.liturgist || <span className="text-slate-500 italic font-mono">[Kosong]</span>}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Presbiter Bertugas:</span>
                    </span>
                    <div className="text-white font-medium text-[11px]">
                      Pnt: {sch.elderDuty || <span className="text-slate-500 italic">Belum diisi</span>}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Dkn: {sch.deaconDuty || <span className="text-slate-500 italic">Belum diisi</span>}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <Music className="w-3 h-3" />
                      <span>Pujian & Musik:</span>
                    </span>
                    <div className="font-medium text-white">
                      {sch.songLeader || <span className="text-slate-500 italic">Belum diisi</span>}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {sch.musicians || <span className="text-slate-500 italic">Belum diisi</span>}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Multimedia & Penerima:</span>
                    </span>
                    <div className="text-white font-medium text-[11px]">
                      {sch.multimediaOperator || <span className="text-slate-500 italic">Belum diisi</span>}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Penyambut: {sch.usher || <span className="text-slate-500 italic">Belum diisi</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : events.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0c1329] border border-dashed border-amber-500/20 space-y-3">
          <Calendar className="w-10 h-10 text-amber-400/40 mx-auto" />
          <h3 className="text-base font-bold text-white">Belum Ada Agenda & Acara Terjadwal</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Silakan tambahkan agenda kebaktian rayon, persekutuan kategorial, rapat majelis, atau kegiatan pelayanan lainnya.
          </p>
          <button
            onClick={openAddEventModal}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Acara Baru</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="p-5 rounded-2xl bg-[#0c1329] border border-amber-500/20 hover:border-amber-400/40 transition-all space-y-3 flex flex-col justify-between overflow-hidden"
            >
              <div>
                {ev.imageUrl && (
                  <div className="w-full h-36 -mt-2 -mx-2 mb-3 rounded-xl overflow-hidden border border-slate-800 relative group">
                    <img
                      src={ev.imageUrl}
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-bold text-amber-300 border border-amber-400/30 flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-emerald-400" />
                      <span>Cloud Photo</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 text-[10px]">
                    {ev.category}
                  </span>
                  <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>{ev.status}</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{ev.title}</h3>
                <div className="text-xs text-slate-400 mt-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-mono">{ev.startTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ev.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>PIC: {ev.picName}</span>
                  </div>
                </div>
              </div>

              {ev.description && (
                <p className="text-xs text-slate-400 pt-3 border-t border-slate-800 line-clamp-2">
                  {ev.description}
                </p>
              )}
              {(onUpdateEvent || onDeleteEvent) && (
                <div className="flex gap-2 pt-3 border-t border-slate-800">
                  {onUpdateEvent && (
                    <button onClick={() => openEditEventModal(ev)} className="flex-1 py-1.5 rounded-lg bg-slate-800 text-cyan-300 text-xs flex items-center justify-center gap-1.5 hover:bg-slate-700">
                      <Edit2 className="w-3 h-3" /> Ubah
                    </button>
                  )}
                  {onDeleteEvent && (
                    <button onClick={() => { if (window.confirm(`Hapus kegiatan "${ev.title}"?`)) void onDeleteEvent(ev.id); }} className="flex-1 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 text-xs flex items-center justify-center gap-1.5 hover:bg-rose-900/70">
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0b1226] border border-amber-500/30 rounded-3xl shadow-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-amber-300">
                {editingSchedule ? 'Edit Petugas & Jadwal Ibadah' : 'Buat Jadwal Petugas Ibadah'}
              </h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tanggal Ibadah *</label>
                  <input
                    type="text"
                    required
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nama Kebaktian *</label>
                  <input
                    type="text"
                    required
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="Kebaktian Minggu Pagi (08.00 WITA)"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Pelayan Firman / Pengkhotbah</label>
                  <input
                    type="text"
                    value={preacher}
                    onChange={(e) => setPreacher(e.target.value)}
                    placeholder="Contoh: Pdt. Sonya W. Isu, S.Th"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-300">Liturgos / Pembawa Acara</label>
                    {liturgist && (
                      <button
                        type="button"
                        onClick={() => setLiturgist('')}
                        className="text-[10px] text-red-400 hover:underline cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={liturgist}
                    onChange={(e) => setLiturgist(e.target.value)}
                    placeholder="Biarkan kosong jika belum ada liturgos"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Penatua Bertugas</label>
                  <input
                    type="text"
                    value={elderDuty}
                    onChange={(e) => setElderDuty(e.target.value)}
                    placeholder="Nama penatua / pelayan"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Diaken Bertugas</label>
                  <input
                    type="text"
                    value={deaconDuty}
                    onChange={(e) => setDeaconDuty(e.target.value)}
                    placeholder="Nama diaken / pelayan"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Pemandu Pujian / Song Leader</label>
                  <input
                    type="text"
                    value={songLeader}
                    onChange={(e) => setSongLeader(e.target.value)}
                    placeholder="Vocal Group Pemuda"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Pemain Musik</label>
                  <input
                    type="text"
                    value={musicians}
                    onChange={(e) => setMusicians(e.target.value)}
                    placeholder="Organis Betel"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Operator Multimedia</label>
                  <input
                    type="text"
                    value={multimedia}
                    onChange={(e) => setMultimedia(e.target.value)}
                    placeholder="Tim Multimedia"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Penerima Tamu / Usher</label>
                  <input
                    type="text"
                    value={usher}
                    onChange={(e) => setUsher(e.target.value)}
                    placeholder="Kaum Perempuan Rayon 1"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Catatan Tambahan / Nats Bacaan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Perjamuan Kudus Triwulan III"
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  {savingSchedule ? 'Menyimpan...' : editingSchedule ? 'Perbarui Jadwal' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b1226] border border-amber-500/30 rounded-3xl shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-amber-300">
              {editingEvent ? 'Ubah Kegiatan / Acara Gerejawi' : 'Tambah Kegiatan / Acara Gerejawi'}
            </h3>

            <form onSubmit={handleSaveEvent} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Kegiatan *</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Contoh: Katekisasi Calon Sidi Baru"
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Kategori Kegiatan</label>
                <select
                  value={eventCat}
                  onChange={(e) => setEventCat(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none"
                >
                  <option value="Ibadah Minggu">Ibadah Minggu</option>
                  <option value="Ibadah Rayon">Ibadah Rayon</option>
                  <option value="Ibadah Kategorial">Ibadah Kategorial</option>
                  <option value="Katekisasi Sidi">Katekisasi Sidi</option>
                  <option value="Sidang Majelis">Sidang Majelis</option>
                  <option value="Rapat Panitia">Rapat Panitia</option>
                  <option value="Pelayanan Diakonia">Pelayanan Diakonia</option>
                  <option value="Bakti Bersih Lingkungan">Bakti Bersih Lingkungan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Waktu Mulai</label>
                  <input
                    type="text"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    placeholder="2026-10-25 08:00:00"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Waktu Selesai</label>
                  <input
                    type="text"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    placeholder="2026-10-25 10:00:00"
                    className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Lokasi Kegiatan</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Gedung Kebaktian Utama Betel"
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Penanggung Jawab (PIC)</label>
                <input
                  type="text"
                  value={eventPic}
                  onChange={(e) => setEventPic(e.target.value)}
                  placeholder="Nama penatua / pelayan"
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Catatan susunan acara atau perlengkapan..."
                  className="w-full px-3 py-2 bg-[#050811] border border-slate-700 rounded-lg text-white outline-none resize-none"
                />
              </div>

              {/* Upload Foto Dokumentasi Kegiatan */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Foto / Banner Kegiatan (Cloud)</span>
                  </span>
                  {cloudSyncedImage && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <Cloud className="w-3 h-3" />
                      <span>Tersimpan di Cloud</span>
                    </span>
                  )}
                  {imageSyncPending && (
                    <span className="text-[10px] text-amber-300 font-bold">Tersimpan di perangkat · menunggu sinkron</span>
                  )}
                  {eventImageUrl && !cloudSyncedImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setEventImageUrl('');
                        setCloudSyncedImage(false);
                        setImageSyncPending(false);
                      }}
                      className="text-[10px] text-red-400 hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>

                {eventImageUrl ? (
                  <div className="w-full h-28 rounded-lg overflow-hidden border border-slate-700 relative group">
                    <img
                      src={eventImageUrl}
                      alt="Banner Kegiatan"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold cursor-pointer transition">
                      <span>Ganti Foto</span>
                      <input type="file" accept="image/*" onChange={handleEventImageUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-slate-700 rounded-lg hover:border-emerald-400/50 cursor-pointer text-slate-400 hover:text-white transition">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>{uploadingImage ? 'Mengompresi & Mengunggah ke Cloud...' : 'Pilih Foto Kegiatan (HP/PC)'}</span>
                    <input type="file" accept="image/*" onChange={handleEventImageUpload} className="hidden" />
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  {savingEvent ? 'Menyimpan...' : editingEvent ? 'Simpan Perubahan' : 'Jadwalkan Acara'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
