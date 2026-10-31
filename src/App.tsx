/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { PublicLanding } from './components/PublicLanding.tsx';
import { MemberFormModal } from './components/MemberFormModal.tsx';
import { MemberDetailModal } from './components/MemberDetailModal.tsx';
import { FamilyModal } from './components/FamilyModal.tsx';
import { SacramentModal } from './components/SacramentModal.tsx';
import { ImportModal } from './components/ImportModal.tsx';
import { PrintReportModal } from './components/PrintReportModal.tsx';
import { KoboExportModal } from './components/KoboExportModal.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';

// Views
import { DashboardView } from './components/views/DashboardView.tsx';
import { MembersView } from './components/views/MembersView.tsx';
import { FamiliesView } from './components/views/FamiliesView.tsx';
import { RayonsView } from './components/views/RayonsView.tsx';
import { StaffView } from './components/views/StaffView.tsx';
import { SacramentsView } from './components/views/SacramentsView.tsx';
import { MutationsView } from './components/views/MutationsView.tsx';
import { EventsView } from './components/views/EventsView.tsx';
import { AttendanceView } from './components/views/AttendanceView.tsx';
import { FinanceView } from './components/views/FinanceView.tsx';
import { DocumentsView } from './components/views/DocumentsView.tsx';
import { AnnouncementsView } from './components/views/AnnouncementsView.tsx';
import { JemaatPortalView } from './components/views/JemaatPortalView.tsx';
import { BackupView } from './components/views/BackupView.tsx';
import { AuditLogsView } from './components/views/AuditLogsView.tsx';
import { ReportsView } from './components/views/ReportsView.tsx';
import { SettingsView } from './components/views/SettingsView.tsx';
import { N8nIntegrationView } from './components/views/N8nIntegrationView.tsx';

import * as api from './services/api.ts';
import { syncPendingActivityImages } from './services/cloud-sync.ts';
import * as adminApi from './services/admin-api.ts';

// Heavy, less frequently used modules are loaded on demand for faster mobile startup.
const AIAssistantView = React.lazy(() => import('./components/views/AIAssistantView.tsx').then((module) => ({ default: module.AIAssistantView })));
const GoogleMapsView = React.lazy(() => import('./components/views/GoogleMapsView.tsx').then((module) => ({ default: module.GoogleMapsView })));
const GoogleWorkspaceView = React.lazy(() => import('./components/views/GoogleWorkspaceView.tsx').then((module) => ({ default: module.GoogleWorkspaceView })));
const WartaPdfModal = React.lazy(() => import('./components/WartaPdfModal.tsx').then((module) => ({ default: module.WartaPdfModal })));
import {
  getOfflineMembersQueue,
  addMemberToOfflineQueue,
  syncOfflineQueueToServer,
  cacheMembersLocally,
  getCachedMembersLocally,
  getOfflineMemberPhotos,
  cacheMemberPhotoOffline,
  removeOfflineMemberPhoto,
  syncOfflineMemberPhotos,
  getOfflineDataSnapshot,
  cacheOfflineDataSnapshot,
} from './utils/offline-sync.ts';
import type {
  Member,
  Family,
  Rayon,
  CategorialGroup,
  ChurchStaff,
  BaptismRecord,
  ConfirmationRecord,
  MarriageRecord,
  MutationRecord,
  ChurchEvent,
  ServiceSchedule,
  AttendanceRecord,
  FinancialTransaction,
  DocumentRecord,
  Announcement,
  DataCorrectionRequest,
  AuditLog,
  User,
  ChurchSettings,
} from './types/index.ts';
import { DEFAULT_CHURCH_SETTINGS } from './utils/church-settings.ts';

export default function App() {
  // User authentication session: if none stored in localStorage, start as null (guest/public)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('sysjeger_user');
      // A stored profile without a server session is only stale display data;
      // never treat it as an authenticated administrator.
      return saved && api.getAuthToken() ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState('dashboard');
  // If not logged in, showPublicSite is forced to true
  const [showPublicSite, setShowPublicSite] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('sysjeger_user');
    } catch {
      return true;
    }
  });
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);

  // Modals state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMemberFormModal, setShowMemberFormModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showMemberDetailModal, setShowMemberDetailModal] = useState(false);
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [showSacramentModal, setShowSacramentModal] = useState(false);
  const [sacramentType, setSacramentType] = useState<'baptis' | 'sidi' | 'nikah'>('baptis');
  const [editingSacrament, setEditingSacrament] = useState<any | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);
  const [showKoboExportModal, setShowKoboExportModal] = useState(false);
  const [showWartaPdfModal, setShowWartaPdfModal] = useState(false);
  const [reportType, setReportType] = useState<'members' | 'rayons' | 'finance' | 'sacraments' | 'attendance'>('members');
  const [aiActiveTab, setAiActiveTab] = useState<string>('counseling');

  // Server Data States - initialize members with locally cached data for instant display
  const [members, setMembers] = useState<Member[]>(() => getCachedMembersLocally());
  const [families, setFamilies] = useState<Family[]>([]);
  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [categorials, setCategorials] = useState<CategorialGroup[]>([]);
  const [staff, setStaff] = useState<ChurchStaff[]>([]);
  const [baptisms, setBaptisms] = useState<BaptismRecord[]>([]);
  const [confirmations, setConfirmations] = useState<ConfirmationRecord[]>([]);
  const [marriages, setMarriages] = useState<MarriageRecord[]>([]);
  const [mutations, setMutations] = useState<MutationRecord[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [corrections, setCorrections] = useState<DataCorrectionRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [churchSettings, setChurchSettings] = useState<ChurchSettings>(DEFAULT_CHURCH_SETTINGS);
  const [stats, setStats] = useState<any>(null);

  // Offline Synchronization & Network Awareness
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(() =>
    getOfflineMembersQueue().length
  );
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [syncToast, setSyncToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  // Load all data from API with Auto-Sync & Promise.allSettled Resilience
  const loadAllData = async () => {
    // Retry pending activity images, member photos, and queued member records.
    if (currentUser && navigator.onLine) {
      await syncPendingActivityImages();
    }
    if (currentUser && Object.keys(getOfflineMemberPhotos()).length > 0 && navigator.onLine) {
      await syncOfflineMemberPhotos(api.updateMemberPhotoApi);
    }
    // 1. Auto-sync any pending offline queue items if server is reachable
    const pendingQueue = getOfflineMembersQueue();
    if (currentUser && pendingQueue.length > 0) {
      try {
        await syncOfflineQueueToServer(api.createMemberApi);
      } catch (syncErr) {
        console.warn('Auto-sync offline queue failed on loadAllData:', syncErr);
      }
    }

    try {
      const offlineSnapshot = currentUser ? (getOfflineDataSnapshot() || {}) : {};
      const isJemaat = currentUser?.role === 'Jemaat';
      if (!currentUser) {
        setMembers([]);
        setFamilies([]);
        setCorrections([]);
      }
      if (!currentUser || isJemaat) {
        setStaff([]);
        setBaptisms([]);
        setConfirmations([]);
        setMarriages([]);
        setMutations([]);
        setAttendance([]);
        setTransactions([]);
        setDocuments([]);
        setAuditLogs([]);
      }
      const privateRequest = (request: () => Promise<any>, allowJemaat = false) =>
        currentUser && (!isJemaat || allowJemaat) ? request() : Promise.resolve(null);
      const results = await Promise.allSettled([
        api.fetchStatsApi(),
        privateRequest(api.fetchMembersApi, true),
        privateRequest(api.fetchFamiliesApi, true),
        api.fetchRayonsApi(),
        api.fetchCategorialsApi(),
        privateRequest(api.fetchStaffApi),
        privateRequest(api.fetchSacramentsApi),
        privateRequest(api.fetchMutationsApi),
        api.fetchEventsApi(),
        api.fetchSchedulesApi(),
        privateRequest(api.fetchAttendanceApi),
        privateRequest(api.fetchFinanceApi),
        privateRequest(api.fetchDocumentsApi),
        api.fetchAnnouncementsApi(),
        privateRequest(api.fetchCorrectionsApi, true),
        privateRequest(api.fetchAuditLogsApi),
        privateRequest(api.fetchChurchSettingsApi),
      ]);

      const val = (idx: number) => results[idx].status === 'fulfilled' ? (results[idx] as PromiseFulfilledResult<any>).value : null;

      const statsRes = val(0);
      const membersRes = val(1);
      const familiesRes = val(2);
      const rayonsRes = val(3);
      const catRes = val(4);
      const staffRes = val(5);
      const sacramentsRes = val(6);
      const mutationsRes = val(7);
      const eventsRes = val(8);
      const schedulesRes = val(9);
      const attendanceRes = val(10);
      const financeRes = val(11);
      const docsRes = val(12);
      const announcementsRes = val(13);
      const correctionsRes = val(14);
      const auditRes = val(15);
      const settingsRes = val(16);

      if (statsRes?.stats) setStats(statsRes.stats);
      else if (offlineSnapshot.stats) setStats(offlineSnapshot.stats);

      // Handle Members: Combine server members with remaining pending offline items
      const pendingPhotos = getOfflineMemberPhotos();
      const serverMembers: Member[] = (membersRes?.members || []).map((member: Member) => pendingPhotos[member.id] ? { ...member, photoUrl: pendingPhotos[member.id] } : member);
      const remainingOffline = getOfflineMembersQueue();
      const offlineItems: Member[] = remainingOffline.map((item) => ({
        id: item.id || `offline-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        memberNo: item.memberNo || 'OFFLINE-TEMP',
        fullName: item.fullName || '',
        nickname: item.nickname || '',
        nik: item.nik || '',
        familyCardNo: item.familyCardNo || '',
        familyId: item.familyId || '',
        familyName: item.familyName || '',
        familyRole: item.familyRole || 'Anak',
        gender: item.gender || 'Laki-laki',
        birthPlace: item.birthPlace || '',
        birthDate: item.birthDate || '',
        address: item.address || '',
        kelurahan: item.kelurahan || '',
        kecamatan: item.kecamatan || '',
        kabupaten: item.kabupaten || '',
        phone: item.phone || '',
        email: item.email || '',
        maritalStatus: item.maritalStatus || 'Belum Menikah',
        spouseName: item.spouseName || '',
        rayonId: item.rayonId || '',
        rayonName: item.rayonName || '',
        categorialGroupId: item.categorialGroupId || '',
        categorialGroupName: item.categorialGroupName || '',
        membershipStatus: item.membershipStatus || 'Tetap',
        baptismStatus: item.baptismStatus || 'Belum',
        baptismDate: item.baptismDate || '',
        confirmationStatus: item.confirmationStatus || 'Belum',
        confirmationDate: item.confirmationDate || '',
        marriageChurchStatus: item.marriageChurchStatus || 'Belum',
        marriageDate: item.marriageDate || '',
        education: item.education || '',
        occupation: item.occupation || '',
        joinDate: item.joinDate || new Date().toISOString().substring(0, 10),
        status: item.status || 'Aktif',
        notes: item.notes || 'Diinput Offline',
        photoUrl: item.photoUrl || '',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
        isOfflinePending: true,
      }));

      // If server responded, synchronize state and cache accurately
      if (currentUser && results[1].status === 'fulfilled' && membersRes) {
        const combinedMembers = [
          ...offlineItems,
          ...serverMembers.filter((sm) => !offlineItems.some((om) => om.id === sm.id)),
        ];
        setMembers(combinedMembers);
        cacheMembersLocally(combinedMembers);
      } else if (currentUser) {
        // Fall back to local cached members only if server was unreachable
        const cached = getCachedMembersLocally();
        if (cached.length > 0) {
          setMembers(cached);
        } else if (offlineSnapshot.members) {
          setMembers(offlineSnapshot.members);
        }
      }
      setPendingOfflineCount(remainingOffline.length);

      if (familiesRes?.families) setFamilies(familiesRes.families);
      else if (offlineSnapshot.families) setFamilies(offlineSnapshot.families);
      if (rayonsRes?.rayons) setRayons(rayonsRes.rayons);
      else if (offlineSnapshot.rayons) setRayons(offlineSnapshot.rayons);
      if (catRes?.categorials) setCategorials(catRes.categorials);
      else if (offlineSnapshot.categorials) setCategorials(offlineSnapshot.categorials);
      if (staffRes?.staff) setStaff(staffRes.staff);
      else if (offlineSnapshot.staff) setStaff(offlineSnapshot.staff);
      if (sacramentsRes) {
        setBaptisms(sacramentsRes.baptisms || []);
        setConfirmations(sacramentsRes.confirmations || []);
        setMarriages(sacramentsRes.marriages || []);
      } else if (offlineSnapshot.baptisms) {
        setBaptisms(offlineSnapshot.baptisms);
        setConfirmations(offlineSnapshot.confirmations || []);
        setMarriages(offlineSnapshot.marriages || []);
      }
      if (mutationsRes?.mutations) setMutations(mutationsRes.mutations);
      else if (offlineSnapshot.mutations) setMutations(offlineSnapshot.mutations);
      if (eventsRes?.events) setEvents(eventsRes.events);
      else if (offlineSnapshot.events) setEvents(offlineSnapshot.events);
      if (schedulesRes?.schedules) setSchedules(schedulesRes.schedules);
      else if (offlineSnapshot.schedules) setSchedules(offlineSnapshot.schedules);
      if (attendanceRes?.attendance) setAttendance(attendanceRes.attendance);
      else if (offlineSnapshot.attendance) setAttendance(offlineSnapshot.attendance);
      if (financeRes?.transactions) setTransactions(financeRes.transactions);
      else if (offlineSnapshot.transactions) setTransactions(offlineSnapshot.transactions);
      if (docsRes?.documents) setDocuments(docsRes.documents);
      else if (offlineSnapshot.documents) setDocuments(offlineSnapshot.documents);
      if (announcementsRes?.announcements) setAnnouncements(announcementsRes.announcements);
      else if (offlineSnapshot.announcements) setAnnouncements(offlineSnapshot.announcements);
      if (correctionsRes?.corrections) setCorrections(correctionsRes.corrections);
      else if (offlineSnapshot.corrections) setCorrections(offlineSnapshot.corrections);
      if (auditRes?.logs) setAuditLogs(auditRes.logs);
      else if (offlineSnapshot.auditLogs) setAuditLogs(offlineSnapshot.auditLogs);
      if (settingsRes?.settings) setChurchSettings(settingsRes.settings);
      else if (offlineSnapshot.churchSettings) setChurchSettings(offlineSnapshot.churchSettings);
      else if (!currentUser) setChurchSettings(DEFAULT_CHURCH_SETTINGS);

      // Keep a device snapshot for offline reading. Server responses remain the
      // source of truth whenever the connection is available.
      if (currentUser) cacheOfflineDataSnapshot({
        stats: statsRes?.stats || offlineSnapshot.stats || null,
        members: results[1].status === 'fulfilled' ? [...offlineItems, ...serverMembers] : offlineSnapshot.members || getCachedMembersLocally(),
        families: familiesRes?.families || offlineSnapshot.families || [],
        rayons: rayonsRes?.rayons || offlineSnapshot.rayons || [],
        categorials: catRes?.categorials || offlineSnapshot.categorials || [],
        staff: staffRes?.staff || offlineSnapshot.staff || [],
        baptisms: sacramentsRes?.baptisms || offlineSnapshot.baptisms || [],
        confirmations: sacramentsRes?.confirmations || offlineSnapshot.confirmations || [],
        marriages: sacramentsRes?.marriages || offlineSnapshot.marriages || [],
        mutations: mutationsRes?.mutations || offlineSnapshot.mutations || [],
        events: eventsRes?.events || offlineSnapshot.events || [],
        schedules: schedulesRes?.schedules || offlineSnapshot.schedules || [],
        attendance: attendanceRes?.attendance || offlineSnapshot.attendance || [],
        transactions: financeRes?.transactions || offlineSnapshot.transactions || [],
        documents: docsRes?.documents || offlineSnapshot.documents || [],
        announcements: announcementsRes?.announcements || offlineSnapshot.announcements || [],
        corrections: correctionsRes?.corrections || offlineSnapshot.corrections || [],
        auditLogs: auditRes?.logs || offlineSnapshot.auditLogs || [],
        churchSettings: settingsRes?.settings || offlineSnapshot.churchSettings || churchSettings,
      });

    } catch (err) {
      console.warn('Jaringan offline atau server tidak merespons, memuat dari penyimpanan lokal browser:', err);
      const cached = getCachedMembersLocally();
      if (cached.length > 0) {
        setMembers(cached);
      }
      const snapshot = getOfflineDataSnapshot();
      if (snapshot) {
        if (snapshot.stats) setStats(snapshot.stats);
        if (snapshot.families) setFamilies(snapshot.families);
        if (snapshot.rayons) setRayons(snapshot.rayons);
        if (snapshot.categorials) setCategorials(snapshot.categorials);
        if (snapshot.staff) setStaff(snapshot.staff);
        if (snapshot.events) setEvents(snapshot.events);
        if (snapshot.schedules) setSchedules(snapshot.schedules);
        if (snapshot.announcements) setAnnouncements(snapshot.announcements);
        if (snapshot.attendance) setAttendance(snapshot.attendance);
        if (snapshot.transactions) setTransactions(snapshot.transactions);
        if (snapshot.documents) setDocuments(snapshot.documents);
        if (snapshot.mutations) setMutations(snapshot.mutations);
      }
    }
  };

  useEffect(() => {
    loadAllData();
  }, [currentUser?.id]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null);
      setShowPublicSite(true);
      setCurrentView('dashboard');
      try { localStorage.removeItem('sysjeger_user'); } catch { /* ignore */ }
    };
    window.addEventListener('sysjeger:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('sysjeger:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'Jemaat' && currentView !== 'portal' && currentView !== 'settings') {
      setCurrentView('portal');
    }
  }, [currentUser?.role, currentView]);

  // Offline Sync execution handler
  const handleSyncOffline = async () => {
    if (syncingOffline) return;
    const queue = getOfflineMembersQueue();
    const photoCount = Object.keys(getOfflineMemberPhotos()).length;
    if (queue.length === 0 && photoCount === 0) {
      setSyncToast({ message: 'Semua data offline sudah tersinkronkan dengan server.', type: 'info' });
      return;
    }
    if (!navigator.onLine) {
      setSyncToast({ message: 'Sinkronisasi menunggu koneksi internet.', type: 'info' });
      return;
    }

    setSyncingOffline(true);
    setSyncToast({ message: `Menyinkronkan ${queue.length} data jemaat dan ${photoCount} foto...`, type: 'info' });
    try {
      const result = await syncOfflineQueueToServer(api.createMemberApi);
      const photoResult = await syncOfflineMemberPhotos(api.updateMemberPhotoApi);
      setPendingOfflineCount(getOfflineMembersQueue().length);
      await loadAllData();
      const failed = result.failedCount + photoResult.remainingCount;
      setSyncToast({
        message: failed > 0
          ? `Sinkronisasi selesai sebagian; ${failed} item masih tertunda dan akan dicoba lagi.`
          : `Berhasil menyinkronkan ${result.syncedCount + photoResult.syncedCount} item offline ke server.`,
        type: failed > 0 ? 'info' : 'success',
      });
    } catch (err: any) {
      setSyncToast({ message: `Kendala sinkronisasi: ${err?.message || 'Server belum dapat dijangkau'}`, type: 'error' });
    } finally {
      setSyncingOffline(false);
    }
  };

  // Listen for online / offline window events & auto-sync
  useEffect(() => {
    const handleOnlineEvent = () => {
      setIsOnline(true);
      // Activity photos have their own idempotent retry queue and must sync
      // even when there are no pending member records.
      void syncPendingActivityImages();
      setSyncToast({
        message: 'Koneksi internet terhubung kembali! Memulai sinkronisasi data offline...',
        type: 'success',
      });
      const pending = getOfflineMembersQueue();
      if (pending.length > 0 || Object.keys(getOfflineMemberPhotos()).length > 0) {
        handleSyncOffline();
      }
    };

    const handleOfflineEvent = () => {
      setIsOnline(false);
      setSyncToast({
        message: 'Koneksi internet terputus. Mode offline aktif — pendaftaran jemaat tetap dapat dilakukan dan tersimpan aman di perangkat.',
        type: 'info',
      });
    };

    window.addEventListener('online', handleOnlineEvent);
    window.addEventListener('offline', handleOfflineEvent);

    return () => {
      window.removeEventListener('online', handleOnlineEvent);
      window.removeEventListener('offline', handleOfflineEvent);
    };
  }, []);

  // Auto-dismiss toast notification after 6 seconds
  useEffect(() => {
    if (syncToast) {
      const timer = setTimeout(() => setSyncToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [syncToast]);

  // Google Maps Quota Listener
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Member CRUD handlers with Automatic Direct-Save & Persistence
  const handleSaveMember = async (data: Partial<Member>) => {
    try {
      if (editingMember) {
        const res = await api.updateMemberApi(editingMember.id, data);
        if (res && res.success === false) {
          throw new Error(res.message || 'Gagal memperbarui jemaat di server');
        }
        setSyncToast({
          message: `Data jemaat "${data.fullName}" berhasil diperbarui di database.`,
          type: 'success',
        });
      } else {
        const res = await api.createMemberApi(data);
        if (res && res.success) {
          setSyncToast({
            message: `Jemaat "${data.fullName}" (${res.memberNo || 'Baru'}) berhasil disimpan ke database.`,
            type: 'success',
          });
          // Immediately update state and persistent local cache
          if (res.member) {
            setMembers((prev) => {
              const updated = [res.member, ...prev.filter((m) => m.id !== res.member.id)];
              cacheMembersLocally(updated);
              return updated;
            });
          }
        } else {
          throw new Error(res?.message || 'Gagal menyimpan ke server');
        }
      }
      await loadAllData();
      setShowMemberFormModal(false);
      setEditingMember(null);
    } catch (err: any) {
      console.warn('Gagal menyimpan langsung ke server, mencadangkan ke antrean offline:', err);
      const isOfflineFailure = !navigator.onLine || err instanceof TypeError;
      if (!editingMember && isOfflineFailure) {
        const optimistic = addMemberToOfflineQueue(data);
        setMembers((prev) => {
          const updated = [optimistic, ...prev.filter((m) => m.id !== optimistic.id)];
          cacheMembersLocally(updated);
          return updated;
        });
        setPendingOfflineCount(getOfflineMembersQueue().length);
        setSyncToast({
          message: `Data jemaat "${data.fullName || 'Baru'}" aman tersimpan di penyimpanan lokal dan akan disinkronkan saat terhubung ke server.`,
          type: 'info',
        });
        setShowMemberFormModal(false);
        setEditingMember(null);
      } else {
        setSyncToast({
          message: `${editingMember ? 'Gagal memperbarui' : 'Gagal menyimpan'} jemaat: ${err?.message || 'Periksa koneksi jaringan server.'}`,
          type: 'error',
        });
      }
    }
  };

  const handleDeleteMember = async (id: string) => {
    await api.deleteMemberApi(id);
    await loadAllData();
  };

  // Direct Photo Update Handler for KAJ Cards (API database + offline retry)
  const handleUpdateMemberPhoto = async (memberId: string, photoUrl: string) => {
    // Update the printable local record first. If the network drops, the photo
    // remains usable and is retried instead of disappearing when the modal closes.
    setMembers((prev) => {
      const updated = prev.map((m) => (m.id === memberId ? { ...m, photoUrl } : m));
      cacheMembersLocally(updated);
      return updated;
    });
    if (detailMember && detailMember.id === memberId) {
      setDetailMember({ ...detailMember, photoUrl });
    }

    try {
      const result = await api.updateMemberPhotoApi(memberId, photoUrl);
      if (result?.success === false) throw new Error(result.message || 'Server menolak foto');
      removeOfflineMemberPhoto(memberId);
      setSyncToast({
        message: 'Foto anggota jemaat berhasil diperbarui dan tersimpan di database serta kartu jemaat.',
        type: 'success',
      });
    } catch (err: any) {
      const isOfflineFailure = !navigator.onLine || err instanceof TypeError;
      if (isOfflineFailure) {
        cacheMemberPhotoOffline(memberId, photoUrl);
        console.warn('Photo queued for offline synchronization:', err);
        setSyncToast({
          message: 'Foto tersimpan pada perangkat dan kartu jemaat. Sinkronisasi server akan diulang saat online.',
          type: 'info',
        });
      } else {
        setSyncToast({
          message: `Foto belum tersimpan di server: ${err?.message || 'Permintaan ditolak.'}`,
          type: 'error',
        });
      }
    }
  };

  // Super Admin: remove only the explicitly identified legacy demo records.
  const handlePurgeAllSampleData = async () => {
    if (currentUser?.role !== 'Super Admin') {
      setSyncToast({ message: 'Hanya Super Admin yang dapat membersihkan data contoh.', type: 'error' });
      return;
    }
    if (!window.confirm('Hapus data contoh lama yang teridentifikasi? Data riil dan data yang Anda masukkan sendiri tidak akan dihapus.')) return;
    try {
      const result = await api.purgeSampleDataApi();
      if (result?.success === false) throw new Error(result.message || 'Pembersihan ditolak server');
      // Keep pending offline records: they may contain real data entered by
      // the operator and are not part of the legacy demo cleanup.
      await loadAllData();
      setSyncToast({ message: 'Data contoh lama berhasil dibersihkan tanpa mengosongkan data riil.', type: 'success' });
    } catch (err: any) {
      setSyncToast({ message: `Gagal membersihkan data contoh: ${err?.message || 'Kesalahan server'}`, type: 'error' });
    }
  };

  // Family CRUD handlers
  const handleSaveFamily = async (data: Partial<Family>) => {
    if (editingFamily || data.id) {
      const famId = editingFamily?.id || data.id!;
      await api.updateFamilyApi(famId, data);
      setSyncToast({
        message: `Data Kartu Keluarga "${data.headOfFamilyName}" berhasil diperbarui di database.`,
        type: 'success',
      });
    } else {
      await api.createFamilyApi(data);
      setSyncToast({
        message: `Kartu Keluarga baru "${data.headOfFamilyName}" berhasil disimpan ke database.`,
        type: 'success',
      });
    }
    setEditingFamily(null);
    setShowFamilyModal(false);
    await loadAllData();
  };

  const handleDeleteFamily = async (id: string) => {
    await api.deleteFamilyApi(id);
    await loadAllData();
  };

  // Church Staff (Majelis, Pendeta, dan Pengajar) CRUD through the API database.
  const handleAddStaff = async (data: Partial<ChurchStaff>) => {
    await api.createStaffApi(data);
    await loadAllData();
  };

  const handleUpdateStaff = async (id: string, data: Partial<ChurchStaff>) => {
    await api.updateStaffApi(id, data);
    await loadAllData();
  };

  const handleDeleteStaff = async (id: string) => {
    await api.deleteStaffApi(id);
    await loadAllData();
  };

  const handleClearAllStaff = async () => {
    await api.clearAllStaffApi();
    await loadAllData();
  };

  // Sacrament handlers
  const handleSaveBaptism = async (data: any) => {
    await api.createBaptismApi(data);
    await loadAllData();
  };
  const handleSaveConfirmation = async (data: any) => {
    await api.createConfirmationApi(data);
    await loadAllData();
  };
  const handleSaveMarriage = async (data: any) => {
    await api.createMarriageApi(data);
    await loadAllData();
  };

  const handleDeleteSacrament = async (type: 'baptis' | 'sidi' | 'nikah', id: string) => {
    await api.deleteSacramentApi(type, id);
    await loadAllData();
  };

  const handleUpdateSacrament = async (type: 'baptis' | 'sidi' | 'nikah', id: string, data: any) => {
    await adminApi.updateSacramentApi(type, id, data);
    await loadAllData();
  };

  // Mutation handler
  const handleAddMutation = async (data: Partial<MutationRecord>) => {
    await api.createMutationApi(data);
    await loadAllData();
  };

  const handleUpdateMutation = async (id: string, data: Partial<MutationRecord>) => {
    await adminApi.updateMutationApi(id, data);
    await loadAllData();
  };

  const handleDeleteMutation = async (id: string) => {
    await adminApi.deleteMutationApi(id);
    await loadAllData();
  };

  // Super Admin structure controls (rayon and kategorial)
  const handleSaveRayon = async (data: Partial<Rayon>, id?: string) => {
    if (currentUser?.role !== 'Super Admin') throw new Error('Hanya Super Admin yang dapat mengubah struktur rayon.');
    if (id) await adminApi.updateRayonApi(id, data);
    else await adminApi.createRayonApi(data);
    await loadAllData();
  };

  const handleDeleteRayon = async (id: string) => {
    if (currentUser?.role !== 'Super Admin') throw new Error('Hanya Super Admin yang dapat menghapus rayon.');
    await adminApi.deleteRayonApi(id);
    await loadAllData();
  };

  const handleSaveCategorial = async (data: Partial<CategorialGroup>, id?: string) => {
    if (currentUser?.role !== 'Super Admin') throw new Error('Hanya Super Admin yang dapat mengubah kategorial.');
    if (id) await adminApi.updateCategorialApi(id, data);
    else await adminApi.createCategorialApi(data);
    await loadAllData();
  };

  const handleDeleteCategorial = async (id: string) => {
    if (currentUser?.role !== 'Super Admin') throw new Error('Hanya Super Admin yang dapat menghapus kategorial.');
    await adminApi.deleteCategorialApi(id);
    await loadAllData();
  };

  // Event and service schedule handlers use the same durable API database.
  const handleAddEvent = async (data: Partial<ChurchEvent>) => {
    await api.createEventApi(data);
    await loadAllData();
  };

  const handleUpdateEvent = async (id: string, data: Partial<ChurchEvent>) => {
    await api.updateEventApi(id, data);
    await loadAllData();
  };

  const handleDeleteEvent = async (id: string) => {
    await api.deleteEventApi(id);
    await loadAllData();
  };

  const handleAddSchedule = async (data: Partial<ServiceSchedule>) => {
    await api.createScheduleApi(data);
    await loadAllData();
  };

  const handleUpdateSchedule = async (id: string, data: Partial<ServiceSchedule>) => {
    await api.updateScheduleApi(id, data);
    await loadAllData();
  };

  const handleDeleteSchedule = async (id: string) => {
    await api.deleteScheduleApi(id);
    await loadAllData();
  };

  const handleClearAllSchedules = async () => {
    await api.clearAllSchedulesApi();
    await loadAllData();
  };

  // Attendance handler
  const handleAddAttendance = async (data: Partial<AttendanceRecord>) => {
    await api.createAttendanceApi(data);
    await loadAllData();
  };

  const handleUpdateAttendance = async (id: string, data: Partial<AttendanceRecord>) => {
    await adminApi.updateAttendanceApi(id, data);
    await loadAllData();
  };

  const handleDeleteAttendance = async (id: string) => {
    await adminApi.deleteAttendanceApi(id);
    await loadAllData();
  };

  // Finance handler
  const handleAddFinance = async (data: Partial<FinancialTransaction>) => {
    await api.createFinanceApi(data);
    await loadAllData();
  };

  const handleDeleteFinance = async (id: string) => {
    await api.deleteFinanceApi(id);
    await loadAllData();
  };

  const handleUpdateFinance = async (id: string, data: Partial<FinancialTransaction>) => {
    await adminApi.updateFinanceApi(id, data);
    await loadAllData();
  };

  // Document handler
  const handleAddDocument = async (data: Partial<DocumentRecord>) => {
    await api.createDocumentApi(data);
    await loadAllData();
  };

  const handleUpdateDocument = async (id: string, data: Partial<DocumentRecord>) => {
    await adminApi.updateDocumentApi(id, data);
    await loadAllData();
  };

  const handleDeleteDocument = async (id: string) => {
    await adminApi.deleteDocumentApi(id);
    await loadAllData();
  };

  const handleSaveChurchSettings = async (data: ChurchSettings) => {
    if (currentUser?.role !== 'Super Admin') throw new Error('Hanya Super Admin yang dapat mengubah kop resmi.');
    const response = await api.updateChurchSettingsApi(data);
    if (response?.settings) setChurchSettings(response.settings);
    await loadAllData();
  };

  // Announcement (Warta Jemaat) handlers use the API database only.
  const handleAddAnnouncement = async (data: Partial<Announcement>) => {
    await api.createAnnouncementApi(data);
    await loadAllData();
  };

  const handleUpdateAnnouncement = async (id: string, data: Partial<Announcement>) => {
    await api.updateAnnouncementApi(id, data);
    await loadAllData();
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await api.deleteAnnouncementApi(id);
    await loadAllData();
  };

  // Correction request handler
  const handleSubmitCorrection = async (details: string) => {
    const mem = currentUser?.memberId ? members.find((m) => m.id === currentUser.memberId) : null;
    if (mem) {
      await api.createCorrectionApi({
        memberId: mem.id,
        memberName: mem.fullName,
        details,
      });
      await loadAllData();
    }
  };

  // Login & Logout authentication handlers
  const handleLoginSuccess = (user: User, token?: string) => {
    if (token) api.setAuthToken(token);
    try {
      localStorage.setItem('sysjeger_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    setCurrentUser(user);
    setShowPublicSite(false);
    setShowLoginModal(false);
    if (user.role === 'Jemaat') {
      setCurrentView('portal');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    api.clearAuthToken();
    try {
      localStorage.removeItem('sysjeger_user');
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setShowPublicSite(true);
    setCurrentView('dashboard');
  };

  // Import handler
  const handleImportMembers = async (items: Partial<Member>[]) => {
    const res = await api.importMembersApi(items);
    await loadAllData();
    return res;
  };

  // Active member for Portal
  const activePortalMember = currentUser?.memberId
    ? members.find((m) => m.id === currentUser.memberId) || null
    : null;
  const activePortalFamily = activePortalMember ? families.find((f) => f.id === activePortalMember.familyId) || null : null;
  const activePortalFamilyMembers = activePortalFamily ? members.filter((m) => m.familyId === activePortalFamily.id) : [];

  // Public website view & Privacy Barrier:
  // If showPublicSite is true or if user is unauthenticated, ONLY render public site + login modal
  if (showPublicSite || !currentUser) {
    return (
      <>
        <PublicLanding
          onEnterApp={() => {
            if (currentUser) {
              setShowPublicSite(false);
            } else {
              setShowLoginModal(true);
            }
          }}
          onOpenLogin={() => setShowLoginModal(true)}
          announcements={announcements}
          events={events}
          schedules={schedules}
          stats={stats}
          members={currentUser && currentUser.role !== 'Jemaat' ? members : []}
          families={currentUser && currentUser.role !== 'Jemaat' ? families : []}
          rayons={rayons}
          categorials={categorials}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="chroma-app min-h-screen text-slate-100 flex flex-col font-sans">
      <div className="chroma-ribbon" aria-hidden="true" />
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenPublicSite={() => setShowPublicSite(true)}
        isOpenMobile={isOpenMobileSidebar}
        onCloseMobile={() => setIsOpenMobileSidebar(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        <Header
          currentView={currentView}
          currentUser={currentUser}
          onOpenMobileSidebar={() => setIsOpenMobileSidebar(true)}
          onOpenPublicSite={() => setShowPublicSite(true)}
          onLogout={handleLogout}
          isOnline={isOnline}
          pendingOfflineCount={pendingOfflineCount}
          onSyncOffline={handleSyncOffline}
          syncingOffline={syncingOffline}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <React.Suspense fallback={<div className="chroma-card p-8 rounded-2xl text-center text-sm text-cyan-200">Memuat modul pelayanan…</div>}>
          {currentView === 'dashboard' && (
            <DashboardView
              stats={stats}
              members={members}
              onNavigate={(v) => setCurrentView(v)}
              onOpenAddMember={() => {
                setEditingMember(null);
                setShowMemberFormModal(true);
              }}
              onOpenAddFamily={() => setShowFamilyModal(true)}
              onOpenAddFinance={() => setCurrentView('finance')}
              onOpenAddAttendance={() => setCurrentView('attendance')}
              onOpenMemberDetail={(m) => {
                setDetailMember(m);
                setShowMemberDetailModal(true);
              }}
              onOpenComposeWarta={() => setShowWartaPdfModal(true)}
              onOpenSpiritualAiTab={(tab) => {
                setAiActiveTab(tab);
                setCurrentView('ai-assistant');
              }}
            />
          )}

          {currentView === 'ai-assistant' && (
            <AIAssistantView
              members={members}
              rayons={rayons}
              stats={stats}
              onAddAnnouncement={handleAddAnnouncement}
              onAddEvent={handleAddEvent}
              initialTab={aiActiveTab as any}
            />
          )}

          {currentView === 'members' && (
            <MembersView
              members={members}
              rayons={rayons}
              categorials={categorials}
              onOpenAddModal={() => {
                setEditingMember(null);
                setShowMemberFormModal(true);
              }}
              onOpenEditModal={(m) => {
                setEditingMember(m);
                setShowMemberFormModal(true);
              }}
              onOpenDetailModal={(m) => {
                setDetailMember(m);
                setShowMemberDetailModal(true);
              }}
              onDeleteMember={handleDeleteMember}
              onOpenImportModal={() => setShowImportModal(true)}
              onOpenKoboExport={() => setShowKoboExportModal(true)}
              onOpenPrintReport={() => {
                setReportType('members');
                setShowPrintReportModal(true);
              }}
              isOnline={isOnline}
              onSyncOffline={handleSyncOffline}
              syncingOffline={syncingOffline}
            />
          )}

          {currentView === 'families' && (
            <FamiliesView
              families={families}
              members={members}
              rayons={rayons}
              categorials={categorials}
              onOpenAddModal={() => {
                setEditingFamily(null);
                setShowFamilyModal(true);
              }}
              onEditFamily={(fam) => {
                setEditingFamily(fam);
                setShowFamilyModal(true);
              }}
              onDeleteFamily={handleDeleteFamily}
              onOpenImportModal={() => setShowImportModal(true)}
              onOpenPrintReport={() => {
                setReportType('rayons');
                setShowPrintReportModal(true);
              }}
            />
          )}

          {currentView === 'rayons' && (
            <RayonsView
              rayons={rayons}
              categorials={categorials}
              members={members}
              initialTab="rayons"
              canManage={currentUser?.role === 'Super Admin'}
              onSaveRayon={handleSaveRayon}
              onDeleteRayon={handleDeleteRayon}
              onSaveCategorial={handleSaveCategorial}
              onDeleteCategorial={handleDeleteCategorial}
              onSelectMember={(m) => {
                setDetailMember(m);
                setShowMemberDetailModal(true);
              }}
            />
          )}

          {currentView === 'maps' && (
            <GoogleMapsView
              members={members}
              families={families}
              rayons={rayons}
              canManage={Boolean(currentUser && currentUser.role !== 'Jemaat')}
              onUpdateRayonLocation={async (rayonId, lat, lng) => {
                await adminApi.updateRayonApi(rayonId, { latitude: lat, longitude: lng });
                await loadAllData();
              }}
              onUpdateFamilyLocation={async (familyId, lat, lng) => {
                await api.updateFamilyApi(familyId, { latitude: lat, longitude: lng });
                await loadAllData();
              }}
              onSaveChurchLocation={async (data) => {
                await api.createLocationApi(data);
                await loadAllData();
              }}
              onDeleteChurchLocation={async (id) => {
                await api.deleteLocationApi(id);
                await loadAllData();
              }}
            />
          )}

          {currentView === 'categorials' && (
            <RayonsView
              rayons={rayons}
              categorials={categorials}
              members={members}
              initialTab="categorials"
              canManage={currentUser?.role === 'Super Admin'}
              onSaveRayon={handleSaveRayon}
              onDeleteRayon={handleDeleteRayon}
              onSaveCategorial={handleSaveCategorial}
              onDeleteCategorial={handleDeleteCategorial}
              onSelectMember={(m) => {
                setDetailMember(m);
                setShowMemberDetailModal(true);
              }}
            />
          )}

          {currentView === 'staff' && (
            <StaffView
              staff={staff}
              onAddStaff={handleAddStaff}
              onUpdateStaff={handleUpdateStaff}
              onDeleteStaff={handleDeleteStaff}
              onClearAllStaff={handleClearAllStaff}
            />
          )}

          {currentView === 'sacraments' && (
            <SacramentsView
              baptisms={baptisms}
              confirmations={confirmations}
              marriages={marriages}
              members={members}
              onOpenAddBaptism={() => {
                setSacramentType('baptis');
                setEditingSacrament(null);
                setShowSacramentModal(true);
              }}
              onOpenAddConfirmation={() => {
                setSacramentType('sidi');
                setEditingSacrament(null);
                setShowSacramentModal(true);
              }}
              onOpenAddMarriage={() => {
                setSacramentType('nikah');
                setEditingSacrament(null);
                setShowSacramentModal(true);
              }}
              onDeleteSacrament={handleDeleteSacrament}
              onEditSacrament={(type, record) => {
                setSacramentType(type);
                setEditingSacrament(record);
                setShowSacramentModal(true);
              }}
              onPrintCertificate={(type, record) => {
                setReportType('sacraments');
                setShowPrintReportModal(true);
              }}
              rayons={rayons}
              onRefreshSacraments={loadAllData}
            />
          )}

          {currentView === 'mutations' && (
            <MutationsView
              mutations={mutations}
              members={members}
              rayons={rayons}
              onAddMutation={handleAddMutation}
              onUpdateMutation={handleUpdateMutation}
              onDeleteMutation={handleDeleteMutation}
            />
          )}

          {currentView === 'events' && (
            <EventsView
              events={events}
              schedules={schedules}
              onAddEvent={handleAddEvent}
              onUpdateEvent={handleUpdateEvent}
              onDeleteEvent={handleDeleteEvent}
              onAddSchedule={handleAddSchedule}
              onUpdateSchedule={handleUpdateSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onClearAllSchedules={handleClearAllSchedules}
              onOpenAIAgendaGenerator={() => {
                setAiActiveTab('church-news');
                setCurrentView('ai-assistant');
              }}
            />
          )}

          {currentView === 'attendance' && (
            <AttendanceView
              attendance={attendance}
              onAddAttendance={handleAddAttendance}
              onUpdateAttendance={handleUpdateAttendance}
              onDeleteAttendance={handleDeleteAttendance}
              onOpenPrintReport={() => {
                setReportType('attendance');
                setShowPrintReportModal(true);
              }}
            />
          )}

          {currentView === 'finance' && (
            <FinanceView
              transactions={transactions}
              onAddTransaction={handleAddFinance}
              onUpdateTransaction={handleUpdateFinance}
              onDeleteTransaction={handleDeleteFinance}
              onOpenPrintReport={() => {
                setReportType('finance');
                setShowPrintReportModal(true);
              }}
            />
          )}

          {currentView === 'documents' && (
            <DocumentsView
              documents={documents}
              members={members}
              onAddDocument={handleAddDocument}
              onUpdateDocument={handleUpdateDocument}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {currentView === 'announcements' && (
            <AnnouncementsView
              announcements={announcements}
              onAddAnnouncement={handleAddAnnouncement}
              onUpdateAnnouncement={handleUpdateAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              churchSettings={churchSettings}
              rayons={rayons}
            />
          )}

          {currentView === 'workspace' && (
            <GoogleWorkspaceView
              members={members}
              transactions={transactions}
              rayons={rayons}
            />
          )}

          {currentView === 'reports' && (
            <ReportsView
              onOpenPrintReport={(t) => {
                setReportType(t);
                setShowPrintReportModal(true);
              }}
              members={members}
              families={families}
              rayons={rayons}
              transactions={transactions}
            />
          )}

          {currentView === 'portal' && (activePortalMember ? (
            <JemaatPortalView
              currentMember={activePortalMember}
              family={activePortalFamily}
              familyMembers={activePortalFamilyMembers}
              schedules={schedules}
              corrections={corrections}
              onSubmitCorrection={handleSubmitCorrection}
              onPrintCard={() => {
                setDetailMember(activePortalMember);
                setShowMemberDetailModal(true);
              }}
            />
          ) : (
            <div className="chroma-card max-w-xl mx-auto p-8 rounded-2xl text-center space-y-3">
              <h2 className="text-lg font-bold text-white">Portal Jemaat</h2>
              <p className="text-sm text-slate-400">Akun ini belum terhubung ke data diri jemaat. Hubungi Tata Usaha untuk menautkan akun Anda; data jemaat lain tidak ditampilkan.</p>
            </div>
          ))}

          {currentView === 'settings' && (
            <SettingsView
              onNavigateToBackup={() => setCurrentView('backup')}
              onPurgeSampleData={handlePurgeAllSampleData}
              isSuperAdmin={currentUser?.role === 'Super Admin'}
              currentUser={currentUser}
              members={members}
              rayons={rayons}
              churchSettings={churchSettings}
              onSaveChurchSettings={handleSaveChurchSettings}
            />
          )}

          {currentView === 'backup' && (
            <BackupView
              onOpenImport={() => setShowImportModal(true)}
            />
          )}

          {currentView === 'audit' && (
            <AuditLogsView
              logs={auditLogs}
            />
          )}

          {currentView === 'n8n' && (
            <N8nIntegrationView />
          )}
          </React.Suspense>
        </main>
      </div>

      {/* Global Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <MemberFormModal
        isOpen={showMemberFormModal}
        onClose={() => {
          setShowMemberFormModal(false);
          setEditingMember(null);
        }}
        onSave={handleSaveMember}
        member={editingMember}
        rayons={rayons}
        categorials={categorials}
        families={families}
      />

      <MemberDetailModal
        isOpen={showMemberDetailModal}
        onClose={() => {
          setShowMemberDetailModal(false);
          setDetailMember(null);
        }}
        member={detailMember}
        onUpdatePhoto={handleUpdateMemberPhoto}
      />

      <FamilyModal
        isOpen={showFamilyModal}
        onClose={() => {
          setShowFamilyModal(false);
          setEditingFamily(null);
        }}
        onSave={handleSaveFamily}
        rayons={rayons}
        family={editingFamily}
      />

      <SacramentModal
        isOpen={showSacramentModal}
        type={sacramentType}
        onClose={() => { setShowSacramentModal(false); setEditingSacrament(null); }}
        members={members}
        editingRecord={editingSacrament}
        onUpdateSacrament={handleUpdateSacrament}
        onSaveBaptism={handleSaveBaptism}
        onSaveConfirmation={handleSaveConfirmation}
        onSaveMarriage={handleSaveMarriage}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportMembers}
        rayons={rayons}
        categorials={categorials}
        families={families}
        members={members}
      />

      <PrintReportModal
        isOpen={showPrintReportModal}
        onClose={() => setShowPrintReportModal(false)}
        reportType={reportType}
        members={members}
        families={families}
        rayons={rayons}
        transactions={transactions}
        churchSettings={churchSettings}
      />

      <KoboExportModal
        isOpen={showKoboExportModal}
        onClose={() => setShowKoboExportModal(false)}
        members={members}
        rayons={rayons}
      />

      {showWartaPdfModal && (
        <React.Suspense fallback={<div className="fixed inset-0 z-50 grid place-items-center bg-black/70 text-sm text-cyan-200">Menyiapkan editor warta…</div>}>
          <WartaPdfModal
            isOpen
            onClose={() => setShowWartaPdfModal(false)}
            transactions={transactions}
            members={members}
            rayons={rayons}
            churchSettings={churchSettings}
          />
        </React.Suspense>
      )}

      {/* Floating Offline & Sync Notification Toast */}
      {syncToast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-start sm:items-center gap-3 max-w-md px-4 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-medium border transition-all ${
            syncToast.type === 'success'
              ? 'bg-[#062419] text-emerald-300 border-emerald-500/50 shadow-emerald-950/70'
              : syncToast.type === 'error'
              ? 'bg-[#2b0c0c] text-rose-300 border-rose-500/50 shadow-rose-950/70'
              : 'bg-[#261d06] text-amber-300 border-amber-500/50 shadow-amber-950/70'
          }`}
          role="alert"
        >
          <span className="flex-1">{syncToast.message}</span>
          <button
            onClick={() => setSyncToast(null)}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
            aria-label="Tutup notifikasi"
          >
            ✕
          </button>
        </div>
      )}

      {/* Network & Offline Status Banner */}
      <OfflineIndicator />
    </div>
  );
}
