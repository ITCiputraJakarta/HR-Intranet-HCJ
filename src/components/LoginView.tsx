import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { User, UserRole } from '../types';
import { getUsers, saveUsers, addAccessLog, getDepartments } from '../lib/storage';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const users = getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!found) {
      setErrorMessage('Alamat email belum terdaftar di sistem.');
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
      setErrorMessage('Kata sandi yang Anda masukkan salah.');
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
      setErrorMessage(
        'Akun Anda masih berstatus Tertunda (Pending). Harap menunggu persetujuan dari Super Admin / HR.'
      );
      addAccessLog({
        user: found,
        actionCategory: 'AUTH',
        action: 'Login Ditolak - Akun Belum Disetujui',
        target: cleanEmail,
        status: 'WARNING',
        details: 'User mencoba login saat status akun masih Pending.',
      });
      return;
    }

    // Success login!
    addAccessLog({
      user: found,
      actionCategory: 'AUTH',
      action: 'Login Pengguna Berhasil',
      target: 'Sesi Portal Intranet',
      status: 'SUCCESS',
      details: `Kredensial berhasil diverifikasi. Role: ${found.role}, Dept: ${found.departemen}`,
    });

    onLoginSuccess(found);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Harap lengkapi semua kolom pendaftaran.');
      return;
    }

    const users = getUsers();
    const cleanEmail = regEmail.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      setErrorMessage('Email tersebut sudah terdaftar di sistem.');
      return;
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      nama: regName.trim(),
      email: cleanEmail,
      departemen: regDept,
      role: regRole,
      status: 'Pending', // New registrations require Super Admin approval
      password: regPassword,
      createdAt: new Date().toISOString(),
    };

    saveUsers([...users, newUser]);

    addAccessLog({
      user: newUser,
      actionCategory: 'USER_MGMT',
      action: 'Pendaftaran Akun Baru',
      target: `${newUser.nama} (${newUser.email})`,
      status: 'SUCCESS',
      details: `Pendaftaran berhasil untuk role ${newUser.role} pada departemen ${newUser.departemen}. Status: Pending.`,
    });

    setSuccessMessage(
      'Pendaftaran berhasil! Akun Anda telah dicatat dengan status Pending dan menunggu persetujuan Super Admin.'
    );
    setIsRegister(false);
    setEmail(cleanEmail);
    setPassword(regPassword);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Hotel Ciputra Jakarta
          </h2>
          <p className="text-sm text-slate-600 font-medium mt-1">
            Portal Intranet & Manajemen Berkas Google Drive
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
              Masuk Sistem
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
              Daftar Akun Baru
            </button>
          </div>

          {/* Feedback Messages */}
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
                  Alamat Email Karyawan
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
                    placeholder="nama@ciputra.com"
                    className="block w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kata Sandi
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
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 shadow-md shadow-indigo-600/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Masuk ke Portal Intranet</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  id="reg-input-name"
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Contoh: Sarah Oktaviana"
                  className="block w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Departemen
                </label>
                <select
                  id="reg-input-dept"
                  value={regDept}
                  onChange={(e) => setRegDept(e.target.value)}
                  className="block w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jabatan / Peran
                </label>
                <select
                  id="reg-input-role"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="block w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white font-medium"
                >
                  <option value="staff">Staff (Pelaksana Operasional)</option>
                  <option value="spv">Supervisor (SPV)</option>
                  <option value="manager">Manager Departemen</option>
                  <option value="hod">Head of Dept (HOD)</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Kantor
                </label>
                <input
                  id="reg-input-email"
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="nama@ciputra.com"
                  className="block w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Buat Kata Sandi
                </label>
                <input
                  id="reg-input-password"
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="block w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                id="btn-register-submit"
                className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Kirim Pendaftaran Akun</span>
              </button>
            </form>
          )}

        </div>

        {/* Security & Cloud Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Autentikasi Terverifikasi & Log Akses Terstruktur</span>
        </div>

      </div>
    </div>
  );
};
