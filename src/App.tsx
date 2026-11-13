/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import {
  isFirestoreSyncReady,
  mirrorDocToFirestore,
  removeDocFromFirestore,
  pullCollectionFromFirestore,
} from './services/firestore-sync.ts';
import { calculateChurchStats } from './utils/church-logic.ts';

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
  enqueueUniversalOfflineMutation,
  syncUniversalOfflineMutations,
  getTotalPendingOfflineCount,
  type OfflineMutationEntity,
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
import { getUpcomingBirthdays } from './utils/celebrations.ts';

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
  const mainContentRef = React.useRef<HTMLElement | null>(null);

  // Smoothly reset the main content viewport to the top on navigation
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [currentView]);

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

  // Compute upcoming member birthdays within 7 days for global notification bell and sidebar badge
  const upcomingBirthdays7Days = useMemo(() => getUpcomingBirthdays(members, 7), [members]);

  // Offline Synchronization & Network Awareness
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(() =>
    getTotalPendingOfflineCount()
  );
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [syncToast, setSyncToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const universalSyncHandlers = useMemo(
    () => ({
      createMember: api.createMemberApi,
      updateMember: api.updateMemberApi,
      deleteMember: api.deleteMemberApi,
      createFamily: api.createFamilyApi,
      updateFamily: api.updateFamilyApi,
      deleteFamily: api.deleteFamilyApi,
      createFinance: api.createFinanceApi,
      updateFinance: adminApi.updateFinanceApi,
      deleteFinance: api.deleteFinanceApi,
      createEvent: api.createEventApi,
      updateEvent: api.updateEventApi,
      deleteEvent: api.deleteEventApi,
      createSchedule: api.createScheduleApi,
      updateSchedule: api.updateScheduleApi,
      deleteSchedule: api.deleteScheduleApi,
      createAnnouncement: api.createAnnouncementApi,
      updateAnnouncement: api.updateAnnouncementApi,
      deleteAnnouncement: api.deleteAnnouncementApi,
      createAttendance: api.createAttendanceApi,
      deleteAttendance: adminApi.deleteAttendanceApi,
    }),
    []
  );

  // Load all data from API with Auto-Sync, Firestore Fallback, & Promise.allSettled Resilience
  const loadAllData = async () => {
    // Retry pending activity images, member photos, and queued records.
    if (currentUser && navigator.onLine) {
      await syncPendingActivityImages();
      if (Object.keys(getOfflineMemberPhotos()).length > 0) {
        await syncOfflineMemberPhotos(api.updateMemberPhotoApi);
      }
      if (getOfflineMembersQueue().length > 0) {
        try {
          await syncOfflineQueueToServer(api.createMemberApi);
        } catch (syncErr) {
          console.warn('Auto-sync offline member queue failed on loadAllData:', syncErr);
        }
      }
      try {
        await syncUniversalOfflineMutations(universalSyncHandlers);
      } catch (universalErr) {
        console.warn('Auto-sync universal mutation queue failed on loadAllData:', universalErr);
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

      const backendOnline = Boolean(
        statsRes?._fromBackend ||
        membersRes?._fromBackend ||
        announcementsRes?._fromBackend ||
        rayonsRes?._fromBackend
      );

      // Handle Members: Combine server members with remaining pending offline items
      const pendingPhotos = getOfflineMemberPhotos();
      const serverMembers: Member[] = (membersRes?._fromBackend ? (membersRes?.members || []) : []).map((member: Member) =>
        pendingPhotos[member.id] ? { ...member, photoUrl: pendingPhotos[member.id] } : member
      );
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

      let resolvedMembers: Member[] = [];
      if (currentUser && membersRes?._fromBackend) {
        resolvedMembers = [
          ...offlineItems,
          ...serverMembers.filter((sm) => !offlineItems.some((om) => om.id === sm.id)),
        ];
        setMembers(resolvedMembers);
        cacheMembersLocally(resolvedMembers);
      } else if (currentUser) {
        const cached = getCachedMembersLocally();
        resolvedMembers = cached.length > 0 ? cached : (offlineSnapshot.members || []);
        if (resolvedMembers.length > 0) {
          setMembers(resolvedMembers);
        }
      }

      // Cross-device Cloud Firestore pull when backend API is absent (e.g. Netlify static) & Firebase user is signed in
      let firestoreFamilies: Family[] = [];
      let firestoreTransactions: FinancialTransaction[] = [];
      let firestoreEvents: ChurchEvent[] = [];
      let firestoreSchedules: ServiceSchedule[] = [];
      let firestoreAnnouncements: Announcement[] = [];

      if (currentUser && !backendOnline && isFirestoreSyncReady()) {
        const [fbMembers, fbFamilies, fbTx, fbEvents, fbSchedules, fbAnnouncements] = await Promise.all([
          !isJemaat ? pullCollectionFromFirestore<Member>('members') : Promise.resolve([]),
          !isJemaat ? pullCollectionFromFirestore<Family>('families') : Promise.resolve([]),
          !isJemaat ? pullCollectionFromFirestore<FinancialTransaction>('financial_transactions') : Promise.resolve([]),
          pullCollectionFromFirestore<ChurchEvent>('events'),
          pullCollectionFromFirestore<ServiceSchedule>('schedules'),
          pullCollectionFromFirestore<Announcement>('announcements'),
        ]);
        if (fbMembers.length > 0) {
          const mergedMap = new Map<string, Member>();
          fbMembers.forEach((m) => mergedMap.set(m.id, m));
          resolvedMembers.forEach((m) => mergedMap.set(m.id, m));
          resolvedMembers = [...mergedMap.values()];
          setMembers(resolvedMembers);
          cacheMembersLocally(resolvedMembers);
        }
        firestoreFamilies = fbFamilies;
        firestoreTransactions = fbTx;
        firestoreEvents = fbEvents;
        firestoreSchedules = fbSchedules;
        firestoreAnnouncements = fbAnnouncements;
      }

      setPendingOfflineCount(getTotalPendingOfflineCount());

      const resolvedFamilies = familiesRes?._fromBackend
        ? familiesRes.families
        : (firestoreFamilies.length > 0 ? firestoreFamilies : (offlineSnapshot.families || []));
      if (familiesRes?._fromBackend || firestoreFamilies.length > 0 || offlineSnapshot.families) {
        setFamilies(resolvedFamilies);
      }

      if (rayonsRes?.rayons) setRayons(rayonsRes.rayons);
      else if (offlineSnapshot.rayons) setRayons(offlineSnapshot.rayons);
      if (catRes?.categorials) setCategorials(catRes.categorials);
      else if (offlineSnapshot.categorials) setCategorials(offlineSnapshot.categorials);
      if (staffRes?._fromBackend && staffRes?.staff) setStaff(staffRes.staff);
      else if (offlineSnapshot.staff) setStaff(offlineSnapshot.staff);
      if (sacramentsRes?._fromBackend) {
        setBaptisms(sacramentsRes.baptisms || []);
        setConfirmations(sacramentsRes.confirmations || []);
        setMarriages(sacramentsRes.marriages || []);
      } else if (offlineSnapshot.baptisms) {
        setBaptisms(offlineSnapshot.baptisms);
        setConfirmations(offlineSnapshot.confirmations || []);
        setMarriages(offlineSnapshot.marriages || []);
      }
      if (mutationsRes?._fromBackend && mutationsRes?.mutations) setMutations(mutationsRes.mutations);
      else if (offlineSnapshot.mutations) setMutations(offlineSnapshot.mutations);

      const resolvedEvents = eventsRes?._fromBackend
        ? eventsRes.events
        : (firestoreEvents.length > 0 ? firestoreEvents : (offlineSnapshot.events || []));
      if (eventsRes?._fromBackend || firestoreEvents.length > 0 || offlineSnapshot.events) setEvents(resolvedEvents);

      const resolvedSchedules = schedulesRes?._fromBackend
        ? schedulesRes.schedules
        : (firestoreSchedules.length > 0 ? firestoreSchedules : (offlineSnapshot.schedules || []));
      if (schedulesRes?._fromBackend || firestoreSchedules.length > 0 || offlineSnapshot.schedules) setSchedules(resolvedSchedules);

      if (attendanceRes?._fromBackend && attendanceRes?.attendance) setAttendance(attendanceRes.attendance);
      else if (offlineSnapshot.attendance) setAttendance(offlineSnapshot.attendance);

      const resolvedTransactions = financeRes?._fromBackend
        ? financeRes.transactions
        : (firestoreTransactions.length > 0 ? firestoreTransactions : (offlineSnapshot.transactions || []));
      if (financeRes?._fromBackend || firestoreTransactions.length > 0 || offlineSnapshot.transactions) {
        setTransactions(resolvedTransactions);
      }

      if (docsRes?._fromBackend && docsRes?.documents) setDocuments(docsRes.documents);
      else if (offlineSnapshot.documents) setDocuments(offlineSnapshot.documents);

      const resolvedAnnouncements = announcementsRes?._fromBackend
        ? announcementsRes.announcements
        : (firestoreAnnouncements.length > 0 ? firestoreAnnouncements : (offlineSnapshot.announcements || []));
      if (announcementsRes?._fromBackend || firestoreAnnouncements.length > 0 || offlineSnapshot.announcements) {
        setAnnouncements(resolvedAnnouncements);
      }

      if (correctionsRes?._fromBackend && correctionsRes?.corrections) setCorrections(correctionsRes.corrections);
      else if (offlineSnapshot.corrections) setCorrections(offlineSnapshot.corrections);
      if (auditRes?._fromBackend && auditRes?.logs) setAuditLogs(auditRes.logs);
      else if (offlineSnapshot.auditLogs) setAuditLogs(offlineSnapshot.auditLogs);
      if (settingsRes?._fromBackend && settingsRes?.settings) setChurchSettings(settingsRes.settings);
      else if (offlineSnapshot.churchSettings) setChurchSettings(offlineSnapshot.churchSettings);
      else if (!currentUser) setChurchSettings(DEFAULT_CHURCH_SETTINGS);

      // Compute accurate live stats even when offline or in static host mode
      const computedLocalStats = currentUser
        ? {
            ...calculateChurchStats(resolvedMembers, resolvedFamilies, resolvedTransactions),
            upcomingEvents: resolvedEvents.slice(0, 5),
            nextService: resolvedSchedules[0] || null,
          }
        : null;

      const finalStats = statsRes?._fromBackend && statsRes?.stats && remainingOffline.length === 0
        ? statsRes.stats
        : (computedLocalStats || offlineSnapshot.stats || statsRes?.stats || null);

      if (finalStats) setStats(finalStats);

      // Keep a device snapshot for offline reading. Server responses remain the
      // source of truth whenever the connection is available.
      if (currentUser) cacheOfflineDataSnapshot({
        stats: finalStats,
        members: resolvedMembers,
        families: resolvedFamilies,
        rayons: (rayonsRes?._fromBackend ? rayonsRes.rayons : null) || offlineSnapshot.rayons || [],
        categorials: (catRes?._fromBackend ? catRes.categorials : null) || offlineSnapshot.categorials || [],
        staff: (staffRes?._fromBackend ? staffRes.staff : null) || offlineSnapshot.staff || [],
        baptisms: (sacramentsRes?._fromBackend ? sacramentsRes.baptisms : null) || offlineSnapshot.baptisms || [],
        confirmations: (sacramentsRes?._fromBackend ? sacramentsRes.confirmations : null) || offlineSnapshot.confirmations || [],
        marriages: (sacramentsRes?._fromBackend ? sacramentsRes.marriages : null) || offlineSnapshot.marriages || [],
        mutations: (mutationsRes?._fromBackend ? mutationsRes.mutations : null) || offlineSnapshot.mutations || [],
        events: resolvedEvents,
        schedules: resolvedSchedules,
        attendance: (attendanceRes?._fromBackend ? attendanceRes.attendance : null) || offlineSnapshot.attendance || [],
        transactions: resolvedTransactions,
        documents: (docsRes?._fromBackend ? docsRes.documents : null) || offlineSnapshot.documents || [],
        announcements: resolvedAnnouncements,
        corrections: (correctionsRes?._fromBackend ? correctionsRes.corrections : null) || offlineSnapshot.corrections || [],
        auditLogs: (auditRes?._fromBackend ? auditRes.logs : null) || offlineSnapshot.auditLogs || [],
        churchSettings: (settingsRes?._fromBackend ? settingsRes.settings : null) || offlineSnapshot.churchSettings || churchSettings,
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
    const totalPending = getTotalPendingOfflineCount();
    if (totalPending === 0) {
      setSyncToast({ message: 'Semua data offline sudah tersinkronkan dengan server.', type: 'info' });
      return;
    }
    if (!navigator.onLine) {
      setSyncToast({ message: 'Sinkronisasi menunggu koneksi internet.', type: 'info' });
      return;
    }

    setSyncingOffline(true);
    setSyncToast({ message: `Menyinkronkan ${totalPending} perubahan data offline...`, type: 'info' });
    try {
      const result = await syncOfflineQueueToServer(api.createMemberApi);
      const universalResult = await syncUniversalOfflineMutations(universalSyncHandlers);
      const photoResult = await syncOfflineMemberPhotos(api.updateMemberPhotoApi);
      await syncPendingActivityImages();
      setPendingOfflineCount(getTotalPendingOfflineCount());
      await loadAllData();
      const synced = result.syncedCount + universalResult.syncedCount + photoResult.syncedCount;
      const failed = result.failedCount + universalResult.failedCount + photoResult.remainingCount;
      setSyncToast({
        message: failed > 0
          ? `Sinkronisasi selesai sebagian (${synced} berhasil, ${failed} menunggu server aktif).`
          : `Berhasil menyinkronkan ${synced} item offline ke server.`,
        type: failed > 0 ? 'info' : 'success',
      });
    } catch (err: any) {
      setSyncToast({ message: `Kendala sinkronisasi: ${err?.message || 'Server belum dapat dijangkau'}`, type: 'error' });
    } finally {
      setSyncingOffline(false);
    }
  };

  // Listen for online / offline / tab visibility & periodic background auto-sync
  useEffect(() => {
    const triggerBackgroundSync = () => {
      setIsOnline(navigator.onLine);
      if (!navigator.onLine) return;
      void syncPendingActivityImages();
      if (getTotalPendingOfflineCount() > 0) {
        void handleSyncOffline();
      }
    };

    const handleOnlineEvent = () => {
      setIsOnline(true);
      setSyncToast({
        message: 'Koneksi internet terhubung kembali! Menyinkronkan data perangkat...',
        type: 'success',
      });
      triggerBackgroundSync();
    };

    const handleOfflineEvent = () => {
      setIsOnline(false);
      setSyncToast({
        message: 'Koneksi internet terputus. Mode offline aktif — seluruh input & edit tetap tersimpan aman di perangkat.',
        type: 'info',
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        triggerBackgroundSync();
      }
    };

    window.addEventListener('online', handleOnlineEvent);
    window.addEventListener('offline', handleOfflineEvent);
    document.addEventListener('visibilitychange', handleVisibility);

    const intervalId = window.setInterval(() => {
      if (navigator.onLine && getTotalPendingOfflineCount() > 0 && currentUser) {
        void handleSyncOffline();
      }
    }, 45_000);

    return () => {
      window.removeEventListener('online', handleOnlineEvent);
      window.removeEventListener('offline', handleOfflineEvent);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [currentUser?.id]);

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

  // Helper to persist optimistic local cache + recomputed live stats during offline/static fallback
  const updateOfflineSnapshotSlice = (patch: {
    members?: Member[];
    families?: Family[];
    transactions?: FinancialTransaction[];
    events?: ChurchEvent[];
    schedules?: ServiceSchedule[];
    announcements?: Announcement[];
    attendance?: AttendanceRecord[];
  }) => {
    const nextMembers = patch.members ?? members;
    const nextFamilies = patch.families ?? families;
    const nextTransactions = patch.transactions ?? transactions;
    const nextEvents = patch.events ?? events;
    const nextSchedules = patch.schedules ?? schedules;
    const nextAnnouncements = patch.announcements ?? announcements;
    const nextAttendance = patch.attendance ?? attendance;

    const recomputedStats = {
      ...calculateChurchStats(nextMembers, nextFamilies, nextTransactions),
      upcomingEvents: nextEvents.slice(0, 5),
      nextService: nextSchedules[0] || null,
    };
    setStats(recomputedStats);

    const existing = getOfflineDataSnapshot() || {};
    cacheOfflineDataSnapshot({
      ...existing,
      stats: recomputedStats,
      members: nextMembers,
      families: nextFamilies,
      transactions: nextTransactions,
      events: nextEvents,
      schedules: nextSchedules,
      announcements: nextAnnouncements,
      attendance: nextAttendance,
    });
    setPendingOfflineCount(getTotalPendingOfflineCount());
  };

  // Member CRUD handlers with Automatic Direct-Save, Firestore Mirroring & Universal Offline Queue
  const handleSaveMember = async (data: Partial<Member>) => {
    try {
      if (editingMember) {
        const res = await api.updateMemberApi(editingMember.id, data);
        if (res && res.success === false) {
          throw new Error(res.message || 'Gagal memperbarui jemaat di server');
        }
        void mirrorDocToFirestore('members', editingMember.id, { ...editingMember, ...data });
        setSyncToast({
          message: `Data jemaat "${data.fullName}" berhasil diperbarui di database.`,
          type: 'success',
        });
      } else {
        const res = await api.createMemberApi(data);
        if (res && res.success) {
          if (res.member) {
            void mirrorDocToFirestore('members', res.member.id, res.member);
          }
          setSyncToast({
            message: `Jemaat "${data.fullName}" (${res.memberNo || 'Baru'}) berhasil disimpan ke database.`,
            type: 'success',
          });
          if (res.member) {
            const newMember = res.member;
            setMembers((prev) => {
              const updated = [newMember, ...prev.filter((m) => m.id !== newMember.id)];
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
      console.warn('Gagal menyimpan langsung ke server, memeriksa mode offline:', err);
      if (api.isOfflineOrStaticError(err)) {
        if (editingMember) {
          const updatedRecord: Member = {
            ...editingMember,
            ...data,
            updatedAt: new Date().toISOString(),
            isOfflinePending: true,
          };
          enqueueUniversalOfflineMutation({
            entity: 'member',
            action: 'update',
            targetId: editingMember.id,
            payload: data,
            label: updatedRecord.fullName,
          });
          void mirrorDocToFirestore('members', editingMember.id, updatedRecord);
          const nextMembers = members.map((m) => (m.id === editingMember.id ? updatedRecord : m));
          setMembers(nextMembers);
          cacheMembersLocally(nextMembers);
          updateOfflineSnapshotSlice({ members: nextMembers });
          setSyncToast({
            message: `Perubahan "${updatedRecord.fullName}" tersimpan lokal & akan tersinkron otomatis saat server terhubung.`,
            type: 'info',
          });
        } else {
          const optimistic = addMemberToOfflineQueue(data);
          void mirrorDocToFirestore('members', optimistic.id, optimistic);
          const nextMembers = [optimistic, ...members.filter((m) => m.id !== optimistic.id)];
          setMembers(nextMembers);
          cacheMembersLocally(nextMembers);
          updateOfflineSnapshotSlice({ members: nextMembers });
          setSyncToast({
            message: `Data jemaat "${data.fullName || 'Baru'}" aman tersimpan di perangkat dan akan disinkronkan saat terhubung.`,
            type: 'info',
          });
        }
        setShowMemberFormModal(false);
        setEditingMember(null);
      } else {
        setSyncToast({
          message: `${editingMember ? 'Gagal memperbarui' : 'Gagal menyimpan'} jemaat: ${err?.message || 'Periksa isian data Anda.'}`,
          type: 'error',
        });
      }
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await api.deleteMemberApi(id);
      void removeDocFromFirestore('members', id);
      await loadAllData();
    } catch (err: any) {
      if (api.isOfflineOrStaticError(err)) {
        enqueueUniversalOfflineMutation({
          entity: 'member',
          action: 'delete',
          targetId: id,
          label: 'Hapus Jemaat',
        });
        void removeDocFromFirestore('members', id);
        const nextMembers = members.filter((m) => m.id !== id);
        setMembers(nextMembers);
        cacheMembersLocally(nextMembers);
        updateOfflineSnapshotSlice({ members: nextMembers });
        setSyncToast({
          message: 'Penghapusan jemaat dicatat lokal & akan disinkronkan otomatis saat server terhubung.',
          type: 'info',
        });
      } else {
        setSyncToast({ message: `Gagal menghapus jemaat: ${err?.message || 'Error'}`, type: 'error' });
      }
    }
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

  // Family CRUD handlers with Offline & Firestore sync
  const handleSaveFamily = async (data: Partial<Family>) => {
    const famId = editingFamily?.id || data.id;
    try {
      if (famId) {
        await api.updateFamilyApi(famId, data);
        void mirrorDocToFirestore('families', famId, { ...editingFamily, ...data, id: famId });
        setSyncToast({
          message: `Data Kartu Keluarga "${data.headOfFamilyName}" berhasil diperbarui di database.`,
          type: 'success',
        });
      } else {
        const res = await api.createFamilyApi(data);
        if (res?.id) void mirrorDocToFirestore('families', res.id, { ...data, id: res.id });
        setSyncToast({
          message: `Kartu Keluarga baru "${data.headOfFamilyName}" berhasil disimpan ke database.`,
          type: 'success',
        });
      }
      setEditingFamily(null);
      setShowFamilyModal(false);
      await loadAllData();
    } catch (err: any) {
      if (api.isOfflineOrStaticError(err)) {
        if (famId) {
          enqueueUniversalOfflineMutation({
            entity: 'family',
            action: 'update',
            targetId: famId,
            payload: data,
            label: data.headOfFamilyName || 'Kartu Keluarga',
          });
          const nextFamilies = families.map((f) => (f.id === famId ? { ...f, ...data } : f));
          setFamilies(nextFamilies);
          updateOfflineSnapshotSlice({ families: nextFamilies });
        } else {
          const tempId = `offline-fam-${Date.now()}`;
          const newFam: Family = {
            id: tempId,
            familyNo: data.familyNo || `KK-OFF-${Math.floor(100 + Math.random() * 899)}`,
            headOfFamilyName: data.headOfFamilyName || '',
            address: data.address || '',
            rayonId: data.rayonId || 'r1',
            rayonName: data.rayonName || 'Rayon I',
            phone: data.phone || '',
            notes: data.notes || '',
            memberCount: 0,
            createdAt: new Date().toISOString(),
          };
          enqueueUniversalOfflineMutation({
            entity: 'family',
            action: 'create',
            targetId: tempId,
            payload: data,
            label: newFam.headOfFamilyName,
          });
          const nextFamilies = [newFam, ...families];
          setFamilies(nextFamilies);
          updateOfflineSnapshotSlice({ families: nextFamilies });
        }
        setEditingFamily(null);
        setShowFamilyModal(false);
        setSyncToast({
          message: `Kartu Keluarga "${data.headOfFamilyName}" disimpan lokal & akan tersinkron otomatis.`,
          type: 'info',
        });
      } else {
        setSyncToast({ message: `Gagal menyimpan KK: ${err?.message || 'Error'}`, type: 'error' });
      }
    }
  };

  const handleDeleteFamily = async (id: string) => {
    try {
      await api.deleteFamilyApi(id);
      void removeDocFromFirestore('families', id);
      await loadAllData();
    } catch (err: any) {
      if (api.isOfflineOrStaticError(err)) {
        enqueueUniversalOfflineMutation({ entity: 'family', action: 'delete', targetId: id, label: 'Hapus KK' });
        const nextFamilies = families.filter((f) => f.id !== id);
        setFamilies(nextFamilies);
        updateOfflineSnapshotSlice({ families: nextFamilies });
        setSyncToast({ message: 'Penghapusan KK disimpan lokal & siap disinkronkan.', type: 'info' });
      }
    }
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

  // Event, schedule, attendance, finance & announcement handlers with Offline Queue & Firestore Sync
  const runOfflineResilientMutation = async (
    entity: OfflineMutationEntity,
    action: 'create' | 'update' | 'delete',
    label: string,
    remoteCall: () => Promise<any>,
    onOfflineOptimistic: () => void,
    targetId?: string,
    payload?: any
  ) => {
    try {
      const res = await remoteCall();
      if (entity === 'event' || entity === 'schedule' || entity === 'announcement' || entity === 'finance') {
        const col = entity === 'finance' ? 'financial_transactions' : (`${entity}s` as any);
        if (action === 'delete' && targetId) void removeDocFromFirestore(col, targetId);
        else if (res?.id || targetId) void mirrorDocToFirestore(col, res?.id || targetId!, { ...payload, id: res?.id || targetId });
      }
      await loadAllData();
    } catch (err: any) {
      if (api.isOfflineOrStaticError(err)) {
        enqueueUniversalOfflineMutation({ entity, action, targetId, payload, label });
        onOfflineOptimistic();
        setSyncToast({
          message: `Perubahan "${label}" tersimpan lokal & otomatis tersinkron saat server terhubung.`,
          type: 'info',
        });
      } else {
        setSyncToast({ message: `Gagal memproses ${label}: ${err?.message || 'Error'}`, type: 'error' });
      }
    }
  };

  const handleAddEvent = async (data: Partial<ChurchEvent>) => {
    const tempId = `offline-ev-${Date.now()}`;
    await runOfflineResilientMutation('event', 'create', data.title || 'Kegiatan', () => api.createEventApi(data), () => {
      const next = [{ ...(data as ChurchEvent), id: tempId }, ...events];
      setEvents(next);
      updateOfflineSnapshotSlice({ events: next });
    }, tempId, data);
  };

  const handleUpdateEvent = async (id: string, data: Partial<ChurchEvent>) => {
    await runOfflineResilientMutation('event', 'update', data.title || 'Kegiatan', () => api.updateEventApi(id, data), () => {
      const next = events.map((e) => (e.id === id ? { ...e, ...data } : e));
      setEvents(next);
      updateOfflineSnapshotSlice({ events: next });
    }, id, data);
  };

  const handleDeleteEvent = async (id: string) => {
    await runOfflineResilientMutation('event', 'delete', 'Hapus Kegiatan', () => api.deleteEventApi(id), () => {
      const next = events.filter((e) => e.id !== id);
      setEvents(next);
      updateOfflineSnapshotSlice({ events: next });
    }, id);
  };

  const handleAddSchedule = async (data: Partial<ServiceSchedule>) => {
    const tempId = `offline-sch-${Date.now()}`;
    await runOfflineResilientMutation('schedule', 'create', data.serviceName || 'Jadwal Ibadah', () => api.createScheduleApi(data), () => {
      const next = [{ ...(data as ServiceSchedule), id: tempId }, ...schedules];
      setSchedules(next);
      updateOfflineSnapshotSlice({ schedules: next });
    }, tempId, data);
  };

  const handleUpdateSchedule = async (id: string, data: Partial<ServiceSchedule>) => {
    await runOfflineResilientMutation('schedule', 'update', data.serviceName || 'Jadwal Ibadah', () => api.updateScheduleApi(id, data), () => {
      const next = schedules.map((s) => (s.id === id ? { ...s, ...data } : s));
      setSchedules(next);
      updateOfflineSnapshotSlice({ schedules: next });
    }, id, data);
  };

  const handleDeleteSchedule = async (id: string) => {
    await runOfflineResilientMutation('schedule', 'delete', 'Hapus Jadwal', () => api.deleteScheduleApi(id), () => {
      const next = schedules.filter((s) => s.id !== id);
      setSchedules(next);
      updateOfflineSnapshotSlice({ schedules: next });
    }, id);
  };

  const handleClearAllSchedules = async () => {
    await api.clearAllSchedulesApi();
    await loadAllData();
  };

  // Attendance handler
  const handleAddAttendance = async (data: Partial<AttendanceRecord>) => {
    const tempId = `offline-att-${Date.now()}`;
    await runOfflineResilientMutation('attendance', 'create', 'Presensi Ibadah', () => api.createAttendanceApi(data), () => {
      const next = [{ ...(data as AttendanceRecord), id: tempId }, ...attendance];
      setAttendance(next);
      updateOfflineSnapshotSlice({ attendance: next });
    }, tempId, data);
  };

  const handleUpdateAttendance = async (id: string, data: Partial<AttendanceRecord>) => {
    await adminApi.updateAttendanceApi(id, data);
    await loadAllData();
  };

  const handleDeleteAttendance = async (id: string) => {
    await runOfflineResilientMutation('attendance', 'delete', 'Hapus Presensi', () => adminApi.deleteAttendanceApi(id), () => {
      const next = attendance.filter((a) => a.id !== id);
      setAttendance(next);
      updateOfflineSnapshotSlice({ attendance: next });
    }, id);
  };

  // Finance handler
  const handleAddFinance = async (data: Partial<FinancialTransaction>) => {
    const tempId = `offline-fin-${Date.now()}`;
    await runOfflineResilientMutation('finance', 'create', data.description || 'Transaksi Kas', () => api.createFinanceApi(data), () => {
      const next = [{ ...(data as FinancialTransaction), id: tempId }, ...transactions];
      setTransactions(next);
      updateOfflineSnapshotSlice({ transactions: next });
    }, tempId, data);
  };

  const handleDeleteFinance = async (id: string) => {
    await runOfflineResilientMutation('finance', 'delete', 'Hapus Transaksi', () => api.deleteFinanceApi(id), () => {
      const next = transactions.filter((t) => t.id !== id);
      setTransactions(next);
      updateOfflineSnapshotSlice({ transactions: next });
    }, id);
  };

  const handleUpdateFinance = async (id: string, data: Partial<FinancialTransaction>) => {
    await runOfflineResilientMutation('finance', 'update', data.description || 'Transaksi Kas', () => adminApi.updateFinanceApi(id, data), () => {
      const next = transactions.map((t) => (t.id === id ? { ...t, ...data } : t));
      setTransactions(next);
      updateOfflineSnapshotSlice({ transactions: next });
    }, id, data);
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

  // Announcement (Warta Jemaat) handlers
  const handleAddAnnouncement = async (data: Partial<Announcement>) => {
    const tempId = `offline-ann-${Date.now()}`;
    await runOfflineResilientMutation('announcement', 'create', data.title || 'Warta Jemaat', () => api.createAnnouncementApi(data), () => {
      const next = [{ ...(data as Announcement), id: tempId }, ...announcements];
      setAnnouncements(next);
      updateOfflineSnapshotSlice({ announcements: next });
    }, tempId, data);
  };

  const handleUpdateAnnouncement = async (id: string, data: Partial<Announcement>) => {
    await runOfflineResilientMutation('announcement', 'update', data.title || 'Warta Jemaat', () => api.updateAnnouncementApi(id, data), () => {
      const next = announcements.map((a) => (a.id === id ? { ...a, ...data } : a));
      setAnnouncements(next);
      updateOfflineSnapshotSlice({ announcements: next });
    }, id, data);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await runOfflineResilientMutation('announcement', 'delete', 'Hapus Warta', () => api.deleteAnnouncementApi(id), () => {
      const next = announcements.filter((a) => a.id !== id);
      setAnnouncements(next);
      updateOfflineSnapshotSlice({ announcements: next });
    }, id);
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

  // Clear all members handler
  const handleClearAllMembers = async () => {
    try {
      const res = await api.clearAllMembersApi();
      cacheMembersLocally([]);
      await loadAllData();
      return res.success;
    } catch (e) {
      console.error('Failed to clear members:', e);
      return false;
    }
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
    <div className="chroma-app min-h-screen text-slate-100 flex flex-col font-sans overflow-x-hidden">
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
        birthdayCount7Days={upcomingBirthdays7Days.length}
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
          members={members}
          onNavigate={(v) => setCurrentView(v)}
          onOpenMemberDetail={(m) => {
            setDetailMember(m);
            setShowMemberDetailModal(true);
          }}
        />

        <main ref={mainContentRef} className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div key={currentView} className="view-fade-in min-h-full w-full">
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
              onClearAllMembers={handleClearAllMembers}
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
              families={families}
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
          </div>
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
        onClearExistingMembers={handleClearAllMembers}
        onGoToMembers={() => {
          setShowImportModal(false);
          setCurrentView('members');
        }}
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
