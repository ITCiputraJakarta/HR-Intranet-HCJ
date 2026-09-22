import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Upload,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Building2,
  HardDrive,
  Eye,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowDownAZ,
  ArrowUpZA,
  SlidersHorizontal,
  X,
  LayoutGrid,
  List,
} from 'lucide-react';
import { IntranetDocument, User, CategoryMaster } from '../types';
import { addDocument, getDepartments } from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';
import { TablePagination } from './TablePagination';
import { SortableHeader } from './SortableHeader';

type AnnouncementSortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'dept-asc';

interface AnnouncementsViewProps {
  documents: IntranetDocument[];
  currentUser: User;
  categories: CategoryMaster[];
  onOpenPreview: (doc: IntranetDocument) => void;
  onRefresh: () => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  documents = [],
  currentUser,
  categories = [],
  onOpenPreview,
  onRefresh,
}) => {
  const departments = getDepartments();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [sortOrder, setSortOrder] = useState<AnnouncementSortOption>('newest');
  const [sortField, setSortField] = useState<string>('uploadedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(6);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Upload Form States
  const [upTitle, setUpTitle] = useState('');
  const [upDept, setUpDept] = useState('All Departments');
  const [upSubcat, setUpSubcat] = useState('');
  const [upKet, setUpKet] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
  const isStaffOrSpv = currentUser.role === 'staff' || currentUser.role === 'spv';

  // 1. Department Filtering Logic (Staff / SPV requirement)
  // "Pas user buka dashboard, sistem cuma bakal narik dan nampilin daftar file yang variabel departemennya cocok dengan departemen si user"
  let filteredAnnouncements = (documents || []).filter((d) => d.category === 'Pengumuman');

  if (isStaffOrSpv) {
    filteredAnnouncements = filteredAnnouncements.filter(
      (d) => d.akses_dept === 'All Departments' || d.akses_dept === currentUser.departemen
    );
  } else if (filterDept !== 'All') {
    filteredAnnouncements = filteredAnnouncements.filter(
      (d) => d.akses_dept === filterDept || d.akses_dept === 'All Departments'
    );
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredAnnouncements = filteredAnnouncements.filter(
      (d) => d.title.toLowerCase().includes(q) || (d.keterangan && d.keterangan.toLowerCase().includes(q))
    );
  }

  filteredAnnouncements.sort((a, b) => {
    let comp = 0;
    if (sortField === 'title') {
      comp = a.title.localeCompare(b.title, 'id', { sensitivity: 'base' });
    } else if (sortField === 'akses_dept') {
      comp = a.akses_dept.localeCompare(b.akses_dept, 'id', { sensitivity: 'base' });
    } else if (sortField === 'uploadedBy') {
      comp = a.uploadedBy.localeCompare(b.uploadedBy, 'id', { sensitivity: 'base' });
    } else if (sortField === 'uploadedAt') {
      comp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
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
    if (sortField === 'title' && sortDirection === 'asc') {
      setSortDirection('desc');
      setSortOrder('title-desc');
    } else {
      setSortField('title');
      setSortDirection('asc');
      setSortOrder('title-asc');
    }
    setCurrentPage(1);
  };

  const paginatedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Upload handler with Google Drive simulation & Anyone with Link setting
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upTitle.trim()) {
      setUploadError('Judul pengumuman wajib diisi.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    // If file is selected, create object URL or image preview
    let fileUrl = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop';
    let thumbUrl = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&auto=format&fit=crop';
    let fileName = 'Pengumuman-' + Date.now() + '.pdf';
    let fileType = 'application/pdf';
    let fileSize = '1.2 MB';

    if (fileInput) {
      fileName = fileInput.name;
      fileType = fileInput.type || 'application/octet-stream';
      fileSize = (fileInput.size / (1024 * 1024)).toFixed(2) + ' MB';
      fileUrl = URL.createObjectURL(fileInput);
      thumbUrl = fileUrl;
    }

    const newDoc: IntranetDocument = {
      id: `doc-${Date.now()}`,
      title: upTitle.trim(),
      category: 'Pengumuman',
      sub_kategori: upSubcat || 'Umum',
      akses_dept: upDept,
      keterangan: upKet.trim(),
      fileUrl,
      previewUrl: fileUrl,
      downloadUrl: fileUrl,
      thumbUrl,
      fileName,
      fileType,
      fileSize,
      uploadedBy: currentUser.nama,
      uploadedByEmail: currentUser.email,
      uploadedAt: new Date().toISOString(),
      driveFileId: `1Drive-Ciputra-${Date.now().toString(36)}`,
    };

    setTimeout(() => {
      addDocument(newDoc, currentUser);
      setIsUploading(false);
      setShowUploadForm(false);
      setUpTitle('');
      setUpKet('');
      setFileInput(null);
      onRefresh();
    }, 400);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Department Filter Indicator */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
            <Megaphone className="w-3.5 h-3.5" />
            <span>Pusat Informasi & Pengumuman Internal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Papan Pengumuman Digital
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            {isStaffOrSpv
              ? `Menampilkan pengumuman resmi terdistribusi untuk departemen ${currentUser.departemen} & seluruh karyawan.`
              : `Sebagai ${currentUser.role.toUpperCase()}, Anda dapat mengunggah dan mendistribusikan pengumuman ke Google Drive.`}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-2">
            <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs text-xs font-semibold flex items-center gap-2 border border-white/10">
              <Building2 className="w-3.5 h-3.5 text-indigo-300" />
              <span>Departemen: <strong>{currentUser.departemen}</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs text-xs font-semibold flex items-center gap-2 border border-white/10">
              <Clock className="w-3.5 h-3.5 text-emerald-300" />
              <span>Total Dilihat: <strong>{filteredAnnouncements.length} Berkas</strong></span>
            </div>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
          <HardDrive className="w-96 h-96 text-white" />
        </div>
      </div>

      {/* Action Bar (Search, Filter, Sort, Upload Button) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-announcements"
              type="text"
              placeholder="Cari pengumuman..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-slate-50 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters, Sort & Upload Controls */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
            
            {/* Quick 1-Click A-Z / Z-A Toggle Button */}
            <button
              id="btn-toggle-sort-announcement-az"
              onClick={toggleSortAZ}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                sortField === 'title'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Urutkan A-Z atau Z-A"
            >
              {sortField === 'title' && sortDirection === 'desc' ? (
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

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
              <select
                id="sort-announcement"
                value={sortOrder}
                onChange={(e) => {
                  const val = e.target.value as AnnouncementSortOption;
                  setSortOrder(val);
                  if (val === 'title-asc') { setSortField('title'); setSortDirection('asc'); }
                  else if (val === 'title-desc') { setSortField('title'); setSortDirection('desc'); }
                  else if (val === 'newest') { setSortField('uploadedAt'); setSortDirection('desc'); }
                  else if (val === 'oldest') { setSortField('uploadedAt'); setSortDirection('asc'); }
                  else if (val === 'dept-asc') { setSortField('akses_dept'); setSortDirection('asc'); }
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none py-1 pr-1 cursor-pointer"
              >
                <option value="newest">Terbaru (Tanggal)</option>
                <option value="oldest">Terlama (Tanggal)</option>
                <option value="title-asc">Judul: A → Z</option>
                <option value="title-desc">Judul: Z → A</option>
                <option value="dept-asc">Departemen (A → Z)</option>
              </select>
            </div>

            {/* Department Filter (Admin / Manager) */}
            {!isStaffOrSpv && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
                <select
                  id="filter-dept-announcement"
                  value={filterDept}
                  onChange={(e) => {
                    setFilterDept(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none py-1 pr-1 cursor-pointer max-w-[150px] sm:max-w-[180px] truncate"
                >
                  <option value="All">Semua Departemen</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-slate-500">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-indigo-600 shadow-xs font-bold'
                    : 'hover:text-slate-800'
                }`}
                title="Tampilan Kartu"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-xs font-bold'
                    : 'hover:text-slate-800'
                }`}
                title="Tampilan Tabel"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Upload Button (Manager / Super Admin only) */}
            {isManagerOrAdmin && (
              <button
                id="btn-open-upload-announcement"
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-600/20 active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Unggah Pengumuman</span>
              </button>
            )}
          </div>
        </div>

        {/* Results summary & Active Filter indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan <strong>{filteredAnnouncements.length}</strong> pengumuman
            </span>
            {filterDept !== 'All' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">• Filter:</span>
                <DepartmentBadge department={filterDept} size="xs" />
              </div>
            )}
          </div>

          {(searchQuery || filterDept !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterDept('All');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold text-xs inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Form (Drawer/Card for Manager/Admin) */}
      {showUploadForm && isManagerOrAdmin && (
        <div className="bg-white p-6 rounded-3xl border-2 border-indigo-200 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Unggah Berkas Pengumuman ke Google Drive
                </h3>
                <p className="text-xs text-slate-500">
                  File otomatis disimpan dengan izin publik (Anyone with link) melalui DriveApp
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUploadForm(false)}
              className="text-xs text-slate-400 hover:text-slate-700 font-semibold"
            >
              Tutup
            </button>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Pengumuman *
                </label>
                <input
                  id="up-announcement-title"
                  type="text"
                  required
                  value={upTitle}
                  onChange={(e) => setUpTitle(e.target.value)}
                  placeholder="Contoh: Jadwal Shift Libur Nasional"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Distribusi Departemen
                </label>
                <select
                  id="up-announcement-dept"
                  value={upDept}
                  onChange={(e) => setUpDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-medium"
                >
                  <option value="All Departments">All Departments (Semua Karyawan)</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  File Dokumen / Foto (PDF/IMG)
                </label>
                <input
                  id="up-announcement-file"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi / Keterangan Pengumuman
              </label>
              <textarea
                id="up-announcement-desc"
                rows={3}
                value={upKet}
                onChange={(e) => setUpKet(e.target.value)}
                placeholder="Tuliskan isi keterangan atau rincian pengumuman..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                id="btn-submit-upload-announcement"
                disabled={isUploading}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{isUploading ? 'Menyimpan ke Drive...' : 'Unggah Sekarang'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements Content */}
      {filteredAnnouncements.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mx-auto">
            <Megaphone className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Belum Ada Pengumuman</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tidak ada pengumuman yang sesuai dengan filter departemen Anda.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAnnouncements.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Card Image Banner */}
                <div className="relative h-48 bg-slate-900 overflow-hidden">
                  <img
                    src={doc.thumbUrl}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    onError={(e: any) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop';
                    }}
                  />
                  
                  {/* Date Chip */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                    <Calendar className="w-3 h-3 text-indigo-400" />
                    <span>
                      {new Date(doc.uploadedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Department Distribution Badge */}
                  <div className="absolute top-3 right-3 shadow-md">
                    <DepartmentBadge department={doc.akses_dept} size="xs" />
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                      {doc.keterangan || 'Tidak ada catatan tambahan untuk dokumen ini.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium truncate max-w-[140px]">
                      Oleh: <strong>{doc.uploadedBy}</strong>
                    </span>
                    <button
                      id={`btn-view-${doc.id}`}
                      onClick={() => onOpenPreview(doc)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Detail</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200">
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredAnnouncements.length}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={[6, 12, 24, 48]}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(newCount) => {
                setItemsPerPage(newCount);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <SortableHeader
                    field="title"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="pl-6 py-4"
                  >
                    Judul & Catatan
                  </SortableHeader>
                  <SortableHeader
                    field="akses_dept"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-4"
                  >
                    Target Departemen
                  </SortableHeader>
                  <SortableHeader
                    field="uploadedBy"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-4"
                  >
                    Diterbitkan Oleh
                  </SortableHeader>
                  <SortableHeader
                    field="uploadedAt"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-4"
                  >
                    Tanggal Rilis
                  </SortableHeader>
                  <th className="py-4 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedAnnouncements.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="pl-6 py-4">
                      <div className="font-bold text-slate-900">{doc.title}</div>
                      {doc.keterangan && (
                        <div className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">
                          {doc.keterangan}
                        </div>
                      )}
                    </td>
                    <td className="py-4">
                      <DepartmentBadge department={doc.akses_dept} size="xs" />
                    </td>
                    <td className="py-4 font-medium text-slate-700">
                      {doc.uploadedBy}
                    </td>
                    <td className="py-4 text-slate-500 whitespace-nowrap">
                      {new Date(doc.uploadedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 pr-6 text-right">
                      <button
                        onClick={() => onOpenPreview(doc)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition-colors shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalItems={filteredAnnouncements.length}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={[5, 10, 25, 50]}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(newCount) => {
              setItemsPerPage(newCount);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

    </div>
  );
};
