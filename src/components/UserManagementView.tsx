import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  Clock,
  Building2,
  Shield,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { User, UserRole, UserStatus } from '../types';
import {
  updateUserStatus,
  updateUserRole,
  saveUsers,
  getUsers,
  deleteUser,
  addAccessLog,
  getDepartments,
} from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';

interface UserManagementViewProps {
  users: User[];
  currentUser: User;
  onRefresh: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users = [],
  currentUser,
  onRefresh,
}) => {
  const departments = getDepartments();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: string]: boolean }>({});
  const [showAddModal, setShowAddModal] = useState(false);

  // Delete modal states
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);
  const [selfDeleteNotice, setSelfDeleteNotice] = useState(false);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDept, setNewDept] = useState('Front Office');
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [newPassword, setNewPassword] = useState('password123');
  const [newStatus, setNewStatus] = useState<UserStatus>('Approved');
  const [formError, setFormError] = useState('');

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleStatusChange = (user: User, newStatus: UserStatus) => {
    updateUserStatus(user.id, newStatus, currentUser);
    onRefresh();
  };

  const handleRoleChange = (user: User, newRole: UserRole) => {
    updateUserRole(user.id, newRole, currentUser);
    onRefresh();
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    setDeleteErrorMsg(null);

    try {
      const result = deleteUser(userToDelete.id, currentUser);
      if (result.success) {
        setDeleteSuccessMsg(`Akun "${userToDelete.nama}" (${userToDelete.email}) berhasil dihapus permanen.`);
        setUserToDelete(null);
        onRefresh();
        setTimeout(() => setDeleteSuccessMsg(null), 5000);
      } else {
        setDeleteErrorMsg(result.message || 'Gagal menghapus pengguna.');
      }
    } catch (err: any) {
      setDeleteErrorMsg(err.message || 'Terjadi kesalahan sistem saat menghapus.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError('Lengkapi semua kolom.');
      return;
    }

    const all = getUsers();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (all.some((u) => u.email.toLowerCase() === cleanEmail)) {
      setFormError('Email ini telah terdaftar.');
      return;
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      nama: newName.trim(),
      email: cleanEmail,
      departemen: newDept,
      role: newRole,
      status: newStatus,
      password: newPassword,
      createdAt: new Date().toISOString(),
    };

    saveUsers([...all, newUser]);

    addAccessLog({
      user: currentUser,
      actionCategory: 'USER_MGMT',
      action: 'Tambah Akun Pengguna Baru',
      target: `${newUser.nama} (${newUser.email})`,
      status: 'SUCCESS',
      details: `Dibuat oleh Super Admin. Role: ${newUser.role}, Dept: ${newUser.departemen}, Status: ${newUser.status}`,
    });

    setShowAddModal(false);
    setNewName('');
    setNewEmail('');
    setNewPassword('password123');
    setFormError('');
    onRefresh();
  };

  const safeUsers = users || [];

  // Filter list
  let filtered = [...safeUsers];
  if (filterDept !== 'All') {
    filtered = filtered.filter((u) => u.departemen === filterDept);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (u) => u.nama.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  const pendingCount = safeUsers.filter((u) => u.status === 'Pending').length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Manajemen Pengguna</h1>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-extrabold border border-rose-200">
                  {pendingCount} Menunggu Persetujuan
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola status persetujuan, tingkat peran (role), dan kredensial karyawan hotel
            </p>
          </div>
        </div>

        <button
          id="btn-open-add-user"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akun Baru</span>
        </button>
      </div>

      {/* Notifications */}
      {deleteSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{deleteSuccessMsg}</span>
          </div>
          <button
            onClick={() => setDeleteSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {deleteErrorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{deleteErrorMsg}</span>
          </div>
          <button
            onClick={() => setDeleteErrorMsg(null)}
            className="text-rose-600 hover:text-rose-800 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-users"
            type="text"
            placeholder="Cari nama atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
            Departemen:
          </span>
          <select
            id="filter-user-dept"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="All">Semua Departemen ({safeUsers.length})</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d} ({safeUsers.filter((u) => u.departemen === d).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Info Karyawan</th>
                <th className="py-3.5 px-4">Departemen</th>
                <th className="py-3.5 px-4">Peran Akses (Role)</th>
                <th className="py-3.5 px-4 text-center">Status Persetujuan</th>
                <th className="py-3.5 px-4">Kata Sandi</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada data pengguna yang sesuai.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const isPwRevealed = revealedPasswords[user.id];
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {user.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{user.nama}</p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <DepartmentBadge department={user.departemen} size="sm" />
                      </td>

                      <td className="py-4 px-4">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user, e.target.value as UserRole)
                          }
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                          <option value="staff">Staff</option>
                          <option value="spv">Supervisor (SPV)</option>
                          <option value="manager">Manager</option>
                          <option value="hod">Head of Dept (HOD)</option>
                          <option value="admin">Super Admin</option>
                        </select>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <select
                          value={user.status}
                          onChange={(e) =>
                            handleStatusChange(user, e.target.value as UserStatus)
                          }
                          className={`px-3 py-1 text-xs rounded-full font-bold border-0 cursor-pointer shadow-xs ${
                            user.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800 ring-2 ring-amber-400/40'
                          }`}
                        >
                          <option value="Approved">Approved</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-700 font-semibold">
                            {isPwRevealed ? user.password || '••••' : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            title={isPwRevealed ? 'Sembunyikan' : 'Lihat Kata Sandi'}
                          >
                            {isPwRevealed ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <button
                          type="button"
                          id={`btn-delete-user-${user.id}`}
                          onClick={() => {
                            if (user.id === currentUser.id) {
                              setSelfDeleteNotice(true);
                              return;
                            }
                            setUserToDelete(user);
                          }}
                          disabled={user.id === currentUser.id}
                          className={`p-2 rounded-xl transition-all ${
                            user.id === currentUser.id
                              ? 'text-slate-300 cursor-not-allowed opacity-50'
                              : 'text-rose-500 hover:bg-rose-50 hover:text-rose-700 active:scale-95'
                          }`}
                          title={user.id === currentUser.id ? 'Tidak dapat menghapus akun Anda sendiri' : `Hapus ${user.nama}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Konfirmasi Hapus Pengguna</h3>
                <p className="text-[11px] text-slate-500">Tindakan ini permanen dan tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2">
              <p className="text-xs text-rose-900">
                Anda akan menghapus akun karyawan berikut dari sistem:
              </p>
              <div className="p-2.5 bg-white rounded-xl border border-rose-100 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama:</span>
                  <span className="font-bold text-slate-900">{userToDelete.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono text-slate-700 font-semibold">{userToDelete.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Departemen:</span>
                  <span className="font-semibold text-slate-800">{userToDelete.departemen}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Peran:</span>
                  <span className="font-bold text-indigo-700 uppercase text-[10px]">{userToDelete.role}</span>
                </div>
              </div>
              <p className="text-[11px] text-rose-700 font-medium">
                Data akun akan dihapus dari penyimpanan intranet dan disinkronkan ke Google Spreadsheet.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-delete-user"
                disabled={isDeletingUser}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 transition-all flex items-center gap-1.5"
              >
                {isDeletingUser ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Permanen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Self-Delete Warning Notice Modal */}
      {selfDeleteNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm">Tidak Dapat Menghapus Akun Sendiri</h3>
              <p className="text-xs text-slate-600">
                Akun ini sedang aktif dalam sesi login Super Admin Anda. Untuk keamanan sistem, akun pengguna yang sedang login tidak dapat dihapus.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelfDeleteNotice(false)}
              className="w-full py-2.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Tambah Karyawan Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Jessica Natalie"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Karyawan *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jessica@ciputra.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Departemen
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
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
                    Peran (Role)
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-medium"
                  >
                    <option value="staff">Staff</option>
                    <option value="spv">Supervisor</option>
                    <option value="manager">Manager</option>
                    <option value="hod">Head of Dept</option>
                    <option value="admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kata Sandi
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as UserStatus)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-bold text-emerald-700"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
