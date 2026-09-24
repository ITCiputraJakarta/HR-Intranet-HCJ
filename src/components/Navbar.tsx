import React, { useState, useEffect } from 'react';
import {
  Bell,
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
  Check
} from 'lucide-react';
import { User, PushNotification } from '../types';
import { markNotificationAsRead, markAllNotificationsAsRead, addAccessLog } from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';
import { Language, t } from '../lib/i18n';
import { getAppBranding, subscribeToAppBranding, AppBranding } from '../lib/branding';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  onSwitchUser?: (user: User) => void;
  onRoleSwitch?: (user: User) => void;
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
  onSwitchUser,
  onRoleSwitch,
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Left Brand with Custom Logo Support */}
          <div className="flex items-center gap-3 select-none">
            {onToggleMobileMenu && (
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                aria-label="Buka Menu Navigasi"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Custom Logo or Default Brand Icon */}
            {branding.customLogoUrl ? (
              <div
                onClick={() => {
                  if (isSuperAdmin && onOpenBranding) onOpenBranding();
                }}
                className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white border border-slate-200 shadow-sm shrink-0 overflow-hidden p-1 ${
                  isSuperAdmin ? 'cursor-pointer hover:border-indigo-400 hover:ring-2 hover:ring-indigo-100 transition-all' : ''
                }`}
                title={isSuperAdmin ? 'Klik untuk mengganti logo portal' : branding.appName}
              >
                <img
                  src={branding.customLogoUrl}
                  alt={branding.appName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div
                onClick={() => {
                  if (isSuperAdmin && onOpenBranding) onOpenBranding();
                }}
                className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-md shadow-indigo-500/20 shrink-0 ${
                  isSuperAdmin ? 'cursor-pointer hover:scale-105 transition-transform' : ''
                }`}
                title={isSuperAdmin ? 'Klik untuk upload logo portal kustom' : branding.appName}
              >
                <Building2 className="w-5 h-5" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight leading-none whitespace-nowrap">
                  {branding.appName || 'Intranet HCJ'}
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200/60 uppercase tracking-wider">
                  HOTEL CIPUTRA
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5 font-medium">
                {branding.subTitle || t('portalSubtitle', currentLang)}
              </p>
            </div>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Super Admin ONLY: Cloud & Logo Settings Button */}
            {isSuperAdmin && (
              <div className="flex items-center gap-1.5">
                {onOpenBranding && (
                  <button
                    id="btn-nav-custom-logo"
                    onClick={onOpenBranding}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 hover:border-indigo-400 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all shadow-2xs active:scale-95"
                    title="Upload atau ganti logo portal Intranet HCJ"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden xl:inline">Ganti Logo</span>
                  </button>
                )}

                <button
                  id="btn-nav-cloud-config"
                  onClick={handleConfig}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 hover:border-emerald-400 bg-emerald-50 text-emerald-700 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Panel Status & Sinkronisasi Cloud Firestore (Super Admin Only)"
                >
                  <Flame className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                  <span>Cloud Firestore</span>
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50 hover:bg-white text-xs font-bold text-slate-700 transition-all shadow-2xs"
              title={currentLang === 'id' ? 'Switch to English' : 'Ubah ke Bahasa Indonesia'}
            >
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span className={`text-[11px] font-extrabold ${currentLang === 'id' ? 'text-indigo-600 underline decoration-2' : 'text-slate-500'}`}>
                ID
              </span>
              <span className="text-slate-300 font-normal">/</span>
              <span className={`text-[11px] font-extrabold ${currentLang === 'en' ? 'text-indigo-600 underline decoration-2' : 'text-slate-500'}`}>
                EN
              </span>
            </button>

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                id="btn-notification-bell"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
                title={t('notificationsTitle', currentLang)}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold text-white bg-rose-600 rounded-full ring-2 ring-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
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
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {t('markAllRead', currentLang)}
                      </button>
                    )}
                  </div>

                  {/* Browser Push Permission Banner */}
                  <div className="px-4 py-2 bg-indigo-50/60 border-b border-indigo-100/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-900 font-medium">
                      <Volume2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>{t('enablePushNotice', currentLang)}</span>
                    </div>
                    <button
                      onClick={requestPushPermission}
                      className="px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 rounded-md shadow-2xs hover:bg-indigo-50 transition-colors"
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
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {n.category}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatRelativeTime(n.createdAt)}
                                </span>
                              </div>
                              <p
                                className={`text-xs ${
                                  !n.read ? 'font-bold text-slate-900' : 'text-slate-700'
                                }`}
                              >
                                {n.title}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>

                              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                                <span className="flex items-center gap-1 font-medium text-indigo-600">
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
            <div className="relative">
              <button
                id="btn-user-profile-toggle"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all focus:outline-none"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentUser.nama.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser.nama}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {currentUser.role} • {currentUser.departemen}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
              </button>

              {/* User Menu Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t('signedInAs', currentLang)}
                    </p>
                    <p className="font-bold text-xs text-slate-900 mt-0.5">{currentUser.nama}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <DepartmentBadge department={currentUser.departemen} size="xs" />
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-700 rounded-md uppercase">
                        {currentUser.role}
                      </span>
                    </div>
                  </div>

                  {/* Super Admin Quick Logo Settings */}
                  {isSuperAdmin && onOpenBranding && (
                    <div className="p-1 border-b border-slate-100">
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenBranding();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors text-left"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>Pengaturan Logo Portal</span>
                      </button>
                    </div>
                  )}

                  {/* Role Switcher for Testing (Super Admin only) */}
                  {currentUser.role === 'admin' && onRoleSwitch && safeAllUsers.length > 0 && (
                    <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1.5">
                        Simulasi Hak Akses Akun:
                      </span>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {safeAllUsers.slice(0, 5).map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onRoleSwitch(u);
                              setShowUserDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 text-xs rounded-xl flex items-center justify-between ${
                              u.id === currentUser.id
                                ? 'bg-indigo-100/70 text-indigo-900 font-bold'
                                : 'hover:bg-slate-200/60 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{u.nama}</span>
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white font-semibold text-slate-600">
                              {u.role}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-1">
                    <button
                      id="btn-user-logout"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
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
