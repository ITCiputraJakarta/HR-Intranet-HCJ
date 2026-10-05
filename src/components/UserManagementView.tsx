import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock,
  Building2,
  Shield,
  KeyRound,
  AlertCircle,
  Filter,
  SlidersHorizontal,
  ArrowDownAZ,
  ArrowUpZA,
  X,
} from 'lucide-react';
import { User, UserRole, UserStatus } from '../types';
import {
  updateUserStatus,
  updateUserRole,
  createUserByAdmin,
  updateUserByAdmin,
  getUsers,
  deleteUser,
  getDepartments,
  getHotelUnits,
} from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';
import { TablePagination } from './TablePagination';
import { SortableHeader } from './SortableHeader';
import { Language, t } from '../lib/i18n';
import { hashPassword, sanitizeInput } from '../lib/security';
import { getBackdropProps } from '../lib/modalHelper';

interface UserManagementViewProps {
  users: User[];
  currentUser: User;
  currentLang?: Language;
  onRefresh: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users = [],
  currentUser,
  currentLang = 'id',
  onRefresh,
}) => {
  const departments = getDepartments();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortField, setSortField] = useState<string>('nama');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: string]: boolean }>({});
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit modal states
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUnit] = useState('Hotel Ciputra Jakarta');
  const [editDept, setEditDept] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('staff');
  const [editStatus, setEditStatus] = useState<UserStatus>('Approved');
  const [editPassword, setEditPassword] = useState('');
  const [editFormError, setEditFormError] = useState('');
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // Delete modal states
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);
  const [selfDeleteNotice, setSelfDeleteNotice] = useState(false);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUnit] = useState('Hotel Ciputra Jakarta');
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

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
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

    const hashedPassword = await hashPassword(newPassword.trim());

    const newUser: User = {
      id: `usr-${Date.now()}`,
      nama: sanitizeInput(newName.trim()),
      email: cleanEmail,
      unit: newUnit,
      departemen: newDept,
      role: newRole,
      status: newStatus,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    createUserByAdmin(newUser, currentUser);

    setShowAddModal(false);
    setNewName('');
    setNewEmail('');
    setNewPassword('password123');
    setFormError('');
    onRefresh();
  };

  const handleOpenEditModal = (user: User) => {
    setUserToEdit(user);
    setEditName(user.nama);
    setEditEmail(user.email);
    setEditDept(user.departemen);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditPassword('');
    setEditFormError('');
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    if (!editName.trim() || !editEmail.trim()) {
      setEditFormError('Nama lengkap dan email tidak boleh kosong.');
      return;
    }

    const hashedPassword = editPassword.trim() ? await hashPassword(editPassword.trim()) : undefined;

    const res = updateUserByAdmin(
      userToEdit.id,
      {
        nama: sanitizeInput(editName.trim()),
        email: editEmail.trim().toLowerCase(),
        unit: editUnit,
        departemen: editDept,
        role: editRole,
        status: editStatus,
        password: hashedPassword,
      },
      currentUser
    );

    if (res.success) {
      setEditSuccessMsg(res.message);
      setUserToEdit(null);
      onRefresh();
      setTimeout(() => setEditSuccessMsg(null), 5000);
    } else {
      setEditFormError(res.message);
    }
  };

  const safeUsers = users || [];

  // Filter list
  let filtered = [...safeUsers];
  if (filterDept !== 'All') {
    filtered = filtered.filter((u) => u.departemen === filterDept);
  }
  if (filterRole !== 'All') {
    filtered = filtered.filter((u) => u.role === filterRole);
  }
  if (filterStatus !== 'All') {
    filtered = filtered.filter((u) => u.status === filterStatus);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (u) => u.nama.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    let comp = 0;
    if (sortField === 'nama') {
      comp = a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
    } else if (sortField === 'departemen') {
      comp = a.departemen.localeCompare(b.departemen, 'id', { sensitivity: 'base' });
    } else if (sortField === 'role') {
      comp = a.role.localeCompare(b.role, 'id', { sensitivity: 'base' });
    } else if (sortField === 'status') {
      comp = a.status.localeCompare(b.status, 'id', { sensitivity: 'base' });
    } else if (sortField === 'createdAt') {
      comp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }
    return sortDirection === 'asc' ? comp : -comp;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const toggleSortAZ = () => {
    if (sortField === 'nama' && sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortField('nama');
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const paginatedUsers = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
      {editSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{editSuccessMsg}</span>
          </div>
          <button
            onClick={() => setEditSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

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

      {/* Pending Account Registration Banner */}
      {pendingCount > 0 && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-sm">
                {pendingCount} Pendaftaran Akun Baru Menunggu Persetujuan
              </h3>
              <p className="text-xs text-amber-800">
                Pengguna baru yang mendaftar secara mandiri memerlukan persetujuan Super Admin sebelum dapat masuk ke sistem.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setFilterStatus('Pending');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                filterStatus === 'Pending'
                  ? 'bg-amber-600 text-white shadow-amber-600/30'
                  : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              {filterStatus === 'Pending' ? 'Sedang Memfilter Pending' : 'Tampilkan Akun Pending'}
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-users"
              type="text"
              placeholder="Cari nama atau email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            {/* Quick 1-Click A-Z / Z-A Toggle Button */}
            <button
              id="btn-toggle-sort-users-az"
              onClick={toggleSortAZ}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                sortField === 'nama'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Urutkan Nama A-Z atau Z-A"
            >
              {sortField === 'nama' && sortDirection === 'desc' ? (
                <>
                  <ArrowUpZA className="w-4 h-4 text-indigo-600" />
                  <span>Z → A</span>
                </>
              ) : (
                <>
                  <ArrowDownAZ className="w-4 h-4 text-indigo-600" />
                  <span>A → Z</span>
                </>
              )}
            </button>



            {/* Department Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
              <select
                id="filter-user-dept"
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none py-1 pr-1 cursor-pointer max-w-[150px] truncate"
              >
                <option value="All">Semua Dept ({safeUsers.length})</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d} ({safeUsers.filter((u) => u.departemen === d).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <Shield className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
              <select
                id="filter-user-role"
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none py-1 pr-1 cursor-pointer"
              >
                <option value="All">Semua Role</option>
                <option value="staff">Staff</option>
                <option value="spv">Supervisor</option>
                <option value="manager">Manager</option>
                <option value="hod">HOD</option>
                <option value="admin">Super Admin</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
              <select
                id="filter-user-status"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none py-1 pr-1 cursor-pointer"
              >
                <option value="All">Semua Status</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results summary and reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Menampilkan <strong>{filtered.length}</strong> dari <strong>{safeUsers.length}</strong> pengguna
          </div>

          {(searchQuery || filterDept !== 'All' || filterRole !== 'All' || filterStatus !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterDept('All');
                setFilterRole('All');
                setFilterStatus('All');
                setCurrentPage(1);
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold text-xs inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <SortableHeader
                  field="nama"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="py-3.5 px-5"
                >
                  {t('thEmployeeInfo', currentLang)}
                </SortableHeader>
                <SortableHeader
                  field="departemen"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="py-3.5 px-4"
                >
                  {t('thDepartment', currentLang)}
                </SortableHeader>
                <SortableHeader
                  field="role"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="py-3.5 px-4"
                >
                  {t('thRole', currentLang)}
                </SortableHeader>
                <SortableHeader
                  field="status"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="py-3.5 px-4 text-center"
                >
                  {t('thApprovalStatus', currentLang)}
                </SortableHeader>
                <th className="py-3.5 px-4">{t('thPassword', currentLang)}</th>
                <th className="py-3.5 px-5 text-right">{t('thAction', currentLang)}</th>
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
                paginatedUsers.map((user) => {
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
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              (user.unit || 'Hotel Ciputra Jakarta').includes('Unit 2')
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : 'bg-sky-50 text-sky-800 border-sky-200'
                            }`}
                          >
                            <Building2 className="w-2.5 h-2.5" />
                            <span>{user.unit || 'Hotel Ciputra Jakarta'}</span>
                          </span>
                          <div>
                            <DepartmentBadge department={user.departemen} size="sm" />
                          </div>
                        </div>
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
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            id={`btn-edit-user-${user.id}`}
                            onClick={() => handleOpenEditModal(user)}
                            className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition-all active:scale-95"
                            title={`Edit Data ${user.nama}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

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
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={[5, 10, 20, 50]}
          onPageChange={(page) => setCurrentPage(page)}
          onItemsPerPageChange={(newCount) => {
            setItemsPerPage(newCount);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div
          {...getBackdropProps(() => { if (!isDeletingUser) setUserToDelete(null); })}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-200 space-y-4 cursor-default"
          >
            <div className="flex items-center gap-3 pb-3 border-slate-100 border-b">
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
                Data akun akan dihapus secara permanen dari basis data arsip digital intranet.
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
        <div
          {...getBackdropProps(() => setSelfDeleteNotice(false))}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 space-y-4 text-center cursor-default"
          >
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
        <div
          {...getBackdropProps(() => setShowAddModal(false))}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-200 space-y-4 cursor-default"
          >
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

      {/* Edit User Modal */}
      {userToEdit && (
        <div
          {...getBackdropProps(() => setUserToEdit(null))}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-200 space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Edit Data Pengguna</h3>
                  <p className="text-[11px] text-slate-500">Perbarui informasi akun, hak akses peran, dan departemen</p>
                </div>
              </div>
              <button
                onClick={() => setUserToEdit(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {editFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleEditUserSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Contoh: Jessica Natalie"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alamat Email *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="user@ciputra.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Departemen
                  </label>
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
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
                    Peran Akses (Role)
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
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
                    Status Akun
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-bold ${
                      editStatus === 'Approved' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reset Sandi (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Kosongkan jika tak ubah"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToEdit(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-edit-user"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
