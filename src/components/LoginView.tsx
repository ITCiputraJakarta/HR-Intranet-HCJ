import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Briefcase,
  Globe,
  Clock,
  Sparkles,
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  Layers,
} from 'lucide-react';
import { User, UserRole } from '../types';
import {
  getUsers,
  saveUsers,
  registerUser,
  addAccessLog,
  getDepartments,
  saveDepartmentMasters,
  getHotelUnits,
  saveHotelUnits,
} from '../lib/storage';
import { Language, t } from '../lib/i18n';
import { CaptchaWidget, CaptchaWidgetRef } from './CaptchaWidget';
import {
  getAppBranding,
  subscribeToAppBranding,
  AppBranding,
  DEFAULT_BRANDING,
} from '../lib/branding';
import {
  subscribeToUsers,
  subscribeToDepartments,
  subscribeToHotelUnits,
  firestoreFindUserByEmail,
} from '../lib/firestoreService';

import defaultHeroBright from '../assets/images/hero_bright_hotel_lounge_1790666713075.jpg';
import defaultGallery1 from '../assets/images/gallery_hotel_decor_lounge_1790666726376.jpg';
import defaultGallery2 from '../assets/images/gallery_hotel_suite_bed_1790666738422.jpg';
import defaultGallery3 from '../assets/images/gallery_hotel_artisan_wall_1790666750842.jpg';
import defaultGallery4 from '../assets/images/gallery_hotel_pantry_cafe_1790666762438.jpg';

const DEFAULT_GALLERY = [defaultGallery1, defaultGallery2, defaultGallery3, defaultGallery4];

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  currentLang?: Language;
  onLanguageChange?: (lang: Language) => void;
  sessionMessage?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  currentLang = 'id',
  onLanguageChange,
  sessionMessage,
}) => {
  const [departments, setDepartments] = useState<string[]>(() => getDepartments());
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [bgError, setBgError] = useState(false);
  const [selectedGalleryIdx, setSelectedGalleryIdx] = useState<number | null>(null);

  // Register form state
  const [hotelUnits, setHotelUnits] = useState(() => getHotelUnits());
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regUnit, setRegUnit] = useState(hotelUnits[0]?.name || 'Hotel Ciputra Jakarta');
  const [regDept, setRegDept] = useState(departments[0] || 'Front Office');
  const [regRole, setRegRole] = useState<UserRole>('staff');

  const loginCaptchaRef = useRef<CaptchaWidgetRef | null>(null);
  const registerCaptchaRef = useRef<CaptchaWidgetRef | null>(null);

  const [branding, setBranding] = useState<AppBranding>(getAppBranding());

  useEffect(() => {
    const unsubBranding = subscribeToAppBranding((b) => {
      setBranding(b);
      setBgError(false);
    });
    const unsubUsers = subscribeToUsers((newUsers) => {
      saveUsers(newUsers);
    });
    const unsubDepts = subscribeToDepartments((newDepts) => {
      saveDepartmentMasters(newDepts);
      setDepartments(getDepartments());
    });
    const unsubUnits = subscribeToHotelUnits((newUnits) => {
      saveHotelUnits(newUnits);
      setHotelUnits(getHotelUnits());
    });
    return () => {
      unsubBranding();
      unsubUsers();
      unsubDepts();
      unsubUnits();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (loginCaptchaRef.current && !loginCaptchaRef.current.isValid()) {
      setErrorMessage(t('errCaptchaInvalid', currentLang));
      loginCaptchaRef.current.reset();
      return;
    }

    setIsLoggingIn(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      let users = getUsers();
      let found = users.find((u) => u.email.toLowerCase() === cleanEmail);

      if (!found) {
        try {
          const remoteUser = await firestoreFindUserByEmail(cleanEmail);
          if (remoteUser) {
            found = remoteUser;
            users = [...users.filter((u) => u.id !== remoteUser.id), remoteUser];
            saveUsers(users);
          }
        } catch (fetchErr) {
          console.debug('Firestore direct user lookup error:', fetchErr);
        }
      }

      if (!found) {
        setErrorMessage(t('errEmailNotRegistered', currentLang));
        loginCaptchaRef.current?.reset();
        addAccessLog({
          user: null,
          actionCategory: 'AUTH',
          action: 'Login Gagal - Email Tidak Ditemukan',
          target: cleanEmail,
          status: 'FAILED',
          details: 'Percobaan login dengan email yang tidak terdaftar.',
        });
        return;
      }

      if (found.password && found.password !== password) {
        try {
          const freshUser = await firestoreFindUserByEmail(cleanEmail);
          if (freshUser && freshUser.password === password) {
            found = freshUser;
            users = [...users.filter((u) => u.id !== freshUser.id), freshUser];
            saveUsers(users);
          }
        } catch (e) {}
      }

      if (found.password && found.password !== password) {
        setErrorMessage(t('errWrongPassword', currentLang));
        loginCaptchaRef.current?.reset();
        addAccessLog({
          user: found,
          actionCategory: 'AUTH',
          action: 'Login Gagal - Kata Sandi Salah',
          target: cleanEmail,
          status: 'FAILED',
          details: 'Kata sandi tidak sesuai dengan data terdaftar.',
        });
        return;
      }

      if (found.status !== 'Approved') {
        try {
          const freshUser = await firestoreFindUserByEmail(cleanEmail);
          if (freshUser && freshUser.status === 'Approved') {
            found = freshUser;
            users = [...users.filter((u) => u.id !== freshUser.id), freshUser];
            saveUsers(users);
          }
        } catch (e) {}
      }

      if (found.status !== 'Approved') {
        setErrorMessage(t('errAccountPending', currentLang));
        loginCaptchaRef.current?.reset();
        addAccessLog({
          user: found,
          actionCategory: 'AUTH',
          action: 'Login Ditolak - Akun Belum Disetujui',
          target: cleanEmail,
          status: 'FAILED',
          details: 'Akun masih berstatus Pending dan belum diverifikasi Super Admin.',
        });
        return;
      }

      addAccessLog({
        user: found,
        actionCategory: 'AUTH',
        action: 'Login Berhasil',
        target: found.email,
        status: 'SUCCESS',
        details: `User ${found.nama} (${found.role}) berhasil masuk ke portal Intranet HCJ.`,
      });

      onLoginSuccess(found);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (registerCaptchaRef.current && !registerCaptchaRef.current.isValid()) {
      setErrorMessage(t('errCaptchaInvalid', currentLang));
      registerCaptchaRef.current.reset();
      return;
    }

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage(t('errFillAllFields', currentLang));
      return;
    }

    const users = getUsers();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      setErrorMessage(t('errEmailTaken', currentLang));
      registerCaptchaRef.current?.reset();
      return;
    }

    // Keamanan: Pendaftaran mandiri hanya diizinkan sampai level HOD (tidak bisa mendaftar sebagai Super Admin)
    const allowedRole: UserRole = regRole === 'admin' ? 'staff' : regRole;

    const newUser: User = {
      id: `user-${Date.now()}`,
      nama: regName.trim(),
      email: cleanEmail,
      unit: regUnit,
      departemen: regDept,
      role: allowedRole,
      status: 'Pending',
      password: regPassword,
      createdAt: new Date().toISOString(),
    };

    await registerUser(newUser);

    addAccessLog({
      user: newUser,
      actionCategory: 'USER_MGMT',
      action: 'Pendaftaran Akun Baru',
      target: `${newUser.nama} (${newUser.email})`,
      status: 'SUCCESS',
      details: `Pendaftaran berhasil untuk role ${newUser.role} pada departemen ${newUser.departemen}. Status: Pending (menunggu persetujuan Super Admin).`,
    });

    setSuccessMessage(t('successRegistered', currentLang));
    setIsRegister(false);
    setEmail(cleanEmail);
    setPassword(regPassword);
  };

  const activeBgSrc = branding.customBgUrl || defaultHeroBright;
  const gallerySlots = [0, 1, 2, 3].map(
    (idx) => branding.galleryImages?.[idx] || DEFAULT_GALLERY[idx]
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f4f8fb] text-slate-800">
      {/* 1. MODERN SOFT INTERACTIVE TOP HEADER BAR */}
      <header className="w-full bg-gradient-to-r from-white via-[#f8fbff] to-[#eef6fd] border-b border-sky-200/70 shrink-0 z-20 shadow-xs sticky top-0 backdrop-blur-md">
        {/* Soft Luxury Top Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-[#005a8d] to-teal-400" />

        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-12 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Soft Layered Logo Frame + Refined Brand Identity */}
          <div className="flex items-center gap-4 group">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-sky-50 via-white to-indigo-50/70 p-1.5 flex items-center justify-center shadow-sm border border-sky-200/80 group-hover:border-sky-300 group-hover:shadow-md transition-all duration-300">
              <div className="w-full h-full rounded-xl bg-white flex items-center justify-center overflow-hidden p-1.5">
                {branding.customLogoUrl ? (
                  <img
                    src={branding.customLogoUrl}
                    alt={branding.appName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#005a8d]">
                    <Building2 className="w-6 h-6 stroke-[2]" />
                    <span className="text-[7px] font-extrabold tracking-tighter uppercase mt-0.5 leading-none">
                      CIPUTRA
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xl sm:text-2xl font-black text-[#004c78] tracking-tight">
                  {branding.appName || 'Intranet'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100/80 text-[#005a8d] border border-sky-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{branding.subTitle || 'Hotel Ciputra Group'}</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                {currentLang === 'en'
                  ? 'Official Management & Employee Digital Workspace'
                  : 'Portal Digital Resmi Manajemen & Karyawan • Sistem Informasi Terpadu'}
              </p>
            </div>
          </div>

          {/* Right: Quick Auth Switch & Language Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Quick Mode Pill */}
            <div className="hidden sm:flex items-center bg-sky-50/90 p-1 rounded-xl border border-sky-200/70 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setErrorMessage('');
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  !isRegister
                    ? 'bg-white text-[#005a8d] shadow-2xs border border-sky-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('loginTab', currentLang)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setErrorMessage('');
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  isRegister
                    ? 'bg-white text-[#005a8d] shadow-2xs border border-sky-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('registerTab', currentLang)}
              </button>
            </div>

            {/* Soft Interactive Language Switcher */}
            <button
              type="button"
              id="btn-login-lang-toggle"
              onClick={() => {
                const nextLang: Language = currentLang === 'id' ? 'en' : 'id';
                if (onLanguageChange) {
                  onLanguageChange(nextLang);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200/80 hover:border-[#005a8d] bg-white hover:bg-sky-50/60 text-xs font-bold text-slate-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title={currentLang === 'id' ? 'Switch language to English' : 'Ubah bahasa ke Indonesia'}
            >
              <Globe className="w-3.5 h-3.5 text-[#005a8d]" />
              <span
                className={`text-[11px] ${
                  currentLang === 'id' ? 'text-[#005a8d] font-extrabold underline' : 'text-slate-400'
                }`}
              >
                ID
              </span>
              <span className="text-slate-300">/</span>
              <span
                className={`text-[11px] ${
                  currentLang === 'en' ? 'text-[#005a8d] font-extrabold underline' : 'text-slate-400'
                }`}
              >
                EN
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. BRIGHT SOFT HERO PHOTO AREA WITH RIGHT-ALIGNED LOGIN/REGISTER CARD (NO EXTRA TEXT ON LEFT) */}
      <section className="relative flex-1 min-h-[540px] sm:min-h-[600px] w-full flex items-center overflow-hidden bg-[#eef1f5]">
        {/* Full-bleed Bright Photo */}
        <div className="absolute inset-0 z-0">
          {!bgError && activeBgSrc ? (
            <img
              src={activeBgSrc}
              alt={branding.appName || 'Hotel Interior'}
              referrerPolicy="no-referrer"
              onError={() => setBgError(true)}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 via-sky-50 to-slate-200" />
          )}
        </div>

        {/* Container positioning Login/Register Card on the Right (Pojok Kanan) */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-10 lg:px-14 py-10 flex justify-center lg:justify-end">
          <div className="w-full max-w-[400px] bg-[#dbe7f4]/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/80 p-6 sm:p-7 text-slate-800">
            {/* Segmented Login / Register Toggle */}
            <div className="flex rounded-xl bg-white/70 p-1 mb-5 text-xs font-bold border border-white">
              <button
                type="button"
                id="tab-login-toggle"
                onClick={() => {
                  setIsRegister(false);
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-center transition-all whitespace-nowrap cursor-pointer ${
                  !isRegister
                    ? 'bg-[#005a8d] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('loginTab', currentLang)}
              </button>
              <button
                type="button"
                id="tab-register-toggle"
                onClick={() => {
                  setIsRegister(true);
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-center transition-all whitespace-nowrap cursor-pointer ${
                  isRegister
                    ? 'bg-[#005a8d] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('registerTab', currentLang)}
              </button>
            </div>

            {/* Feedback Messages */}
            {sessionMessage && !errorMessage && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{sessionMessage}</div>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
              </div>
            )}

            {!isRegister ? (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('emailLabel', currentLang)}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="input-login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('emailPlaceholder', currentLang)}
                      className="block w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-white bg-white/95 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005a8d] transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('passwordLabel', currentLang)}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-login-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('passwordPlaceholder', currentLang)}
                      className="block w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-white bg-white/95 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005a8d] transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                <div className="pt-0.5">
                  <CaptchaWidget
                    ref={loginCaptchaRef}
                    idPrefix="login"
                    currentLang={currentLang}
                  />
                </div>

                <button
                  type="submit"
                  id="btn-login-submit"
                  disabled={isLoggingIn}
                  className="w-full mt-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#005a8d] hover:bg-[#004872] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005a8d] shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  {isLoggingIn ? (
                    <span>Memverifikasi akun...</span>
                  ) : (
                    <>
                      <span>{t('loginSubmitBtn', currentLang)}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('fullNameLabel', currentLang)}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-input-name"
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder={t('namePlaceholder', currentLang)}
                      className="block w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-white bg-white/95 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {currentLang === 'en' ? 'Hotel Group Unit' : 'Unit Hotel Group'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <select
                      id="reg-input-unit"
                      value={regUnit}
                      onChange={(e) => setRegUnit(e.target.value)}
                      className="block w-full pl-8 pr-2 py-2 text-xs rounded-xl border border-white bg-white/95 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
                    >
                      {hotelUnits.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t('deptLabel', currentLang)}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      <select
                        id="reg-input-dept"
                        value={regDept}
                        onChange={(e) => setRegDept(e.target.value)}
                        className="block w-full pl-8 pr-2 py-2 text-xs rounded-xl border border-white bg-white/95 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
                      >
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t('roleLabel', currentLang)}
                    </label>
                    <select
                      id="reg-input-role"
                      value={regRole === 'admin' ? 'staff' : regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="block w-full px-2.5 py-2 text-xs rounded-xl border border-white bg-white/95 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
                    >
                      <option value="staff">{t('roleStaffDesc', currentLang)}</option>
                      <option value="spv">{t('roleSpvDesc', currentLang)}</option>
                      <option value="manager">{t('roleManagerDesc', currentLang)}</option>
                      <option value="hod">{t('roleHodDesc', currentLang)}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('workEmailLabel', currentLang)}
                  </label>
                  <input
                    id="reg-input-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder={t('emailPlaceholder', currentLang)}
                    className="block w-full px-3 py-2 text-xs rounded-xl border border-white bg-white/95 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('createPasswordLabel', currentLang)}
                  </label>
                  <input
                    id="reg-input-password"
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder={t('passwordMinChars', currentLang)}
                    className="block w-full px-3 py-2 text-xs rounded-xl border border-white bg-white/95 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
                  />
                </div>

                <div className="pt-0.5">
                  <CaptchaWidget
                    ref={registerCaptchaRef}
                    idPrefix="register"
                    currentLang={currentLang}
                  />
                </div>

                <button
                  type="submit"
                  id="btn-register-submit"
                  className="w-full mt-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#005a8d] hover:bg-[#004872] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005a8d] shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <span>{t('registerSubmitBtn', currentLang)}</span>
                </button>
              </form>
            )}

            <div className="mt-4 pt-3 border-t border-slate-300/60 flex items-center justify-center gap-1.5 text-[11px] text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-[#005a8d] shrink-0" />
              <span>{t('authSecurityNotice', currentLang)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BAGIAN BAWAH: SOFT MODERN INTERACTIVE FOOTER (NOT DARK — BRIGHT PEARL & SKY ALABASTER) */}
      <footer className="w-full bg-gradient-to-b from-[#f4f9fe] via-[#ebf3fc] to-[#e2eef9] text-slate-800 pt-10 pb-6 px-6 sm:px-12 shrink-0 z-20 border-t border-sky-200/80">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Soft Identity Card, Description, Interactive Unit Chips & Helpdesk */}
          <div className="lg:col-span-5 space-y-4 bg-white/85 backdrop-blur-xs p-6 rounded-3xl border border-sky-200/70 shadow-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-[#005a8d] text-[10px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-sky-600" />
              <span>Hospitality Intranet Ecosystem</span>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-[#004872]">
                {branding.footerTitle || DEFAULT_BRANDING.footerTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal mt-1.5">
                {branding.footerDescription || DEFAULT_BRANDING.footerDescription}
              </p>
            </div>

            {/* Bottom Contact & Signature Box */}
            <div className="pt-3 border-t border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-[#004872] tracking-tight">
                  {branding.footerBottomTitle || DEFAULT_BRANDING.footerBottomTitle}
                </h4>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <PhoneCall className="w-3 h-3 text-sky-600 shrink-0" />
                  <span>{branding.footerContact || DEFAULT_BRANDING.footerContact}</span>
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-sky-50 text-[#005a8d] border border-sky-200/60 text-[11px] font-bold self-start sm:self-auto">
                {branding.creatorSignature || DEFAULT_BRANDING.creatorSignature}
              </span>
            </div>
          </div>

          {/* Right Column: Interactive Gallery Heading + 4 Soft Framed Photos with Lightbox */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-[#004872]">
                  {branding.galleryTitle || DEFAULT_BRANDING.galleryTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  {currentLang === 'en'
                    ? 'Click any photo to view full gallery preview'
                    : 'Sentuh atau klik foto untuk melihat pratinjau ukuran penuh'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-sky-200 text-[11px] font-bold text-[#005a8d] self-start sm:self-auto shadow-2xs">
                <ZoomIn className="w-3.5 h-3.5 text-sky-600" />
                <span>Galeri Interaktif</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {gallerySlots.map((imgSrc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedGalleryIdx(idx)}
                  className="group relative aspect-square w-full bg-white p-2 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-sky-200/80 hover:border-sky-400 transition-all duration-300 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
                >
                  <div className="relative w-full h-full rounded-xl overflow-hidden bg-sky-50">
                    <img
                      src={imgSrc}
                      alt={`Galeri ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_GALLERY[idx];
                      }}
                      className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#003853]/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-white/20 backdrop-blur-xs px-2 py-1 rounded-lg w-fit">
                        <ZoomIn className="w-3 h-3" />
                        <span>Perbesar Foto {idx + 1}</span>
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Soft Highlights Strip under Gallery */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-white/80 border border-sky-200/70 flex items-center gap-2.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#005a8d] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Akses Terisolasi</p>
                  <p className="text-[10px] text-slate-500">Pemisahan SOP & Staf per Unit</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/80 border border-sky-200/70 flex items-center gap-2.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Real-Time Cloud</p>
                  <p className="text-[10px] text-slate-500">Sinkronisasi Dokumen & KPI</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/80 border border-sky-200/70 flex items-center gap-2.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Rule Pengumuman</p>
                  <p className="text-[10px] text-slate-500">Masa Tayang Otomatis per Unit</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div className="max-w-7xl mx-auto mt-8 pt-4 border-t border-sky-200/70 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p className="font-semibold text-slate-600">
            {branding.footerCopyright || DEFAULT_BRANDING.footerCopyright}
          </p>
          <p className="text-[11px] text-slate-500">
            {branding.footerAddress || DEFAULT_BRANDING.footerAddress}
          </p>
        </div>
      </footer>

      {/* Interactive Gallery Lightbox Modal */}
      {selectedGalleryIdx !== null && (
        <div
          onClick={() => setSelectedGalleryIdx(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-sky-200 space-y-3 cursor-default"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#005a8d] font-bold text-xs border border-sky-200">
                  Foto {selectedGalleryIdx + 1} / {gallerySlots.length}
                </span>
                <h4 className="font-bold text-slate-800 text-sm">
                  {branding.galleryTitle || DEFAULT_BRANDING.galleryTitle}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGalleryIdx(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={gallerySlots[selectedGalleryIdx]}
                alt={`Galeri ${selectedGalleryIdx + 1}`}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    DEFAULT_GALLERY[selectedGalleryIdx];
                }}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setSelectedGalleryIdx(
                    (selectedGalleryIdx - 1 + gallerySlots.length) % gallerySlots.length
                  )
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                title="Foto Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedGalleryIdx((selectedGalleryIdx + 1) % gallerySlots.length)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                title="Foto Berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
