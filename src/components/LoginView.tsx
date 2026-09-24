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
  Clock
} from 'lucide-react';
import { User, UserRole } from '../types';
import { getUsers, registerUser, addAccessLog, getDepartments } from '../lib/storage';
import { Language, t } from '../lib/i18n';
import { CaptchaWidget, CaptchaWidgetRef } from './CaptchaWidget';
import { getAppBranding, subscribeToAppBranding, AppBranding } from '../lib/branding';

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
  const departments = getDepartments();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDept, setRegDept] = useState(departments[0] || 'Front Office');
  const [regRole, setRegRole] = useState<UserRole>('staff');

  // Captcha references
  const loginCaptchaRef = useRef<CaptchaWidgetRef | null>(null);
  const registerCaptchaRef = useRef<CaptchaWidgetRef | null>(null);

  // Live branding state (custom logo & app name)
  const [branding, setBranding] = useState<AppBranding>(getAppBranding());

  useEffect(() => {
    const unsub = subscribeToAppBranding((b) => setBranding(b));
    return () => unsub();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Captcha verification check
    if (loginCaptchaRef.current && !loginCaptchaRef.current.isValid()) {
      setErrorMessage(t('errCaptchaInvalid', currentLang));
      loginCaptchaRef.current.reset();
      return;
    }

    const users = getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);

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

    // Success login
    addAccessLog({
      user: found,
      actionCategory: 'AUTH',
      action: 'Login Berhasil',
      target: found.email,
      status: 'SUCCESS',
      details: `User ${found.nama} (${found.role}) berhasil masuk ke portal Intranet HCJ.`,
    });

    onLoginSuccess(found);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Captcha validation for registration
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

    const newUser: User = {
      id: `user-${Date.now()}`,
      nama: regName.trim(),
      email: cleanEmail,
      departemen: regDept,
      role: regRole,
      status: 'Pending',
      password: regPassword,
      createdAt: new Date().toISOString(),
    };

    // Save to local storage and sync directly to Cloud Firestore USERS_COL
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      {/* Language Switcher Button in Header/Top Right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-10">
        <button
          type="button"
          id="btn-login-lang-toggle"
          onClick={() => {
            const nextLang: Language = currentLang === 'id' ? 'en' : 'id';
            if (onLanguageChange) {
              onLanguageChange(nextLang);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-300 hover:border-indigo-400 bg-white/90 backdrop-blur-xs text-xs font-bold text-slate-700 shadow-sm hover:shadow transition-all active:scale-95"
          title={currentLang === 'id' ? 'Switch language to English' : 'Ubah bahasa ke Indonesia'}
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
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Brand Header */}
        <div className="text-center">
          {branding.customLogoUrl ? (
            <div className="mx-auto w-20 h-20 rounded-2xl bg-white p-2 border border-slate-200 shadow-lg shadow-indigo-500/15 mb-4 flex items-center justify-center overflow-hidden">
              <img
                src={branding.customLogoUrl}
                alt={branding.appName}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4">
              <Building2 className="w-8 h-8" />
            </div>
          )}
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {branding.appName || t('hotelName', currentLang)}
          </h2>
          <p className="text-sm text-slate-600 font-medium mt-1">
            {branding.subTitle || t('portalSubtitle', currentLang)}
          </p>
        </div>

        {/* Card Form */}
        <div className="mt-8 bg-white py-8 px-6 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200/80">
          
          {/* Top Toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 text-xs font-bold">
            <button
              type="button"
              id="tab-login-toggle"
              onClick={() => {
                setIsRegister(false);
                setErrorMessage('');
              }}
              className={`flex-1 py-2 rounded-lg text-center transition-all ${
                !isRegister
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
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
              className={`flex-1 py-2 rounded-lg text-center transition-all ${
                isRegister
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('registerTab', currentLang)}
            </button>
          </div>

          {/* Feedback Messages */}
          {sessionMessage && !errorMessage && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{sessionMessage}</div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          {!isRegister ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                    className="block w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                    className="block w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              {/* Security Captcha Widget */}
              <div className="pt-1">
                <CaptchaWidget
                  ref={loginCaptchaRef}
                  idPrefix="login"
                  currentLang={currentLang}
                />
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 shadow-md shadow-indigo-600/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>{t('loginSubmitBtn', currentLang)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
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
                    className="block w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('deptLabel', currentLang)}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <select
                    id="reg-input-dept"
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white font-medium"
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
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="block w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white font-medium"
                >
                  <option value="staff">{t('roleStaffDesc', currentLang)}</option>
                  <option value="spv">{t('roleSpvDesc', currentLang)}</option>
                  <option value="manager">{t('roleManagerDesc', currentLang)}</option>
                  <option value="hod">{t('roleHodDesc', currentLang)}</option>
                  <option value="admin">{t('roleAdminDesc', currentLang)}</option>
                </select>
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
                  className="block w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
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
                  className="block w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                />
              </div>

              {/* Security Captcha Widget for Registration */}
              <div className="pt-1">
                <CaptchaWidget
                  ref={registerCaptchaRef}
                  idPrefix="register"
                  currentLang={currentLang}
                />
              </div>

              <button
                type="submit"
                id="btn-register-submit"
                className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>{t('registerSubmitBtn', currentLang)}</span>
              </button>
            </form>
          )}

        </div>

        {/* Security & Cloud Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{t('authSecurityNotice', currentLang)}</span>
        </div>

        {/* Creator Signature Mark */}
        <div className="mt-6 text-center text-xs text-slate-500 font-medium">
          <p className="font-semibold text-slate-700 tracking-wide">
            {branding.creatorSignature || 'JBagas 2026 ttd'}
          </p>
        </div>

      </div>
    </div>
  );
};
