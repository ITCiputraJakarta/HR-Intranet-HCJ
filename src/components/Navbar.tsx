import React, { useState } from 'react';
import {
  Bell,
  Building2,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  X,
  Volume2,
  Menu
} from 'lucide-react';
import { User, PushNotification } from '../types';
import { markNotificationAsRead, markAllNotificationsAsRead, addAccessLog } from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  onSwitchUser?: (user: User) => void;
  onRoleSwitch?: (user: User) => void;
  allUsers?: User[];
  notifications?: PushNotification[];
  unreadCount?: number;
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
  onRefreshNotifications,
  onClearNotifications,
  onOpenConfig,
  onNavigate,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const handleSwitch = onRoleSwitch || onSwitchUser || (() => {});
  const handleClear = onClearNotifications || onRefreshNotifications || (() => {});
  const handleConfig = onOpenConfig || (() => onNavigate?.('spreadsheet'));

  const safeNotifications = notifications || [];
  const safeAllUsers = allUsers || [];

  const calculatedUnread = safeNotifications.filter(
    (n) =>
      !n.read &&
      (n.targetDepartment === 'All Departments' ||
        n.targetDepartment === currentUser.departemen)
  ).length;

  const unreadCount = propUnreadCount !== undefined ? propUnreadCount : calculatedUnread;

  const relevantNotifs = safeNotifications.filter(
    (n) =>
      n.targetDepartment === 'All Departments' ||
      n.targetDepartment === currentUser.departemen
  );

  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('Notifikasi Intranet Aktif', {
          body: `Halo ${currentUser.nama}, Anda akan menerima notifikasi setiap ada dokumen baru untuk departemen ${currentUser.departemen}.`,
          icon: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100&auto=format&fit=crop',
        });
      }
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'manager':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'spv':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'hod':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'SUPER ADMIN';
      case 'manager':
        return 'MANAGER';
      case 'spv':
        return 'SPV / SUPERVISOR';
      case 'hod':
        return 'HEAD OF DEPT';
      default:
        return 'STAFF';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Hotel CIPUTRA Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onToggleMobileMenu && (
              <button
                id="btn-mobile-menu"
                type="button"
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
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
                  Hotel Ciputra Jakarta
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200/60 uppercase tracking-wider">
                  Intranet Portal
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5">
                Google Sheets & Drive Document Storage
              </p>
            </div>
          </div>

          {/* Center: Quick Role Switcher (Tester Helper) */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/80 rounded-xl border border-slate-200/60 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-600 font-medium mr-1">Simulasi Role:</span>
            {safeAllUsers
              .filter((u) => u.status === 'Approved')
              .slice(0, 4)
              .map((userOption) => (
                <button
                  key={userOption.id}
                  id={`role-switch-${userOption.role}`}
                  onClick={() => handleSwitch(userOption)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                    currentUser.id === userOption.id
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                  title={`${userOption.nama} (${userOption.departemen})`}
                >
                  {userOption.role === 'admin'
                    ? 'Admin'
                    : userOption.role === 'manager'
                    ? 'Manager'
                    : userOption.role === 'spv'
                    ? 'SPV'
                    : 'Staff'}
                </button>
              ))}
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-3">
            
            {/* Spreadsheet Integration Shortcut */}
            <button
              id="btn-nav-spreadsheet"
              onClick={handleConfig}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 transition-colors"
              title="Konfigurasi Google Spreadsheet & Drive"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Google Sheet Studio</span>
            </button>

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                id="btn-notification-bell"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
                title="Notifikasi Dokumen Terbaru"
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
                      <h4 className="font-bold text-slate-900 text-sm">Notifikasi Masuk</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                        {relevantNotifs.length} total
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => {
                          markAllNotificationsAsRead();
                          onRefreshNotifications();
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>

                  {/* Browser Push Permission Request Prompt */}
                  <div className="mx-3 my-2 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-indigo-900">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Aktifkan notifikasi push browser</span>
                    </div>
                    <button
                      onClick={requestPushPermission}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-[11px] shrink-0 transition-colors"
                    >
                      Izinkan
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {relevantNotifs.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Belum ada notifikasi baru untuk departemen Anda.
                      </div>
                    ) : (
                      relevantNotifs.map((item) => (
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
                            <span className="text-xs font-bold text-slate-900 leading-tight">
                              {item.title}
                            </span>
                            {!item.read && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {item.message}
                          </p>
                          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                            <span className="font-semibold text-indigo-600">
                              {item.targetDepartment}
                            </span>
                            <span>
                              {new Date(item.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
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
                      Masuk Sebagai
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
                      <span>Profil Akun Saya</span>
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
                        <span>Sistem Log Akses Terstruktur</span>
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
                      <span>Keluar (Sign Out)</span>
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
