import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
  ArrowLeft,
  ChevronRight,
  Building2,
  Eye,
  EyeOff
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
  generateSecureClientId,
  clearAllSessionCache,
} from '../lib/storage';
import { Language, t } from '../lib/i18n';
import { CaptchaWidget, CaptchaWidgetRef } from './CaptchaWidget';
import {
  getAppBranding,
  subscribeToAppBranding,
  AppBranding,
  DEFAULT_BRANDING,
} from '../lib/branding';
import { UnifiedLogo } from './common/UnifiedLogo';
import { SocialMediaBar } from './common/SocialMediaBar';
import {
  subscribeToDepartments,
  subscribeToHotelUnits,
  firestoreFindUserByEmail,
  firestoreSaveUser,
} from '../lib/firestoreService';
import {
  verifyPassword,
  hashPassword,
  sanitizeInput,
  needsPasswordUpgrade,
  validatePasswordStrength,
} from '../lib/security';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { safeReadJson } from '../lib/authSession';

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
  onLoginSuccess: (user: User, apiToken?: string | null) => void;
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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Google SSO state
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Register form state (role strictly locked to 'staff' & 'Pending' on public self-registration)
  const [hotelUnits, setHotelUnits] = useState(() => getHotelUnits());
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regUnit] = useState(hotelUnits[0]?.name || 'Hotel Ciputra Jakarta');
  const [regDept, setRegDept] = useState(departments[0] || 'Front Office');
  const regRole: UserRole = 'staff';

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
      let apiToken: string | null = null;
      let serverUser: User | null = null;

      // 0. Check backend scrypt + HMAC Bearer session auth first
      try {
        const apiResp = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
        });
        if (apiResp.ok) {
          const { data: apiData } = await safeReadJson<{ token?: string; user?: User }>(apiResp);
          if (apiData?.token && apiData?.user) {
            apiToken = apiData.token;
            serverUser = apiData.user;
          }
        }
      } catch {
        // Server unavailable or user exists in Firestore registry; fall through to targeted Firestore verification
      }

      // 1. Targeted lookup by email in Cloud Firestore (never loads bulk user list pre-login)
      let matchedUser: User | null = null;
      try {
        const remoteUser = await firestoreFindUserByEmail(cleanEmail);
        if (remoteUser) {
          matchedUser = remoteUser;
          const currentLocal = getUsers().filter(
            (u) => u.id !== remoteUser.id && u.email.toLowerCase() !== cleanEmail
          );
          saveUsers([...currentLocal, remoteUser]);
        }
      } catch (remoteErr) {
        console.warn('Firestore live user lookup notice:', remoteErr);
      }

      if (!matchedUser && serverUser) {
        matchedUser = serverUser;
      }

      if (!matchedUser) {
        const localUsers = getUsers();
        matchedUser = localUsers.find((u) => u.email.toLowerCase() === cleanEmail) || null;
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

      // Check account approval status safely
      let statusNormalized = (matchedUser.status || '').trim().toLowerCase();

      if (statusNormalized === 'pending') {
        try {
          const freshRemote = await firestoreFindUserByEmail(cleanEmail);
          if (freshRemote) {
            matchedUser = freshRemote;
            statusNormalized = (freshRemote.status || '').trim().toLowerCase();
            const currentLocal = getUsers().filter(
              (u) => u.id !== freshRemote.id && u.email.toLowerCase() !== cleanEmail
            );
            saveUsers([...currentLocal, freshRemote]);
          }
        } catch (checkErr) {
          console.warn('Live status check notice:', checkErr);
        }
      }

      if (statusNormalized === 'pending') {
        setIsLoggingIn(false);
        loginCaptchaRef.current?.reset();
        setErrorMessage(
          currentLang === 'en'
            ? 'Your account is pending verification by Super Admin. Please contact HRD/IT.'
            : 'Akun Anda sedang menunggu persetujuan Super Admin. Silakan hubungi tim HRD/IT.'
        );
        return;
      }

      if (statusNormalized === 'rejected') {
        setIsLoggingIn(false);
        loginCaptchaRef.current?.reset();
        setErrorMessage(
          currentLang === 'en'
            ? 'Your account registration was not approved. Please contact Administrator.'
            : 'Pendaftaran akun Anda ditolak. Silakan hubungi Administrator sistem.'
        );
        return;
      }

      // Verify credentials via server session OR PBKDF2/SHA256 hash
      let isPasswordValid = Boolean(apiToken && serverUser);
      if (!isPasswordValid) {
        if (!matchedUser.password) {
          setIsLoggingIn(false);
          loginCaptchaRef.current?.reset();
          setErrorMessage(
            'Akun ini belum memiliki kata sandi aktif. Silakan masuk dengan Google (SSO) atau hubungi Administrator IT.'
          );
          return;
        }
        isPasswordValid = await verifyPassword(cleanPassword, matchedUser.password);
      }

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

      // Upgrade legacy SHA-256 hashes transparently to PBKDF2-SHA256 on successful login
      if (matchedUser.password && needsPasswordUpgrade(matchedUser.password)) {
        try {
          const newHashed = await hashPassword(cleanPassword);
          const upgraded = { ...matchedUser, password: newHashed };
          matchedUser = upgraded;
          const allUsers = getUsers();
          const idx = allUsers.findIndex((u) => u.id === upgraded.id);
          if (idx !== -1) {
            allUsers[idx] = upgraded;
            saveUsers(allUsers);
          }
          firestoreSaveUser(upgraded).catch(() => {});
        } catch {
          // Non-blocking hash upgrade
        }
      }

      // Reset security lockouts
      saveLockoutState({ failedAttempts: 0, lockUntil: 0, lockCount: 0 });
      setFailedAttempts(0);
      setLockoutRemainingSec(0);

      try {
        const userRole = (matchedUser.role || 'staff').toUpperCase();
        const userDept = matchedUser.departemen || 'Umum';
        const userUnit = matchedUser.unit || 'Hotel Ciputra Jakarta';
        addAccessLog({
          user: matchedUser,
          actionCategory: 'AUTH',
          action: 'Login Berhasil',
          target: 'Portal Intranet HCJ',
          status: 'SUCCESS',
          details: `Login sukses via Web Portal (${userRole} - ${userDept} - ${userUnit}).`,
        });
      } catch (logErr) {
        console.warn('Audit log write notice:', logErr);
      }

      setIsLoggingIn(false);
      setPassword('');
      onLoginSuccess(matchedUser, apiToken);
    } catch (err: any) {
      console.error('Login process error:', err);
      setIsLoggingIn(false);
      loginCaptchaRef.current?.reset();
      setErrorMessage(
        'Terjadi kesalahan saat memproses login: ' +
          (err?.message || 'Silakan coba beberapa saat lagi.')
      );
    }
  };


  const cleanupUnapprovedGoogleSession = async () => {
    await auth.signOut().catch(() => {});
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    clearAllSessionCache();
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);

      const cleanEmail = (cred.user.email || '').trim().toLowerCase();
      const hasGoogleProvider = cred.user.providerData.some((p) => p.providerId === 'google.com');
      if (!cleanEmail || !cred.user.emailVerified || !hasGoogleProvider) {
        await cleanupUnapprovedGoogleSession();
        setIsGoogleLoading(false);
        setErrorMessage('Akun Google wajib memiliki alamat email yang terverifikasi.');
        return;
      }

      // Check Firestore approval status FIRST before requesting server API session
      let existingRemote: User | null = null;
      let lookupFailed = false;
      try {
        existingRemote = await firestoreFindUserByEmail(cleanEmail);
      } catch {
        lookupFailed = true;
      }

      if (lookupFailed && cleanEmail !== 'it@hotelciputra.com') {
        await cleanupUnapprovedGoogleSession();
        setIsGoogleLoading(false);
        setErrorMessage('Gagal memverifikasi status persetujuan akun Anda di database. Silakan coba beberapa saat lagi.');
        return;
      }

      if (existingRemote) {
        const statusLower = (existingRemote.status || '').toLowerCase();
        if (statusLower === 'rejected') {
          await cleanupUnapprovedGoogleSession();
          setIsGoogleLoading(false);
          setErrorMessage('Akun Google Anda ditolak atau dinonaktifkan oleh Administrator.');
          return;
        }
        if (statusLower !== 'approved' && cleanEmail !== 'it@hotelciputra.com') {
          await cleanupUnapprovedGoogleSession();
          setIsGoogleLoading(false);
          setErrorMessage('Akun Google Anda masih menunggu persetujuan Super Admin.');
          return;
        }
      } else if (cleanEmail !== 'it@hotelciputra.com') {
        // First-time Google SSO user: create least-privilege Pending Staff profile then sign out immediately
        const newPendingStaff: User = {
          id: generateSecureClientId('usr'),
          nama: sanitizeInput(cred.user.displayName || cleanEmail.split('@')[0]),
          email: cleanEmail,
          unit: 'Hotel Ciputra Jakarta',
          departemen: 'Front Office',
          role: 'staff',
          status: 'Pending',
          createdAt: new Date().toISOString(),
        };
        await registerUser(newPendingStaff);
        await cleanupUnapprovedGoogleSession();
        setIsGoogleLoading(false);
        setSuccessMessage(
          'Akun Google berhasil didaftarkan sebagai Staff (Pending). Silakan hubungi Super Admin untuk persetujuan.'
        );
        return;
      }

      // Exchange verified Google ID token for signed server HttpOnly cookie + in-memory Bearer token
      const idToken = await cred.user.getIdToken();
      const resp = await fetch('/api/auth/firebase-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const { data: apiData } = await safeReadJson<{ token?: string; user?: User; error?: string }>(resp);
      if (!resp.ok || !apiData?.token || !apiData?.user) {
        await cleanupUnapprovedGoogleSession();
        const fallbackMsg =
          resp.status >= 500
            ? 'Layanan sesi sedang tidak tersedia sementara. Silakan coba beberapa saat lagi.'
            : 'Verifikasi Google SSO gagal atau akun belum disetujui Super Admin.';
        setErrorMessage(apiData?.error || fallbackMsg);
        setIsGoogleLoading(false);
        return;
      }

      if (existingRemote) {
        const mergedProfile: User = {
          ...existingRemote,
          role: cleanEmail === 'it@hotelciputra.com' ? 'admin' : apiData.user.role || existingRemote.role,
          status: 'Approved',
        };
        onLoginSuccess(mergedProfile, apiData.token);
      } else {
        const adminProfile: User = {
          id: apiData.user.id || 'usr-it-01',
          nama: apiData.user.nama || cred.user.displayName || 'Super Admin IT',
          email: cleanEmail,
          unit: 'Hotel Ciputra Jakarta',
          departemen: 'Engineering',
          role: 'admin',
          status: 'Approved',
          createdAt: new Date().toISOString(),
        };
        await firestoreSaveUser(adminProfile).catch(() => {});
        onLoginSuccess(adminProfile, apiData.token);
      }
      setIsGoogleLoading(false);
    } catch (err: any) {
      await cleanupUnapprovedGoogleSession().catch(() => {});
      setIsGoogleLoading(false);
      if (err?.code === 'auth/unauthorized-domain') {
        setErrorMessage(
          'Login Google tidak diizinkan pada domain ini. Silakan masuk menggunakan Email & Kata Sandi di atas atau hubungi Tim IT.'
        );
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMessage(
          'Pop-up login Google diblokir browser. Izinkan pop-up untuk situs ini atau masuk menggunakan Email & Kata Sandi di atas.'
        );
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMessage('Login Google dibatalkan atau gagal. Silakan coba lagi.');
      }
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

    const pwCheck = validatePasswordStrength(regPassword);
    if (!pwCheck.valid) {
      setErrorMessage(pwCheck.error || 'Kata sandi wajib minimal 8 karakter dengan kombinasi huruf dan angka.');
      return;
    }

    const existingRemote = await firestoreFindUserByEmail(cleanEmail).catch(() => null);
    const currentUsers = getUsers();
    if (existingRemote || currentUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      setErrorMessage('Alamat email ini sudah terdaftar. Silakan gunakan tab Masuk Sistem.');
      return;
    }

    const sanitizedName = sanitizeInput(cleanName);

    // Register on server registry first (server hardcodes role='staff', status='Pending')
    try {
      const regResp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          nama: sanitizedName,
          email: cleanEmail,
          departemen: regDept,
          password: regPassword,
        }),
      });
      if (!regResp.ok) {
        const { data: regData } = await safeReadJson<{ error?: string }>(regResp);
        setErrorMessage(
          regData?.error ||
            (regResp.status === 409
              ? 'Alamat email ini sudah terdaftar di sistem.'
              : 'Pendaftaran akun gagal diproses oleh server. Silakan coba lagi.')
        );
        return;
      }
    } catch {
      if (!auth.currentUser) {
        setErrorMessage('Gagal terhubung ke server pendaftaran. Silakan periksa koneksi internet Anda.');
        return;
      }
    }

    const hashedPassword = await hashPassword(regPassword);

    const newUser: User = {
      id: generateSecureClientId('usr'),
      email: cleanEmail,
      nama: sanitizedName,
      unit: regUnit,
      departemen: regDept,
      role: 'staff', // Strictly enforced lowest-privilege role on public self-registration
      password: hashedPassword,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    await registerUser(newUser);

    addAccessLog({
      user: newUser,
      actionCategory: 'AUTH',
      action: 'Registrasi Akun Baru',
      target: cleanEmail,
      status: 'SUCCESS',
      details: `Pendaftaran mandiri: ${sanitizedName} (STAFF - ${regDept} - ${regUnit}). Menunggu verifikasi admin.`,
    });

    setSuccessMessage(
      'Pendaftaran berhasil! Akun Staff Anda sedang menunggu persetujuan Super Admin. Anda dapat mencoba login setelah diverifikasi.'
    );
    setIsRegister(false);
    setEmail(cleanEmail);
    setPassword('');
    setRegPassword('');
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
            <UnifiedLogo customLogoUrl={branding.customLogoUrl} size="lg" />
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
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="lg:col-span-7 xl:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#F48C06]/30 text-[#F48C06] text-xs font-normal shadow-2xs mx-auto lg:mx-0">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Portal Resmi Karyawan & Manajemen Hotel Ciputra Jakarta</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-normal text-[#2F327D] leading-tight tracking-tight">
              Akses Digital Terpadu <br className="hidden sm:inline" />
              <span className="text-[#F48C06]">Sistem Informasi & Arsip HCJ</span>
            </h1>

            <p className="text-xs sm:text-base text-[#696984] leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal">
              Satu pintu masuk untuk seluruh kebutuhan operasional Anda: Standar Operasional Prosedur (SOP), Formulir Kerja, Penilaian Kinerja Karyawan (KPI), Pengumuman Manajemen, dan Administrasi Kepegawaian.
            </p>

            {/* Pillars in Beranda Theme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1 max-w-xl mx-auto lg:mx-0 text-left">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.14 }}
                whileHover={{ y: -3 }}
                className="p-3.5 sm:p-4 rounded-2xl bg-white/90 border border-orange-100 shadow-2xs space-y-1.5 hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-50 text-[#F48C06] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="font-normal text-[#2F327D] text-xs sm:text-sm">Arsip & Dokumen SOP</h4>
                <p className="text-[11px] text-[#696984] leading-snug">
                  Panduan operasional baku per departemen terstruktur rapi.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.22 }}
                whileHover={{ y: -3 }}
                className="p-3.5 sm:p-4 rounded-2xl bg-white/90 border border-indigo-100 shadow-2xs space-y-1.5 hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 text-[#2F327D] flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <h4 className="font-normal text-[#2F327D] text-xs sm:text-sm">Evaluasi Kinerja (KPI)</h4>
                <p className="text-[11px] text-[#696984] leading-snug">
                  Penilaian transparan, target tahunan, dan evaluasi berkala.
                </p>
              </motion.div>
            </div>

            {/* Career Callout */}
            {onNavigateToCareer && (
              <div className="pt-1 flex justify-center lg:justify-start">
                <div className="inline-flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-[#FFF3E4]/80 border border-[#F48C06]/20 text-xs text-[#2F327D] text-left">
                  <Briefcase className="w-4 h-4 text-[#F48C06] shrink-0" />
                  <span className="text-[11px] sm:text-xs">Bukan staf internal? Ingin bergabung dengan tim kami?</span>
                  <button
                    type="button"
                    onClick={onNavigateToCareer}
                    className="text-[#F48C06] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer whitespace-nowrap text-[11px] sm:text-xs"
                  >
                    <span>Lowongan Karir</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* RIGHT: Login / Register Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
            className="lg:col-span-5 xl:col-span-5 w-full max-w-[480px] mx-auto bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl border border-orange-100 p-4 sm:p-7 text-slate-800"
          >
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

            <AnimatePresence mode="wait">
              {!isRegister ? (
                /* LOGIN FORM */
                <motion.form
                  key="login-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  onSubmit={handleLogin}
                  className="space-y-3.5"
                >
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
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F48C06] focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-[#F48C06] transition-colors cursor-pointer"
                      title={showLoginPassword ? 'Sembunyikan Kata Sandi' : 'Intip Kata Sandi'}
                      aria-label="Intip Kata Sandi"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-600" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
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

              {/* Google SSO Option */}
              <div className="pt-2 space-y-2.5">
                <div className="relative flex items-center justify-center">
                  <span className="w-full border-t border-slate-200/80" />
                  <span className="bg-white px-2.5 text-[10.5px] uppercase tracking-wider text-slate-400 whitespace-nowrap">
                    atau masuk melalui
                  </span>
                  <span className="w-full border-t border-slate-200/80" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.37 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                    />
                  </svg>
                  <span>{isGoogleLoading ? 'Menghubungkan Google...' : 'Masuk dengan Google (SSO)'}</span>
                </button>
              </div>

              </motion.form>
            ) : (
              /* REGISTER FORM */
              <motion.form
                key="register-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onSubmit={handleRegister}
                className="space-y-3"
              >
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
                      {t('roleLabel', currentLang)}
                    </label>
                    <div className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-normal">
                      Staff (Pendaftar Baru)
                    </div>
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
                    <div className="relative">
                      <input
                        id="reg-input-password"
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min. 8 karakter"
                        className="block w-full pl-2.5 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-[#F48C06] transition-colors cursor-pointer"
                        title={showRegPassword ? 'Sembunyikan Kata Sandi' : 'Intip Kata Sandi'}
                        aria-label="Intip Kata Sandi"
                      >
                        {showRegPassword ? (
                          <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    </div>
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
              </motion.form>
            )}
            </AnimatePresence>

            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10.5px] text-slate-500 font-normal">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{t('authSecurityNotice', currentLang)}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. SIMPLE UNIFIED FOOTER IN BERANDA THEME */}
      <footer className="w-full bg-[#1a1c4b] text-white/70 py-4 px-4 sm:px-6 lg:px-8 shrink-0 z-20 border-t-4 border-[#F48C06]">
        <div className="w-full max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-normal">
          <p className="text-center md:text-left text-white/80">
            &copy; 2026 Hotel Ciputra Jakarta. All Rights Reserved. • Internal System Only
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <SocialMediaBar variant="footer" socialLinks={branding.socialLinks} />
            <div className="hidden sm:flex items-center gap-2 text-white/50 text-xs pl-2 border-l border-white/10">
              <span>it@hotelciputra.com</span>
              <span>•</span>
              <span>+62 21 566 0640</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
