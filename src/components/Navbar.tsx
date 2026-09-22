import React, { useState } from 'react';
import {
  Bell,
  Building2,
  ChevronDown,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  X,
  Volume2,
  Menu,
  Globe,
  Clock,
  Sparkles
} from 'lucide-react';
import { User, PushNotification } from '../types';
import { markNotificationAsRead, markAllNotificationsAsRead, addAccessLog } from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';
import { Language, t } from '../lib/i18n';

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
  onNavigate,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleClear = onClearNotifications || onRefreshNotifications || (() => {});
  const handleConfig = onOpenConfig || (() => onNavigate?.('spreadsheet'));

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
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification(t('notificationsTitle', currentLang), {
          body: `Halo ${currentUser.nama}, notifikasi intranet Hotel Ciputra aktif untuk departemen ${currentUser.departemen}.`,
          icon: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100&auto=format&fit=crop',
        });
      }
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'manager':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'spv':
      case 'hod':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return t('roleAdmin', currentLang);
      case 'manager':
        return t('roleManager', currentLang);
      case 'spv':
        return t('roleSpv', currentLang);
      case 'hod':
        return t('roleHod', currentLang);
      default:
        return t('roleStaff', currentLang);
    }
  };

  const formatTimeAndExpiry = (dateStr: string) => {
    const created = new Date(dateStr).getTime();
    if (isNaN(created)) return { timeAgo: '', remainingText: '' };
    const now = Date.now();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeAgo = '';
    if (diffMins < 1) {
      timeAgo = t('justNow', currentLang);
    } else if (diffMins < 60) {
      timeAgo = `${diffMins} ${t('minutesUnit', currentLang)}`;
    } else if (diffHours < 24) {
      timeAgo = `${diffHours} ${t('hoursUnit', currentLang)}`;
    } else {
      timeAgo = `${diffDays} ${t('daysUnit', currentLang)}`;
    }

    const remainingMs = 3 * 24 * 60 * 60 * 1000 - diffMs;
    const remainingDays = Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
    const remainingText = `${t('expiresInDays', currentLang)} ${remainingDays} ${t('daysUnit', currentLang)}`;

    return { timeAgo, remainingText };
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo & Title with Mobile Hamburger */}
          <div className="flex items-center gap-3">
            {onToggleMobileMenu && (
              <button
                id="btn-mobile-menu-toggle"
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
                aria-label="Buka Menu Navigasi"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight leading-none whitespace-nowrap">
                  {t('hotelName', currentLang)}
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200/60 uppercase tracking-wider">
                  {t('intranetPortal', currentLang)}
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5">
                {t('portalSubtitle', currentLang)}
              </p>
            </div>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            
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

            {/* Spreadsheet Integration Shortcut */}
            <button
              id="btn-nav-spreadsheet"
              onClick={handleConfig}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 transition-colors"
              title="Konfigurasi Google Spreadsheet & Drive"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{t('googleSheetStudio', currentLang)}</span>
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
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full ring-2 ring-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {t('notificationsTitle', currentLang)}
                      </h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                        {relevantNotifs.length} {t('totalCountLabel', currentLang)}
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => {
                          markAllNotificationsAsRead();
                          if (onRefreshNotifications) onRefreshNotifications();
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        {t('markAllRead', currentLang)}
                      </button>
                    )}
                  </div>

                  {/* Browser Push Permission Request Prompt */}
                  <div className="mx-3 my-2 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-indigo-900">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="text-[11px]">{t('enablePushNotice', currentLang)}</span>
                    </div>
                    <button
                      onClick={requestPushPermission}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-[11px] shrink-0 transition-colors"
                    >
                      {t('allowPushBtn', currentLang)}
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {relevantNotifs.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs px-4">
                        {t('noActiveNotifications', currentLang)}
                      </div>
                    ) : (
                      relevantNotifs.map((item) => {
                        const { timeAgo, remainingText } = formatTimeAndExpiry(item.createdAt);
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              markNotificationAsRead(item.id);
                              if (typeof onRefreshNotifications === 'function') {
                                onRefreshNotifications();
                              }
                              if (typeof onNavigate === 'function') {
                                if (item.category === 'Pengumuman') {
                                  onNavigate('announcements');
                                } else if (item.category === 'KPI') {
                                  onNavigate('performance');
                                } else {
                                  onNavigate('documents', item.category);
                                }
                              }
                              setShowNotifDropdown(false);
                            }}
                            className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                              !item.read ? 'bg-indigo-50/40' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase">
                                  {item.category}
                                </span>
                                <span className="text-xs font-bold text-slate-900 leading-tight">
                                  {item.title}
                                </span>
                              </div>
                              {!item.read && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                              {item.message}
                            </p>
                            <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-indigo-600">
                                  {item.targetDepartment}
                                </span>
                                <span>•</span>
                                <span>{timeAgo}</span>
                              </div>
                              <span className="flex items-center gap-1 text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
                                <Clock className="w-3 h-3" />
                                {remainingText}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* 3-day retention disclaimer footer */}
                  <div className="px-4 pt-2.5 pb-1 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                    {t('autoExpireNotice', currentLang)}
                  </div>
                </div>
              )}
            </div>

            {/* Current User Card & Dropdown */}
            <div className="relative">
              <button
                id="btn-user-profile-menu"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 pl-2 hover:bg-slate-100/80 rounded-xl transition-all border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {currentUser.nama.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-none">
                    {currentUser.nama}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {currentUser.departemen}
                  </span>
                </div>
                <span
                  className={`hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeColor(
                    currentUser.role
                  )}`}
                >
                  {getRoleLabel(currentUser.role)}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in duration-100">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t('signedInAs', currentLang)}
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                      {currentUser.nama}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeColor(
                          currentUser.role
                        )}`}
                      >
                        {getRoleLabel(currentUser.role)}
                      </span>
                      <DepartmentBadge department={currentUser.departemen} size="xs" />
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      id="btn-nav-profile"
                      onClick={() => {
                        if (typeof onNavigate === 'function') {
                          onNavigate('profile');
                        }
                        setShowUserDropdown(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>{t('myProfile', currentLang)}</span>
                    </button>
                    {currentUser.role === 'admin' && (
                      <button
                        id="btn-nav-logs"
                        onClick={() => {
                          if (typeof onNavigate === 'function') {
                            onNavigate('logs');
                          }
                          setShowUserDropdown(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                        <span>{t('accessLogsMenu', currentLang)}</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      id="btn-nav-logout"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
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
