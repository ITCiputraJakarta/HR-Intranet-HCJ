import React, { useState } from 'react';
import {
  FileCheck2,
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  Building2,
  HardDrive,
  Filter,
  Upload,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  ArrowDownAZ,
  ArrowUpZA,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
  File
} from 'lucide-react';
import { IntranetDocument, User, CategoryMaster, DocumentCategory } from '../types';
import { addDocument, addAccessLog, getDepartments } from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';
import { uploadFileToGoogleDrive } from '../lib/driveApi';
import { Flame } from 'lucide-react';
import { TablePagination } from './TablePagination';
import { SortableHeader } from './SortableHeader';

export type DocumentSortOption = 'title-asc' | 'title-desc' | 'date-desc' | 'date-asc' | 'dept-asc';

interface DocumentsViewProps {
  category: DocumentCategory; // 'SOP' | 'Form'
  documents: IntranetDocument[];
  currentUser: User;
  categories: CategoryMaster[];
  onOpenPreview: (doc: IntranetDocument) => void;
  onRefresh: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  category,
  documents = [],
  currentUser,
  categories = [],
  onOpenPreview,
  onRefresh,
}) => {
  const departments = getDepartments();
  const [selectedSubcat, setSelectedSubcat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [sortField, setSortField] = useState<string>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sortBy, setSortBy] = useState<DocumentSortOption>('title-asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload modal state
  const [upTitle, setUpTitle] = useState('');
  const [upDept, setUpDept] = useState(
    currentUser.role === 'manager' || currentUser.role === 'admin'
      ? 'All Departments'
      : currentUser.departemen
  );
  const [upSubcat, setUpSubcat] = useState('');
  const [upDesc, setUpDesc] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
  const isStaffOrSpv = currentUser.role === 'staff' || currentUser.role === 'spv';

  // Filter docs by category (SOP or Form)
  let catDocs = (documents || []).filter((d) => d.category === category);

  // Filter by user's department for Staff/SPV
  if (isStaffOrSpv) {
    catDocs = catDocs.filter(
      (d) => d.akses_dept === 'All Departments' || d.akses_dept === currentUser.departemen
    );
  } else if (filterDept !== 'All') {
    catDocs = catDocs.filter(
      (d) => d.akses_dept === filterDept || d.akses_dept === 'All Departments'
    );
  }

  // Filter by subcategory
  if (selectedSubcat !== 'All') {
    catDocs = catDocs.filter((d) => d.sub_kategori === selectedSubcat);
  }

  // Filter by search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    catDocs = catDocs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.keterangan && d.keterangan.toLowerCase().includes(q)) ||
        d.fileName.toLowerCase().includes(q)
    );
  }

  // Sorting
  catDocs.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'title') {
      comparison = a.title.localeCompare(b.title, 'id', { sensitivity: 'base' });
    } else if (sortField === 'sub_kategori') {
      comparison = (a.sub_kategori || '').localeCompare(b.sub_kategori || '', 'id', { sensitivity: 'base' });
    } else if (sortField === 'akses_dept') {
      comparison = a.akses_dept.localeCompare(b.akses_dept, 'id', { sensitivity: 'base' });
    } else if (sortField === 'uploadedBy') {
      comparison = a.uploadedBy.localeCompare(b.uploadedBy, 'id', { sensitivity: 'base' });
    } else if (sortField === 'uploadedAt') {
      comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
    } else if (sortField === 'fileSize') {
      comparison = (a.fileSize || '').localeCompare(b.fileSize || '', 'id', { numeric: true });
    }
    return sortDirection === 'asc' ? comparison : -comparison;
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
    } else {
      setSortField('title');
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const paginatedDocs = catDocs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Subcategories available for this category and user's department
  const relevantCategories = (categories || []).filter((c) =>
    isStaffOrSpv
      ? c.departemen === currentUser.departemen || c.departemen === 'All Departments'
      : true
  );

  const availableSubcats = Array.from(
    new Set(relevantCategories.map((c) => c.nama_kategori))
  );

  const handleDownload = (doc: IntranetDocument) => {
    addAccessLog({
      user: currentUser,
      actionCategory: 'DOCUMENT',
      action: `Unduh File ${category}`,
      target: doc.title,
      status: 'SUCCESS',
      details: `File ${doc.fileName} diunduh dari folder Google Drive.`,
    });

    const link = window.document.createElement('a');
    link.href = doc.downloadUrl || doc.fileUrl;
    link.target = '_blank';
    link.download = doc.fileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upTitle.trim()) {
      setUploadError('Judul berkas wajib diisi.');
      return;
    }

    let fileUrl = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&auto=format&fit=crop';
    let previewUrl = fileUrl;
    let downloadUrl = fileUrl;
    let thumbUrl = fileUrl;
    let fileName = `${category}-${Date.now()}.pdf`;
    let fileType = 'application/pdf';
    let fileSize = '1.8 MB';
    let driveFileId = `1Drv-${category}-${Date.now().toString(36)}`;

    if (fileInput) {
      const driveResult = await uploadFileToGoogleDrive({
        file: fileInput,
        title: upTitle.trim(),
        category,
        departemen: upDept,
        uploadedBy: currentUser.nama,
        uploadedByEmail: currentUser.email,
      });

      if (driveResult.fileUrl) fileUrl = driveResult.fileUrl;
      if (driveResult.previewUrl) previewUrl = driveResult.previewUrl;
      if (driveResult.downloadUrl) downloadUrl = driveResult.downloadUrl;
      if (driveResult.thumbUrl) thumbUrl = driveResult.thumbUrl;
      if (driveResult.driveFileId) driveFileId = driveResult.driveFileId;
      if (driveResult.fileName) fileName = driveResult.fileName;
      if (driveResult.fileType) fileType = driveResult.fileType;
      if (driveResult.fileSize) fileSize = driveResult.fileSize;
    }

    const newDoc: IntranetDocument = {
      id: `doc-${Date.now()}`,
      title: upTitle.trim(),
      category: category,
      sub_kategori: upSubcat || availableSubcats[0] || 'Umum',
      akses_dept: upDept,
      keterangan: upDesc.trim(),
      fileUrl,
      previewUrl: fileUrl,
      downloadUrl: fileUrl,
      thumbUrl: fileUrl,
      fileName,
      fileType,
      fileSize,
      uploadedBy: currentUser.nama,
      uploadedByEmail: currentUser.email,
      uploadedAt: new Date().toISOString(),
      driveFileId,
    };

    addDocument(newDoc, currentUser);
    setShowUploadModal(false);
    setUpTitle('');
    setUpDesc('');
    setFileInput(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
              category === 'SOP'
                ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-500/20'
                : 'bg-gradient-to-br from-amber-600 to-orange-700 shadow-amber-500/20'
            }`}
          >
            {category === 'SOP' ? (
              <FileCheck2 className="w-6 h-6" />
            ) : (
              <FileText className="w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {category === 'SOP' ? 'Standard Operating Procedures (SOP)' : 'Formulir Kerja Standar'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Repositori dokumen resmi terintegrasi Google Drive untuk operasional hotel
            </p>
          </div>
        </div>

        {isManagerOrAdmin && (
          <button
            id="btn-open-upload-doc"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Unggah {category} Baru</span>
          </button>
        )}
      </div>

      {/* Subcategory Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedSubcat('All')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
            selectedSubcat === 'All'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Semua Kategori ({(documents || []).filter((d) => d.category === category).length})
        </button>
        {availableSubcats.map((subcat) => {
          const count = (documents || []).filter(
            (d) => d.category === category && d.sub_kategori === subcat
          ).length;
          return (
            <button
              key={subcat}
              onClick={() => setSelectedSubcat(subcat)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
                selectedSubcat === subcat
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {subcat} ({count})
            </button>
          );
        })}
      </div>

      {/* Filter, Search, Sort & View Mode Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-documents"
              type="text"
              placeholder={`Cari nama, file, atau isi ${category}...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 placeholder:text-slate-400"
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

          {/* Sort & Department Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Quick 1-Click A-Z / Z-A Toggle Button */}
            <button
              id="btn-toggle-sort-az"
              onClick={toggleSortAZ}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                sortField === 'title'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Klik untuk beralih antara A-Z dan Z-A"
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

            {/* Sort By Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
              <select
                id="select-sort-documents"
                value={sortBy}
                onChange={(e) => {
                  const val = e.target.value as DocumentSortOption;
                  setSortBy(val);
                  if (val === 'title-asc') { setSortField('title'); setSortDirection('asc'); }
                  else if (val === 'title-desc') { setSortField('title'); setSortDirection('desc'); }
                  else if (val === 'date-desc') { setSortField('uploadedAt'); setSortDirection('desc'); }
                  else if (val === 'date-asc') { setSortField('uploadedAt'); setSortDirection('asc'); }
                  else if (val === 'dept-asc') { setSortField('akses_dept'); setSortDirection('asc'); }
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none py-1 pr-1 cursor-pointer"
              >
                <option value="title-asc">Judul: A → Z</option>
                <option value="title-desc">Judul: Z → A</option>
                <option value="date-desc">Terbaru (Tanggal)</option>
                <option value="date-asc">Terlama (Tanggal)</option>
                <option value="dept-asc">Departemen (A → Z)</option>
              </select>
            </div>

            {/* Department Filter (For Admins & Managers) */}
            {!isStaffOrSpv && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
                <select
                  id="select-filter-dept"
                  value={filterDept}
                  onChange={(e) => {
                    setFilterDept(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none py-1 pr-1 cursor-pointer max-w-[150px] sm:max-w-[190px] truncate"
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

            {/* View Mode Toggle: Table / Cards */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-slate-500">
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
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-indigo-600 shadow-xs font-bold'
                    : 'hover:text-slate-800'
                }`}
                title="Tampilan Kartu (Responsif)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* Results Info & Active Filter Tag */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan <strong>{catDocs.length}</strong> dokumen {category}
            </span>
            {filterDept !== 'All' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">• Filter:</span>
                <DepartmentBadge department={filterDept} size="xs" />
              </div>
            )}
            <span className="text-slate-400">• Urutan:</span>
            <span className="font-semibold text-slate-700">
              {sortBy === 'title-asc'
                ? 'Judul A-Z'
                : sortBy === 'title-desc'
                ? 'Judul Z-A'
                : sortBy === 'date-desc'
                ? 'Terbaru'
                : sortBy === 'date-asc'
                ? 'Terlama'
                : 'Departemen'}
            </span>
          </div>

          {(searchQuery || filterDept !== 'All' || selectedSubcat !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterDept('All');
                setSelectedSubcat('All');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold text-xs inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Documents Display: Cards Mode OR Table Mode */}
      {viewMode === 'cards' ? (
        /* Card Grid View (Ideal for Tablet & Smartphone) */
        catDocs.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mx-auto">
              {category === 'SOP' ? <FileCheck2 className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Tidak ada berkas {category} ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ada dokumen yang cocok dengan kata kunci atau filter departemen yang dipilih.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10px]">
                        {doc.sub_kategori || 'Umum'}
                      </span>
                      <DepartmentBadge department={doc.akses_dept} size="xs" />
                    </div>

                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          category === 'SOP'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                          {doc.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-1 truncate">
                          {doc.fileName}
                        </p>
                      </div>
                    </div>

                    {doc.keterangan && (
                      <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-100">
                        {doc.keterangan}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{doc.uploadedBy}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span>{doc.fileSize || '1.5 MB'}</span>
                        <span>•</span>
                        <span>
                          {new Date(doc.uploadedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onOpenPreview(doc)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <TablePagination
              currentPage={currentPage}
              totalItems={catDocs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemsPerPageOptions={[6, 12, 24, 48]}
              itemLabel={`dokumen ${category}`}
            />
          </div>
        )
      ) : (
        /* Table View with responsive horizontal scroll, Sortable Headers & Pagination */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <SortableHeader
                    field="title"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-5"
                  >
                    Nama Berkas & Judul
                  </SortableHeader>

                  <SortableHeader
                    field="sub_kategori"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4"
                  >
                    Sub-Kategori
                  </SortableHeader>

                  <SortableHeader
                    field="akses_dept"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4"
                  >
                    Target Distribusi
                  </SortableHeader>

                  <SortableHeader
                    field="uploadedAt"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4"
                  >
                    Pengunggah & Tanggal
                  </SortableHeader>

                  <SortableHeader
                    field="fileSize"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    align="center"
                    className="py-3.5 px-4"
                  >
                    Ukuran
                  </SortableHeader>

                  <th className="py-3.5 px-5 text-right font-bold uppercase tracking-wider text-[11px] text-slate-600">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada berkas {category} yang tersedia untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  paginatedDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                              category === 'SOP'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 max-w-sm">
                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                              {doc.title}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                              {doc.fileName}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {doc.sub_kategori || 'Umum'}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <DepartmentBadge department={doc.akses_dept} size="sm" />
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{doc.uploadedBy}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(doc.uploadedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </td>

                      <td className="py-4 px-4 text-center font-mono text-slate-500 whitespace-nowrap">
                        {doc.fileSize || '1.5 MB'}
                      </td>

                      <td className="py-4 px-5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => onOpenPreview(doc)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                          title="Pratinjau Dokumen"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                          title="Unduh Berkas Google Drive"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalItems={catDocs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[5, 10, 25, 50]}
            itemLabel={`dokumen ${category}`}
          />
        </div>
      )}

      {/* Upload Modal (Manager / Admin) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Unggah Dokumen {category} Baru
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Berkas / Prosedur *
                </label>
                <input
                  type="text"
                  required
                  value={upTitle}
                  onChange={(e) => setUpTitle(e.target.value)}
                  placeholder={`Contoh: Prosedur Standar ${category}`}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Distribusi Departemen
                  </label>
                  <select
                    value={upDept}
                    onChange={(e) => setUpDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  >
                    <option value="All Departments">All Departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sub-Kategori
                  </label>
                  <select
                    value={upSubcat}
                    onChange={(e) => setUpSubcat(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  >
                    <option value="">- Pilih Kategori -</option>
                    {availableSubcats.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Berkas (PDF / Dokumen)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                  onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan / Catatan Singkat
                </label>
                <textarea
                  rows={3}
                  value={upDesc}
                  onChange={(e) => setUpDesc(e.target.value)}
                  placeholder="Instruksi penggunaan atau deskripsi berkas..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mengunggah ke Drive & Firebase...</span>
                    </>
                  ) : (
                    <span>Simpan & Unggah ke Drive</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
