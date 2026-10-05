import React, { useState, useEffect, useRef } from 'react';
import {
  Hotel,
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
  FileText,
  Award,
  Shield,
  ArrowLeft,
  ChevronRight,
  Building2
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
import { verifyPassword, hashPassword, sanitizeInput } from '../lib/security';

const AUTH_LOCKOUT_STORAGE_KEY = 'hcj_auth_security_lockout_v1';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 60;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmailFormat(val: string): boolean {
  return EMAIL_REGEX.test(val.trim());
}

function isStrongPassword(val: string): boolean {
  return val.length >= 8 && /[a-zA-Z]/.test(val) && /[0-9]/.test(val);
}

function formatShortUnitOption(name: string, code: string): string {
  const short = name
    .replace(/^Hotel Ciputra Jakarta$/i, 'HC Jakarta')
    .replace(/^Hotel Ciputra Group\s*-\s*/i, 'HC Group ');
  return `${code} • ${short}`;
}

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
    // ignore quota
  }
}

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  currentLang?: Language;
  onLanguageChange?: (lang: Language) => void;
  sessionMessage?: string;
  onNavigateToHome?: () => void;
  onNavigateToCareer?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  currentLang = 'id',
  onLanguageChange,
  sessionMessage,
  onNavigateToHome,
  onNavigateToCareer,
}) => {
  const [departments, setDepartments] = useState<string[]>(() => getDepartments());
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
    const unsubBranding = subscribeToAppBranding((b) => setBranding(b));
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

    // 2. Anti-Bot Honeypot trap check
    if (honeypotTrap.trim().length > 0) {
      console.warn('Bot submission blocked via Honeypot trap.');
      setErrorMessage('Verifikasi keamanan gagal. Silakan coba lagi.');
      return;
    }

    // 3. Captcha verification check
    if (loginCaptchaRef.current && !loginCaptchaRef.current.isValid()) {
      setErrorMessage(
        currentLang === 'en'
          ? 'Security captcha code is incorrect or expired. Please check and try again.'
          : 'Kode captcha keamanan tidak sesuai atau telah kedaluwarsa. Silakan ketik kode yang tertera.'
      );
      loginCaptchaRef.current.reset();
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!isValidEmailFormat(cleanEmail)) {
      setErrorMessage(
        currentLang === 'en'
          ? 'Please enter a valid email address.'
          : 'Format email tidak valid. Pastikan penulisan alamat email benar.'
      );
      return;
    }

    setIsLoggingIn(true);

    try {
      let localUsers = getUsers();
      let matchedUser = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);

      // Fallback: check Firebase Firestore if not in local cache
      if (!matchedUser) {
        try {
          const remoteUser = await firestoreFindUserByEmail(cleanEmail);
          if (remoteUser) {
            localUsers = [...localUsers.filter((u) => u.id !== remoteUser.id), remoteUser];
            saveUsers(localUsers);
            matchedUser = remoteUser;
          }
        } catch (err) {
          console.warn('Firestore fallback check:', err);
        }
      }

      if (!matchedUser) {
        recordFailedAttempt(cleanEmail, 'Email tidak terdaftar');
        loginCaptchaRef.current?.reset();
        setIsLoggingIn(false);
        setErrorMessage(
          currentLang === 'en'
            ? 'Account not found with this email. Please check your credentials or register.'
            : 'Akun dengan email ini belum terdaftar. Silakan periksa kembali atau daftar akun baru.'
        );
        return;
      }

      // Check account approval status
      if (matchedUser.status === 'Pending') {
        setIsLoggingIn(false);
        loginCaptchaRef.current?.reset();
        setErrorMessage(
          currentLang === 'en'
            ? 'Your account is pending verification by Super Admin. Please contact HRD/IT.'
            : 'Akun Anda sedang menunggu persetujuan Super Admin. Silakan hubungi tim HRD/IT.'
        );
        return;
      }

      if (matchedUser.status === 'Rejected') {
        setIsLoggingIn(false);
        loginCaptchaRef.current?.reset();
        setErrorMessage(
          currentLang === 'en'
            ? 'Your account registration was not approved. Please contact Administrator.'
            : 'Pendaftaran akun Anda ditolak. Silakan hubungi Administrator sistem.'
        );
        return;
      }

      // Password verification
      const isPasswordValid = await verifyPassword(cleanPassword, matchedUser.password);
      if (!isPasswordValid) {
        recordFailedAttempt(cleanEmail, 'Password salah', matchedUser);
        loginCaptchaRef.current?.reset();
        setIsLoggingIn(false);
        setErrorMessage(
          currentLang === 'en'
            ? 'Incorrect password. Please verify your password and try again.'
            : 'Kata sandi tidak sesuai. Harap periksa kembali password Anda.'
        );
        return;
      }

      // Upgrade legacy password to SHA-256 salted hash transparently
      if (!matchedUser.password.startsWith('SHA256:')) {
        try {
          const newHashed = await hashPassword(cleanPassword);
          const allUsers = getUsers();
          const idx = allUsers.findIndex((u) => u.id === matchedUser.id);
          if (idx !== -1) {
            allUsers[idx] = { ...matchedUser, password: newHashed };
            saveUsers(allUsers);
            matchedUser.password = newHashed;
          }
        } catch (upgradeErr) {
          // Non-blocking hash upgrade
        }
      }

      // Login Successful: Reset security lockouts
      const resetState: AuthLockoutState = {
        failedAttempts: 0,
        lockUntil: 0,
        lockCount: 0,
      };
      saveLockoutState(resetState);
      setFailedAttempts(0);
      setLockoutRemainingSec(0);

      // Record successful access log
      addAccessLog({
        user: matchedUser,
        actionCategory: 'AUTH',
        action: 'Login Berhasil',
        target: 'Portal Intranet HCJ',
        status: 'SUCCESS',
        details: `Login sukses via Web Portal (${matchedUser.role.toUpperCase()} - ${matchedUser.departemen} - ${matchedUser.unit || 'Hotel Ciputra Jakarta'}).`,
      });

      setIsLoggingIn(false);
      onLoginSuccess(matchedUser);
    } catch (err) {
      setIsLoggingIn(false);
      loginCaptchaRef.current?.reset();
      setErrorMessage('Terjadi kesalahan saat memproses login. Silakan coba beberapa saat lagi.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (honeypotTrap.trim().length > 0) {
      setErrorMessage('Verifikasi keamanan gagal.');
      return;
    }

    if (registerCaptchaRef.current && !registerCaptchaRef.current.isValid()) {
      setErrorMessage('Kode captcha keamanan tidak sesuai. Harap ketik kode captcha yang tampil.');
      registerCaptchaRef.current.reset();
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanName = regName.trim();

    if (!cleanName) {
      setErrorMessage('Nama lengkap wajib diisi.');
      return;
    }

    if (!isValidEmailFormat(cleanEmail)) {
      setErrorMessage('Format email belum sesuai (contoh: nama@ciputra.com).');
      return;
    }

    if (!isStrongPassword(regPassword)) {
      setErrorMessage('Kata sandi wajib minimal 8 karakter dengan kombinasi huruf dan angka.');
      return;
    }

    const currentUsers = getUsers();
    if (currentUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      setErrorMessage('Alamat email ini sudah terdaftar. Silakan gunakan tab Masuk Sistem.');
      return;
    }

    const hashedPassword = await hashPassword(regPassword);
    const sanitizedName = sanitizeInput(cleanName);

    const newUser: User = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      nama: sanitizedName,
      unit: regUnit,
      departemen: regDept,
      role: regRole,
      password: hashedPassword,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    registerUser(newUser);

    addAccessLog({
      user: newUser,
      actionCategory: 'AUTH',
      action: 'Registrasi Akun Baru',
      target: cleanEmail,
      status: 'SUCCESS',
      details: `Pendaftaran mandiri: ${cleanName} (${regRole.toUpperCase()} - ${regDept} - ${regUnit}). Menunggu verifikasi admin.`,
    });

    setSuccessMessage(
      'Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan Super Admin. Anda dapat mencoba login setelah diverifikasi.'
    );
    setIsRegister(false);
    setEmail(cleanEmail);
    setPassword(regPassword);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-br from-[#FFF3E4] via-[#fdfbf7] to-[#f7f2ea] text-slate-800 selection:bg-[#F48C06] selection:text-white font-sans antialiased">
      {/* 1. TOP HEADER BAR WITH UNIFIED BRAND LOGO */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-orange-200/60 shrink-0 z-20 shadow-xs">
        {/* Top Gold Accent Line matching Beranda */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#F48C06] via-[#2F327D] to-[#65C2B4]" />

        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-3">
          {/* Brand Identity - Uniform across app */}
          <div
            onClick={onNavigateToHome || (() => {})}
            className="flex items-center gap-3 select-none cursor-pointer group"
          >
            {branding.customLogoUrl ? (
              <img
                src={branding.customLogoUrl}
                alt="Logo Hotel Ciputra"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover shadow-lg shadow-[#F48C06]/30 group-hover:scale-105 transition-transform duration-300 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#F48C06] rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-[#F48C06]/30 group-hover:scale-105 transition-transform duration-300 shrink-0">
                <Hotel className="w-6 h-6 stroke-[2.2]" />
              </div>
            )}
            <div>
              <span className="text-[#2F327D] font-bold brand-top-left-bold text-xl sm:text-2xl tracking-tight leading-none block">
                Hotel Ciputra
              </span>
              <span className="text-xs sm:text-sm font-normal text-[#696984]">
                Jakarta • Portal Internal HCJ
              </span>
            </div>
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {onNavigateToHome && (
              <button
                type="button"
                onClick={onNavigateToHome}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full border border-slate-200 hover:border-[#F48C06] bg-white hover:bg-orange-50/50 text-xs sm:text-sm font-normal text-[#2F327D] hover:text-[#F48C06] shadow-2xs transition-all cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Beranda</span>
              </button>
            )}

            {onNavigateToCareer && (
              <button
                type="button"
                onClick={onNavigateToCareer}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#F48C06]/30 hover:border-[#F48C06] bg-[#FFF3E4] hover:bg-[#ffe8cd] text-xs sm:text-sm font-normal text-[#F48C06] shadow-2xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Lowongan Karir</span>
              </button>
            )}

            {/* Language Switcher */}
            <button
              type="button"
              id="btn-login-lang-toggle"
              onClick={() => {
                const nextLang: Language = currentLang === 'id' ? 'en' : 'id';
                if (onLanguageChange) {
                  onLanguageChange(nextLang);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 hover:border-[#2F327D] bg-white hover:bg-slate-50 text-xs font-normal text-slate-700 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
              title={currentLang === 'id' ? 'Switch language to English' : 'Ubah bahasa ke Indonesia'}
            >
              <Globe className="w-3.5 h-3.5 text-[#F48C06]" />
              <span className={`text-[11px] font-normal ${currentLang === 'id' ? 'text-[#2F327D] underline' : 'text-slate-400'}`}>
                ID
              </span>
              <span className="text-slate-300">/</span>
              <span className={`text-[11px] font-normal ${currentLang === 'en' ? 'text-[#2F327D] underline' : 'text-slate-400'}`}>
                EN
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN LOGIN AREA IN BERANDA THEME (NO DARK GALLERY/SLIDER SHOWCASE) */}
      <section className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* LEFT: Clean Executive Portal Presentation in Beranda Theme */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#F48C06]/30 text-[#F48C06] text-xs font-normal shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Portal Resmi Karyawan & Manajemen Hotel Ciputra Jakarta</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#2F327D] leading-[1.2] tracking-tight">
              Akses Digital Terpadu <br />
              <span className="text-[#F48C06]">Sistem Informasi & Arsip HCJ</span>
            </h1>

            <p className="text-sm sm:text-base text-[#696984] leading-relaxed max-w-xl font-normal">
              Satu pintu masuk untuk seluruh kebutuhan operasional Anda: Standar Operasional Prosedur (SOP), Formulir Kerja, Penilaian Kinerja Karyawan (KPI), Pengumuman Manajemen, dan Administrasi Kepegawaian.
            </p>

            {/* Pillars in Beranda Theme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-2 max-w-xl">
              <div className="p-4 rounded-2xl bg-white/90 border border-orange-100 shadow-2xs space-y-1.5 hover:shadow-md transition">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#F48C06] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="font-normal text-[#2F327D] text-sm">Arsip & Dokumen SOP</h4>
                <p className="text-[11px] text-[#696984] leading-snug">
                  Panduan operasional baku per departemen terstruktur rapi.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/90 border border-indigo-100 shadow-2xs space-y-1.5 hover:shadow-md transition">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#2F327D] flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <h4 className="font-normal text-[#2F327D] text-sm">Evaluasi Kinerja (KPI)</h4>
                <p className="text-[11px] text-[#696984] leading-snug">
                  Penilaian transparan, target tahunan, dan evaluasi berkala.
                </p>
              </div>
            </div>

            {/* Career Callout */}
            {onNavigateToCareer && (
              <div className="pt-2">
                <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-[#FFF3E4]/80 border border-[#F48C06]/20 text-xs text-[#2F327D]">
                  <Briefcase className="w-4 h-4 text-[#F48C06] shrink-0" />
                  <span>Bukan staf internal? Ingin bergabung dengan tim kami?</span>
                  <button
                    type="button"
                    onClick={onNavigateToCareer}
                    className="text-[#F48C06] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Buka Lowongan Karir</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Login / Register Form Card */}
          <div className="lg:col-span-5 xl:col-span-5 w-full max-w-[480px] mx-auto bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl border border-orange-100 p-6 sm:p-7 text-slate-800">
            {/* Tab Toggle: Masuk vs Daftar */}
            <div className="flex rounded-2xl bg-[#FFF3E4]/70 p-1 mb-4 text-xs font-normal border border-orange-200/60 shadow-inner">
              <button
                type="button"
                id="tab-login-toggle"
                onClick={() => {
                  setIsRegister(false);
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-center transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
                  !isRegister
                    ? 'bg-white text-[#2F327D] font-normal shadow-xs border border-orange-200/80'
                    : 'text-slate-600 hover:text-[#2F327D]'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-[#F48C06]" />
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
                    ? 'bg-white text-[#2F327D] font-normal shadow-xs border border-orange-200/80'
                    : 'text-slate-600 hover:text-[#2F327D]'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5 text-[#F48C06]" />
                <span>{t('registerTab', currentLang)}</span>
              </button>
            </div>

            {/* Session Notification Message */}
            {sessionMessage && !errorMessage && (
              <div className="mb-3.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                <div className="w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <div className="flex-1 font-normal leading-snug">{sessionMessage}</div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-3.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                <div className="w-5 h-5 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <AlertCircle className="w-3 h-3" />
                </div>
                <div className="flex-1 font-normal leading-snug">
                  {errorMessage}
                  {failedAttempts >= 2 && lockoutRemainingSec === 0 && (
                    <span className="block text-[10.5px] font-normal text-rose-700 mt-0.5">
                      {currentLang === 'en'
                        ? `Security notice: ${failedAttempts}/${MAX_FAILED_ATTEMPTS} failed attempts before temporary lockout.`
                        : `Peringatan Keamanan: Percobaan gagal ${failedAttempts}/${MAX_FAILED_ATTEMPTS} sebelum penguncian sementara.`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Lockout Notice */}
            {lockoutRemainingSec > 0 && (
              <div className="mb-3.5 p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-950">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-normal text-[11px]">Proteksi Brute-Force Aktif</span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-amber-200/80 text-amber-950 font-normal font-mono text-xs">
                  {lockoutRemainingSec}s
                </span>
              </div>
            )}

            {/* Success Notice */}
            {successMessage && (
              <div className="mb-3.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800">
                <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <div className="flex-1 font-normal leading-snug">{successMessage}</div>
              </div>
            )}

            {!isRegister ? (
              /* LOGIN FORM */
              <form onSubmit={handleLogin} className="space-y-3.5">
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
                  <label className="block text-xs font-normal text-slate-700 mb-1">
                    {t('emailLabel', currentLang)}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4 text-[#F48C06]" />
                    </div>
                    <input
                      id="input-login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@hotelciputra.com"
                      className="block w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F48C06] focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-normal text-slate-700 mb-1">
                    {t('passwordLabel', currentLang)}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 text-[#F48C06]" />
                    </div>
                    <input
                      id="input-login-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F48C06] focus:border-transparent transition"
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
                  className="w-full mt-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-normal text-white bg-[#F48C06] hover:bg-[#e07f04] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F48C06] shadow-md shadow-[#F48C06]/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {lockoutRemainingSec > 0 ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Terkunci ({lockoutRemainingSec} dtk)</span>
                    </>
                  ) : isLoggingIn ? (
                    <span>Memverifikasi Kredensial...</span>
                  ) : (
                    <>
                      <span>{t('loginSubmitBtn', currentLang)}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* REGISTER FORM */
              <form onSubmit={handleRegister} className="space-y-3">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-normal text-slate-700 mb-0.5">
                      {t('fullNameLabel', currentLang)} *
                    </label>
                    <input
                      id="reg-input-name"
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value.slice(0, 100))}
                      placeholder="Budi Santoso"
                      className="block w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-normal text-slate-700 mb-0.5">
                      Unit Hotel
                    </label>
                    <div className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-normal">
                      Hotel Ciputra Jakarta
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-normal text-slate-700 mb-0.5">
                      {t('deptLabel', currentLang)} *
                    </label>
                    <select
                      id="reg-input-dept"
                      value={regDept}
                      onChange={(e) => setRegDept(e.target.value)}
                      className="block w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                    >
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-normal text-slate-700 mb-0.5">
                      {t('roleLabel', currentLang)} *
                    </label>
                    <select
                      id="reg-input-role"
                      value={regRole === 'admin' ? 'staff' : regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="block w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                    >
                      <option value="staff">{t('roleStaffDesc', currentLang)}</option>
                      <option value="spv">{t('roleSpvDesc', currentLang)}</option>
                      <option value="manager">{t('roleManagerDesc', currentLang)}</option>
                      <option value="hod">{t('roleHodDesc', currentLang)}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-normal text-slate-700 mb-0.5">
                      {t('workEmailLabel', currentLang)} *
                    </label>
                    <input
                      id="reg-input-email"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="budi@ciputra.com"
                      className="block w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-normal text-slate-700 mb-0.5">
                      {t('createPasswordLabel', currentLang)} *
                    </label>
                    <input
                      id="reg-input-password"
                      type="password"
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min. 8 karakter"
                      className="block w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
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
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-normal text-white bg-[#F48C06] hover:bg-[#e07f04] focus:outline-none focus:ring-2 focus:ring-[#F48C06] shadow-md shadow-[#F48C06]/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t('registerSubmitBtn', currentLang)}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10.5px] text-slate-500 font-normal">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{t('authSecurityNotice', currentLang)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SIMPLE UNIFIED FOOTER IN BERANDA THEME */}
      <footer className="w-full bg-[#1a1c4b] text-white/70 py-4 px-4 sm:px-6 lg:px-8 shrink-0 z-20 border-t-4 border-[#F48C06]">
        <div className="w-full max-w-[1920px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs font-normal">
          <p className="text-center sm:text-left text-white/80">
            &copy; 2026 Hotel Ciputra Jakarta. All Rights Reserved. • Internal System Only
          </p>
          <div className="flex items-center gap-4 text-white/50 text-xs">
            <span>Dukungan IT: it@hotelciputra.com</span>
            <span>•</span>
            <span>Telp: +62 21 566 0640</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
