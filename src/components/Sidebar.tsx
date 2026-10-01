import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  FileCheck2,
  FileText,
  Award,
  Users,
  Tags,
  Sliders,
  ShieldAlert,
  Building2,
  LogOut,
  Flame,
  FolderLock,
  Globe,
  X,
} from 'lucide-react';
import { User } from '../types';
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
  const isL1 = role === 'staff' || role === 'spv' || role === 'manager';
  const isHod = role === 'hod';
  const isAdmin = role === 'admin';
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

  // Soft Light Active & Inactive Classes (No Dark Theme)
  const getNavButtonClass = (isActive: boolean) =>
    `group w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs transition-all cursor-pointer ${
      isActive
        ? 'bg-gradient-to-r from-sky-100/90 via-[#eaf4fe] to-indigo-50/75 text-[#004872] font-extrabold border border-sky-300/90 shadow-xs ring-1 ring-sky-300/30'
        : 'bg-white/70 text-slate-600 font-semibold hover:bg-sky-50/80 hover:text-[#004872] border border-transparent hover:border-sky-200/80'
    }`;

  const renderContent = (isMobile = false) => (
    <div className="flex flex-col h-full select-none bg-gradient-to-b from-white via-[#fafdff] to-[#f2f8ff]">
      {/* Soft Luxury Top Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-indigo-400 to-teal-400 shrink-0" />

      {/* Mobile Drawer Top Header */}
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-sky-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#005a8d] font-black text-xs shadow-2xs">
              HC
            </div>
            <div>
              <span className="font-black text-[#004872] text-sm block leading-tight">
                {branding.appName || t('hotelName', currentLang)}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {branding.subTitle || t('intranetPortal', currentLang)}
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Department & Access Scope Soft Pearl Card */}
      <div className="p-3.5 border-b border-sky-100/90 shrink-0">
        <div className="p-3.5 bg-gradient-to-br from-white via-[#f7fbff] to-sky-50/60 rounded-2xl border border-sky-200/80 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider text-[#005a8d] uppercase">
              {t('yourDepartment', currentLang)}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15 animate-pulse" />
          </div>
          <div className="text-[11px] font-bold text-[#004872] flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-sky-200/80 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-sky-50 border border-sky-200 text-[#005a8d] flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <span className="truncate">{currentUser.unit || 'Hotel Ciputra Jakarta'}</span>
          </div>
          <div>
            <DepartmentBadge department={currentUser.departemen} size="sm" />
          </div>
          <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-600">
            <div className="w-5 h-5 rounded-md bg-sky-50 border border-sky-200/80 text-[#005a8d] flex items-center justify-center shrink-0">
              <FolderLock className="w-3 h-3" />
            </div>
            <span className="truncate font-semibold">
              {isAdmin
                ? 'Akses Lintas Unit & Departemen'
                : `Unit: ${getHotelUnitRule(currentUser.unit).code}`}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links with custom scrollbar */}
      <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-5">
        {/* Utama (Intranet & Dokumen) */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-sky-700/80">
            {t('archivesAndFiles', currentLang)}
          </div>
          <nav className="space-y-1.5">
            {(() => {
              const isActive = activeTab === 'announcements';
              return (
                <button
                  id="menu-announcements"
                  onClick={() => handleNav('announcements')}
                  className={getNavButtonClass(isActive)}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                      isActive
                        ? 'bg-white text-[#005a8d] border border-sky-300 shadow-2xs'
                        : 'bg-sky-50/80 text-[#005a8d] border border-sky-200/80'
                    }`}
                  >
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-left">{t('menuAnnouncements', currentLang)}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#005a8d] shrink-0" />}
                </button>
              );
            })()}

            {(() => {
              const isActive =
                activeTab === 'sop' || (activeTab === 'documents' && activeCategory === 'SOP');
              return (
                <button
                  id="menu-sop"
                  onClick={() => handleNav('documents', 'SOP')}
                  className={getNavButtonClass(isActive)}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                      isActive
                        ? 'bg-white text-blue-600 border border-sky-300 shadow-2xs'
                        : 'bg-blue-50/80 text-blue-600 border border-blue-200/80'
                    }`}
                  >
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-left">{t('menuSOP', currentLang)}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#005a8d] shrink-0" />}
                </button>
              );
            })()}

            {(() => {
              const isActive =
                activeTab === 'forms' || (activeTab === 'documents' && activeCategory === 'Form');
              return (
                <button
                  id="menu-form"
                  onClick={() => handleNav('documents', 'Form')}
                  className={getNavButtonClass(isActive)}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                      isActive
                        ? 'bg-white text-amber-600 border border-amber-300 shadow-2xs'
                        : 'bg-amber-50/80 text-amber-600 border border-amber-200/80'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-left">{t('menuForms', currentLang)}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#005a8d] shrink-0" />}
                </button>
              );
            })()}
          </nav>
        </div>

        {/* Evaluasi Kinerja */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-sky-700/80">
            Evaluasi & Kinerja
          </div>
          <nav className="space-y-1.5">
            {(() => {
              const isActive = activeTab === 'performance';
              return (
                <button
                  id="menu-performance"
                  onClick={() => handleNav('performance')}
                  className={getNavButtonClass(isActive)}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                      isActive
                        ? 'bg-white text-emerald-600 border border-emerald-300 shadow-2xs'
                        : 'bg-emerald-50/80 text-emerald-600 border border-emerald-200/80'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-left">
                    {isL1
                      ? 'Formulir KPI Saya'
                      : isHod
                      ? 'Evaluasi Kinerja Tim'
                      : t('menuPerformance', currentLang)}
                  </span>
                  {pendingAppraisalsCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                      {pendingAppraisalsCount}
                    </span>
                  ) : (
                    isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#005a8d] shrink-0" />
                  )}
                </button>
              );
            })()}
          </nav>
        </div>

        {/* Master Data (HOD Level 2 & Super Admin Level 3) */}
        {isHodOrAdmin && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-sky-700/80">
              {t('masterAndConfig', currentLang)}
            </div>
            <nav className="space-y-1.5">
              {(() => {
                const isActive = activeTab === 'units';
                return (
                  <button
                    id="menu-units"
                    onClick={() => handleNav('units')}
                    className={getNavButtonClass(isActive)}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? 'bg-white text-[#005a8d] border border-sky-300 shadow-2xs'
                          : 'bg-sky-50/80 text-[#005a8d] border border-sky-200/80'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-left">
                      {currentLang === 'en' ? 'Hotel Units Master' : 'Master Unit Hotel'}
                    </span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#005a8d] shrink-0" />}
                  </button>
                );
              })()}

              {(() => {
                const isActive = activeTab === 'departments';
                return (
                  <button
                    id="menu-departments"
                    onClick={() => handleNav('departments')}
                    className={getNavButtonClass(isActive)}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? 'bg-white text-emerald-600 border border-emerald-300 shadow-2xs'
                          : 'bg-emerald-50/80 text-emerald-600 border border-emerald-200/80'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-left">{t('menuDepartments', currentLang)}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#005a8d] shrink-0" />}
                  </button>
                );
              })()}

              {(() => {
                const isActive = activeTab === 'categories';
                return (
                  <button
                    id="menu-categories"
                    onClick={() => handleNav('categories')}
                    className={getNavButtonClass(isActive)}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? 'bg-white text-rose-600 border border-rose-300 shadow-2xs'
                          : 'bg-rose-50/80 text-rose-600 border border-rose-200/80'
                      }`}
                    >
                      <Tags className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-left">{t('menuCategories', currentLang)}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#005a8d] shrink-0" />}
                  </button>
                );
              })()}

              {(() => {
                const isActive = activeTab === 'kpi' || activeTab === 'kpi-master';
                return (
                  <button
                    id="menu-kpi"
                    onClick={() => handleNav('kpi')}
                    className={getNavButtonClass(isActive)}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? 'bg-white text-cyan-600 border border-cyan-300 shadow-2xs'
                          : 'bg-cyan-50/80 text-cyan-600 border border-cyan-200/80'
                      }`}
                    >
                      <Sliders className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-left">{t('menuKPIMaster', currentLang)}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#005a8d] shrink-0" />}
                  </button>
                );
              })()}
            </nav>
          </div>
        )}

        {/* Administrasi Sistem (Super Admin Khusus) */}
        {isAdmin && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-amber-700">
              {t('superAdminControl', currentLang)}
            </div>
            <nav className="space-y-1.5">
              {(() => {
                const isActive = activeTab === 'users';
                return (
                  <button
                    id="menu-users"
                    onClick={() => handleNav('users')}
                    className={getNavButtonClass(isActive)}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? 'bg-white text-purple-600 border border-purple-300 shadow-2xs'
                          : 'bg-purple-50/80 text-purple-600 border border-purple-200/80'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-left">{t('menuUserManagement', currentLang)}</span>
                    {pendingUsersCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300">
                        {pendingUsersCount}
                      </span>
                    ) : (
                      isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#005a8d] shrink-0" />
                    )}
                  </button>
                );
              })()}

              {(() => {
                const isActive = activeTab === 'logs';
                return (
                  <button
                    id="menu-logs"
                    onClick={() => handleNav('logs')}
                    className={getNavButtonClass(isActive)}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? 'bg-white text-amber-600 border border-amber-300 shadow-2xs'
                          : 'bg-amber-50/80 text-amber-600 border border-amber-200/80'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-left">{t('menuAccessLogs', currentLang)}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#005a8d] shrink-0" />}
                  </button>
                );
              })()}

              {(() => {
                const isActive = activeTab === 'spreadsheet';
                return (
                  <button
                    id="menu-spreadsheet"
                    onClick={() => handleNav('spreadsheet')}
                    className={getNavButtonClass(isActive)}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? 'bg-white text-amber-600 border border-amber-300 shadow-2xs'
                          : 'bg-amber-50/80 text-amber-600 border border-amber-200/80'
                      }`}
                    >
                      <Flame className="w-4 h-4 fill-amber-500" />
                    </div>
                    <span className="flex-1 text-left">{t('menuCloudSync', currentLang)}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  </button>
                );
              })()}
            </nav>
          </div>
        )}
      </div>

      {/* Footer User Logout */}
      <div className="p-3 border-t border-sky-100 bg-white/90 shrink-0">
        <button
          id="btn-sidebar-logout"
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            onLogout();
          }}
          className="group w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50/70 hover:bg-rose-100/90 rounded-2xl border border-rose-200/80 transition-all cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-white border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
            <LogOut className="w-3.5 h-3.5" />
          </div>
          <span>{t('logoutSession', currentLang)}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sticky Sidebar (Pure Bright Pearl & Soft Sky Theme) */}
      <aside className="hidden lg:flex w-64 bg-white text-slate-700 flex-col shrink-0 rounded-3xl overflow-hidden border border-sky-200/90 shadow-[0_8px_30px_rgb(2,132,199,0.06)] sticky top-24 h-[calc(100vh-7rem)] self-start z-20">
        {renderContent(false)}
      </aside>

      {/* Mobile / Tablet Drawer (Pure Bright Pearl & Soft Sky Theme) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-500/25 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white text-slate-700 flex flex-col h-full shadow-2xl border-r border-sky-200 animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
