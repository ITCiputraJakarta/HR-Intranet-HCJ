import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Rocket,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Search,
  X,
  ArrowDownAZ,
  ArrowUpZA,
} from 'lucide-react';
import { KPIMasterItem, User, UserRole } from '../types';
import {
  addKPIMasterItem,
  updateKPIMasterItem,
  deleteKPIMasterItem,
  deployKPI,
  getDepartments,
} from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';
import { TablePagination } from './TablePagination';
import { SortableHeader } from './SortableHeader';
import { Language, t } from '../lib/i18n';

interface KPIMasterViewProps {
  kpiMaster: KPIMasterItem[];
  currentUser: User;
  currentLang?: Language;
  onRefresh: () => void;
}

export const KPIMasterView: React.FC<KPIMasterViewProps> = ({
  kpiMaster = [],
  currentUser,
  currentLang = 'id',
  onRefresh,
}) => {
  const departments = getDepartments();
  const [filterDept, setFilterDept] = useState(
    currentUser.role === 'admin' ? 'Front Office' : currentUser.departemen
  );
  const [filterYear, setFilterYear] = useState('2026');
  const [filterType, setFilterType] = useState<'Mid-Year' | 'Year-End'>('Mid-Year');
  const [filterRole, setFilterRole] = useState<UserRole>('staff');

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pillar, setPillar] = useState('');
  const [objective, setObjective] = useState('');
  const [weight, setWeight] = useState<number>(30);
  const [target, setTarget] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeployConfirm, setShowDeployConfirm] = useState(false);
  const [kpiToDelete, setKpiToDelete] = useState<KPIMasterItem | null>(null);

  // Table search, sort and pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('pillar');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  const safeKpiMaster = kpiMaster || [];

  // Filtered indicators
  const scopedKPIs = safeKpiMaster.filter(
    (k) =>
      k.departemen === filterDept &&
      String(k.tahun) === filterYear &&
      k.tipe === filterType &&
      k.target_role === filterRole
  );

  let filteredKPIs = [...scopedKPIs];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredKPIs = filteredKPIs.filter(
      (k) =>
        k.pillar.toLowerCase().includes(q) ||
        k.objective.toLowerCase().includes(q) ||
        k.target.toLowerCase().includes(q)
    );
  }

  filteredKPIs.sort((a, b) => {
    let comp = 0;
    if (sortField === 'pillar') {
      comp = a.pillar.localeCompare(b.pillar, 'id', { sensitivity: 'base' });
    } else if (sortField === 'weight') {
      comp = Number(a.weight || 0) - Number(b.weight || 0);
    } else if (sortField === 'target') {
      comp = a.target.localeCompare(b.target, 'id', { sensitivity: 'base' });
    } else if (sortField === 'status') {
      comp = a.status.localeCompare(b.status, 'id', { sensitivity: 'base' });
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

  const paginatedKPIs = filteredKPIs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalWeight = scopedKPIs.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const hasDraft = scopedKPIs.some((k) => k.status === 'Draft');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!pillar.trim() || !objective.trim() || !target.trim()) {
      setErrorMessage('Harap lengkapi semua kolom indikator.');
      return;
    }

    if (weight <= 0 || weight > 100) {
      setErrorMessage('Bobot harus antara 1% hingga 100%.');
      return;
    }

    if (editingId) {
      const existing = scopedKPIs.find((k) => k.id === editingId);
      if (existing) {
        updateKPIMasterItem(
          {
            ...existing,
            pillar: pillar.trim(),
            objective: objective.trim(),
            weight: Number(weight),
            target: target.trim(),
          },
          currentUser
        );
      }
      setEditingId(null);
    } else {
      const newItem: KPIMasterItem = {
        id: `kpi-${Date.now()}`,
        departemen: filterDept,
        tahun: Number(filterYear),
        tipe: filterType,
        target_role: filterRole,
        pillar: pillar.trim(),
        objective: objective.trim(),
        weight: Number(weight),
        target: target.trim(),
        status: 'Draft',
      };
      addKPIMasterItem(newItem, currentUser);
    }

    setPillar('');
    setObjective('');
    setTarget('');
    setWeight(30);
    onRefresh();
  };

  const handleDeploy = () => {
    if (totalWeight !== 100) {
      setErrorMessage(`Total bobot indikator saat ini adalah ${totalWeight}%. Wajib tepat 100% untuk melakukan deploy!`);
      return;
    }
    setShowDeployConfirm(true);
  };

  const confirmDeploy = () => {
    deployKPI(filterDept, filterYear, filterType, filterRole, currentUser);
    setShowDeployConfirm(false);
    setSuccessMessage('Indikator KPI berhasil dideploy menjadi Active!');
    onRefresh();
  };

  const handleEdit = (item: KPIMasterItem) => {
    setEditingId(item.id);
    setPillar(item.pillar);
    setObjective(item.objective);
    setWeight(item.weight);
    setTarget(item.target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (item: KPIMasterItem) => {
    setKpiToDelete(item);
  };

  const confirmDeleteKPI = () => {
    if (!kpiToDelete) return;
    deleteKPIMasterItem(kpiToDelete.id, currentUser);
    setKpiToDelete(null);
    setSuccessMessage('Indikator KPI berhasil dihapus.');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-cyan-600/20">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t('headerKPIMasterTitle', currentLang)}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('headerKPIMasterSubtitle', currentLang)}
            </p>
          </div>
        </div>

        {totalWeight === 100 && hasDraft && (
          <button
            id="btn-deploy-kpi"
            onClick={handleDeploy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all active:scale-95 animate-pulse"
          >
            <Rocket className="w-4 h-4" />
            <span>Deploy Karyawan (Set Active)</span>
          </button>
        )}
      </div>

      {/* Scope Filter Box */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
            Departemen
          </label>
          <select
            value={filterDept}
            disabled={currentUser.role !== 'admin'}
            onChange={(e) => {
              setFilterDept(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold focus:ring-2 focus:ring-indigo-600"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
            Tahun Periode
          </label>
          <select
            value={filterYear}
            onChange={(e) => {
              setFilterYear(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold focus:ring-2 focus:ring-indigo-600"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
            Tipe Review
          </label>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as any);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold focus:ring-2 focus:ring-indigo-600"
          >
            <option value="Mid-Year">Mid-Year</option>
            <option value="Year-End">Year-End</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
            Target Jabatan
          </label>
          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value as UserRole);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 bg-indigo-50/50 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-600"
          >
            <option value="staff">Staff (Pelaksana)</option>
            <option value="spv">Supervisor</option>
            <option value="manager">Manager</option>
            <option value="hod">Head of Dept (HOD)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Indicator Creator Form */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">
              {editingId ? 'Edit Indikator KPI' : 'Buat Indikator KPI Baru'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setPillar('');
                  setObjective('');
                  setTarget('');
                  setWeight(30);
                }}
                className="text-xs text-rose-600 font-bold hover:underline"
              >
                Batal
              </button>
            )}
          </div>

          {/* Weight Progress Bar Meter */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">Total Bobot Terkumpul:</span>
              <span
                className={
                  totalWeight === 100
                    ? 'text-emerald-600'
                    : totalWeight > 100
                    ? 'text-rose-600'
                    : 'text-indigo-600'
                }
              >
                {totalWeight}% / 100%
              </span>
            </div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  totalWeight === 100
                    ? 'bg-emerald-500'
                    : totalWeight > 100
                    ? 'bg-rose-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(totalWeight, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {totalWeight === 100
                ? '✅ Komposisi tepat 100%! Siap untuk dideploy.'
                : `Sisa ${100 - totalWeight}% untuk mencapai kuota 100% per role.`}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilar Kinerja *
              </label>
              <input
                type="text"
                required
                value={pillar}
                onChange={(e) => setPillar(e.target.value)}
                placeholder="Contoh: Guest Satisfaction, Operational Speed"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Objektif / Sasaran *
              </label>
              <textarea
                rows={2}
                required
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Tujuan yang terukur secara operasional..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bobot (%) *
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  required
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Angka *
                </label>
                <input
                  type="text"
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Contoh: >= 92%"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              {editingId ? 'Simpan Perubahan' : 'Tambah Indikator (Draft)'}
            </button>
          </form>
        </div>

        {/* Right: Table of Indicators */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm">
                  Daftar Indikator:
                </h3>
                <DepartmentBadge department={filterDept} size="sm" />
                <span className="text-xs font-bold text-slate-600">
                  • {filterRole.toUpperCase()} ({filterYear} {filterType})
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {scopedKPIs.length} Pilar Indikator
              </span>
            </div>

            {/* Indicator Search and Filter Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari pilar, objektif, target..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-500">
                Menampilkan <strong>{filteredKPIs.length}</strong> data
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <SortableHeader
                      field="pillar"
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="py-3 px-5"
                    >
                      {t('thPillarObjective', currentLang)}
                    </SortableHeader>
                    <SortableHeader
                      field="weight"
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="py-3 px-4 text-center"
                    >
                      {t('thWeight', currentLang)}
                    </SortableHeader>
                    <SortableHeader
                      field="target"
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="py-3 px-4"
                    >
                      {t('thStandardTarget', currentLang)}
                    </SortableHeader>
                    <SortableHeader
                      field="status"
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="py-3 px-4 text-center"
                    >
                      {t('thStatus', currentLang)}
                    </SortableHeader>
                    <th className="py-3 px-5 text-right">{t('thAction', currentLang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKPIs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        {searchQuery
                          ? 'Tidak ada indikator KPI yang sesuai dengan pencarian.'
                          : 'Belum ada indikator KPI yang dibuat untuk kombinasi filter ini.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedKPIs.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-5">
                          <strong className="text-slate-900 block">{item.pillar}</strong>
                          <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm">
                            {item.objective}
                          </p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-black text-indigo-700 text-sm">
                            {item.weight}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-700 font-medium max-w-xs">
                          {item.target}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              item.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalItems={filteredKPIs.length}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={[5, 10, 20]}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(newCount) => {
              setItemsPerPage(newCount);
              setCurrentPage(1);
            }}
          />
        </div>

      </div>

      {/* Deploy Confirmation Modal */}
      {showDeployConfirm && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeployConfirm(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 cursor-default"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Deploy Indikator KPI?</h4>
                <p className="text-xs text-slate-500 mt-0.5">Akan mengaktifkan standar KPI untuk penilaian.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              Deploy seluruh indikator KPI <strong>{filterDept}</strong> ({filterYear} {filterType} - {filterRole.toUpperCase()}) ke status <strong>Active</strong> agar dapat diisi dan dinilai oleh karyawan bersangkutan?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeployConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeploy}
                className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors shadow-sm"
              >
                Ya, Deploy Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {kpiToDelete && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setKpiToDelete(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 cursor-default"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Hapus Indikator KPI?</h4>
                <p className="text-xs text-slate-500 mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Yakin ingin menghapus sasaran: <strong>"{kpiToDelete.objective}"</strong> (Bobot: {kpiToDelete.weight}%)?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setKpiToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteKPI}
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
