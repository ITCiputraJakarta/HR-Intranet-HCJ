import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Award,
  Users,
  Tags,
  Sliders,
  ShieldAlert,
  Building2,
  UserCheck,
  FolderGit2,
  LogOut,
  Flame,
  Cloud,
  FolderLock,
  Globe,
  X
} from 'lucide-react';
import { User, UserRole } from '../types';
import { DepartmentBadge } from '../lib/departmentColors';
import { Language, t } from '../lib/i18n';
import { getAppBranding, subscribeToAppBranding, AppBranding } from '../lib/branding';
import { getHotelUnitRule } from '../lib/storage';

interface SidebarProps {
  activeTab?: string;
  currentTab?: string;
  activeCategory?: string;
  currentUser: User;
  currentLang?: Language;
  onNavigate?: (tab: string, category?: string) => void;
  onSelectTab?: (tab: string) => void;
  onLogout?: () => void;
  pendingUsersCount?: number;
  pendingAppraisalsCount?: number;
  newLogsCount?: number;
  unreadLogsCount?: number;
  onOpenFirestoreModal?: () => void;
  onOpenGASModal?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab: propActiveTab,
  currentTab,
  activeCategory,
  currentUser,
  currentLang = 'id',
  onNavigate,
  onSelectTab,
  onLogout = () => {},
  pendingUsersCount = 0,
  pendingAppraisalsCount = 0,
  newLogsCount,
  unreadLogsCount,
  onOpenFirestoreModal,
  onOpenGASModal,
  isMobileOpen = false,
  onCloseMobile = () => {},
}) => {
  const [branding, setBranding] = useState<AppBranding>(getAppBranding());

  useEffect(() => {
    const unsub = subscribeToAppBranding(setBranding);
    return () => unsub();
  }, []);

  const openSyncModal = onOpenFirestoreModal || onOpenGASModal;

  const role = currentUser?.role || 'staff';
  const isL1 = role === 'staff' || role === 'spv' || role === 'manager'; // Level 1 (View only / self-service)
  const isHod = role === 'hod';                                         // Level 2 (Head of Department)
  const isAdmin = role === 'admin';                                     // Level 3 (Super Admin)
  const isHodOrAdmin = isHod || isAdmin;

  const activeTab = propActiveTab || currentTab || 'announcements';

  const handleNav = (tab: string, category?: string) => {
    if (onCloseMobile) onCloseMobile();
    if ((tab === 'spreadsheet' || tab === 'firestore-sync') && openSyncModal) {
      openSyncModal();
      return;
    }
    if (typeof onNavigate === 'function') {
      onNavigate(tab, category);
      return;
    }
    if (typeof onSelectTab === 'function') {
      if (tab === 'documents' && category === 'SOP') {
        onSelectTab('sop');
      } else if (tab === 'documents' && category === 'Form') {
        onSelectTab('forms');
      } else if (tab === 'kpi') {
        onSelectTab('kpi-master');
      } else {
        onSelectTab(tab);
      }
    }
  };

  const renderContent = (isMobile = false) => (
    <div className="flex flex-col h-full select-none">
      {/* Mobile Drawer Top Header */}
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              HC
            </div>
            <div>
              <span className="font-bold text-white text-sm block leading-tight">{t('hotelName', currentLang)}</span>
              <span className="text-[10px] text-slate-400">{t('intranetPortal', currentLang)}</span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Department & Access Scope Pill */}
      <div className="p-4 border-b border-sky-900/40 shrink-0">
        <div className="p-3.5 bg-gradient-to-br from-slate-800/80 via-[#112440]/90 to-slate-900/90 rounded-2xl border border-sky-500/20 shadow-inner space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-sky-300/80 uppercase">
              {t('yourDepartment', currentLang)}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/15 animate-pulse" />
          </div>
          <div className="text-[11px] font-bold text-white flex items-center gap-2 bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-sky-500/25 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 to-[#005a8d] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <span className="truncate">{currentUser.unit || 'Hotel Ciputra Jakarta'}</span>
          </div>
          <div>
            <DepartmentBadge department={currentUser.departemen} size="sm" />
          </div>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-300">
            <div className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
              <FolderLock className="w-3 h-3" />
            </div>
            <span className="truncate font-medium">
              {isAdmin
                ? 'Akses Lintas Unit & Departemen'
                : `Scope Unit: ${getHotelUnitRule(currentUser.unit).code}`}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links with custom scrollbar */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        
        {/* Utama (Intranet & Berkas) */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-sky-300/70">
            {t('archivesAndFiles', currentLang)}
          </div>
          <nav className="space-y-1.5">
            <button
              id="menu-announcements"
              onClick={() => handleNav('announcements')}
              className={`group w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-gradient-to-r from-[#005a8d] via-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-900/40 font-bold border border-sky-400/30'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  activeTab === 'announcements'
                    ? 'bg-white/20 text-white border border-white/30 shadow-xs'
                    : 'bg-gradient-to-br from-indigo-500/20 to-sky-500/10 text-sky-400 border border-sky-500/25'
                }`}
              >
                <Megaphone className="w-4 h-4" />
              </div>
              <span className="flex-1 text-left">{t('menuAnnouncements', currentLang)}</span>
            </button>

            <button
              id="menu-sop"
              onClick={() => handleNav('documents', 'SOP')}
              className={`group w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'sop' || (activeTab === 'documents' && activeCategory === 'SOP')
                  ? 'bg-gradient-to-r from-[#005a8d] via-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-900/40 font-bold border border-sky-400/30'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  activeTab === 'sop' || (activeTab === 'documents' && activeCategory === 'SOP')
                    ? 'bg-white/20 text-white border border-white/30 shadow-xs'
                    : 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10 text-blue-400 border border-blue-500/25'
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
              </div>
              <span className="flex-1 text-left">{t('menuSOP', currentLang)}</span>
            </button>

            <button
              id="menu-form"
              onClick={() => handleNav('documents', 'Form')}
              className={`group w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'forms' || (activeTab === 'documents' && activeCategory === 'Form')
                  ? 'bg-gradient-to-r from-[#005a8d] via-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-900/40 font-bold border border-sky-400/30'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  activeTab === 'forms' || (activeTab === 'documents' && activeCategory === 'Form')
                    ? 'bg-white/20 text-white border border-white/30 shadow-xs'
                    : 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/25'
                }`}
              >
                <FileText className="w-4 h-4" />
              </div>
              <span className="flex-1 text-left">{t('menuForms', currentLang)}</span>
            </button>
          </nav>
        </div>

        {/* Evaluasi Kinerja (Staff/SPV mengisi KPI, Manager mereview & approve, Admin mengelola semua) */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-sky-300/70">
            Evaluasi & Kinerja
          </div>
          <nav className="space-y-1.5">
            <button
              id="menu-performance"
              onClick={() => handleNav('performance')}
              className={`group w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'performance'
                  ? 'bg-gradient-to-r from-[#005a8d] via-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-900/40 font-bold border border-sky-400/30'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  activeTab === 'performance'
                    ? 'bg-white/20 text-white border border-white/30 shadow-xs'
                    : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/25'
                }`}
              >
                <Award className="w-4 h-4" />
              </div>
              <span className="flex-1 text-left">
                {isL1 ? 'Form KPI Saya' : (isHod ? 'Evaluasi Kinerja Tim' : t('menuPerformance', currentLang))}
              </span>
              {pendingAppraisalsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950 shadow-2xs">
                  {pendingAppraisalsCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Master Data (HOD Level 2 & Super Admin Level 3) */}
        {isHodOrAdmin && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-sky-300/70">
              {t('masterAndConfig', currentLang)}
            </div>
            <nav className="space-y-1.5">
              <button
                id="menu-units"
                onClick={() => handleNav('units')}
                className={`group w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'units'
                    ? 'bg-gradient-to-r from-[#005a8d] via-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-900/40 font-bold border border-sky-400/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    activeTab === 'units'
                      ? 'bg-white/20 text-white border border-white/30 shadow-xs'
                      : 'bg-gradient-to-br from-sky-500/20 to-blue-500/10 text-sky-400 border border-sky-500/25'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left">
                  {currentLang === 'en' ? 'Hotel Units Master' : 'Master Unit Hotel'}
                </span>
              </button>

              <button
                id="menu-departments"
                onClick={() => handleNav('departments')}
                className={`group w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'departments'
                    ? 'bg-gradient-to-r from-[#005a8d] via-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-900/40 font-bold border border-sky-400/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    activeTab === 'departments'
                      ? 'bg-white/20 text-white border border-white/30 shadow-xs'
                      : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/25'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left">{t('menuDepartments', currentLang)}</span>
              </button>

              <button
                id="menu-categories"
                onClick={() => handleNav('categories')}
                className={`group w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'categories'
                    ? 'bg-gradient-to-r from-[#005a8d] via-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-900/40 font-bold border border-sky-400/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    activeTab === 'categories'
                      ? 'bg-white/20 text-white border border-white/30 shadow-xs'
                      : 'bg-gradient-to-br from-pink-500/20 to-rose-500/10 text-pink-400 border border-pink-500/25'
                  }`}
                >
                  <Tags className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left">{t('menuCategories', currentLang)}</span>
              </button>

              <button
                id="menu-kpi"
                onClick={() => handleNav('kpi')}
                className={`group w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'kpi' || activeTab === 'kpi-master'
                    ? 'bg-gradient-to-r from-[#005a8d] via-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-900/40 font-bold border border-sky-400/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    activeTab === 'kpi' || activeTab === 'kpi-master'
                      ? 'bg-white/20 text-white border border-white/30 shadow-xs'
                      : 'bg-gradient-to-br from-cyan-500/20 to-sky-500/10 text-cyan-400 border border-cyan-500/25'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left">{t('menuKPIMaster', currentLang)}</span>
              </button>
            </nav>
          </div>
        )}

        {/* Administrasi Sistem (Super Admin Khusus) */}
        {isAdmin && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-amber-400/90">
              {t('superAdminControl', currentLang)}
            </div>
            <nav className="space-y-1.5">
              <button
                id="menu-users"
                onClick={() => handleNav('users')}
                className={`group w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-gradient-to-r from-[#005a8d] via-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-900/40 font-bold border border-sky-400/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    activeTab === 'users'
                      ? 'bg-white/20 text-white border border-white/30 shadow-xs'
                      : 'bg-gradient-to-br from-purple-500/20 to-indigo-500/10 text-purple-400 border border-purple-500/25'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left">{t('menuUserManagement', currentLang)}</span>
                {pendingUsersCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shadow-2xs">
                    {pendingUsersCount}
                  </span>
                )}
              </button>

              <button
                id="menu-logs"
                onClick={() => handleNav('logs')}
                className={`group w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'logs'
                    ? 'bg-gradient-to-r from-[#005a8d] via-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-900/40 font-bold border border-sky-400/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    activeTab === 'logs'
                      ? 'bg-white/20 text-white border border-white/30 shadow-xs'
                      : 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10 text-amber-400 border border-amber-500/25'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left">{t('menuAccessLogs', currentLang)}</span>
              </button>

              <button
                id="menu-spreadsheet"
                onClick={() => handleNav('spreadsheet')}
                className={`group w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'spreadsheet'
                    ? 'bg-gradient-to-r from-[#005a8d] via-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-900/40 font-bold border border-sky-400/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    activeTab === 'spreadsheet'
                      ? 'bg-white/20 text-white border border-white/30 shadow-xs'
                      : 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/25'
                  }`}
                >
                  <Flame className="w-4 h-4 fill-amber-400" />
                </div>
                <span className="flex-1 text-left">{t('menuCloudSync', currentLang)}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              </button>
            </nav>
          </div>
        )}

      </div>

      {/* Footer User Logout & Creator Signature */}
      <div className="p-3 border-t border-sky-900/40 shrink-0 space-y-2">
        <button
          id="btn-sidebar-logout"
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            onLogout();
          }}
          className="group w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 rounded-2xl border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <LogOut className="w-3.5 h-3.5" />
          </div>
          <span>{t('logoutSession', currentLang)}</span>
        </button>

        <div className="pt-1 px-1 text-center">
          <p className="text-[11px] text-slate-400 font-bold tracking-wide">
            {branding.creatorSignature || 'JBagas 2026 ttd'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sticky Sidebar */}
      <aside className="hidden lg:flex w-64 bg-gradient-to-b from-[#0b172a] via-[#0e1f38] to-[#091324] text-slate-300 flex-col shrink-0 rounded-3xl overflow-hidden border border-sky-900/40 shadow-xl sticky top-24 h-[calc(100vh-7rem)] self-start z-20">
        {renderContent(false)}
      </aside>

      {/* Mobile / Tablet Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};

