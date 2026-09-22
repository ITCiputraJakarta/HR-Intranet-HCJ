import React, { useState, useEffect } from 'react';
import {
  User,
  IntranetDocument,
  Announcement,
  AccessLog,
  KPIMasterItem,
  CategoryMaster,
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
  getNotifications,
  getPerformances,
  getSpreadsheetConfig,
  markNotificationsAsRead,
  addAccessLog,
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
import { GASConfigModal } from './components/GASConfigModal';
import { Megaphone, FileCheck2, FileText, Award, Menu as MenuIcon, Flame, Cloud, ShieldAlert } from 'lucide-react';
import {
  seedInitialFirestoreData,
  subscribeToUsers,
  subscribeToDocuments,
  subscribeToAccessLogs,
  subscribeToCategories,
  subscribeToKPIs,
  subscribeToPerformances,
  subscribeToNotifications,
  subscribeToSystemConfig,
  onFirebaseStateChange,
  FirebaseConnectionState
} from './lib/firestoreService';

export default function App() {
  const [currentUser, setUserState] = useState<User | null>(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('announcements');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Connection State
  const [firebaseState, setFirebaseState] = useState<FirebaseConnectionState>('checking');
  const [firebaseErrorMsg, setFirebaseErrorMsg] = useState<string>('');
  const [modalInitialTab, setModalInitialTab] = useState<'firebase' | 'rules' | 'credentials' | 'drive'>('firebase');

  // Master Data States with synchronous fallback initialization
  const [documents, setDocuments] = useState<IntranetDocument[]>(() => getDocuments());
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getAnnouncements());
  const [users, setUsers] = useState<User[]>(() => getUsers());
  const [logs, setLogs] = useState<AccessLog[]>(() => getAccessLogs());
  const [kpiMaster, setKpiMaster] = useState<KPIMasterItem[]>(() => getKPIMaster());
  const [categories, setCategories] = useState<CategoryMaster[]>(() => getCategories());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => getNotifications());
  const [performances, setPerformances] = useState<PerformanceAppraisal[]>(() => getPerformances());
  const [config, setConfig] = useState<SpreadsheetConfig>(() => getSpreadsheetConfig());

  // Modals
  const [previewDoc, setPreviewDoc] = useState<IntranetDocument | null>(null);
  const [showGASModal, setShowGASModal] = useState<boolean>(false);

  // Load all data from storage
  const refreshAllData = () => {
    setDocuments(getDocuments());
    setAnnouncements(getAnnouncements());
    setUsers(getUsers());
    setLogs(getAccessLogs());
    setKpiMaster(getKPIMaster());
    setCategories(getCategories());
    setNotifications(getNotifications());
    setPerformances(getPerformances());
    setConfig(getSpreadsheetConfig());
  };

  useEffect(() => {
    refreshAllData();

    // Listen to Firebase connectivity state
    const unsubState = onFirebaseStateChange((state, msg) => {
      setFirebaseState(state);
      if (msg) setFirebaseErrorMsg(msg);
    });

    // Auto-seed Firestore if collections are empty
    seedInitialFirestoreData(false).catch((err) => console.warn('Firestore seed check:', err));

    // Real-time Firestore snapshot subscriptions
    const unsubUsers = subscribeToUsers((newUsers) => {
      setUsers(newUsers);
      localStorage.setItem('ciputra_intra_users_v1', JSON.stringify(newUsers));
    });

    const unsubDocs = subscribeToDocuments((newDocs) => {
      setDocuments(newDocs);
      setAnnouncements(newDocs.filter((d) => d.category === 'Pengumuman'));
      localStorage.setItem('ciputra_intra_documents_v1', JSON.stringify(newDocs));
    });

    const unsubLogs = subscribeToAccessLogs((newLogs) => {
      setLogs(newLogs);
      localStorage.setItem('ciputra_intra_logs_v1', JSON.stringify(newLogs));
    });

    const unsubCats = subscribeToCategories((newCats) => {
      setCategories(newCats);
      localStorage.setItem('ciputra_intra_cats_v1', JSON.stringify(newCats));
    });

    const unsubKPIs = subscribeToKPIs((newKPIs) => {
      setKpiMaster(newKPIs);
      localStorage.setItem('ciputra_intra_kpis_v1', JSON.stringify(newKPIs));
    });

    const unsubPerfs = subscribeToPerformances((newPerfs) => {
      setPerformances(newPerfs);
      localStorage.setItem('ciputra_intra_perfs_v1', JSON.stringify(newPerfs));
    });

    const unsubNotifs = subscribeToNotifications((newNotifs) => {
      setNotifications(newNotifs);
      localStorage.setItem('ciputra_intra_notifs_v1', JSON.stringify(newNotifs));
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
      unsubKPIs();
      unsubPerfs();
      unsubNotifs();
      unsubConfig();
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setUserState(user);
    refreshAllData();
  };

  const handleLogout = () => {
    if (currentUser) {
      addAccessLog({
        user: currentUser,
        actionCategory: 'AUTH',
        action: 'Logout Pengguna',
        target: currentUser.email,
        status: 'SUCCESS',
        details: 'Sesi portal intranet berakhir secara normal.',
      });
    }
    setCurrentUser(null);
    setUserState(null);
  };

  const handleRoleSwitch = (newUser: User) => {
    setCurrentUser(newUser);
    setUserState(newUser);
    refreshAllData();
  };

  const handleClearNotifications = () => {
    markNotificationsAsRead();
    setNotifications(getNotifications());
  };

  const handleNavigate = (tab: string, category?: string) => {
    if (tab === 'spreadsheet') {
      setShowGASModal(true);
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
      } else {
        setActiveTab('performance');
      }
      return;
    }
    setActiveTab(tab);
  };

  // If user is not logged in, render authentication page
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
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
        onClearNotifications={handleClearNotifications}
        onOpenConfig={() => {
          setModalInitialTab(firebaseState === 'permission_denied' ? 'rules' : 'firebase');
          setShowGASModal(true);
        }}
        onRoleSwitch={handleRoleSwitch}
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
              onClick={() => {
                setModalInitialTab('rules');
                setShowGASModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 text-white font-bold text-[11px] hover:bg-slate-800 transition-colors shrink-0 self-start sm:self-auto"
            >
              <span>Salin Aturan & Perbaiki Rules</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 gap-6">
        
        {/* Left Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          activeTab={activeTab}
          currentTab={activeTab}
          onNavigate={handleNavigate}
          onSelectTab={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          pendingUsersCount={(users || []).filter((u) => u.status === 'Pending').length}
          newLogsCount={(logs || []).filter((l) => l.status === 'WARNING' || l.status === 'FAILED').length}
          unreadLogsCount={(logs || []).filter((l) => l.status === 'WARNING' || l.status === 'FAILED').length}
          onOpenGASModal={() => {
            setModalInitialTab(firebaseState === 'permission_denied' ? 'rules' : 'firebase');
            setShowGASModal(true);
          }}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Dynamic Main Content Area */}
        <main className="flex-1 min-w-0 pb-16 lg:pb-0">
          {activeTab === 'announcements' && (
            <AnnouncementsView
              documents={documents}
              categories={categories}
              currentUser={currentUser}
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
              onOpenPreview={setPreviewDoc}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'performance' && (
            <PerformanceView
              performances={performances}
              kpiMaster={kpiMaster}
              currentUser={currentUser}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'departments' && (
            <DepartmentsMasterView
              currentUser={currentUser}
              users={users}
              documents={documents}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesMasterView
              categories={categories}
              currentUser={currentUser}
              onRefresh={refreshAllData}
            />
          )}

          {(activeTab === 'kpi-master' || activeTab === 'kpi') && (
            <KPIMasterView
              kpiMaster={kpiMaster}
              currentUser={currentUser}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementView
              users={users}
              currentUser={currentUser}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'logs' && (
            <AccessLogsView
              logs={logs}
              currentUser={currentUser}
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
        />
      )}

      {/* Google Apps Script & Spreadsheet Connector Modal */}
      {showGASModal && (
        <GASConfigModal
          currentUser={currentUser}
          initialTab={modalInitialTab}
          onClose={() => setShowGASModal(false)}
          onConfigSaved={(newCfg) => {
            setConfig(newCfg);
            refreshAllData();
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Hotel Ciputra Jakarta</span>
            <span>•</span>
            <span>Intranet Portal & Cloud Architecture</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setModalInitialTab(firebaseState === 'permission_denied' ? 'rules' : 'firebase');
                setShowGASModal(true);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                firebaseState === 'connected'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : firebaseState === 'permission_denied'
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 animate-pulse'
                  : firebaseState === 'not_found'
                  ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
              title={firebaseErrorMsg || 'Status Koneksi Firebase & Google Drive'}
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
                  : 'Firebase: Mode Offline (Cache Lokal Aktif)'}
              </span>
              <span>•</span>
              <span>Drive: Aktif</span>
            </button>
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
          <span>Kinerja</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <MenuIcon className="w-4 h-4 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>

    </div>
  );
}
