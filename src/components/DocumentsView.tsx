import React, { useState } from 'react';
import {
  FileCheck2,
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  Building2,
  Database,
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
  File,
  Edit3,
  Trash2,
  CheckCircle2,
  FolderTree,
  Folder,
  Check,
  RefreshCw
} from 'lucide-react';
import { IntranetDocument, User, CategoryMaster, DocumentCategory } from '../types';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  addAccessLog,
  getDepartments,
  getHotelUnits,
  getHotelUnitRule,
} from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';
import { processFileForFirestore, formatBytes, downloadFileFromDataUrl } from '../lib/fileCompressor';
import { Language, t } from '../lib/i18n';
import { TablePagination } from './TablePagination';
import { SortableHeader } from './SortableHeader';

export type DocumentSortOption = 'title-asc' | 'title-desc' | 'date-desc' | 'date-asc' | 'dept-asc';

const getFirestoreStoragePath = (category: string, dept: string, fileName?: string) => {
  return `Cloud Firestore > ${category} > ${dept} > ${fileName || 'Nama Berkas'}`;
};

interface DocumentsViewProps {
  category: DocumentCategory; // 'SOP' | 'Form'
  documents: IntranetDocument[];
  currentUser: User;
  categories: CategoryMaster[];
  currentLang?: Language;
  onOpenPreview: (doc: IntranetDocument) => void;
  onRefresh: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  category,
  documents = [],
  currentUser,
  categories = [],
  currentLang = 'id',
  onOpenPreview,
  onRefresh,
}) => {
  const departments = getDepartments();
  const hotelUnits = getHotelUnits();
  const userUnit = currentUser.unit || 'Hotel Ciputra Jakarta';
  const [selectedSubcat, setSelectedSubcat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnit, setFilterUnit] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [sortField, setSortField] = useState<string>('uploadedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<DocumentSortOption>('date-desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Upload modal state
  const [upTitle, setUpTitle] = useState('');
  const [upUnit, setUpUnit] = useState(userUnit);
  const [upDept, setUpDept] = useState(
    currentUser.role === 'admin'
      ? 'All Departments'
      : currentUser.departemen || 'All Departments'
  );
  const [upSubcat, setUpSubcat] = useState('');
  const [upDesc, setUpDesc] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Edit / Update Modal State
  const [editDoc, setEditDoc] = useState<IntranetDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUnit, setEditUnit] = useState(userUnit);
  const [editDept, setEditDept] = useState('');
  const [editSubcat, setEditSubcat] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editFileInput, setEditFileInput] = useState<File | null>(null);
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Confirm State
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<IntranetDocument | null>(null);

  const isManagerOrAdmin =
    currentUser.role === 'admin' ||
    currentUser.role === 'hod' ||
    currentUser.role === 'manager';
  const isStaffOrSpv = currentUser.role === 'staff' || currentUser.role === 'spv';

  // Filter docs by category (SOP or Form)
  let catDocs = (documents || []).filter((d) => d.category === category);

  // Documents for Hotel Ciputra Jakarta

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
      setSortBy('title-desc');
    } else {
      setSortField('title');
      setSortDirection('asc');
      setSortBy('title-asc');
    }
    setCurrentPage(1);
  };

  const paginatedDocs = catDocs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Subcategories available for filter
  const availableSubcats = Array.from(
    new Set(
      categories
        .filter((c) => {
          if (currentUser.role === 'admin' || currentUser.role === 'manager') return true;
          return c.departemen === currentUser.departemen || c.departemen === 'All Departments';
        })
        .map((c) => c.nama_kategori)
    )
  );

  const handleDownload = (doc: IntranetDocument) => {
    addAccessLog({
      user: currentUser,
      actionCategory: 'DOCUMENT',
      action: 'Unduh Dokumen Cloud Firestore',
      target: doc.title,
      status: 'SUCCESS',
      details: `File ID ${doc.id} (${doc.fileName}) diunduh dari cloud Firestore. Jalur: ${getFirestoreStoragePath(doc.category, doc.akses_dept, doc.fileName)}`,
    });

    downloadFileFromDataUrl(doc.downloadUrl || doc.fileUrl, doc.fileName);
  };

  // Open Edit Modal
  const handleOpenEdit = (doc: IntranetDocument) => {
    setEditDoc(doc);
    setEditTitle(doc.title);
    setEditUnit(doc.unit || userUnit);
    setEditDept(doc.akses_dept);
    setEditSubcat(doc.sub_kategori || '');
    setEditDesc(doc.keterangan || '');
    setEditFileInput(null);
    setEditError('');
  };

  // Save Edit / Replace File
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDoc) return;
    if (!editTitle.trim()) {
      setEditError('Judul berkas tidak boleh kosong.');
      return;
    }

    setIsSavingEdit(true);
    setEditError('');

    try {
      let updatedDoc: IntranetDocument = {
        ...editDoc,
        title: editTitle.trim(),
        unit: currentUser.role === 'admin' ? editUnit : userUnit,
        akses_dept: editDept,
        sub_kategori: editSubcat || editDoc.sub_kategori,
        keterangan: editDesc.trim(),
        updatedAt: new Date().toISOString(),
      };

      // If user uploaded a replacement file ("ganti file")
      if (editFileInput) {
        const compressed = await processFileForFirestore(editFileInput);
        updatedDoc = {
          ...updatedDoc,
          fileUrl: compressed.dataUrl,
          previewUrl: compressed.dataUrl,
          downloadUrl: compressed.dataUrl,
          thumbUrl: compressed.mimeType.startsWith('image/') ? compressed.dataUrl : '',
          fileName: compressed.fileName,
          fileType: compressed.mimeType,
          fileSize: formatBytes(compressed.compressedSizeBytes),
        };
      }

      await updateDocument(updatedDoc, currentUser);
      setEditDoc(null);
      setActionSuccessNotice(`Dokumen ${category} "${updatedDoc.title}" berhasil diperbarui dan disinkronkan ke Cloud Firestore!`);
      setTimeout(() => setActionSuccessNotice(null), 5000);
      onRefresh();
    } catch (err: any) {
      setEditError(err?.message || 'Gagal menyimpan perubahan berkas.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (docId: string) => {
    const targetTitle = deleteConfirmDoc?.title || category;
    await deleteDocument(docId, currentUser);
    setDeleteConfirmDoc(null);
    setActionSuccessNotice(`Dokumen "${targetTitle}" telah dihapus secara permanen dari arsip & Cloud Firestore.`);
    setTimeout(() => setActionSuccessNotice(null), 5000);
    onRefresh();
  };

  // Upload New Document
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upTitle.trim()) {
      setUploadError('Judul dokumen wajib diisi.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      let fileUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      let previewUrl = fileUrl;
      let downloadUrl = fileUrl;
      let thumbUrl = '';
      let fileName = `${category}-${upTitle.trim().replace(/\s+/g, '_')}.pdf`;
      let fileType = 'application/pdf';
      let fileSize = '45 KB';

      if (fileInput) {
        const compressed = await processFileForFirestore(fileInput);
        fileUrl = compressed.dataUrl;
        previewUrl = compressed.dataUrl;
        downloadUrl = compressed.dataUrl;
        thumbUrl = compressed.mimeType.startsWith('image/') ? compressed.dataUrl : '';
        fileName = compressed.fileName;
        fileType = compressed.mimeType;
        fileSize = formatBytes(compressed.compressedSizeBytes);
      }

      const newDoc: IntranetDocument = {
        id: `doc-${Date.now()}`,
        title: upTitle.trim(),
        category: category,
        sub_kategori: upSubcat || availableSubcats[0] || 'Umum',
        unit: currentUser.role === 'admin' ? (upUnit || userUnit) : userUnit,
        akses_dept: upDept || 'All Departments',
        keterangan: upDesc.trim(),
        fileUrl,
        previewUrl,
        downloadUrl,
        thumbUrl,
        fileName,
        fileType,
        fileSize,
        uploadedBy: currentUser.nama,
        uploadedByEmail: currentUser.email,
        uploadedAt: new Date().toISOString(),
      };

      await addDocument(newDoc, currentUser);
      setShowUploadModal(false);
      setUpTitle('');
      setUpDesc('');
      setFileInput(null);
      // Reset filters and sort by newest so the uploaded document is immediately visible at the top
      setSelectedSubcat('All');
      setFilterDept('All');
      setSearchQuery('');
      setSortField('uploadedAt');
      setSortDirection('desc');
      setSortBy('date-desc');
      setCurrentPage(1);
      setActionSuccessNotice(`Berkas ${category} "${newDoc.title}" berhasil disimpan dan tersinkron ke Cloud Firestore!`);
      setTimeout(() => setActionSuccessNotice(null), 5000);
      onRefresh();
    } catch (err: any) {
      setUploadError(err?.message || 'Gagal mengunggah berkas ke penyimpanan.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div
            className={`w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-lg ring-1 ring-white/30 shrink-0 ${
              category === 'SOP'
                ? 'bg-gradient-to-br from-[#005a8d] via-[#0277bd] to-indigo-700 shadow-sky-600/25'
                : 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 shadow-amber-500/25'
            }`}
          >
            {category === 'SOP' ? (
              <FileCheck2 className="w-6 h-6 drop-shadow-xs" />
            ) : (
              <FileText className="w-6 h-6 drop-shadow-xs" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {category === 'SOP'
                  ? t('headerSOPTitle', currentLang)
                  : t('headerFormsTitle', currentLang)}
              </h1>
              <span className="px-2.5 py-0.5 rounded-lg bg-sky-50 text-[#005a8d] border border-sky-200 text-[11px] font-bold">
                Hotel Ciputra Jakarta
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {category === 'SOP'
                ? 'Standar Operasional Prosedur baku Hotel Ciputra Jakarta.'
                : t('headerFormsSubtitle', currentLang)}
            </p>
          </div>
        </div>

        {isManagerOrAdmin && (
          <button
            id="btn-open-upload-doc"
            onClick={() => {
              setUploadError('');
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#005a8d] to-[#0277bd] hover:from-[#00466e] hover:to-[#015f96] text-white font-bold text-xs shadow-md shadow-sky-700/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Unggah {category} Baru</span>
          </button>
        )}
      </div>

      {actionSuccessNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
          <button
            onClick={() => setActionSuccessNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
              placeholder={`Cari nama berkas, SOP, atau keterangan ${category}...`}
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

          {/* Filters & Mode */}
          <div className="flex items-center gap-2 flex-wrap justify-end">


            {/* Department Filter (Admins/Managers) */}
            {isManagerOrAdmin && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterDept}
                  onChange={(e) => {
                    setFilterDept(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="All">Semua Departemen</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => {
                  const val = e.target.value as DocumentSortOption;
                  setSortBy(val);
                  if (val === 'title-asc') {
                    setSortField('title');
                    setSortDirection('asc');
                  } else if (val === 'title-desc') {
                    setSortField('title');
                    setSortDirection('desc');
                  } else if (val === 'date-desc') {
                    setSortField('uploadedAt');
                    setSortDirection('desc');
                  } else if (val === 'date-asc') {
                    setSortField('uploadedAt');
                    setSortDirection('asc');
                  } else if (val === 'dept-asc') {
                    setSortField('akses_dept');
                    setSortDirection('asc');
                  }
                  setCurrentPage(1);
                }}
                className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="title-asc">Judul (A - Z)</option>
                <option value="title-desc">Judul (Z - A)</option>
                <option value="date-desc">Terbaru Diunggah</option>
                <option value="date-asc">Terlama</option>
                <option value="dept-asc">Departemen (A - Z)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
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
                title="Tampilan Kartu"
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
          </div>

          {(searchQuery || filterDept !== 'All' || selectedSubcat !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterDept('All');
                setSelectedSubcat('All');
                setCurrentPage(1);
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Documents Display: Cards Mode OR Table Mode */}
      {viewMode === 'cards' ? (
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
              {paginatedDocs.map((doc) => {
                const folderPath = getFirestoreStoragePath(doc.category, doc.akses_dept, doc.fileName);
                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                              (doc.unit || 'Hotel Ciputra Jakarta').includes('Unit 2')
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : 'bg-sky-50 text-sky-800 border-sky-200'
                            }`}
                          >
                            {doc.unit || 'Hotel Ciputra Jakarta'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10px]">
                            {doc.sub_kategori || 'Umum'}
                          </span>
                        </div>
                        <DepartmentBadge department={doc.akses_dept} size="xs" />
                      </div>

                      <div
                        onClick={() => onOpenPreview(doc)}
                        className="flex items-start gap-3 cursor-pointer group-hover:text-indigo-600"
                      >
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
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate hover:text-indigo-500">
                            {doc.fileName}
                          </p>
                        </div>
                      </div>

                      {/* Storage Path Indicator - Super Admin Only */}
                      {currentUser.role === 'admin' && (
                        <div
                          className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded-lg border border-slate-150 truncate"
                          title={`Lokasi Penyimpanan: ${folderPath}`}
                        >
                          <Database className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="truncate">{folderPath}</span>
                        </div>
                      )}

                      {doc.keterangan && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed bg-slate-50/50 p-2 rounded-xl">
                          {doc.keterangan}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-400">
                        <span>{doc.fileSize || '1.5 MB'}</span>
                        {doc.updatedAt && (
                          <span className="text-emerald-600 ml-1 font-semibold">• Diedit</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenPreview(doc)}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1"
                          title="Detail Berkas"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>

                        {/* Edit Button */}
                        {isManagerOrAdmin && (
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            className="py-1.5 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors flex items-center gap-1 border border-amber-200"
                            title="Perbaharui / Edit Berkas & Keterangan"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                            <span>Edit</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDownload(doc)}
                          className="py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
                          title="Unduh Berkas"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh</span>
                        </button>

                        {isManagerOrAdmin && (
                          <button
                            onClick={() => setDeleteConfirmDoc(doc)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors flex items-center border border-slate-200 hover:border-rose-200"
                            title="Hapus Berkas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
        /* Table View */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <SortableHeader
                    field="title"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-5"
                  >
                    {t('thDocName', currentLang)}
                  </SortableHeader>

                  <SortableHeader
                    field="sub_kategori"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4"
                  >
                    {t('thSubCategory', currentLang)}
                  </SortableHeader>

                  <SortableHeader
                    field="akses_dept"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4"
                  >
                    {t('thDistributionTarget', currentLang)}
                  </SortableHeader>

                  <SortableHeader
                    field="uploadedAt"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4"
                  >
                    {t('thUploaderAndDate', currentLang)}
                  </SortableHeader>

                  <SortableHeader
                    field="fileSize"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    align="center"
                    className="py-3.5 px-4"
                  >
                    {t('thFileSize', currentLang)}
                  </SortableHeader>

                  <th className="py-3.5 px-5 text-right font-bold uppercase tracking-wider text-[11px] text-slate-600">
                    {t('thAction', currentLang)}
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
                  paginatedDocs.map((doc) => {
                    const folderPath = getFirestoreStoragePath(doc.category, doc.akses_dept, doc.fileName);
                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td
                          className="py-4 px-5 cursor-pointer"
                          onClick={() => onOpenPreview(doc)}
                          title="Klik untuk melihat detail berkas"
                        >
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
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate group-hover:text-indigo-500">
                                {doc.fileName}
                              </p>
                              {/* Storage Path Badge - Super Admin Only */}
                              {currentUser.role === 'admin' && (
                                <div className="flex items-center gap-1 text-[10px] text-indigo-600/80 font-mono mt-1" title="Jalur Penyimpanan Cloud">
                                  <Database className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{folderPath}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {doc.sub_kategori || 'Umum'}
                          </span>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                (doc.unit || 'Hotel Ciputra Jakarta').includes('Unit 2')
                                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                                  : 'bg-sky-50 text-sky-800 border-sky-200'
                              }`}
                            >
                              <Building2 className="w-2.5 h-2.5" />
                              <span>{doc.unit || 'Hotel Ciputra Jakarta'}</span>
                            </span>
                            <div>
                              <DepartmentBadge department={doc.akses_dept} size="sm" />
                            </div>
                          </div>
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
                          {doc.updatedAt && (
                            <span className="text-[10px] text-emerald-600 font-medium">Diedit</span>
                          )}
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

                          {/* Edit Button */}
                          {isManagerOrAdmin && (
                            <button
                              onClick={() => handleOpenEdit(doc)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white font-bold transition-colors inline-flex items-center gap-1 shadow-2xs border border-amber-200 hover:border-amber-600"
                              title="Perbaharui Berkas & Keterangan"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDownload(doc)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                            title="Unduh Berkas"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Unduh</span>
                          </button>

                          {/* Delete Button (Manager/Admin) */}
                          {isManagerOrAdmin && (
                            <button
                              onClick={() => setDeleteConfirmDoc(doc)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors inline-flex items-center"
                              title="Hapus Berkas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
            totalItems={catDocs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[5, 10, 25, 50]}
            itemLabel={`dokumen ${category}`}
          />
        </div>
      )}

      {/* MODAL 1: EDIT / PERBAHARUI DOKUMEN & GANTI BERKAS */}
      {editDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setEditDoc(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Perbaharui Berkas & Keterangan {category}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ID Dokumen: {editDoc.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditDoc(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Dokumen *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Contoh: Standard Prosedur FO Check-In"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unit Hotel Group (Pemisah SOP & Formulir) *
                </label>
                {currentUser.role === 'admin' ? (
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-indigo-50/40 font-bold text-indigo-950"
                  >
                    {hotelUnits.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                    <option value="All Units">All Units (Lintas Unit Hotel Group)</option>
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-200 bg-indigo-50/60 font-bold text-indigo-900">
                    {userUnit}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Distribusi Departemen
                  </label>
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
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
                    value={editSubcat}
                    onChange={(e) => setEditSubcat(e.target.value)}
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

              {/* Upload Ganti File */}
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-950">Ganti Berkas / Upload File Baru (Opsional)</span>
                  <span className="text-[10px] text-amber-700 font-mono">Saat ini: {editDoc.fileName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    onChange={(e) => setEditFileInput(e.target.files?.[0] || null)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                  />
                  {editFileInput && (
                    <button
                      type="button"
                      onClick={() => setEditFileInput(null)}
                      className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs shrink-0"
                      title="Batalkan penggantian file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-amber-800">
                  Penyimpanan Cloud Firestore: <strong>{getFirestoreStoragePath(editDoc.category, editDept, editFileInput ? editFileInput.name : editDoc.fileName)}</strong> (Kompresi otomatis ultra-ringan)
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-normal text-slate-700">
                    Keterangan / Catatan Dokumen
                  </label>
                  <span className={`text-[11px] font-normal ${editDesc.length >= 950 ? 'text-rose-600' : 'text-slate-400'}`}>
                    Maks. 1.000 karakter • {editDesc.length}/1000
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Keterangan, instruksi, atau versi revisi..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 resize-y min-h-[90px]"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  💡 Kolom dapat ditarik ke bawah untuk melihat teks panjang.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditDoc(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingEdit ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan ke Firestore...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD DOKUMEN BARU */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Unggah Dokumen {category} Baru
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Penyimpanan cloud aman terpusat per departemen & terdaftar di basis data
                  </p>
                </div>
              </div>
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
                  placeholder={`Contoh: Prosedur Standar Operasional ${category}`}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unit Hotel Group (Pemisah SOP & Formulir) *
                </label>
                {currentUser.role === 'admin' ? (
                  <select
                    value={upUnit}
                    onChange={(e) => setUpUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-indigo-50/40 font-bold text-indigo-950"
                  >
                    {hotelUnits.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                    <option value="All Units">All Units (Lintas Unit Hotel Group)</option>
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-200 bg-indigo-50/60 font-bold text-indigo-900">
                    {userUnit}
                  </div>
                )}
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
                  Pilih Berkas (PDF / Dokumen / Excel)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                  onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                />
                {currentUser.role === 'admin' && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Penyimpanan Cloud: <strong>{getFirestoreStoragePath(category, upDept, fileInput ? fileInput.name : undefined)}</strong> (Kompresi otomatis dokumen & arsip)
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-normal text-slate-700">
                    Keterangan / Catatan Singkat
                  </label>
                  <span className={`text-[11px] font-normal ${upDesc.length >= 950 ? 'text-rose-600' : 'text-slate-400'}`}>
                    Maks. 1.000 karakter • {upDesc.length}/1000
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={upDesc}
                  onChange={(e) => setUpDesc(e.target.value)}
                  placeholder="Instruksi penggunaan atau deskripsi berkas..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 resize-y min-h-[90px]"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  💡 Kolom dapat ditarik ke bawah untuk melihat teks panjang.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                      <span>{currentLang === 'en' ? 'Uploading...' : 'Menyimpan berkas...'}</span>
                    </>
                  ) : (
                    <span>{currentLang === 'en' ? 'Upload Document' : 'Simpan & Unggah Dokumen'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {deleteConfirmDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setDeleteConfirmDoc(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Hapus Dokumen?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus <strong>"{deleteConfirmDoc.title}"</strong> dari arsip Firebase Firestore?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmDoc(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteDocument(deleteConfirmDoc.id)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20"
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
