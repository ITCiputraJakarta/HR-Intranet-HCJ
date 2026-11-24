import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  User,
  IntranetDocument,
  Announcement,
  AccessLog,
  KPIMasterItem,
  CategoryMaster,
  DepartmentMaster,
  NotificationItem,
  SpreadsheetConfig,
  PerformanceAppraisal,
  HotelUnitMaster,
} from './types';
import {
  getCurrentUser,
  setCurrentUser,
  getDocuments,
  getAnnouncements,
  getUsers,
  getAccessLogs,
  getKPIMaster,
  getCategories,
  getDepartmentMasters,
  getNotifications,
  getPerformances,
  getSpreadsheetConfig,
  getHotelUnits,
  markNotificationsAsRead,
  addAccessLog,
  clearAllSessionCache,
  pruneExpiredAnnouncements,
  pruneExpiredAccessLogs,
  saveDocuments,
  saveUsers,
  saveAccessLogs,
  saveCategories,
  saveDepartmentMasters,
  saveKPIMaster,
  savePerformances,
  saveNotifications,
  saveHotelUnits,
  fetchBackendRegisteredUsers,
  syncAdminUsersToBackend,
} from './lib/storage';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AnnouncementsView } from './components/AnnouncementsView';
import { DocumentsView } from './components/DocumentsView';
import { PerformanceView } from './components/PerformanceView';
import { KPIMasterView } from './components/KPIMasterView';
import { UserManagementView } from './components/UserManagementView';
import { AccessLogsView } from './components/AccessLogsView';
import { CategoriesMasterView } from './components/CategoriesMasterView';
import { DepartmentsMasterView } from './components/DepartmentsMasterView';
import { QuotaAnalyticsView } from './components/QuotaAnalyticsView';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { FirestoreSyncModal } from './components/FirestoreSyncModal';
import { BrandingSettingsModal } from './components/BrandingSettingsModal';
import { PublicHomeView } from './components/public/PublicHomeView';
import { PublicCareerView } from './components/public/PublicCareerView';
import { HomeCmsAdminView } from './components/HomeCmsAdminView';
import { CareerCmsAdminView } from './components/CareerCmsAdminView';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { UnifiedLogo } from './components/common/UnifiedLogo';
import { SocialMediaBar } from './components/common/SocialMediaBar';
import { MotionLenisProvider, useLenis } from './components/common/MotionLenisProvider';
import {
  PublicHomeSkeleton,
  PublicCareerSkeleton,
  LoginSkeleton,
  DashboardShellSkeleton,
  TabContentSkeleton,
} from './components/common/SkeletonLoaders';
import {
  getCareerApplications,
  subscribeToCareerApplications,
} from './lib/cmsService';
import { useIdleTimeout, recordUserActivity, clearActivityTimer, isSessionExpiredByInactivity } from './lib/useIdleTimeout';
import { Menu as MenuIcon, ShieldAlert } from 'lucide-react';
import { Language, getSavedLanguage, saveLanguage } from './lib/i18n';
import { getAppBranding, subscribeToAppBranding, AppBranding } from './lib/branding';
import {
  seedInitialFirestoreData,
  cleanupLegacySampleData,
  subscribeToUsers,
  subscribeToDocuments,
  subscribeToAccessLogs,
  subscribeToCategories,
  subscribeToDepartments,
  subscribeToKPIs,
  subscribeToPerformances,
  subscribeToNotifications,
  subscribeToSystemConfig,
  subscribeToHotelUnits,
  onFirebaseStateChange,
  testFirestoreConnection,
  firestorePullAllCollections,
  firestoreSyncQuotaTelemetry,
  firestoreGetUserById,
  firestoreSaveUser,
  backfillUserAccessFromUsers,
  FirebaseConnectionState
} from './lib/firestoreService';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { setInMemoryApiToken, getInMemoryApiToken, fetchWithApiAuth, clearInMemoryApiToken, safeReadJson } from './lib/authSession';

function AppContent() {
  const { scrollToTop } = useLenis();
  const [currentUser, setUserState] = useState<User | null>(() => {
    if (isSessionExpiredByInactivity()) {
      clearAllSessionCache();
      return null;
    }
    return getCurrentUser();
  });
  const [isSessionVerified, setIsSessionVerified] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('announcements');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [currentLang, setCurrentLang] = useState<Language>(() => getSavedLanguage());

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    saveLanguage(lang);
  };

  // Connection State
  const [firebaseState, setFirebaseState] = useState<FirebaseConnectionState>('checking');
  const [firebaseErrorMsg, setFirebaseErrorMsg] = useState<string>('');
  const [isInitialSyncing, setIsInitialSyncing] = useState<boolean>(true);

  // Master Data States with synchronous fallback initialization
  const [documents, setDocuments] = useState<IntranetDocument[]>(() => getDocuments());
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getAnnouncements());
  const [users, setUsers] = useState<User[]>(() => getUsers());
  const [logs, setLogs] = useState<AccessLog[]>(() => getAccessLogs());
  const [kpiMaster, setKpiMaster] = useState<KPIMasterItem[]>(() => getKPIMaster());
  const [categories, setCategories] = useState<CategoryMaster[]>(() => getCategories());
  const [departmentMasters, setDepartmentMasters] = useState<DepartmentMaster[]>(() => getDepartmentMasters());
  const [hotelUnits, setHotelUnits] = useState<HotelUnitMaster[]>(() => getHotelUnits());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => getNotifications());
  const [performances, setPerformances] = useState<PerformanceAppraisal[]>(() => getPerformances());
  const [config, setConfig] = useState<SpreadsheetConfig>(() => getSpreadsheetConfig());

  // Modals
  const [previewDoc, setPreviewDoc] = useState<IntranetDocument | null>(null);
  const [showFirestoreModal, setShowFirestoreModal] = useState<boolean>(false);
  const [showBrandingModal, setShowBrandingModal] = useState<boolean>(false);
  const [idleTimeoutMessage, setIdleTimeoutMessage] = useState<string>('');
  const [branding, setBranding] = useState<AppBranding>(getAppBranding());

  // Public Landing Page & Career Router states
  const [publicPage, setPublicPage] = useState<'home' | 'career' | 'login'>('home');
  const [careerApplications, setCareerApplications] = useState(() => getCareerApplications());
  const [previewHomeModal, setPreviewHomeModal] = useState<boolean>(false);
  const [previewCareerModal, setPreviewCareerModal] = useState<boolean>(false);

  // Unified Skeleton Reload states for tab switches and public page transitions
  const [isTabReloading, setIsTabReloading] = useState<boolean>(false);
  const [isPublicReloading, setIsPublicReloading] = useState<boolean>(false);
  const tabReloadTimerRef = useRef<number | null>(null);
  const publicReloadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tabReloadTimerRef.current) window.clearTimeout(tabReloadTimerRef.current);
      if (publicReloadTimerRef.current) window.clearTimeout(publicReloadTimerRef.current);
    };
  }, []);

  const switchTabWithSkeleton = (nextTab: string) => {
    if (nextTab === activeTab) {
      setIsTabReloading(true);
      if (tabReloadTimerRef.current) window.clearTimeout(tabReloadTimerRef.current);
      tabReloadTimerRef.current = window.setTimeout(() => setIsTabReloading(false), 200);
      return;
    }
    setActiveTab(nextTab);
    setIsTabReloading(true);
    if (tabReloadTimerRef.current) window.clearTimeout(tabReloadTimerRef.current);
    tabReloadTimerRef.current = window.setTimeout(() => setIsTabReloading(false), 200);
  };

  const navigatePublicWithSkeleton = (nextPage: 'home' | 'career' | 'login') => {
    setPublicPage(nextPage);
    setIsPublicReloading(true);
    if (publicReloadTimerRef.current) window.clearTimeout(publicReloadTimerRef.current);
    publicReloadTimerRef.current = window.setTimeout(() => setIsPublicReloading(false), 180);
  };

  useEffect(() => {
    scrollToTop(true);
  }, [publicPage, currentUser?.id, scrollToTop]);

  // Load all data from storage
  const refreshAllData = (allowAdminPrune: boolean = false) => {
    if (allowAdminPrune) {
      try {
        pruneExpiredAnnouncements(7, currentUser || undefined);
        pruneExpiredAccessLogs();
      } catch (e) {
        console.warn('Pruning check:', e);
      }
    }
    const latestUsers = getUsers();
    setDocuments(getDocuments());
    setAnnouncements(getAnnouncements());
    setUsers(latestUsers);
    setLogs(getAccessLogs());
    setKpiMaster(getKPIMaster());
    setCategories(getCategories());
    setDepartmentMasters(getDepartmentMasters());
    setHotelUnits(getHotelUnits());
    setNotifications(getNotifications());
    setPerformances(getPerformances());
    setConfig(getSpreadsheetConfig());
    setBranding(getAppBranding());
    setUserState((prev) => {
      if (!prev) return null;
      const matched = latestUsers.find((u) => u.id === prev.id);
      if (
        matched &&
        (matched.unit !== prev.unit ||
          matched.departemen !== prev.departemen ||
          matched.role !== prev.role ||
          matched.nama !== prev.nama)
      ) {
        setCurrentUser(matched);
        return matched;
      }
      return prev;
    });
  };

  // Reconcile and verify restored session on boot (never blindly trust tampered localStorage roles)
  useEffect(() => {
    let active = true;

    const verifyRestoredSession = async () => {
      if (!currentUser) {
        if (active) setIsSessionVerified(false);
        return;
      }

      // 1. Verify server session via in-memory Bearer token OR HttpOnly signed session cookie
      try {
        const resp = await fetchWithApiAuth('/api/auth/session');
        if (resp.ok) {
          const { data: payload } = await safeReadJson<{ authenticated?: boolean; user?: User }>(resp);
          if (payload?.authenticated && payload?.user && active) {
            setCurrentUser(payload.user);
            setUserState(payload.user);
            setIsSessionVerified(true);
            return;
          }
        } else if (resp.status === 401) {
          clearInMemoryApiToken();
        }
      } catch {
        // Server unreachable; continue to Firebase Auth verification
      }

      // 2. If Firebase Auth Google session exists with verified email, exchange ID token and check Firestore profile
      if (auth.currentUser && auth.currentUser.email && auth.currentUser.emailVerified) {
        try {
          const idToken = await auth.currentUser.getIdToken();
          const resp = await fetch('/api/auth/firebase-session', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          if (resp.ok) {
            const { data } = await safeReadJson<{ token?: string; user?: User }>(resp);
            if (data?.token && data?.user && active) {
              setInMemoryApiToken(data.token);
              const remote = await firestoreGetUserById(currentUser.id).catch(() => null);
              if (!active) return;
              if (remote) {
                if ((remote.status || '').toLowerCase() !== 'approved') {
                  await auth.signOut().catch(() => {});
                  clearAllSessionCache();
                  setCurrentUser(null);
                  setUserState(null);
                  setIsSessionVerified(false);
                  return;
                }
                setCurrentUser(remote);
                setUserState(remote);
              } else {
                setCurrentUser(data.user);
                setUserState(data.user);
              }
              setIsSessionVerified(true);
              return;
            }
          } else if (resp.status === 401 || resp.status === 403) {
            await auth.signOut().catch(() => {});
          }
        } catch {
          // Fall through to fail-closed reset
        }
      }

      // 3. Fail closed: never grant verified UI state from unauthenticated localStorage
      if (active) {
        clearAllSessionCache();
        setCurrentUser(null);
        setUserState(null);
        setIsSessionVerified(false);
      }
    };

    verifyRestoredSession();

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.emailVerified && !getInMemoryApiToken()) {
        try {
          const idToken = await fbUser.getIdToken();
          const resp = await fetch('/api/auth/firebase-session', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          if (resp.ok) {
            const { data } = await safeReadJson<{ token?: string }>(resp);
            if (data?.token && active) {
              setInMemoryApiToken(data.token);
            }
          } else if (resp.status === 401 || resp.status === 403) {
            await auth.signOut().catch(() => {});
          }
        } catch {
          // Non-blocking
        }
      }
    });

    return () => {
      active = false;
      unsubAuth();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    // Listen to Firebase connectivity state & branding even on Login screen
    const unsubState = onFirebaseStateChange((state, msg) => {
      setFirebaseState(state);
      if (msg) setFirebaseErrorMsg(msg);
    });

    testFirestoreConnection().catch(() => {});

    const initialSyncTimer = setTimeout(() => {
      setIsInitialSyncing(false);
    }, 1200);

    const unsubBranding = subscribeToAppBranding((b) => {
      setBranding(b);
    });

    // Unauthenticated or unverified visitors only listen to public announcements (isPublic == true) and public master lists
    const isAuthed = Boolean(currentUser?.id && isSessionVerified);
    const unsubDocs = subscribeToDocuments((newDocs) => {
      saveDocuments(newDocs);
      const syncedDocs = getDocuments();
      setDocuments(syncedDocs);
      setAnnouncements(syncedDocs.filter((d) => d.category === 'Pengumuman'));
    }, !isAuthed);

    const unsubDepts = subscribeToDepartments((newDepts) => {
      saveDepartmentMasters(newDepts);
      setDepartmentMasters(getDepartmentMasters());
    });

    const unsubUnits = subscribeToHotelUnits((newUnits) => {
      saveHotelUnits(newUnits);
      setHotelUnits(getHotelUnits());
    });

    // Verified Session Only: Subscribe to internal collections with scoped queries for non-admins
    let unsubCats = () => {};
    let unsubConfig = () => {};
    let unsubUsers = () => {};
    let unsubLogs = () => {};
    let unsubKPIs = () => {};
    let unsubPerfs = () => {};
    let unsubNotifs = () => {};
    let unsubApps = () => {};

    const isVerifiedAdmin = isSessionVerified && currentUser?.role === 'admin';
    const scopedEmail = isVerifiedAdmin ? undefined : currentUser?.email;

    if (currentUser?.id && isSessionVerified) {
      refreshAllData(isVerifiedAdmin);

      if (isVerifiedAdmin) {
        seedInitialFirestoreData(false).catch((err) => console.warn('Firestore seed check:', err));
        cleanupLegacySampleData().catch(() => {});
      }

      unsubCats = subscribeToCategories((newCats) => {
        saveCategories(newCats);
        setCategories(getCategories());
      });

      unsubConfig = subscribeToSystemConfig((newConfig) => {
        setConfig((prev) => ({ ...prev, ...newConfig }));
      });

      unsubUsers = subscribeToUsers((newUsers) => {
        saveUsers(newUsers);
        const syncedUsers = getUsers();
        setUsers(syncedUsers);
        setUserState((prev) => {
          if (!prev) return null;
          const matched = syncedUsers.find((u) => u.id === prev.id);
          if (matched && (matched.status || '').toLowerCase() !== 'approved') {
            clearAllSessionCache();
            setCurrentUser(null);
            return null;
          }
          if (
            matched &&
            (matched.unit !== prev.unit ||
              matched.departemen !== prev.departemen ||
              matched.role !== prev.role ||
              matched.nama !== prev.nama)
          ) {
            setCurrentUser(matched);
            return matched;
          }
          return prev;
        });
      }, scopedEmail);

      unsubLogs = subscribeToAccessLogs((newLogs) => {
        saveAccessLogs(newLogs);
        setLogs(getAccessLogs());
      }, scopedEmail);

      unsubKPIs = subscribeToKPIs((newKPIs) => {
        saveKPIMaster(newKPIs);
        setKpiMaster(getKPIMaster());
      });

      unsubPerfs = subscribeToPerformances((newPerfs) => {
        savePerformances(newPerfs);
        setPerformances(getPerformances());
      }, scopedEmail);

      unsubNotifs = subscribeToNotifications((newNotifs) => {
        saveNotifications(newNotifs);
        setNotifications(getNotifications());
      });

      if (isVerifiedAdmin) {
        unsubApps = subscribeToCareerApplications((apps) => {
          setCareerApplications(apps);
        });
      }
    }

    return () => {
      clearTimeout(initialSyncTimer);
      unsubState();
      unsubBranding();
      unsubDocs();
      unsubCats();
      unsubDepts();
      unsubUnits();
      unsubConfig();
      unsubUsers();
      unsubLogs();
      unsubKPIs();
      unsubPerfs();
      unsubNotifs();
      unsubApps();
    };
  }, [currentUser?.id, isSessionVerified]);

  const isSuperAdmin = isSessionVerified && currentUser?.role === 'admin';
  const isHod = isSessionVerified && currentUser?.role === 'hod';
  const isHodOrAdmin = isSuperAdmin || isHod;
  const isL1 =
    !isSessionVerified ||
    currentUser?.role === 'staff' ||
    currentUser?.role === 'spv' ||
    currentUser?.role === 'manager';

  // Automatic update on open & every 1 minute (60s) while Super Admin is active
  useEffect(() => {
    if (!isSuperAdmin || !currentUser) return;

    const runSuperAdminAutoSync = async () => {
      try {
        await testFirestoreConnection();
        const res = await firestorePullAllCollections();
        if (res.success) {
          saveDocuments(res.documents);
          savePerformances(res.performances);
          saveAccessLogs(res.accessLogs);
          saveCategories(res.categories);
          saveDepartmentMasters(res.departments);
          saveKPIMaster(res.kpiMaster);
          if (res.hotelUnits && res.hotelUnits.length > 0) {
            saveHotelUnits(res.hotelUnits);
          }

          // Bi-directional user reconciliation:
          // 1. Pull self-registered Pending users from Express server into Firestore
          // 2. Backfill /userAccess/{accessId} for Firestore Security Rules
          // 3. Push Firestore authoritative user registry to Express server
          const backendUsers = await fetchBackendRegisteredUsers();
          const mergedByEmail = new Map<string, User>();
          for (const fsU of res.users) {
            if (fsU?.email) {
              mergedByEmail.set(fsU.email.toLowerCase().trim(), fsU);
            }
          }
          for (const bU of backendUsers) {
            if (!bU?.email) continue;
            const key = bU.email.toLowerCase().trim();
            if (!mergedByEmail.has(key)) {
              const newFsUser: User = {
                ...bU,
                email: key,
                role: key === 'it@hotelciputra.com' ? 'admin' : bU.role || 'staff',
                status: key === 'it@hotelciputra.com' ? 'Approved' : bU.status || 'Pending',
              };
              mergedByEmail.set(key, newFsUser);
              await firestoreSaveUser(newFsUser).catch(() => {});
            }
          }
          const reconciledUsers = Array.from(mergedByEmail.values());
          saveUsers(reconciledUsers);
          await Promise.all([
            backfillUserAccessFromUsers(reconciledUsers),
            syncAdminUsersToBackend(reconciledUsers),
          ]);

          refreshAllData(true);

          const rawBytes =
            new Blob([JSON.stringify(res.documents)]).size +
            new Blob([JSON.stringify(res.users)]).size +
            new Blob([JSON.stringify(res.performances)]).size +
            new Blob([JSON.stringify(res.accessLogs)]).size +
            new Blob([JSON.stringify(res.categories)]).size +
            new Blob([JSON.stringify(res.departments)]).size +
            new Blob([JSON.stringify(res.hotelUnits)]).size;
          const totalBytes = Math.max(1024, Math.round(rawBytes * 1.18));
          const totalKB = Math.max(1, Math.round(totalBytes / 1024));
          const totalDocs = res.serverTotalDocsCount;
          const nowIso = new Date().toISOString();

          await firestoreSyncQuotaTelemetry({
            id: 'cloud_quota_telemetry',
            projectId: 'hr-intranet-31ff4',
            databaseId: '(default)',
            dateKey: nowIso.slice(0, 10),
            monthKey: nowIso.slice(0, 7),
            firebaseUsedBytes: totalBytes,
            firebaseUsedKB: totalKB,
            firebaseRemainingKB: Math.max(0, 1048576 - totalKB),
            firebaseTotalDocs: totalDocs,
            firebaseChunkDocs: res.chunkDocsCount,
            dailyReadsUsed: totalDocs * 2 + res.accessLogs.length * 4,
            dailyWritesUsed: res.documents.length + res.accessLogs.length,
            dailyDeletesUsed: 0,
            vercelBandwidthUsedMB: Number(
              Math.max(0.1, (totalKB * 4.5 + res.accessLogs.length * 18) / 1024).toFixed(2)
            ),
            vercelEdgeRequestsUsed: totalDocs * 16 + res.accessLogs.length * 28,
            vercelBuildMinutesUsed: 0,
            vercelBundleSizeMB: 0,
            lastSyncedAt: nowIso,
            syncedBy: currentUser.nama,
          });
        }
      } catch {
        // silent background sync
      }
    };

    // Immediate update when Super Admin opens app
    runSuperAdminAutoSync();

    // Update every 1 minute (60,000 ms) while Super Admin remains active
    const intervalId = setInterval(runSuperAdminAutoSync, 60000);
    return () => clearInterval(intervalId);
  }, [isSuperAdmin, currentUser?.id]);

  // Strict role guard: redirect to announcements if user does not have verified permission to view current tab
  useEffect(() => {
    if (!currentUser) return;

    if (!isSessionVerified || isL1) {
      // Unverified or Level 1: view-only/self-service access to archives, files, and own KPI evaluation
      if (
        activeTab !== 'announcements' &&
        activeTab !== 'sop' &&
        activeTab !== 'forms' &&
        activeTab !== 'documents' &&
        activeTab !== 'performance'
      ) {
        setActiveTab('announcements');
      }
    } else if (isHod) {
      // Level 2: Head of Department (HOD) can manage KPI Master & view departments/categories
      if (
        activeTab === 'users' ||
        activeTab === 'logs' ||
        activeTab === 'access-logs' ||
        activeTab === 'spreadsheet' ||
        activeTab === 'firestore-sync' ||
        activeTab === 'quota-analytics' ||
        activeTab === 'home-cms' ||
        activeTab === 'career-cms'
      ) {
        setActiveTab('announcements');
      }
    }
  }, [currentUser, isSessionVerified, isL1, isHod, activeTab]);

  // 1-minute idle auto-logout handler
  useIdleTimeout(!!currentUser, () => {
    handleLogout(true);
  });

  const handleLoginSuccess = (user: User, apiToken?: string | null) => {
    if (tabReloadTimerRef.current) window.clearTimeout(tabReloadTimerRef.current);
    if (publicReloadTimerRef.current) window.clearTimeout(publicReloadTimerRef.current);
    setIsTabReloading(false);
    setIsPublicReloading(false);
    if (apiToken) {
      setInMemoryApiToken(apiToken);
    }
    setCurrentUser(user);
    setUserState(user);
    setIsSessionVerified(true);
    setIdleTimeoutMessage('');
    recordUserActivity();
    // Always start at announcements on login so staff never sees previous admin tab
    setActiveTab('announcements');
    setIsMobileMenuOpen(false);
    refreshAllData(user.role === 'admin');
  };

  const handleLogout = (isIdleTimeout: boolean = false) => {
    if (currentUser) {
      addAccessLog({
        user: currentUser,
        actionCategory: 'AUTH',
        action: isIdleTimeout ? 'Logout Otomatis (Idle 1 Menit)' : 'Logout Pengguna',
        target: currentUser.email,
        status: 'SUCCESS',
        details: isIdleTimeout
          ? 'Sesi portal intranet berakhir otomatis karena pengguna tidak ada aktivitas selama 1 menit.'
          : 'Sesi portal intranet berakhir secara normal.',
      });
    }

    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    auth.signOut().catch(() => {});

    // Clear user and timer while keeping system data intact
    if (tabReloadTimerRef.current) window.clearTimeout(tabReloadTimerRef.current);
    if (publicReloadTimerRef.current) window.clearTimeout(publicReloadTimerRef.current);
    setIsTabReloading(false);
    setIsPublicReloading(false);
    clearActivityTimer();
    clearAllSessionCache();
    setIsSessionVerified(false);
    setCurrentUser(null);
    setUserState(null);
    setActiveTab('announcements');
    setIsMobileMenuOpen(false);
    setPreviewDoc(null);
    setShowFirestoreModal(false);

    if (isIdleTimeout) {
      setIdleTimeoutMessage('Sesi Anda telah berakhir karena tidak ada aktivitas selama 1 menit. Silakan login kembali.');
    } else {
      setIdleTimeoutMessage('');
    }

    // Reset volatile states to strictly public announcements only
    const publicDocs = getDocuments().filter((d) => d.isPublic === true);
    setDocuments(publicDocs);
    setAnnouncements(publicDocs.filter((d) => d.category === 'Pengumuman'));
    setUsers([]);
    setLogs([]);
    setPerformances([]);
    setNotifications([]);
  };

  const handleClearNotifications = () => {
    markNotificationsAsRead();
    setNotifications(getNotifications());
  };

  const handleNavigate = (tab: string, category?: string) => {
    if (tab === 'spreadsheet' || tab === 'firestore-sync') {
      if (isSuperAdmin) setShowFirestoreModal(true);
      return;
    }
    if (tab === 'documents') {
      if (category === 'SOP') {
        switchTabWithSkeleton('sop');
      } else if (category === 'Form') {
        switchTabWithSkeleton('forms');
      } else {
        switchTabWithSkeleton('sop');
      }
      return;
    }
    if (tab === 'kpi') {
      switchTabWithSkeleton('kpi-master');
      return;
    }
    if (tab === 'profile') {
      if (isSuperAdmin) {
        switchTabWithSkeleton('users');
      } else if (isHod || currentUser?.role === 'manager') {
        switchTabWithSkeleton('performance');
      } else {
        switchTabWithSkeleton('announcements');
      }
      return;
    }
    switchTabWithSkeleton(tab);
  };

  // Full-screen Skeleton Reload overlay (initial sync & public route reload)
  const showFullSkeleton = isInitialSyncing || (!currentUser && isPublicReloading);
  const FullScreenLoadingBlocker = (
    <AnimatePresence>
      {showFullSkeleton && (
        <motion.div
          id="portal-full-screen-loader"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] bg-slate-50 overflow-hidden select-none cursor-wait"
          style={{ pointerEvents: 'all' }}
        >
          {currentUser ? (
            <DashboardShellSkeleton activeTab={activeTab} />
          ) : publicPage === 'career' ? (
            <PublicCareerSkeleton />
          ) : publicPage === 'login' ? (
            <LoginSkeleton />
          ) : (
            <PublicHomeSkeleton />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // If user is not logged in, render public pages (Home, Career, or Login)
  if (!currentUser) {
    if (publicPage === 'career') {
      return (
        <>
          {FullScreenLoadingBlocker}
          <PublicCareerView
            onNavigateToHome={() => navigatePublicWithSkeleton('home')}
            onNavigateToLogin={() => navigatePublicWithSkeleton('login')}
          />
          <ScrollToTopButton />
        </>
      );
    }

    if (publicPage === 'login') {
      return (
        <>
          {FullScreenLoadingBlocker}
          <LoginView
            onLoginSuccess={handleLoginSuccess}
            currentLang={currentLang}
            onLanguageChange={handleLanguageChange}
            sessionMessage={idleTimeoutMessage}
            onNavigateToHome={() => navigatePublicWithSkeleton('home')}
            onNavigateToCareer={() => navigatePublicWithSkeleton('career')}
          />
          <ScrollToTopButton />
        </>
      );
    }

    return (
      <>
        {FullScreenLoadingBlocker}
        <PublicHomeView
          onNavigateToLogin={() => navigatePublicWithSkeleton('login')}
          onNavigateToCareer={() => navigatePublicWithSkeleton('career')}
          announcements={documents}
          onOpenAnnouncementPreview={(doc) => setPreviewDoc(doc)}
        />
        <DocumentPreviewModal
          document={previewDoc}
          currentUser={null}
          onClose={() => setPreviewDoc(null)}
          onNavigateToLogin={() => {
            setPreviewDoc(null);
            navigatePublicWithSkeleton('login');
          }}
        />
        <ScrollToTopButton />
      </>
    );
  }

  const unreadNotifsCount = (notifications || []).filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {FullScreenLoadingBlocker}
      
      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        unreadCount={unreadNotifsCount}
        allUsers={users}
        notifications={notifications}
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onClearNotifications={handleClearNotifications}
        onOpenBranding={() => isSuperAdmin && setShowBrandingModal(true)}
        onOpenConfig={() => isSuperAdmin && setShowFirestoreModal(true)}
        onOpenFirestoreModal={() => isSuperAdmin && setShowFirestoreModal(true)}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Super Admin Only: Database Permission Attention */}
      {isSuperAdmin && firebaseState === 'permission_denied' && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-normal shadow-xs flex items-center justify-between animate-in fade-in">
          <div className="w-full max-w-[1920px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-slate-950" />
              <span>
                Sinkronisasi basis data memerlukan verifikasi ulang sesi Super Admin.
              </span>
            </div>
            <button
              onClick={() => setShowFirestoreModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 text-white font-normal text-[11px] hover:bg-slate-800 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <span>Periksa Sinkronisasi</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container - Full-Width Fit to Screen on Desktop, Tablet & Mobile */}
      <div className="flex-1 flex w-full max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-6 py-3 sm:py-4 gap-4 lg:gap-5 items-start">
        
        {/* Left Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          activeTab={activeTab}
          currentTab={activeTab}
          currentLang={currentLang}
          onNavigate={handleNavigate}
          onSelectTab={switchTabWithSkeleton}
          currentUser={currentUser}
          onLogout={handleLogout}
          pendingUsersCount={(users || []).filter((u) => u.status === 'Pending').length}
          pendingApplicantsCount={careerApplications.filter((a) => a.status === 'Pending').length}
          pendingAppraisalsCount={
            (performances || []).filter((p) => {
              if (p.status !== 'On Review' && p.status !== 'Submitted' && p.status !== 'On Check') return false;
              if (isSuperAdmin) return true;
              if (currentUser?.role === 'manager' || currentUser?.role === 'hod' || currentUser?.role === 'spv') {
                const owner = (users || []).find((u) => u.email.toLowerCase() === p.email.toLowerCase());
                const perfUnit = p.unit || owner?.unit || 'Hotel Ciputra Jakarta';
                const currUnit = currentUser?.unit || 'Hotel Ciputra Jakarta';
                return p.departemen === currentUser?.departemen && perfUnit === currUnit;
              }
              return false;
            }).length
          }
          newLogsCount={(logs || []).filter((l) => l.status === 'WARNING' || l.status === 'FAILED').length}
          unreadLogsCount={(logs || []).filter((l) => l.status === 'WARNING' || l.status === 'FAILED').length}
          onOpenFirestoreModal={() => setShowFirestoreModal(true)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Dynamic Main Content Area */}
        <main className="flex-1 min-w-0 w-full pb-8">
          <AnimatePresence mode="wait">
            {isTabReloading ? (
              <motion.div
                key={`skeleton-${activeTab}`}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                <TabContentSkeleton activeTab={activeTab} />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
              >
              {activeTab === 'announcements' && (
                <AnnouncementsView
                  documents={documents}
                  categories={categories}
                  currentUser={currentUser}
                  currentLang={currentLang}
                  onOpenPreview={setPreviewDoc}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'sop' && (
                <DocumentsView
                  category="SOP"
                  documents={documents}
                  currentUser={currentUser}
                  categories={categories}
                  currentLang={currentLang}
                  onOpenPreview={setPreviewDoc}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'forms' && (
                <DocumentsView
                  category="Form"
                  documents={documents}
                  currentUser={currentUser}
                  categories={categories}
                  currentLang={currentLang}
                  onOpenPreview={setPreviewDoc}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'performance' && (
                <PerformanceView
                  performances={performances}
                  kpiMaster={kpiMaster}
                  currentUser={currentUser}
                  currentLang={currentLang}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'departments' && isHodOrAdmin && (
                <DepartmentsMasterView
                  currentUser={currentUser}
                  departments={departmentMasters}
                  users={users}
                  documents={documents}
                  currentLang={currentLang}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'categories' && isHodOrAdmin && (
                <CategoriesMasterView
                  categories={categories}
                  currentUser={currentUser}
                  currentLang={currentLang}
                  onRefresh={refreshAllData}
                />
              )}

              {(activeTab === 'kpi-master' || activeTab === 'kpi') && isHodOrAdmin && (
                <KPIMasterView
                  kpiMaster={kpiMaster}
                  currentUser={currentUser}
                  currentLang={currentLang}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'users' && isSuperAdmin && (
                <UserManagementView
                  users={users}
                  currentUser={currentUser}
                  currentLang={currentLang}
                  onRefresh={refreshAllData}
                />
              )}

              {(activeTab === 'logs' || activeTab === 'access-logs') && isSuperAdmin && (
                <AccessLogsView
                  logs={logs}
                  currentUser={currentUser}
                  currentLang={currentLang}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'quota-analytics' && isSuperAdmin && (
                <QuotaAnalyticsView
                  currentUser={currentUser}
                  documents={documents}
                  users={users}
                  performances={performances}
                  kpiMaster={kpiMaster}
                  logs={logs}
                  categories={categories}
                  departments={departmentMasters}
                  hotelUnits={hotelUnits}
                  firebaseState={firebaseState}
                  currentLang={currentLang}
                  onRefresh={() => refreshAllData(isSuperAdmin)}
                />
              )}

              {activeTab === 'home-cms' && isSuperAdmin && (
                <HomeCmsAdminView
                  currentUser={currentUser}
                  onPreviewPublicHome={() => setPreviewHomeModal(true)}
                />
              )}

              {activeTab === 'career-cms' && isSuperAdmin && (
                <CareerCmsAdminView
                  currentUser={currentUser}
                  onPreviewPublicCareer={() => setPreviewCareerModal(true)}
                />
              )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Document Quick Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        currentUser={currentUser}
        onClose={() => setPreviewDoc(null)}
        onUpdate={(updated) => {
          setPreviewDoc(updated);
          refreshAllData();
        }}
        onDelete={() => {
          setPreviewDoc(null);
          refreshAllData();
        }}
        onRefresh={refreshAllData}
      />

      {/* Cloud Firestore Status & Sync Modal (Super Admin only) */}
      {isSuperAdmin && (
        <FirestoreSyncModal
          isOpen={showFirestoreModal}
          onClose={() => setShowFirestoreModal(false)}
          currentUser={currentUser}
          onRefreshAll={() => refreshAllData(true)}
        />
      )}

      {/* Branding & Logo Settings Modal (Super Admin only) */}
      {isSuperAdmin && (
        <BrandingSettingsModal
          isOpen={showBrandingModal}
          onClose={() => setShowBrandingModal(false)}
          currentUser={currentUser}
          currentLang={currentLang}
          onBrandingSaved={() => refreshAllData(true)}
        />
      )}

      {/* Super Admin Preview Home Modal */}
      <AnimatePresence>
        {previewHomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            data-lenis-prevent
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col overflow-y-auto"
          >
            <div className="sticky top-0 z-50 bg-[#2F327D] text-white px-4 py-2.5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-normal">
                  Pratinjau Halaman Beranda
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewHomeModal(false)}
                className="px-3 py-1 rounded-lg bg-[#F48C06] text-white text-xs font-normal hover:bg-[#e07f04] cursor-pointer"
              >
                ✕ Tutup Pratinjau
              </button>
            </div>
            <div className="flex-1 bg-white">
              <PublicHomeView
                onNavigateToLogin={() => setPreviewHomeModal(false)}
                onNavigateToCareer={() => {
                  setPreviewHomeModal(false);
                  setPreviewCareerModal(true);
                }}
                announcements={documents}
                onOpenAnnouncementPreview={(doc) => setPreviewDoc(doc)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Super Admin Preview Career Modal */}
      <AnimatePresence>
        {previewCareerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            data-lenis-prevent
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col overflow-y-auto"
          >
            <div className="sticky top-0 z-50 bg-[#2F327D] text-white px-4 py-2.5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-normal">
                  Pratinjau Portal Karir &amp; Rekrutmen
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCareerModal(false)}
                className="px-3 py-1 rounded-lg bg-[#F48C06] text-white text-xs font-normal hover:bg-[#e07f04] cursor-pointer"
              >
                ✕ Tutup Pratinjau
              </button>
            </div>
            <div className="flex-1 bg-white">
              <PublicCareerView
                onNavigateToHome={() => {
                  setPreviewCareerModal(false);
                  setPreviewHomeModal(true);
                }}
                onNavigateToLogin={() => setPreviewCareerModal(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single-Line Soft Modern Footer (After Login) */}
      <footer className="w-full shrink-0 border-t border-sky-200/80 bg-gradient-to-r from-white via-[#f5f9fe] to-[#eaf3fc] py-3 px-3 sm:px-5 lg:px-6 mt-auto relative z-10 shadow-2xs">
        <div className="w-full max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          {/* Left: Unified Logo & Copyright */}
          <div className="flex items-center gap-2.5 justify-center sm:justify-start text-center sm:text-left">
            <UnifiedLogo customLogoUrl={branding.customLogoUrl} size="xs" />
            <span className="font-normal text-[#004872]">
              {branding.footerCopyright || '© 2026 Hotel Ciputra Jakarta. All Rights Reserved.'}
            </span>
          </div>

          {/* Center: Social Media Links (Configured by Super Admin) */}
          <div className="flex items-center gap-2 justify-center">
            <SocialMediaBar variant="dashboard" socialLinks={branding.socialLinks} />
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => switchTabWithSkeleton('home-cms')}
                className="hidden lg:inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#F48C06] transition font-normal ml-1 cursor-pointer"
                title="Atur link media sosial di Home CMS"
              >
                <span>• Atur Sosmed</span>
              </button>
            )}
          </div>

          {/* Right: Session Info & Super Admin Shortcut */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            {isSuperAdmin && (
              <button
                onClick={() => switchTabWithSkeleton('home-cms')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-orange-50 text-[#2F327D] hover:text-[#F48C06] border border-orange-200 shadow-2xs font-normal text-[11px] transition-all cursor-pointer"
                title="Kelola Konten Beranda (Home CMS)"
              >
                <span>Kelola Beranda (Home CMS)</span>
              </button>
            )}

            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-white/90 px-3 py-1 rounded-full border border-sky-200/80 shadow-2xs">
              <span className="text-[#004872] font-normal">{currentUser.nama}</span>
              <span className="text-sky-700 font-normal">({currentUser.role.toUpperCase()})</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modern Floating Bottom-Right Scroll-To-Top Button across all views */}
      <ScrollToTopButton />
    </div>
  );
}

export default function App() {
  return (
    <MotionLenisProvider>
      <AppContent />
    </MotionLenisProvider>
  );
}
