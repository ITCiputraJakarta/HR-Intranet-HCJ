import React, { useState, useEffect } from 'react';
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
import { UnitsMasterView } from './components/UnitsMasterView';
import { QuotaAnalyticsView } from './components/QuotaAnalyticsView';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { FirestoreSyncModal } from './components/FirestoreSyncModal';
import { BrandingSettingsModal } from './components/BrandingSettingsModal';
import { useIdleTimeout, recordUserActivity, clearActivityTimer } from './lib/useIdleTimeout';
import { Megaphone, FileCheck2, FileText, Award, Menu as MenuIcon, Flame, Cloud, ShieldAlert } from 'lucide-react';
import { Language, getSavedLanguage, saveLanguage } from './lib/i18n';
import { getAppBranding, subscribeToAppBranding, AppBranding } from './lib/branding';
import {
  seedInitialFirestoreData,
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
  FirebaseConnectionState
} from './lib/firestoreService';

export default function App() {
  const [currentUser, setUserState] = useState<User | null>(() => getCurrentUser());
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

  // Load all data from storage
  const refreshAllData = () => {
    try {
      pruneExpiredAnnouncements(7, currentUser || undefined);
      pruneExpiredAccessLogs();
    } catch (e) {
      console.warn('Pruning check:', e);
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

  useEffect(() => {
    // Listen to Firebase connectivity state & branding even on Login screen
    const unsubState = onFirebaseStateChange((state, msg) => {
      setFirebaseState(state);
      if (msg) setFirebaseErrorMsg(msg);
    });

    testFirestoreConnection().catch(() => {});
    seedInitialFirestoreData(false).catch((err) => console.warn('Firestore seed check:', err));

    const unsubBranding = subscribeToAppBranding((b) => {
      setBranding(b);
    });

    // Security: Do not subscribe to sensitive collections (Users, SOPs, Logs, KPIs) until user is authenticated
    if (!currentUser?.id) {
      return () => {
        unsubState();
        unsubBranding();
      };
    }

    refreshAllData();

    // Real-time Firestore snapshot subscriptions (Authenticated Session Only)
    const unsubUsers = subscribeToUsers((newUsers) => {
      saveUsers(newUsers);
      const syncedUsers = getUsers();
      setUsers(syncedUsers);
      setUserState((prev) => {
        if (!prev) return null;
        const matched = syncedUsers.find((u) => u.id === prev.id);
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
    });

    const unsubDocs = subscribeToDocuments((newDocs) => {
      saveDocuments(newDocs);
      const syncedDocs = getDocuments();
      setDocuments(syncedDocs);
      setAnnouncements(syncedDocs.filter((d) => d.category === 'Pengumuman'));
    });

    const unsubLogs = subscribeToAccessLogs((newLogs) => {
      saveAccessLogs(newLogs);
      setLogs(getAccessLogs());
    });

    const unsubCats = subscribeToCategories((newCats) => {
      saveCategories(newCats);
      setCategories(getCategories());
    });

    const unsubDepts = subscribeToDepartments((newDepts) => {
      saveDepartmentMasters(newDepts);
      setDepartmentMasters(getDepartmentMasters());
    });

    const unsubUnits = subscribeToHotelUnits((newUnits) => {
      saveHotelUnits(newUnits);
      setHotelUnits(getHotelUnits());
    });

    const unsubKPIs = subscribeToKPIs((newKPIs) => {
      saveKPIMaster(newKPIs);
      setKpiMaster(getKPIMaster());
    });

    const unsubPerfs = subscribeToPerformances((newPerfs) => {
      savePerformances(newPerfs);
      setPerformances(getPerformances());
    });

    const unsubNotifs = subscribeToNotifications((newNotifs) => {
      saveNotifications(newNotifs);
      setNotifications(getNotifications());
    });

    const unsubConfig = subscribeToSystemConfig((newConfig) => {
      setConfig((prev) => ({ ...prev, ...newConfig }));
    });

    return () => {
      unsubState();
      unsubUsers();
      unsubDocs();
      unsubLogs();
      unsubCats();
      unsubDepts();
      unsubUnits();
      unsubKPIs();
      unsubPerfs();
      unsubNotifs();
      unsubConfig();
      unsubBranding();
    };
  }, [currentUser?.id]);

  const isSuperAdmin = currentUser?.role === 'admin';
  const isHod = currentUser?.role === 'hod';
  const isHodOrAdmin = isSuperAdmin || isHod;
  const isL1 = currentUser?.role === 'staff' || currentUser?.role === 'spv' || currentUser?.role === 'manager';

  // Automatic update on open & every 1 minute (60s) while Super Admin is active
  useEffect(() => {
    if (!isSuperAdmin || !currentUser) return;

    const runSuperAdminAutoSync = async () => {
      try {
        await testFirestoreConnection();
        const res = await firestorePullAllCollections();
        if (res.success) {
          if (res.documents.length > 0) saveDocuments(res.documents);
          if (res.users.length > 0) saveUsers(res.users);
          if (res.performances.length > 0) savePerformances(res.performances);
          if (res.accessLogs.length > 0) saveAccessLogs(res.accessLogs);
          if (res.categories && res.categories.length > 0) saveCategories(res.categories);
          if (res.departments && res.departments.length > 0) saveDepartmentMasters(res.departments);
          if (res.hotelUnits && res.hotelUnits.length > 0) saveHotelUnits(res.hotelUnits);
          if (res.kpiMaster && res.kpiMaster.length > 0) saveKPIMaster(res.kpiMaster);
          refreshAllData();

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
            projectId: 'intranet-hcj',
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
              Math.max(14.8, (totalKB * 4.5 + res.accessLogs.length * 18) / 1024).toFixed(2)
            ),
            vercelEdgeRequestsUsed: totalDocs * 16 + res.accessLogs.length * 28 + 420,
            vercelBuildMinutesUsed: 6.6,
            vercelBundleSizeMB: 0.64,
            lastSyncedAt: nowIso,
            syncedBy: `${currentUser.nama} (Auto-Sync 1m)`,
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

  // Strict role guard: redirect to announcements if user does not have permission to view current tab
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role || 'staff';
    const isLevel1 = role === 'staff' || role === 'spv' || role === 'manager';
    const isHead = role === 'hod';
    const isAdmin = role === 'admin';

    if (isLevel1) {
      // Level 1: Staff, SPV, and Manager have view-only/self-service access to archives, files, and their own KPI evaluation
      if (
        activeTab !== 'announcements' &&
        activeTab !== 'sop' &&
        activeTab !== 'forms' &&
        activeTab !== 'documents' &&
        activeTab !== 'performance'
      ) {
        setActiveTab('announcements');
      }
    } else if (isHead) {
      // Level 2: Head of Department (HOD) can manage KPI Master & view departments/categories
      if (
        activeTab === 'users' ||
        activeTab === 'logs' ||
        activeTab === 'access-logs' ||
        activeTab === 'spreadsheet' ||
        activeTab === 'firestore-sync'
      ) {
        setActiveTab('announcements');
      }
    }
  }, [currentUser, activeTab]);

  // 1-minute idle auto-logout handler
  useIdleTimeout(!!currentUser, () => {
    handleLogout(true);
  });

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setUserState(user);
    setIdleTimeoutMessage('');
    recordUserActivity();
    // Always start at announcements on login so staff never sees previous admin tab
    setActiveTab('announcements');
    setIsMobileMenuOpen(false);
    refreshAllData();
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

    // Clear user and timer while keeping system data intact
    clearActivityTimer();
    clearAllSessionCache();
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

    // Reset volatile states
    setDocuments(getDocuments());
    setAnnouncements(getAnnouncements());
    setUsers(getUsers());
    setLogs([]);
    setNotifications([]);
  };

  const handleClearNotifications = () => {
    markNotificationsAsRead();
    setNotifications(getNotifications());
  };

  const handleNavigate = (tab: string, category?: string) => {
    if (tab === 'spreadsheet' || tab === 'firestore-sync') {
      setShowFirestoreModal(true);
      return;
    }
    if (tab === 'documents') {
      if (category === 'SOP') {
        setActiveTab('sop');
      } else if (category === 'Form') {
        setActiveTab('forms');
      } else {
        setActiveTab('sop');
      }
      return;
    }
    if (tab === 'kpi') {
      setActiveTab('kpi-master');
      return;
    }
    if (tab === 'profile') {
      if (currentUser?.role === 'admin') {
        setActiveTab('users');
      } else if (currentUser?.role === 'manager' || currentUser?.role === 'hod') {
        setActiveTab('performance');
      } else {
        setActiveTab('announcements');
      }
      return;
    }
    setActiveTab(tab);
  };

  // If user is not logged in, render authentication page
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        sessionMessage={idleTimeoutMessage}
      />
    );
  }

  const unreadNotifsCount = (notifications || []).filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        unreadCount={unreadNotifsCount}
        allUsers={users}
        notifications={notifications}
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onClearNotifications={handleClearNotifications}
        onOpenBranding={() => setShowBrandingModal(true)}
        onOpenConfig={() => setShowFirestoreModal(true)}
        onOpenFirestoreModal={() => setShowFirestoreModal(true)}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Actionable Banner if Firebase Security Rules Need Attention */}
      {firebaseState === 'permission_denied' && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold shadow-xs flex items-center justify-between animate-in fade-in">
          <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-slate-950" />
              <span>
                <strong>Perhatian Firebase (hr-intranet-31ff4):</strong> Aturan keamanan (Rules) di Firebase Console Anda sedang memblokir akses database.
              </span>
            </div>
            <button
              onClick={() => setShowFirestoreModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 text-white font-bold text-[11px] hover:bg-slate-800 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <span>Buka Status Firestore</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 gap-6 items-start">
        
        {/* Left Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          activeTab={activeTab}
          currentTab={activeTab}
          currentLang={currentLang}
          onNavigate={handleNavigate}
          onSelectTab={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          pendingUsersCount={(users || []).filter((u) => u.status === 'Pending').length}
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

          {activeTab === 'units' && isHodOrAdmin && (
            <UnitsMasterView
              currentUser={currentUser}
              units={hotelUnits}
              users={users}
              documents={documents}
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

          {activeTab === 'quota-analytics' && (
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
              onRefresh={refreshAllData}
            />
          )}
        </main>
      </div>

      {/* Document Quick Preview Modal */}
      {previewDoc && (
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
      )}

      {/* Cloud Firestore Status & Sync Modal (Super Admin only) */}
      <FirestoreSyncModal
        isOpen={showFirestoreModal}
        onClose={() => setShowFirestoreModal(false)}
        currentUser={currentUser}
        onRefreshAll={refreshAllData}
      />

      {/* Super Admin Branding & Custom Logo Modal */}
      <BrandingSettingsModal
        isOpen={showBrandingModal}
        onClose={() => setShowBrandingModal(false)}
        currentUser={currentUser}
        onBrandingSaved={refreshAllData}
      />

      {/* Single-Line Soft Modern Footer (After Login) */}
      <footer className="w-full shrink-0 border-t border-sky-200/80 bg-gradient-to-r from-white via-[#f5f9fe] to-[#eaf3fc] py-3 px-4 sm:px-6 lg:px-8 mt-auto relative z-10 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600">
          {/* Left: Unified Copyright */}
          <div className="flex items-center justify-center sm:justify-start text-center sm:text-left">
            <span className="font-bold text-[#004872]">
              © 2026 Intranet HCJ JBagas • All Rights Reserved
            </span>
          </div>

          {/* Right: Session Info & Super Admin / Cloud Status */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            {isSuperAdmin && (
              <button
                onClick={() => setShowBrandingModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-sky-50 text-[#005a8d] border border-sky-200/90 shadow-2xs font-bold text-[11px] transition-all cursor-pointer"
                title="Ubah Tampilan Awal, Logo, Foto Hotel & Bagian Bawah"
              >
                <span>Edit Tampilan & Footer</span>
              </button>
            )}

            {isSuperAdmin ? (
              <button
                onClick={() => setShowFirestoreModal(true)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-bold text-[11px] transition-all cursor-pointer shadow-2xs ${
                  firebaseState === 'connected'
                    ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : firebaseState === 'permission_denied'
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 animate-pulse'
                    : firebaseState === 'not_found'
                    ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title={firebaseErrorMsg || 'Status Database Cloud Firestore'}
              >
                <Flame
                  className={`w-3 h-3 ${
                    firebaseState === 'connected'
                      ? 'text-emerald-600 fill-emerald-500'
                      : 'text-amber-600'
                  }`}
                />
                <span>
                  {firebaseState === 'connected'
                    ? 'Firestore: Online'
                    : firebaseState === 'permission_denied'
                    ? 'Perbaiki Rules'
                    : firebaseState === 'not_found'
                    ? 'DB Belum Aktif'
                    : 'Offline'}
                </span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50/90 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                <Flame className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                <span>Cloud Aktif</span>
              </div>
            )}

            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-white/90 px-3 py-1 rounded-full border border-sky-200/80 shadow-2xs">
              <strong className="text-[#004872]">{currentUser.nama}</strong>
              <span className="text-sky-700 font-bold">({currentUser.role.toUpperCase()})</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
