import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  FileText,
  Lock,
  X,
  Layers,
  Info,
  ArrowDownAZ,
  ArrowUpZA,
} from 'lucide-react';
import { DepartmentMaster, User, IntranetDocument } from '../types';
import { getDepartmentMasters, addDepartment, updateDepartment } from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';
import { TablePagination } from './TablePagination';
import { SortableHeader } from './SortableHeader';
import { Language, t } from '../lib/i18n';

interface DepartmentsMasterViewProps {
  currentUser: User;
  users?: User[];
  documents?: IntranetDocument[];
  currentLang?: Language;
  onRefresh: () => void;
}

export const DepartmentsMasterView: React.FC<DepartmentsMasterViewProps> = ({
  currentUser,
  users = [],
  documents = [],
  currentLang = 'id',
  onRefresh,
}) => {
  const [departments, setDepartments] = useState<DepartmentMaster[]>(() => getDepartmentMasters());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentMaster | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const isAdmin = currentUser.role === 'admin';
  const isPrivileged =
    currentUser.role === 'admin' ||
    currentUser.role === 'manager' ||
    currentUser.role === 'spv' ||
    currentUser.role === 'hod';

  // Helper to refresh local list and parent
  const reloadData = () => {
    const updated = getDepartmentMasters();
    setDepartments(updated);
    onRefresh();
  };

  // Filtered departments
  const filteredDepartments = departments.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q))
    );
  });

  // Calculate usage stats per department
  const getDeptStats = (deptName: string) => {
    const userCount = users.filter((u) => u.departemen === deptName).length;
    const docCount = documents.filter(
      (doc) => doc.akses_dept === deptName || doc.akses_dept === 'All Departments'
    ).length;
    return { userCount, docCount };
  };

  // Sorting
  const sortedDepartments = [...filteredDepartments].sort((a, b) => {
    let comp = 0;
    if (sortField === 'name') {
      comp = a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
    } else if (sortField === 'code') {
      comp = a.code.localeCompare(b.code, 'id', { sensitivity: 'base' });
    } else if (sortField === 'description') {
      comp = (a.description || '').localeCompare(b.description || '', 'id', { sensitivity: 'base' });
    } else if (sortField === 'userCount') {
      const aStats = getDeptStats(a.name);
      const bStats = getDeptStats(b.name);
      comp = aStats.userCount - bStats.userCount;
    } else if (sortField === 'docCount') {
      const aStats = getDeptStats(a.name);
      const bStats = getDeptStats(b.name);
      comp = aStats.docCount - bStats.docCount;
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

  const paginatedDepartments = sortedDepartments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenAdd = () => {
    setFormData({ name: '', code: '', description: '' });
    setFeedback({ type: null, message: '' });
    setShowAddModal(true);
  };

  const handleOpenEdit = (dept: DepartmentMaster) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
    });
    setFeedback({ type: null, message: '' });
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({ type: null, message: '' });

    if (!formData.name.trim()) {
      setFeedback({ type: 'error', message: 'Nama departemen wajib diisi.' });
      return;
    }
    if (!formData.code.trim()) {
      setFeedback({ type: 'error', message: 'Kode singkatan departemen wajib diisi (contoh: IT, FO, HK).' });
      return;
    }

    const res = addDepartment(
      {
        name: formData.name,
        code: formData.code,
        description: formData.description,
      },
      currentUser
    );

    if (!res.success) {
      setFeedback({ type: 'error', message: res.message });
      return;
    }

    setFeedback({ type: 'success', message: res.message });
    reloadData();
    setTimeout(() => {
      setShowAddModal(false);
      setFeedback({ type: null, message: '' });
    }, 1200);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    setFeedback({ type: null, message: '' });

    if (!formData.name.trim()) {
      setFeedback({ type: 'error', message: 'Nama departemen tidak boleh kosong.' });
      return;
    }
    if (!formData.code.trim()) {
      setFeedback({ type: 'error', message: 'Kode singkatan tidak boleh kosong.' });
      return;
    }

    const res = updateDepartment(
      editingDept.id,
      {
        name: formData.name,
        code: formData.code,
        description: formData.description,
      },
      currentUser
    );

    if (!res.success) {
      setFeedback({ type: 'error', message: res.message });
      return;
    }

    setFeedback({ type: 'success', message: res.message });
    reloadData();
    setTimeout(() => {
      setEditingDept(null);
      setFeedback({ type: null, message: '' });
    }, 1200);
  };

  // Color helper for department codes
  const getCodeBadgeStyle = (code: string) => {
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-purple-50 text-purple-700 border-purple-200',
      'bg-rose-50 text-rose-700 border-rose-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200',
      'bg-teal-50 text-teal-700 border-teal-200',
    ];
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {t('headerDepartmentsTitle', currentLang)}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    Hotel Ciputra Jakarta
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  {t('headerDepartmentsSubtitle', currentLang)}
                </p>
              </div>
            </div>
          </div>

          {/* Add Action Button */}
          {isPrivileged && (
            <button
              id="btn-add-department"
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Departemen Baru</span>
            </button>
          )}
        </div>

        {/* Anti-Error & Anti-Deletion Safety Notice */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-indigo-50/40 border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs text-slate-700">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              Proteksi Integritas Data Aktif (Anti-Hapus Relasional)
            </p>
            <p className="text-slate-600 mt-0.5 leading-relaxed">
              Sesuai kebijakan keamanan sistem portal, tombol hapus departemen <strong>ditiadakan</strong> agar tidak memicu galat (<em>error</em>) pada relasi akun karyawan, dokumen arsip Cloud Firestore, formulir SOP, dan histori penilaian kinerja. Anda dapat <strong>menambah</strong> departemen baru atau <strong>mengubah nama & kodenya</strong> kapan saja dengan sinkronisasi otomatis.
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Total Departemen
              </p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {departments.length}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Karyawan Terpetakan
              </p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {users.length}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Dokumen & SOP Terkait
              </p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {documents.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main List & Controls */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="search-departments"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama departemen, kode, atau deskripsi..."
                className="w-full pl-10 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                if (sortField === 'name' && sortDirection === 'asc') {
                  setSortDirection('desc');
                } else {
                  setSortField('name');
                  setSortDirection('asc');
                }
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                sortField === 'name'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Urutkan A-Z"
            >
              {sortField === 'name' && sortDirection === 'desc' ? (
                <ArrowUpZA className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownAZ className="w-3.5 h-3.5" />
              )}
              <span>Sort A-Z</span>
            </button>

            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-dashed border-slate-300"
              >
                Reset
              </button>
            )}
          </div>

          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Menampilkan <strong>{filteredDepartments.length}</strong> dari {departments.length} departemen
          </span>
        </div>

        {/* Table / List */}
        {filteredDepartments.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">Departemen tidak ditemukan</p>
            <p className="text-xs text-slate-500">
              Tidak ada data yang cocok dengan kata kunci pencarian &quot;{searchQuery}&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3.5 w-14 text-center">{t('thNo', currentLang)}</th>
                    <SortableHeader
                      field="code"
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="px-4 py-3.5 w-24"
                    >
                      {t('thCode', currentLang)}
                    </SortableHeader>
                    <SortableHeader
                      field="name"
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="px-4 py-3.5"
                    >
                      {t('thDeptName', currentLang)}
                    </SortableHeader>
                    <SortableHeader
                      field="description"
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="px-4 py-3.5 hidden md:table-cell"
                    >
                      {t('thOperationalDesc', currentLang)}
                    </SortableHeader>
                    <SortableHeader
                      field="userCount"
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="px-4 py-3.5 text-center w-28"
                    >
                      {t('thEmployees', currentLang)}
                    </SortableHeader>
                    <SortableHeader
                      field="docCount"
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="px-4 py-3.5 text-center w-28"
                    >
                      {t('thDocuments', currentLang)}
                    </SortableHeader>
                    <th className="px-4 py-3.5 text-center w-40">{t('thProtectionStatusAction', currentLang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDepartments.map((dept, index) => {
                    const stats = getDeptStats(dept.name);
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <tr
                        key={dept.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        <td className="px-4 py-3.5 font-medium text-slate-400 text-center">
                          {rowNumber}
                        </td>

                        {/* Code Badge */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border tracking-wider ${getCodeBadgeStyle(
                              dept.code
                            )}`}
                          >
                            {dept.code}
                          </span>
                        </td>

                        {/* Name & Subtitle */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <DepartmentBadge department={dept.name} size="sm" />
                            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                              ({dept.code})
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block md:hidden mt-1">
                            {dept.description || 'Tidak ada catatan deskripsi.'}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3.5 hidden md:table-cell text-slate-600 text-[11px] leading-relaxed max-w-xs">
                          {dept.description || '-'}
                        </td>

                        {/* Users Count */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            <span>{stats.userCount}</span>
                          </span>
                        </td>

                        {/* Document Count */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>{stats.docCount}</span>
                          </span>
                        </td>

                        {/* Action & Protection status */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPrivileged && (
                              <button
                                id={`btn-edit-dept-${dept.code}`}
                                onClick={() => handleOpenEdit(dept)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all border border-indigo-200/60 shadow-2xs"
                                title="Edit nama atau kode departemen"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            )}

                            {/* Anti-delete visual badge */}
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-semibold border border-slate-200/60 cursor-help"
                              title="Departemen dilindungi dari penghapusan demi mencegah error relasional"
                            >
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>Terkunci</span>
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalItems={filteredDepartments.length}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={[5, 10, 20]}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(newCount) => {
                setItemsPerPage(newCount);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Modal: Tambah Departemen */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tambah Departemen Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftarkan divisi atau departemen baru ke portal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedback.message && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                  feedback.type === 'error'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {feedback.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span className="font-semibold">{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Departemen <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-add-dept-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Information Technology (IT)"
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kode Singkatan (2 - 5 Karakter) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-add-dept-code"
                  maxLength={6}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Contoh: IT, FO, HK, GRO"
                  required
                  className="w-full px-3.5 py-2 text-xs uppercase tracking-wider font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Digunakan untuk identifikasi singkatan dan label badge.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deskripsi / Lingkup Tugas
                </label>
                <textarea
                  rows={3}
                  id="input-add-dept-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ringkasan operasional dan fungsi departemen di hotel..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Live Preview */}
              {formData.name.trim() && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Preview Tampilan:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]">
                      {formData.code.trim() || 'KODE'}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {formData.name.trim()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  id="btn-cancel-add-dept"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-add-dept"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all"
                >
                  Simpan Departemen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Departemen */}
      {editingDept && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingDept(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Departemen
                  </h3>
                  <p className="text-xs text-slate-500">
                    Perbarui nama, kode, atau deskripsi operasional
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingDept(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedback.message && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                  feedback.type === 'error'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {feedback.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span className="font-semibold">{feedback.message}</span>
              </div>
            )}

            {/* Cascade Synchronization Note */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Sinkronisasi Otomatis:</strong> Mengubah nama departemen akan secara instan memperbarui semua berkas dokumen, akun karyawan, dan KPI terkait agar relasi data tidak rusak.
              </p>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Departemen <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-edit-dept-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kode Singkatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-edit-dept-code"
                  maxLength={6}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  className="w-full px-3.5 py-2 text-xs uppercase tracking-wider font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deskripsi Operasional
                </label>
                <textarea
                  rows={3}
                  id="input-edit-dept-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  id="btn-cancel-edit-dept"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-edit-dept"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all"
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
