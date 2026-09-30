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
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { FirestoreSyncModal } from './components/FirestoreSyncModal';
import { BrandingSettingsModal } from './components/BrandingSettingsModal';
import { useIdleTimeout, recordUserActivity, clearActivityTimer } from './lib/useIdleTimeout';
import { Megaphone, FileCheck2, FileText, Award, Menu as MenuIcon, Flame, Cloud, ShieldAlert } from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';
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
  onFirebaseStateChange,
  testFirestoreConnection,
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
    setDocuments(getDocuments());
    setAnnouncements(getAnnouncements());
    setUsers(getUsers());
    setLogs(getAccessLogs());
    setKpiMaster(getKPIMaster());
    setCategories(getCategories());
    setDepartmentMasters(getDepartmentMasters());
    setNotifications(getNotifications());
    setPerformances(getPerformances());
    setConfig(getSpreadsheetConfig());
    setBranding(getAppBranding());
  };

  useEffect(() => {
    refreshAllData();

    // Listen to Firebase connectivity state
    const unsubState = onFirebaseStateChange((state, msg) => {
      setFirebaseState(state);
      if (msg) setFirebaseErrorMsg(msg);
    });

    // Probe Firebase connection & auto-seed Firestore if collections are empty
    testFirestoreConnection().catch(() => {});
    seedInitialFirestoreData(false).catch((err) => console.warn('Firestore seed check:', err));

    // Real-time Firestore snapshot subscriptions
    const unsubUsers = subscribeToUsers((newUsers) => {
      saveUsers(newUsers);
      setUsers(newUsers);
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

    const unsubBranding = subscribeToAppBranding((b) => {
      setBranding(b);
    });

    return () => {
      unsubState();
      unsubUsers();
      unsubDocs();
      unsubLogs();
      unsubCats();
      unsubDepts();
      unsubKPIs();
      unsubPerfs();
      unsubNotifs();
      unsubConfig();
      unsubBranding();
    };
  }, []);

  const isSuperAdmin = currentUser?.role === 'admin';
  const isHod = currentUser?.role === 'hod';
  const isHodOrAdmin = isSuperAdmin || isHod;
  const isL1 = currentUser?.role === 'staff' || currentUser?.role === 'spv' || currentUser?.role === 'manager';

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
                return p.departemen === currentUser?.departemen;
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

      {/* Footer */}
      <footer className="w-full shrink-0 border-t border-slate-200 bg-white py-4 mt-auto relative z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-800 tracking-wide text-xs">
              {branding.footerCopyright || '© 2026 Intranet HCJ • All Rights Reserved'}
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-700">
              {branding.creatorSignature || 'JBagas 2026 ttd'}
            </span>
            {branding.footerContact && (
              <>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline text-slate-500">{branding.footerContact}</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isSuperAdmin && (
              <button
                onClick={() => setShowBrandingModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold transition-colors cursor-pointer"
                title="Ubah Tampilan Awal, Logo, Foto Hotel & Bagian Bawah"
              >
                <span>Edit Tampilan & Footer</span>
              </button>
            )}
            {isSuperAdmin ? (
              <button
                onClick={() => setShowFirestoreModal(true)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                  firebaseState === 'connected'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : firebaseState === 'permission_denied'
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 animate-pulse'
                    : firebaseState === 'not_found'
                    ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
                title={firebaseErrorMsg || 'Status Database Cloud Firestore'}
              >
                <Flame className={`w-3.5 h-3.5 ${
                  firebaseState === 'connected' ? 'text-amber-500 fill-amber-500' : 'text-amber-600'
                }`} />
                <span>
                  {firebaseState === 'connected'
                    ? 'Database: Firebase Firestore (Online)'
                    : firebaseState === 'permission_denied'
                    ? 'Firebase: Izin Rules Ditolak (Klik Perbaiki)'
                    : firebaseState === 'not_found'
                    ? 'Firebase: Database Belum Dibuat'
                    : 'Firebase: Mode Offline'}
                </span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                <Flame className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                <span>Firestore Cloud: Aktif</span>
              </div>
            )}
            <span>•</span>
            <span>Akses: <strong>{currentUser.nama}</strong> ({currentUser.role.toUpperCase()})</span>
          </div>
        </div>
      </footer>

      {/* Mobile Smartphone Bottom Quick Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => {
            setActiveTab('announcements');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'announcements'
              ? 'text-indigo-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4 mb-0.5" />
          <span>Beranda</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('sop');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'sop'
              ? 'text-indigo-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4 mb-0.5" />
          <span>SOP</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('forms');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'forms'
              ? 'text-indigo-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span>Formulir</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('performance');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'performance'
              ? 'text-indigo-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 mb-0.5" />
          <span>{currentUser?.role === 'staff' || currentUser?.role === 'spv' ? 'KPI Saya' : 'Kinerja'}</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <MenuIcon className="w-4 h-4 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Vercel Speed Insights */}
      <SpeedInsights />

    </div>
  );
}
