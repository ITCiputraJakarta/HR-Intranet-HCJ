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
  subscribeToDepartments,
  subscribeToHotelUnits,
  firestoreFindUserByEmail,
} from '../lib/firestoreService';

const AUTH_LOCKOUT_STORAGE_KEY = 'hcj_auth_security_lockout_v1';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 60;

interface AuthLockoutState {
  failedAttempts: number;
  lockUntil: number; // timestamp in ms
  lockCount: number;
}

function getLockoutState(): AuthLockoutState {
  try {
    const raw = localStorage.getItem(AUTH_LOCKOUT_STORAGE_KEY);
    if (!raw) return { failedAttempts: 0, lockUntil: 0, lockCount: 0 };
    const parsed = JSON.parse(raw);
    return {
      failedAttempts: Number(parsed.failedAttempts) || 0,
      lockUntil: Number(parsed.lockUntil) || 0,
      lockCount: Number(parsed.lockCount) || 0,
    };
  } catch {
    return { failedAttempts: 0, lockUntil: 0, lockCount: 0 };
  }
}

function saveLockoutState(state: AuthLockoutState): void {
  try {
    localStorage.setItem(AUTH_LOCKOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

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

  // Anti-bot Honeypot & Brute-Force Lockout states
  const [honeypotTrap, setHoneypotTrap] = useState('');
  const [failedAttempts, setFailedAttempts] = useState<number>(() => getLockoutState().failedAttempts);
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState<number>(() => {
    const st = getLockoutState();
    return st.lockUntil > Date.now() ? Math.ceil((st.lockUntil - Date.now()) / 1000) : 0;
  });

  const loginCaptchaRef = useRef<CaptchaWidgetRef | null>(null);
  const registerCaptchaRef = useRef<CaptchaWidgetRef | null>(null);

  const [branding, setBranding] = useState<AppBranding>(getAppBranding());

  // Countdown timer when Brute-Force lockout is active
  useEffect(() => {
    if (lockoutRemainingSec <= 0) return;
    const timer = setInterval(() => {
      const st = getLockoutState();
      const rem = st.lockUntil > Date.now() ? Math.ceil((st.lockUntil - Date.now()) / 1000) : 0;
      setLockoutRemainingSec(rem);
      if (rem <= 0) {
        const resetState: AuthLockoutState = {
          failedAttempts: 0,
          lockUntil: 0,
          lockCount: st.lockCount,
        };
        saveLockoutState(resetState);
        setFailedAttempts(0);
        setErrorMessage('');
        loginCaptchaRef.current?.reset();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemainingSec]);

  useEffect(() => {
    const unsubBranding = subscribeToAppBranding((b) => {
      setBranding(b);
      setBgError(false);
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
      unsubDepts();
      unsubUnits();
    };
  }, []);

  const recordFailedAttempt = (targetEmail: string, reason: string, matchedUser?: User | null) => {
    const st = getLockoutState();
    const nextAttempts = st.failedAttempts + 1;

    if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
      const nextLockCount = st.lockCount + 1;
      const durationSec = LOCKOUT_DURATION_SECONDS * Math.min(nextLockCount, 3);
      const lockUntil = Date.now() + durationSec * 1000;
      saveLockoutState({
        failedAttempts: nextAttempts,
        lockUntil,
        lockCount: nextLockCount,
      });
      setFailedAttempts(nextAttempts);
      setLockoutRemainingSec(durationSec);
      setErrorMessage(
        currentLang === 'en'
          ? `Too many failed login attempts (${MAX_FAILED_ATTEMPTS}x). Access is temporarily locked for ${durationSec} seconds.`
          : `Terlalu banyak percobaan login gagal (${MAX_FAILED_ATTEMPTS}x). Demi keamanan, akses login dikunci sementara selama ${durationSec} detik.`
      );
      addAccessLog({
        user: matchedUser || null,
        actionCategory: 'AUTH',
        action: 'Proteksi Brute-Force Aktif (Penguncian Sementara)',
        target: targetEmail || 'Unknown',
        status: 'FAILED',
        details: `Login dikunci selama ${durationSec} detik setelah ${nextAttempts} kali gagal berturut-turut (${reason}).`,
      });
    } else {
      saveLockoutState({
        ...st,
        failedAttempts: nextAttempts,
      });
      setFailedAttempts(nextAttempts);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // 1. Check active Brute-Force Lockout
    const currentLock = getLockoutState();
    if (currentLock.lockUntil > Date.now()) {
      const rem = Math.ceil((currentLock.lockUntil - Date.now()) / 1000);
      setLockoutRemainingSec(rem);
      setErrorMessage(
        currentLang === 'en'
          ? `Login is temporarily locked. Please wait ${rem} seconds before trying again.`
          : `Akses login masih dikunci sementara. Silakan tunggu ${rem} detik lagi.`
      );
      return;
    }

    // 2. Check Honeypot anti-bot trap
    if (honeypotTrap.trim() !== '') {
      addAccessLog({
        user: null,
        actionCategory: 'AUTH',
        action: 'Serangan Bot Terdeteksi (Honeypot Trap)',
        target: email.trim() || 'Automated Bot',
        status: 'FAILED',
        details: 'Pengisian otomatis pada field jebakan honeypot terdeteksi dan diblokir.',
      });
      loginCaptchaRef.current?.reset();
      setErrorMessage(t('errCaptchaInvalid', currentLang));
      return;
    }

    // 3. Verify 6-character Anti-Bot Captcha
    if (loginCaptchaRef.current && !loginCaptchaRef.current.isValid()) {
      setErrorMessage(t('errCaptchaInvalid', currentLang));
      loginCaptchaRef.current.reset();
      return;
    }

    setIsLoggingIn(true);

    try {
      // Subtle random delay (350-600ms) to mitigate timing enumeration & slow down credential stuffing
      await new Promise((resolve) => setTimeout(resolve, 350 + Math.floor(Math.random() * 250)));

      const cleanEmail = email.trim().toLowerCase();
      let users = getUsers();
      let found = users.find((u) => u.email.toLowerCase() === cleanEmail);

      // Query targeted user from Cloud Firestore without subscribing to entire user directory on login screen
      try {
        const remoteUser = await firestoreFindUserByEmail(cleanEmail);
        if (remoteUser) {
          found = remoteUser;
          users = [...users.filter((u) => u.id !== remoteUser.id), remoteUser];
          saveUsers(users);
        }
      } catch (fetchErr) {
        console.debug('Firestore direct user lookup fallback:', fetchErr);
      }

      const unifiedInvalidCredentialsMsg =
        currentLang === 'en'
          ? 'Invalid email or password. Please check your credentials and try again.'
          : 'Email atau kata sandi yang Anda masukkan tidak sesuai. Silakan periksa kembali.';

      if (!found) {
        setErrorMessage(unifiedInvalidCredentialsMsg);
        loginCaptchaRef.current?.reset();
        addAccessLog({
          user: null,
          actionCategory: 'AUTH',
          action: 'Login Gagal - Kredensial Tidak Valid',
          target: cleanEmail,
          status: 'FAILED',
          details: 'Percobaan login dengan email yang tidak terdaftar.',
        });
        recordFailedAttempt(cleanEmail, 'Email tidak ditemukan', null);
        return;
      }

      if (found.password && found.password !== password) {
        setErrorMessage(unifiedInvalidCredentialsMsg);
        loginCaptchaRef.current?.reset();
        addAccessLog({
          user: found,
          actionCategory: 'AUTH',
          action: 'Login Gagal - Kata Sandi Salah',
          target: cleanEmail,
          status: 'FAILED',
          details: 'Kata sandi tidak sesuai dengan data terdaftar.',
        });
        recordFailedAttempt(cleanEmail, 'Kata sandi salah', found);
        return;
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

      // Reset brute-force lockout counters on successful login
      saveLockoutState({ failedAttempts: 0, lockUntil: 0, lockCount: 0 });
      setFailedAttempts(0);
      setLockoutRemainingSec(0);

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

    // 1. Check Honeypot anti-bot trap
    if (honeypotTrap.trim() !== '') {
      registerCaptchaRef.current?.reset();
      setErrorMessage(t('errCaptchaInvalid', currentLang));
      return;
    }

    // 2. Verify Captcha
    if (registerCaptchaRef.current && !registerCaptchaRef.current.isValid()) {
      setErrorMessage(t('errCaptchaInvalid', currentLang));
      registerCaptchaRef.current.reset();
      return;
    }

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage(t('errFillAllFields', currentLang));
      return;
    }

    // 3. Enforce Password Complexity Policy (min 8 chars + letters & numbers)
    const hasLetter = /[a-zA-Z]/.test(regPassword);
    const hasNumber = /[0-9]/.test(regPassword);
    if (regPassword.trim().length < 8 || !hasLetter || !hasNumber) {
      setErrorMessage(
        currentLang === 'en'
          ? 'Password must be at least 8 characters and include both letters and numbers.'
          : 'Demi keamanan, kata sandi wajib minimal 8 karakter dengan kombinasi huruf dan angka.'
      );
      registerCaptchaRef.current?.reset();
      return;
    }

    const users = getUsers();
    const cleanEmail = regEmail.trim().toLowerCase();

    // Also check remote Firestore for existing email
    let existingRemote: User | null = null;
    try {
      existingRemote = await firestoreFindUserByEmail(cleanEmail);
    } catch {}

    if (existingRemote || users.some((u) => u.email.toLowerCase() === cleanEmail)) {
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
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden w-full flex flex-col justify-between bg-[#f4f8fb] text-slate-800 selection:bg-[#005a8d] selection:text-white">
      {/* 1. PREMIUM EXECUTIVE SOFT TOP HEADER BAR */}
      <header className="w-full bg-gradient-to-r from-white/95 via-[#f8fbff]/95 to-[#eef6fd]/95 border-b border-sky-200/80 shrink-0 z-20 shadow-xs backdrop-blur-md">
        {/* Luxury Top Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-[#005a8d] to-sky-400" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left: 3D Layered Logo Frame + Refined Brand Identity */}
          <div className="flex items-center gap-3.5 group">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-amber-100/70 via-white to-sky-100/80 p-1 flex items-center justify-center shadow-sm border border-sky-200/90 group-hover:border-amber-300 group-hover:shadow-md transition-all duration-300">
              <div className="w-full h-full rounded-xl bg-white flex items-center justify-center overflow-hidden p-1 shadow-inner">
                {branding.customLogoUrl ? (
                  <img
                    src={branding.customLogoUrl}
                    alt={branding.appName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#005a8d]">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#005a8d] to-sky-600 text-white flex items-center justify-center shadow-xs">
                      <Building2 className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-[6.5px] font-black tracking-widest uppercase mt-0.5 leading-none text-[#004872]">
                      CIPUTRA
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-[#003b5c] via-[#005a8d] to-sky-700 bg-clip-text text-transparent tracking-tight">
                  {branding.appName || 'Intranet'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-sky-50 to-indigo-50/80 text-[#005a8d] border border-sky-200/90 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{branding.subTitle || 'Hotel Ciputra Jakarta'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                {currentLang === 'en'
                  ? 'Official Executive & Employee Digital Workspace'
                  : 'Portal Digital Resmi Manajemen & Karyawan • Sistem Informasi Terpadu'}
              </p>
            </div>
          </div>

          {/* Right: Quick Auth Switch & Premium Language Toggle */}
          <div className="flex items-center gap-2.5">
            {/* Quick Mode Pill */}
            <div className="hidden sm:flex items-center bg-sky-50/90 p-1 rounded-xl border border-sky-200/80 text-xs font-bold shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setErrorMessage('');
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isRegister
                    ? 'bg-gradient-to-r from-[#005a8d] to-sky-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#005a8d]'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>{t('loginTab', currentLang)}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setErrorMessage('');
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  isRegister
                    ? 'bg-gradient-to-r from-[#005a8d] to-sky-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#005a8d]'
                }`}
              >
                <UserIcon className="w-3 h-3" />
                <span>{t('registerTab', currentLang)}</span>
              </button>
            </div>

            {/* Premium Language Switcher */}
            <button
              type="button"
              id="btn-login-lang-toggle"
              onClick={() => {
                const nextLang: Language = currentLang === 'id' ? 'en' : 'id';
                if (onLanguageChange) {
                  onLanguageChange(nextLang);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-sky-200/90 hover:border-[#005a8d] bg-white hover:bg-sky-50/70 text-xs font-bold text-slate-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title={currentLang === 'id' ? 'Switch language to English' : 'Ubah bahasa ke Indonesia'}
            >
              <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-sky-500 to-[#005a8d] text-white flex items-center justify-center shadow-2xs">
                <Globe className="w-3 h-3" />
              </div>
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

      {/* 2. FIT-TO-DESKTOP HERO AREA WITH RIGHT-ALIGNED PREMIUM AUTH CARD */}
      <section className="relative flex-1 min-h-[430px] lg:min-h-0 w-full flex items-center overflow-hidden bg-[#eef2f6]">
        {/* Full-bleed Bright Hotel Interior Photo */}
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
          {/* Subtle luxury light vignette to enhance contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/10 via-transparent to-slate-900/25 pointer-events-none" />
        </div>

        {/* Container positioning Login/Register Card on the Right (Pojok Kanan) */}
        <div className="relative z-10 w-full h-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-4 lg:py-3 flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-[400px] max-h-full overflow-y-auto bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/95 ring-1 ring-sky-900/10 p-5 sm:p-6 text-slate-800">
            {/* Segmented Login / Register Toggle */}
            <div className="flex rounded-2xl bg-slate-100/90 p-1 mb-3.5 text-xs font-bold border border-slate-200/80 shadow-inner">
              <button
                type="button"
                id="tab-login-toggle"
                onClick={() => {
                  setIsRegister(false);
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-center transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
                  !isRegister
                    ? 'bg-gradient-to-r from-[#004872] via-[#005a8d] to-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{t('loginTab', currentLang)}</span>
              </button>
              <button
                type="button"
                id="tab-register-toggle"
                onClick={() => {
                  setIsRegister(true);
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-center transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
                  isRegister
                    ? 'bg-gradient-to-r from-[#004872] via-[#005a8d] to-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>{t('registerTab', currentLang)}</span>
              </button>
            </div>

            {/* Feedback Messages */}
            {sessionMessage && !errorMessage && (
              <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                <div className="w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <div className="flex-1 font-medium leading-snug">{sessionMessage}</div>
              </div>
            )}

            {errorMessage && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                <div className="w-5 h-5 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <AlertCircle className="w-3 h-3" />
                </div>
                <div className="flex-1 font-medium leading-snug">
                  {errorMessage}
                  {failedAttempts >= 2 && lockoutRemainingSec === 0 && (
                    <span className="block text-[10.5px] font-bold text-rose-700 mt-0.5">
                      {currentLang === 'en'
                        ? `Security notice: ${failedAttempts}/${MAX_FAILED_ATTEMPTS} failed attempts before temporary lockout.`
                        : `Peringatan Keamanan: Percobaan gagal ${failedAttempts}/${MAX_FAILED_ATTEMPTS} sebelum penguncian sementara.`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {lockoutRemainingSec > 0 && (
              <div className="mb-3 p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-950">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-[11px]">
                    {currentLang === 'en'
                      ? 'Brute-Force Protection Active'
                      : 'Proteksi Keamanan Brute-Force Aktif'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-amber-200/80 text-amber-950 font-black font-mono text-xs">
                  {lockoutRemainingSec}s
                </span>
              </div>
            )}

            {successMessage && (
              <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800">
                <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <div className="flex-1 font-medium leading-snug">{successMessage}</div>
              </div>
            )}

            {!isRegister ? (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-3">
                {/* Invisible Anti-Bot Honeypot Field */}
                <div className="hidden" aria-hidden="true">
                  <input
                    type="text"
                    name="company_website_fax"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypotTrap}
                    onChange={(e) => setHoneypotTrap(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('emailLabel', currentLang)}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-100 to-indigo-50 border border-sky-200/80 text-[#005a8d] flex items-center justify-center shadow-2xs">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <input
                      id="input-login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('emailPlaceholder', currentLang)}
                      className="block w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200/90 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005a8d] focus:border-transparent transition-all shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('passwordLabel', currentLang)}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-100 to-indigo-50 border border-sky-200/80 text-[#005a8d] flex items-center justify-center shadow-2xs">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <input
                      id="input-login-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('passwordPlaceholder', currentLang)}
                      className="block w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200/90 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005a8d] focus:border-transparent transition-all shadow-2xs"
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
                  disabled={isLoggingIn || lockoutRemainingSec > 0}
                  className="w-full mt-1 py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-[#004872] via-[#005a8d] to-sky-600 hover:from-[#003b5c] hover:to-[#005a8d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005a8d] shadow-md shadow-sky-900/15 transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  {lockoutRemainingSec > 0 ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>
                        {currentLang === 'en'
                          ? `Locked (${lockoutRemainingSec}s)`
                          : `Terkunci Sementara (${lockoutRemainingSec} dtk)`}
                      </span>
                    </>
                  ) : isLoggingIn ? (
                    <span>Memverifikasi kredensial...</span>
                  ) : (
                    <>
                      <span>{t('loginSubmitBtn', currentLang)}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Register Form (Compact for Fit-to-Desktop) */
              <form onSubmit={handleRegister} className="space-y-2.5">
                {/* Invisible Anti-Bot Honeypot Field */}
                <div className="hidden" aria-hidden="true">
                  <input
                    type="text"
                    name="employee_office_fax"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypotTrap}
                    onChange={(e) => setHoneypotTrap(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {t('fullNameLabel', currentLang)}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none">
                        <div className="w-5 h-5 rounded-md bg-sky-50 border border-sky-200/80 text-[#005a8d] flex items-center justify-center">
                          <UserIcon className="w-3 h-3" />
                        </div>
                      </div>
                      <input
                        id="reg-input-name"
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder={t('namePlaceholder', currentLang)}
                        className="block w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200/90 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {currentLang === 'en' ? 'Hotel Group Unit' : 'Unit Hotel Group'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none">
                        <div className="w-5 h-5 rounded-md bg-sky-50 border border-sky-200/80 text-[#005a8d] flex items-center justify-center">
                          <Building2 className="w-3 h-3" />
                        </div>
                      </div>
                      <select
                        id="reg-input-unit"
                        value={regUnit}
                        onChange={(e) => setRegUnit(e.target.value)}
                        className="block w-full pl-8 pr-2 py-1.5 text-xs rounded-xl border border-slate-200/90 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
                      >
                        {hotelUnits.map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.name} ({u.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {t('deptLabel', currentLang)}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none">
                        <div className="w-5 h-5 rounded-md bg-sky-50 border border-sky-200/80 text-[#005a8d] flex items-center justify-center">
                          <Briefcase className="w-3 h-3" />
                        </div>
                      </div>
                      <select
                        id="reg-input-dept"
                        value={regDept}
                        onChange={(e) => setRegDept(e.target.value)}
                        className="block w-full pl-8 pr-2 py-1.5 text-xs rounded-xl border border-slate-200/90 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
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
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {t('roleLabel', currentLang)}
                    </label>
                    <select
                      id="reg-input-role"
                      value={regRole === 'admin' ? 'staff' : regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="block w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200/90 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
                    >
                      <option value="staff">{t('roleStaffDesc', currentLang)}</option>
                      <option value="spv">{t('roleSpvDesc', currentLang)}</option>
                      <option value="manager">{t('roleManagerDesc', currentLang)}</option>
                      <option value="hod">{t('roleHodDesc', currentLang)}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {t('workEmailLabel', currentLang)}
                    </label>
                    <input
                      id="reg-input-email"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder={t('emailPlaceholder', currentLang)}
                      className="block w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200/90 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {t('createPasswordLabel', currentLang)}
                    </label>
                    <input
                      id="reg-input-password"
                      type="password"
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder={currentLang === 'en' ? 'Min. 8 chars (letters & numbers)' : 'Min. 8 karakter (huruf & angka)'}
                      className="block w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200/90 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
                    />
                  </div>
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
                  className="w-full py-2 px-4 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-[#004872] via-[#005a8d] to-sky-600 hover:from-[#003b5c] hover:to-[#005a8d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005a8d] shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <span>{t('registerSubmitBtn', currentLang)}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-center gap-1.5 text-[10.5px] text-slate-600 font-medium">
              <div className="w-4 h-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3 h-3" />
              </div>
              <span>{t('authSecurityNotice', currentLang)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. COMPACT FIT-TO-DESKTOP SOFT LUXURY FOOTER WITH INTERACTIVE 4-PHOTO GALLERY */}
      <footer className="w-full bg-gradient-to-b from-[#f5f9fe] via-[#edf5fc] to-[#e4f0fb] text-slate-800 py-3.5 lg:py-3 px-4 sm:px-8 lg:px-12 shrink-0 z-20 border-t border-sky-200/90">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center">
          {/* Left Column: Soft Identity Card, Concise Description & Single Copyright */}
          <div className="lg:col-span-5 space-y-2 bg-white/90 backdrop-blur-xs px-4 py-3 rounded-2xl border border-sky-200/80 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#005a8d] to-sky-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm sm:text-base font-black tracking-tight text-[#004872]">
                  {branding.footerTitle || DEFAULT_BRANDING.footerTitle}
                </h3>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-50 text-[#005a8d] border border-sky-200/70 text-[10px] font-bold shrink-0">
                {branding.creatorSignature || DEFAULT_BRANDING.creatorSignature}
              </span>
            </div>

            <p className="text-[11px] sm:text-xs text-slate-600 leading-snug line-clamp-2">
              {branding.footerDescription || DEFAULT_BRANDING.footerDescription}
            </p>

            {/* Bottom Contact & Single Copyright Line */}
            <div className="pt-2 border-t border-sky-100 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
              <span className="text-slate-600 flex items-center gap-1 font-medium">
                <div className="w-4 h-4 rounded-md bg-sky-100 text-[#005a8d] flex items-center justify-center shrink-0">
                  <PhoneCall className="w-2.5 h-2.5" />
                </div>
                <span>{branding.footerContact || DEFAULT_BRANDING.footerContact}</span>
              </span>
              <span className="font-bold text-[#004872]">
                {branding.footerCopyright || DEFAULT_BRANDING.footerCopyright}
              </span>
            </div>
          </div>

          {/* Right Column: Interactive 4-Photo Gallery Fitted for Desktop */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black tracking-tight text-[#004872]">
                  {branding.galleryTitle || DEFAULT_BRANDING.galleryTitle}
                </h3>
                <span className="hidden sm:inline text-[11px] text-slate-500">
                  • {currentLang === 'en' ? 'Click photo to enlarge' : 'Klik foto untuk memperbesar'}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 border border-sky-200 text-[10px] font-bold text-[#005a8d] shadow-2xs">
                <ZoomIn className="w-3 h-3 text-sky-600" />
                <span>Galeri Interaktif</span>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
              {gallerySlots.map((imgSrc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedGalleryIdx(idx)}
                  className="group relative h-16 sm:h-20 lg:h-[82px] w-full bg-white p-1.5 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg border border-sky-200/90 hover:border-sky-400 transition-all duration-300 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#005a8d]"
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
                    <div className="absolute inset-0 bg-gradient-to-t from-[#003853]/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-1.5">
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white bg-white/20 backdrop-blur-xs px-1.5 py-0.5 rounded-md">
                        <ZoomIn className="w-2.5 h-2.5" />
                        <span>Foto {idx + 1}</span>
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
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
