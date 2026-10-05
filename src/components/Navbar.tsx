import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Hotel,
  Building2,
  ChevronDown,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  X,
  Volume2,
  Menu,
  Globe,
  Clock,
  Sparkles,
  Sliders,
  Flame,
  Check,
  Briefcase,
  LayoutDashboard
} from 'lucide-react';
import { User, PushNotification } from '../types';
import { markNotificationAsRead, markAllNotificationsAsRead, addAccessLog } from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';
import { Language, t } from '../lib/i18n';
import { getAppBranding, subscribeToAppBranding, AppBranding } from '../lib/branding';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  allUsers?: User[];
  notifications?: PushNotification[];
  unreadCount?: number;
  currentLang?: Language;
  onLanguageChange?: (lang: Language) => void;
  onRefreshNotifications?: () => void;
  onClearNotifications?: () => void;
  onOpenConfig?: () => void;
  onOpenFirestoreModal?: () => void;
  onOpenBranding?: () => void;
  onNavigate?: (tab: string, category?: string) => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  allUsers = [],
  notifications = [],
  unreadCount: propUnreadCount,
  currentLang = 'id',
  onLanguageChange,
  onRefreshNotifications,
  onClearNotifications,
  onOpenConfig,
  onOpenFirestoreModal,
  onOpenBranding,
  onNavigate,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [branding, setBranding] = useState<AppBranding>(getAppBranding());

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close notifications or profile dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (showNotifDropdown && notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifDropdown(false);
      }
      if (showUserDropdown && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserDropdown(false);
      }
    };

    if (showNotifDropdown || showUserDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showNotifDropdown, showUserDropdown]);

  useEffect(() => {
    const unsub = subscribeToAppBranding((b) => setBranding(b));
    return () => unsub();
  }, []);

  const isSuperAdmin = currentUser.role === 'admin';
  const handleClear = onClearNotifications || onRefreshNotifications || (() => {});
  const handleConfig = onOpenFirestoreModal || onOpenConfig || (() => onNavigate?.('firestore-sync'));

  const safeNotifications = notifications || [];
  const safeAllUsers = allUsers || [];

  // Filter notifikasi sesuai role & departemen
  const isPrivileged =
    currentUser.role === 'admin' ||
    currentUser.role === 'manager' ||
    currentUser.role === 'spv' ||
    currentUser.role === 'hod';

  const relevantNotifs = safeNotifications.filter((n) => {
    if (currentUser.role === 'admin') return true;

    // Filter role-specific notifications
    if (n.targetRole === 'admin') return false;
    if (n.targetRole === 'spv' && !isPrivileged) return false;

    // Filter department
    if (n.targetDepartment === 'All Departments' || n.targetDepartment === currentUser.departemen) {
      return true;
    }

    return false;
  });

  const calculatedUnread = relevantNotifs.filter((n) => !n.read).length;
  const unreadCount = propUnreadCount !== undefined ? propUnreadCount : calculatedUnread;

  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification('Notifikasi Intranet HCJ Aktif', {
            body: 'Anda akan menerima pemberitahuan langsung saat ada pengumuman atau tugas baru.',
            icon: '/favicon.ico',
          });
        }
      } catch (e) {
        console.warn('Notification permission error:', e);
      }
    }
  };

  const handleNotificationClick = (notif: PushNotification) => {
    markNotificationAsRead(notif.id);
    setShowNotifDropdown(false);
    handleClear();

    if (notif.category === 'PENGUMUMAN' || notif.category === 'ANNOUNCEMENT') {
      onNavigate?.('announcements');
    } else if (notif.category === 'KPI' || notif.category === 'APPRAISAL') {
      onNavigate?.('performance');
    } else if (notif.category === 'DOCUMENT' || notif.category === 'SOP') {
      onNavigate?.('sop');
    } else if (notif.category === 'FORM') {
      onNavigate?.('forms');
    } else if (notif.category === 'USER_MGMT') {
      onNavigate?.('users');
    }
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    handleClear();
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

      if (diffMins < 1) return t('justNow', currentLang);
      if (diffMins < 60) return `${diffMins} ${t('minutesUnit', currentLang)}`;
      if (diffHours < 24) return `${diffHours} ${t('hoursUnit', currentLang)}`;
      return `${diffDays} ${t('daysUnit', currentLang)}`;
    } catch {
      return '';
    }
  };

  const getDaysRemaining = (createdAt: string) => {
    try {
      const expiryDays = 3;
      const createdTime = new Date(createdAt).getTime();
      const expiryTime = createdTime + expiryDays * 24 * 60 * 60 * 1000;
      const remainingMs = expiryTime - Date.now();
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      return Math.max(0, remainingDays);
    } catch {
      return 0;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-orange-200/60 shadow-xs">
      {/* Click-outside backdrop overlay to instantly close notif or profile on any click */}
      {(showNotifDropdown || showUserDropdown) && (
        <div
          className="fixed inset-0 z-30 bg-transparent"
          onClick={() => {
            setShowNotifDropdown(false);
            setShowUserDropdown(false);
          }}
        />
      )}

      {/* Top Gold Accent Line matching Beranda */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#F48C06] via-[#2F327D] to-[#65C2B4]" />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-16 sm:h-[68px] gap-4">
          
          {/* Left Brand with Uniform Logo and Font */}
          <div className="flex items-center gap-3 select-none">
            {onToggleMobileMenu && (
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-[#F48C06] rounded-xl hover:bg-orange-50 transition-colors cursor-pointer"
                aria-label="Buka Menu Navigasi"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Standard Uniform Logo matching Beranda */}
            <div
              onClick={() => onNavigate?.('announcements')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              {branding.customLogoUrl ? (
                <img
                  src={branding.customLogoUrl}
                  alt="Logo Hotel Ciputra"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover shadow-md shadow-[#F48C06]/20 group-hover:scale-105 transition-transform duration-300 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#F48C06] rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md shadow-[#F48C06]/20 group-hover:scale-105 transition-transform duration-300 shrink-0">
                  <Hotel className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="font-bold brand-top-left-bold text-[#2F327D] hover:text-[#F48C06] text-lg sm:text-xl tracking-tight leading-none whitespace-nowrap cursor-pointer transition-colors"
                  >
                    Hotel Ciputra
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-normal bg-orange-50 text-[#F48C06] rounded-full border border-orange-200 tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{currentUser.unit || 'Hotel Ciputra Jakarta'}</span>
                  </span>
                </div>
                <p className="hidden sm:block text-xs font-normal text-[#696984] mt-0.5">
                  Jakarta • Portal Intranet HCJ
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Super Admin ONLY: Direct Shortcuts to Home CMS & Career CMS (Replacing old image gallery) */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <button
                  id="btn-nav-home-cms"
                  onClick={() => onNavigate?.('home-cms')}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-orange-200 hover:border-[#F48C06] bg-white hover:bg-orange-50/70 text-[#2F327D] hover:text-[#F48C06] text-xs font-normal transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Kelola Konten Beranda (Home CMS)"
                >
                  <div className="w-5 h-5 rounded-lg bg-[#F48C06] text-white flex items-center justify-center shadow-2xs">
                    <LayoutDashboard className="w-3 h-3" />
                  </div>
                  <span className="hidden xl:inline">Kelola Beranda</span>
                </button>

                <button
                  id="btn-nav-career-cms"
                  onClick={() => onNavigate?.('career-cms')}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-200 hover:border-[#2F327D] bg-white hover:bg-indigo-50/70 text-[#2F327D] text-xs font-normal transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Kelola Karir & Pelamar"
                >
                  <div className="w-5 h-5 rounded-lg bg-[#2F327D] text-white flex items-center justify-center shadow-2xs">
                    <Briefcase className="w-3 h-3" />
                  </div>
                  <span className="hidden xl:inline">Kelola Karir</span>
                </button>

                <button
                  id="btn-nav-quota-analytics"
                  onClick={() => onNavigate?.('quota-analytics')}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200/90 hover:border-emerald-400 bg-white hover:bg-emerald-50/70 text-emerald-800 text-xs font-normal transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Analitik Kuota Penyimpanan & Pusat Database Cloud Firebase"
                >
                  <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-2xs">
                    <Flame className="w-3 h-3 fill-white" />
                  </div>
                  <span>Kuota & Cloud Firebase</span>
                </button>
              </div>
            )}

            {/* Language Switcher Pill */}
            <button
              id="btn-lang-toggle"
              onClick={() => {
                const nextLang: Language = currentLang === 'id' ? 'en' : 'id';
                if (onLanguageChange) {
                  onLanguageChange(nextLang);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-sky-200/90 hover:border-[#005a8d] bg-white hover:bg-sky-50/60 text-xs font-normal text-slate-700 transition-all shadow-2xs cursor-pointer"
              title={currentLang === 'id' ? 'Switch to English' : 'Ubah ke Bahasa Indonesia'}
            >
              <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-sky-500 to-[#005a8d] text-white flex items-center justify-center shadow-2xs">
                <Globe className="w-3 h-3" />
              </div>
              <span className={`text-[11px] font-normal ${currentLang === 'id' ? 'text-[#005a8d] underline decoration-2' : 'text-slate-500'}`}>
                ID
              </span>
              <span className="text-slate-300 font-normal">/</span>
              <span className={`text-[11px] font-normal ${currentLang === 'en' ? 'text-[#005a8d] underline decoration-2' : 'text-slate-500'}`}>
                EN
              </span>
            </button>

            {/* Notification Bell with Dropdown */}
            <div ref={notifRef} className="relative z-40">
              <button
                id="btn-notification-bell"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-1.5 text-slate-600 hover:text-[#005a8d] bg-white hover:bg-sky-50/70 border border-sky-200/80 rounded-xl shadow-2xs transition-all focus:outline-none cursor-pointer"
                title={t('notificationsTitle', currentLang)}
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-50 to-sky-50 border border-sky-200/70 text-[#005a8d] flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-normal text-white bg-rose-600 rounded-full ring-2 ring-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-normal text-slate-900 text-sm">
                        {t('notificationsTitle', currentLang)}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {unreadCount} {t('unreadCountLabel', currentLang)} • {relevantNotifs.length}{' '}
                        {t('totalCountLabel', currentLang)}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-normal text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {t('markAllRead', currentLang)}
                      </button>
                    )}
                  </div>

                  {/* Browser Push Permission Banner */}
                  <div className="px-4 py-2 bg-indigo-50/60 border-b border-indigo-100/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-900 font-normal">
                      <Volume2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>{t('enablePushNotice', currentLang)}</span>
                    </div>
                    <button
                      onClick={requestPushPermission}
                      className="px-2 py-0.5 text-[10px] font-normal text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 rounded-md shadow-2xs hover:bg-indigo-50 transition-colors"
                    >
                      {t('allowPushBtn', currentLang)}
                    </button>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {relevantNotifs.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
                        <p>{t('noActiveNotifications', currentLang)}</p>
                      </div>
                    ) : (
                      relevantNotifs.map((n) => {
                        const daysLeft = getDaysRemaining(n.createdAt);
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${
                              !n.read ? 'bg-indigo-50/30' : ''
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              <span
                                className={`w-2 h-2 rounded-full block ${
                                  !n.read ? 'bg-indigo-600' : 'bg-transparent'
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-normal text-slate-400 uppercase tracking-wider">
                                  {n.category}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatRelativeTime(n.createdAt)}
                                </span>
                              </div>
                              <p
                                className={`text-xs ${
                                  !n.read ? 'font-normal text-slate-900' : 'text-slate-700'
                                }`}
                              >
                                {n.title}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>

                              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                                <span className="flex items-center gap-1 font-normal text-indigo-600">
                                  {n.targetDepartment}
                                </span>
                                <span className="flex items-center gap-1 font-mono text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
                                  <Clock className="w-2.5 h-2.5" />
                                  {t('expiresInDays', currentLang)} {daysLeft}{' '}
                                  {t('daysUnit', currentLang)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2 border-t border-slate-100 text-center bg-slate-50/50">
                    <span className="text-[10px] text-slate-400">
                      {t('autoExpireNotice', currentLang)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill */}
            <div ref={userMenuRef} className="relative z-40">
              <button
                id="btn-user-profile-toggle"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-white/90 hover:bg-sky-50/80 border border-sky-200/70 hover:border-sky-300 shadow-2xs transition-all focus:outline-none cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#005a8d] to-sky-500 text-white flex items-center justify-center font-normal text-xs shadow-xs">
                  {currentUser.nama.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser.nama}
                  </div>
                  <div className="text-[10px] font-medium text-amber-700 leading-tight truncate max-w-[130px]">
                    {currentUser.unit || 'Hotel Ciputra Jakarta'}
                  </div>
                  <div className="text-[9px] font-medium text-[#005a8d] uppercase tracking-wider">
                    {currentUser.role} • {currentUser.departemen}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
              </button>

              {/* User Menu Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-[10px] font-normal text-slate-400 uppercase tracking-wider">
                      {t('signedInAs', currentLang)}
                    </p>
                    <p className="font-normal text-xs text-slate-900 mt-0.5">{currentUser.nama}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                    <p className="text-[10px] font-normal text-indigo-700 mt-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      <span>{currentUser.unit || 'Hotel Ciputra Jakarta'}</span>
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <DepartmentBadge department={currentUser.departemen} size="xs" />
                      <span className="px-2 py-0.5 text-[9px] font-normal bg-slate-100 text-slate-700 rounded-md uppercase">
                        {currentUser.role}
                      </span>
                    </div>
                  </div>

                  {/* Super Admin Quick Logo & CMS Settings */}
                  {isSuperAdmin && (
                    <div className="p-1 border-b border-slate-100 space-y-0.5">
                      {onOpenBranding && (
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onOpenBranding();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-normal text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors text-left cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Tampilan Awal & Logo</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onNavigate?.('home-cms');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-normal text-orange-700 hover:bg-orange-50 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-[#F48C06]" />
                        <span>Kelola Beranda (Home CMS)</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onNavigate?.('career-cms');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-normal text-[#2F327D] hover:bg-indigo-50 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-[#2F327D]" />
                        <span>Kelola Karir & Pelamar</span>
                      </button>
                    </div>
                  )}


                  <div className="p-1">
                    <button
                      id="btn-user-logout"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-normal text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('signOut', currentLang)}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
