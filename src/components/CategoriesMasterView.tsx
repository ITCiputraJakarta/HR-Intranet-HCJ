import React, { useState } from 'react';
import {
  Tags,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  FolderTree,
  Filter
} from 'lucide-react';
import { CategoryMaster, User } from '../types';
import { addCategory, deleteCategory, getDepartments } from '../lib/storage';

interface CategoriesMasterViewProps {
  categories: CategoryMaster[];
  currentUser: User;
  onRefresh: () => void;
}

export const CategoriesMasterView: React.FC<CategoriesMasterViewProps> = ({
  categories = [],
  currentUser,
  onRefresh,
}) => {
  const departments = getDepartments();
  const [filterDept, setFilterDept] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryMaster | null>(null);

  // Form states
  const [newDept, setNewDept] = useState(
    currentUser.role === 'admin' ? 'Front Office' : currentUser.departemen
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const safeCategories = categories || [];

  const isPrivileged =
    currentUser.role === 'admin' ||
    currentUser.role === 'manager' ||
    currentUser.role === 'spv' ||
    currentUser.role === 'hod';

  // Filter list
  let filtered = [...safeCategories];
  if (filterDept !== 'All') {
    filtered = filtered.filter((c) => c.departemen === filterDept);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.nama_kategori.toLowerCase().includes(q) ||
        c.departemen.toLowerCase().includes(q)
    );
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newCategoryName.trim()) {
      setErrorMessage('Nama kategori wajib diisi.');
      return;
    }

    const exists = safeCategories.some(
      (c) =>
        c.departemen === newDept &&
        c.nama_kategori.toLowerCase() === newCategoryName.trim().toLowerCase()
    );

    if (exists) {
      setErrorMessage(`Kategori '${newCategoryName.trim()}' sudah terdaftar untuk departemen ${newDept}.`);
      return;
    }

    const newCat: CategoryMaster = {
      id: `cat-${Date.now()}`,
      departemen: newDept,
      nama_kategori: newCategoryName.trim(),
    };

    addCategory(newCat, currentUser);
    setSuccessMessage(`Kategori '${newCat.nama_kategori}' berhasil ditambahkan.`);
    setNewCategoryName('');
    setShowAddModal(false);
    onRefresh();
  };

  const handleDelete = (cat: CategoryMaster) => {
    setCategoryToDelete(cat);
  };

  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    deleteCategory(categoryToDelete.id, currentUser);
    setSuccessMessage(`Kategori '${categoryToDelete.nama_kategori}' berhasil dihapus.`);
    setCategoryToDelete(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
            <Tags className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Master Kategori & Sub-Klasifikasi Berkas
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700">
                {safeCategories.length} Kategori
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Standarisasi label pengelompokan dokumen SOP, formulir kerja, dan arsip pengumuman.
            </p>
          </div>
        </div>

        {isPrivileged && (
          <button
            id="btn-add-category-master"
            onClick={() => {
              setErrorMessage('');
              setSuccessMessage('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-pink-600/20 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori Baru</span>
          </button>
        )}
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-category"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kategori atau departemen..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            id="filter-category-dept"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="text-xs bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="All">Semua Departemen ({safeCategories.length})</option>
            <option value="All Departments">All Departments (Umum)</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d} ({safeCategories.filter((c) => c.departemen === d).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Categories Grid Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <FolderTree className="w-4 h-4 text-pink-600" />
            <span>Daftar Kategori Terdaftar ({filtered.length})</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Tidak ada kategori yang sesuai dengan filter pencarian.
            </div>
          ) : (
            filtered.map((cat) => (
              <div
                key={cat.id}
                className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                    <Tags className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {cat.nama_kategori}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {cat.departemen}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ID: {cat.id}
                      </span>
                    </div>
                  </div>
                </div>

                {isPrivileged && (
                  <button
                    id={`btn-del-cat-${cat.id}`}
                    onClick={() => handleDelete(cat)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title="Hapus Kategori"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tambah Kategori Baru
                </h3>
                <p className="text-xs text-slate-500">
                  Standarisasi sub-kategori untuk dokumen & berkas hotel.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Departemen Tujuan
                </label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="All Departments">All Departments (Lintas Departemen)</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Kategori / Sub-Klasifikasi
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Contoh: Standar Pelayanan Tamu VIP"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl transition-all shadow-sm"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Hapus Kategori?</h4>
                <p className="text-xs text-slate-500 mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Yakin ingin menghapus kategori <strong>"{categoryToDelete.nama_kategori}"</strong> ({categoryToDelete.departemen})?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
