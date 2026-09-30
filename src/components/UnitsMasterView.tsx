import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  FileText,
  Lock,
  X,
  Info,
  Clock,
  FileCheck2,
  Megaphone,
  ArrowDownAZ,
  ArrowUpZA,
  Globe,
} from 'lucide-react';
import { HotelUnitMaster, User, IntranetDocument } from '../types';
import {
  getHotelUnits,
  addHotelUnit,
  updateHotelUnit,
  deleteHotelUnit,
} from '../lib/storage';
import { Language } from '../lib/i18n';

interface UnitsMasterViewProps {
  currentUser: User;
  units?: HotelUnitMaster[];
  users?: User[];
  documents?: IntranetDocument[];
  currentLang?: Language;
  onRefresh: () => void;
}

export const UnitsMasterView: React.FC<UnitsMasterViewProps> = ({
  currentUser,
  units: propUnits,
  users = [],
  documents = [],
  currentLang = 'id',
  onRefresh,
}) => {
  const [units, setUnits] = useState<HotelUnitMaster[]>(
    () => propUnits || getHotelUnits()
  );
  const [unitToDelete, setUnitToDelete] = useState<HotelUnitMaster | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<HotelUnitMaster | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    announcementMaxDays: 7,
    announcementRuleNote: '',
    sopRuleNote: '',
  });

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const isAdmin = currentUser.role === 'admin';
  const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'hod';

  useEffect(() => {
    if (propUnits && propUnits.length > 0) {
      setUnits(propUnits);
    }
  }, [propUnits]);

  const reloadData = () => {
    const updated = getHotelUnits();
    setUnits(updated);
    onRefresh();
  };

  // Filtered & sorted units
  const filteredUnits = units
    .filter((u) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q) ||
        (u.description && u.description.toLowerCase().includes(q)) ||
        (u.announcementRuleNote && u.announcementRuleNote.toLowerCase().includes(q)) ||
        (u.sopRuleNote && u.sopRuleNote.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const comp = a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
      return sortAsc ? comp : -comp;
    });

  // Calculate usage stats per Hotel Unit
  const getUnitStats = (unitName: string) => {
    const staffCount = users.filter(
      (u) => (u.unit || 'Hotel Ciputra Jakarta') === unitName
    ).length;
    const sopCount = documents.filter(
      (d) =>
        d.category !== 'Pengumuman' &&
        (d.unit === unitName || !d.unit || d.unit === 'All Units')
    ).length;
    const announcementCount = documents.filter(
      (d) =>
        d.category === 'Pengumuman' &&
        (d.unit === unitName || !d.unit || d.unit === 'All Units')
    ).length;
    return { staffCount, sopCount, announcementCount };
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      announcementMaxDays: 7,
      announcementRuleNote: '',
      sopRuleNote: '',
    });
    setFeedback({ type: null, message: '' });
    setShowAddModal(true);
  };

  const handleOpenEdit = (unit: HotelUnitMaster) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      code: unit.code,
      description: unit.description || '',
      announcementMaxDays: unit.announcementMaxDays || unit.announcementPruneDays || 7,
      announcementRuleNote: unit.announcementRuleNote || '',
      sopRuleNote: unit.sopRuleNote || '',
    });
    setFeedback({ type: null, message: '' });
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({ type: null, message: '' });

    if (!formData.name.trim()) {
      setFeedback({ type: 'error', message: 'Nama Unit Hotel wajib diisi.' });
      return;
    }
    if (!formData.code.trim()) {
      setFeedback({
        type: 'error',
        message: 'Kode singkatan Unit Hotel wajib diisi (contoh: HCJ, HCG-U2, HCS).',
      });
      return;
    }

    const res = addHotelUnit(
      {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        announcementMaxDays: Number(formData.announcementMaxDays) || 7,
        announcementRuleNote: formData.announcementRuleNote,
        sopRuleNote: formData.sopRuleNote,
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
    }, 900);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    setFeedback({ type: null, message: '' });

    if (!formData.name.trim()) {
      setFeedback({ type: 'error', message: 'Nama Unit Hotel tidak boleh kosong.' });
      return;
    }
    if (!formData.code.trim()) {
      setFeedback({ type: 'error', message: 'Kode Unit Hotel tidak boleh kosong.' });
      return;
    }

    const res = updateHotelUnit(
      editingUnit.id,
      {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        announcementMaxDays: Number(formData.announcementMaxDays) || 7,
        announcementRuleNote: formData.announcementRuleNote,
        sopRuleNote: formData.sopRuleNote,
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
      setEditingUnit(null);
      setFeedback({ type: null, message: '' });
    }, 900);
  };

  const getUnitBadgeColor = (idx: number) => {
    const styles = [
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-teal-50 text-teal-700 border-teal-200',
      'bg-sky-50 text-sky-700 border-sky-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-purple-50 text-purple-700 border-purple-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
    ];
    return styles[idx % styles.length];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shadow-2xs shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {currentLang === 'en'
                      ? 'Hotel Group Units Management'
                      : 'Master Unit Hotel Group'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80">
                    Multi-Unit & Rule Isolasi
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  {currentLang === 'en'
                    ? 'Add, edit, or configure Hotel Group units along with unit-specific SOP & Announcement rules'
                    : 'Kelola daftar Unit Hotel Group, pemisahan staf per properti, serta aturan (rule) SOP & Pengumuman masing-masing unit'}
                </p>
              </div>
            </div>
          </div>

          {/* Add Unit Action Button */}
          {isPrivileged && (
            <button
              id="btn-add-hotel-unit"
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Unit Hotel Baru</span>
            </button>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50/50 to-emerald-50/40 border border-sky-200/80 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs text-slate-700">
            <p className="font-bold text-slate-900">
              Pemisahan Otomatis Staf, SOP & Rule Pengumuman Antar Unit Hotel
            </p>
            <p className="text-slate-600 mt-0.5 leading-relaxed">
              Setiap unit hotel yang Anda tambahkan atau ubah di halaman ini akan langsung tersedia pada{' '}
              <strong>Form Registrasi Karyawan</strong>, <strong>Manajemen Pengguna</strong>,{' '}
              <strong>Penerbitan Pengumuman</strong>, dan <strong>Arsip SOP & Formulir</strong>. Mengubah nama unit akan otomatis menyinkronkan data staf dan dokumen terkait di Cloud Firestore.
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Total Unit Hotel
              </p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{units.length}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Total Staf Terdaftar
              </p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{users.length}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Total SOP & Pengumuman
              </p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{documents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main List & Controls */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="search-hotel-units"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama unit hotel, kode unit, atau catatan rule..."
                className="w-full pl-10 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setSortAsc((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Urutkan Nama Unit"
            >
              {sortAsc ? (
                <ArrowDownAZ className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <ArrowUpZA className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>{sortAsc ? 'A-Z' : 'Z-A'}</span>
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Menampilkan <strong>{filteredUnits.length}</strong> dari {units.length} Unit Hotel
          </span>
        </div>

        {/* Units Table */}
        {filteredUnits.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">Unit Hotel tidak ditemukan</p>
            <p className="text-xs text-slate-500">
              Tidak ada unit hotel yang cocok dengan kata kunci &quot;{searchQuery}&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">No</th>
                    <th className="px-4 py-3.5 w-28">Kode Unit</th>
                    <th className="px-4 py-3.5 min-w-[200px]">Nama Unit Hotel & Deskripsi</th>
                    <th className="px-4 py-3.5 min-w-[240px]">Rule Pengumuman & SOP Unit</th>
                    <th className="px-4 py-3.5 text-center w-28">Staf Unit</th>
                    <th className="px-4 py-3.5 text-center w-32">SOP & Info</th>
                    <th className="px-4 py-3.5 text-right w-40">Aksi Pengaturan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnits.map((unit, idx) => {
                    const stats = getUnitStats(unit.name);
                    return (
                      <tr
                        key={unit.id}
                        className="hover:bg-slate-50/80 transition-colors align-top"
                      >
                        <td className="px-4 py-4 font-bold text-slate-400 text-center">
                          {idx + 1}
                        </td>

                        {/* Code Badge */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border tracking-wider ${getUnitBadgeColor(
                              idx
                            )}`}
                          >
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{unit.code}</span>
                          </span>
                        </td>

                        {/* Name & Description */}
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {unit.name}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {unit.description || '-'}
                          </p>
                        </td>

                        {/* Unit Rules (Announcement & SOP) */}
                        <td className="px-4 py-4 space-y-2">
                          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-950">
                            <div className="font-bold flex items-center gap-1.5 text-amber-800">
                              <Megaphone className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                Rule Pengumuman: Default {unit.announcementMaxDays || unit.announcementPruneDays || 7} Hari
                              </span>
                            </div>
                            <p className="text-amber-900/80 mt-0.5 leading-snug">
                              {unit.announcementRuleNote}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/70 text-[11px] text-indigo-950">
                            <div className="font-bold flex items-center gap-1.5 text-indigo-800">
                              <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Rule Standar SOP Unit:</span>
                            </div>
                            <p className="text-indigo-900/80 mt-0.5 leading-snug">
                              {unit.sopRuleNote}
                            </p>
                          </div>
                        </td>

                        {/* Staff Count */}
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/60 font-bold text-xs">
                            <Users className="w-3.5 h-3.5" />
                            <span>{stats.staffCount} Staf</span>
                          </span>
                        </td>

                        {/* Document / SOP Count */}
                        <td className="px-4 py-4 text-center space-y-1">
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 font-bold text-[11px]">
                              <FileText className="w-3 h-3" />
                              <span>{stats.sopCount} SOP/Form</span>
                            </span>
                          </div>
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 font-bold text-[11px]">
                              <Clock className="w-3 h-3" />
                              <span>{stats.announcementCount} Info</span>
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPrivileged && (
                              <button
                                id={`btn-edit-unit-${unit.code}`}
                                onClick={() => handleOpenEdit(unit)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all border border-indigo-200/60 shadow-2xs cursor-pointer"
                                title="Edit Nama, Kode, atau Rule Unit Hotel"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            )}

                            {isAdmin && units.length > 1 ? (
                              <button
                                id={`btn-delete-unit-${unit.code}`}
                                onClick={() => setUnitToDelete(unit)}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors inline-flex items-center border border-slate-200 hover:border-rose-200 cursor-pointer"
                                title="Hapus Unit Hotel"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-semibold border border-slate-200/60"
                                title="Unit utama aktif"
                              >
                                <Lock className="w-3 h-3 text-slate-400" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Tambah Unit Hotel Baru */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4 my-8 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tambah Unit Hotel Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tambahkan unit properti hotel beserta aturan SOP & pengumumannya
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
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

            <form onSubmit={handleSubmitAdd} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Unit Hotel <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-add-unit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Hotel Ciputra Semarang"
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Unit <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-add-unit-code"
                    maxLength={10}
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="HCS / HCJ"
                    required
                    className="w-full px-3.5 py-2 text-xs uppercase tracking-wider font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Operasional Unit Hotel
                </label>
                <textarea
                  rows={2}
                  id="input-add-unit-desc"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Deskripsi singkat unit properti hotel..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-amber-700" />
                    <span>Durasi Standar Tayang Pengumuman (Hari)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={formData.announcementMaxDays}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        announcementMaxDays: Number(e.target.value) || 7,
                      })
                    }
                    className="w-20 px-2.5 py-1 text-xs font-bold text-center rounded-lg bg-white border border-amber-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">
                    Catatan Rule Pengumuman Unit
                  </label>
                  <input
                    type="text"
                    value={formData.announcementRuleNote}
                    onChange={(e) =>
                      setFormData({ ...formData, announcementRuleNote: e.target.value })
                    }
                    placeholder="Otomatis diisi jika dikosongkan..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-amber-200 text-slate-800"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
                <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Catatan Rule Standar SOP & Formulir Unit</span>
                </label>
                <input
                  type="text"
                  value={formData.sopRuleNote}
                  onChange={(e) =>
                    setFormData({ ...formData, sopRuleNote: e.target.value })
                  }
                  placeholder="Contoh: Standar operasional khusus unit properti ini..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-indigo-200 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-add-unit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  Simpan Unit Hotel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Unit Hotel */}
      {editingUnit && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingUnit(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4 my-8 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Unit Hotel & Rule Operasional
                  </h3>
                  <p className="text-xs text-slate-500">
                    Perbarui identitas unit hotel, batas tayang pengumuman, dan aturan SOP
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUnit(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
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

            <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Sinkronisasi Relasional Otomatis:</strong> Mengubah nama Unit Hotel akan otomatis memperbarui unit pada seluruh akun staf, dokumen SOP, dan pengumuman yang terhubung ke unit ini.
              </p>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Unit Hotel <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-edit-unit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Unit <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-edit-unit-code"
                    maxLength={10}
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    required
                    className="w-full px-3.5 py-2 text-xs uppercase tracking-wider font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Operasional Unit Hotel
                </label>
                <textarea
                  rows={2}
                  id="input-edit-unit-desc"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-amber-700" />
                    <span>Durasi Standar Tayang Pengumuman (Hari)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={formData.announcementMaxDays}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        announcementMaxDays: Number(e.target.value) || 7,
                      })
                    }
                    className="w-20 px-2.5 py-1 text-xs font-bold text-center rounded-lg bg-white border border-amber-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">
                    Catatan Rule Pengumuman Unit
                  </label>
                  <input
                    type="text"
                    value={formData.announcementRuleNote}
                    onChange={(e) =>
                      setFormData({ ...formData, announcementRuleNote: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-amber-200 text-slate-800"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
                <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Catatan Rule Standar SOP & Formulir Unit</span>
                </label>
                <input
                  type="text"
                  value={formData.sopRuleNote}
                  onChange={(e) =>
                    setFormData({ ...formData, sopRuleNote: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-indigo-200 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-edit-unit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Unit Hotel */}
      {unitToDelete && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setUnitToDelete(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 cursor-default"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Hapus Unit Hotel?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {unitToDelete.name} ({unitToDelete.code})
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              Unit Hotel <strong>{unitToDelete.name}</strong> akan dihapus dari daftar unit portal dan Cloud Firestore.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUnitToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteHotelUnit(unitToDelete.id, currentUser);
                  setUnitToDelete(null);
                  reloadData();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm cursor-pointer"
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
