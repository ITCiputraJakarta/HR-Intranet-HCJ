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
  X
} from 'lucide-react';
import { User, UserRole } from '../types';
import { DepartmentBadge } from '../lib/departmentColors';
import { Language, t } from '../lib/i18n';
import { getAppBranding, subscribeToAppBranding, AppBranding } from '../lib/branding';

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
  newLogsCount?: number;
  unreadLogsCount?: number;
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
  newLogsCount,
  unreadLogsCount,
  onOpenGASModal,
  isMobileOpen = false,
  onCloseMobile = () => {},
}) => {
  const [branding, setBranding] = useState<AppBranding>(getAppBranding());

  useEffect(() => {
    const unsub = subscribeToAppBranding(setBranding);
    return () => unsub();
  }, []);

  const role = currentUser?.role || 'staff';
  const isStaffOrSpv = role === 'staff' || role === 'spv';
  const isManagerOrAdmin = role === 'admin' || role === 'manager' || role === 'hod';
  const isAdmin = role === 'admin';

  const activeTab = propActiveTab || currentTab || 'announcements';

  const handleNav = (tab: string, category?: string) => {
    if (onCloseMobile) onCloseMobile();
    if (tab === 'spreadsheet' && onOpenGASModal) {
      onOpenGASModal();
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
      <div className="p-4 border-b border-slate-800/80 shrink-0">
        <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              {t('yourDepartment', currentLang)}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <DepartmentBadge department={currentUser.departemen} size="sm" />
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400">
            <FolderLock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">
              {isAdmin || role === 'manager'
                ? t('allFilesAccess', currentLang)
                : t('deptProtectedFilter', currentLang)}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links with custom scrollbar */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        
        {/* Utama (Intranet & Berkas) */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t('archivesAndFiles', currentLang)}
          </div>
          <nav className="space-y-1">
            <button
              id="menu-announcements"
              onClick={() => handleNav('announcements')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'announcements'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Megaphone className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="flex-1 text-left">{t('menuAnnouncements', currentLang)}</span>
            </button>

            <button
              id="menu-sop"
              onClick={() => handleNav('documents', 'SOP')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'sop' || (activeTab === 'documents' && activeCategory === 'SOP')
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="flex-1 text-left">{t('menuSOP', currentLang)}</span>
            </button>

            <button
              id="menu-form"
              onClick={() => handleNav('documents', 'Form')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'forms' || (activeTab === 'documents' && activeCategory === 'Form')
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="flex-1 text-left">{t('menuForms', currentLang)}</span>
            </button>
          </nav>
        </div>

        {/* Evaluasi Kinerja (Staff/SPV mengisi KPI, Manager mereview & approve, Admin mengelola semua) */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Evaluasi & Kinerja
          </div>
          <nav className="space-y-1">
            <button
              id="menu-performance"
              onClick={() => handleNav('performance')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'performance'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Award className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="flex-1 text-left">
                {role === 'staff' || role === 'spv' ? 'Form KPI Saya' : t('menuPerformance', currentLang)}
              </span>
            </button>
          </nav>
        </div>

        {/* Master Data (Manager, HOD & Super Admin Khusus) */}
        {isManagerOrAdmin && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t('masterAndConfig', currentLang)}
            </div>
            <nav className="space-y-1">
              <button
                id="menu-departments"
                onClick={() => handleNav('departments')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'departments'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="flex-1 text-left">{t('menuDepartments', currentLang)}</span>
              </button>

              <button
                id="menu-categories"
                onClick={() => handleNav('categories')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'categories'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Tags className="w-4 h-4 text-pink-400 shrink-0" />
                <span className="flex-1 text-left">{t('menuCategories', currentLang)}</span>
              </button>

              <button
                id="menu-kpi"
                onClick={() => handleNav('kpi')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'kpi' || activeTab === 'kpi-master'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="flex-1 text-left">{t('menuKPIMaster', currentLang)}</span>
              </button>
            </nav>
          </div>
        )}

        {/* Administrasi Sistem (Super Admin Khusus) */}
        {isAdmin && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-rose-400">
              {t('superAdminControl', currentLang)}
            </div>
            <nav className="space-y-1">
              <button
                id="menu-users"
                onClick={() => handleNav('users')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'users'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="flex-1 text-left">{t('menuUserManagement', currentLang)}</span>
                {pendingUsersCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
                    {pendingUsersCount}
                  </span>
                )}
              </button>

              <button
                id="menu-logs"
                onClick={() => handleNav('logs')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'logs'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="flex-1 text-left">{t('menuAccessLogs', currentLang)}</span>
              </button>

              <button
                id="menu-spreadsheet"
                onClick={() => handleNav('spreadsheet')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'spreadsheet'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                <span className="flex-1 text-left">{t('menuCloudSync', currentLang)}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              </button>
            </nav>
          </div>
        )}

      </div>

      {/* Footer User Logout & Creator Signature */}
      <div className="p-3 border-t border-slate-800 shrink-0 space-y-2">
        <button
          id="btn-sidebar-logout"
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            onLogout();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>{t('logoutSession', currentLang)}</span>
        </button>

        <div className="pt-1 px-1 text-center">
          <p className="text-[10px] text-slate-500 font-medium">
            {branding.creatorSignature || '© 2026 Intranet HCJ | Developed with by bagas @2026'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sticky Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0 rounded-3xl overflow-hidden border border-slate-800/80 shadow-lg sticky top-24 h-[calc(100vh-7rem)] self-start z-20">
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

