import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Upload,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Building2,
  Database,
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
  Edit3,
  Trash2,
  Image,
  FolderSync,
  Info,
  Lock,
  Download,
  Paperclip
} from 'lucide-react';
import { IntranetDocument, User, CategoryMaster } from '../types';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  getDepartments,
  pruneExpiredAnnouncements,
  getDriveStorageConfig
} from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';
import { processFileForFirestore, formatBytes } from '../lib/fileCompressor';
import { Language, t } from '../lib/i18n';
import { TablePagination } from './TablePagination';
import { SortableHeader } from './SortableHeader';

type AnnouncementSortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'dept-asc';

const getFirestoreStoragePath = (category: string, dept: string, fileName: string) => {
  return `Cloud Firestore > ${category} > ${dept} > ${fileName}`;
};

// Component for Card Banner: displays photo if uploaded, or clean neutral gray box if no photo
const AnnouncementCardBanner: React.FC<{
  doc: IntranetDocument;
  expInfo: { badgeClass: string; label: string };
  onClick: () => void;
}> = ({ doc, expInfo, onClick }) => {
  const [imgError, setImgError] = useState(false);

  const rawUrl = doc.thumbUrl || doc.fileUrl;
  const isImageValid = Boolean(
    rawUrl &&
    !imgError &&
    !rawUrl.includes('unsplash.com') &&
    (rawUrl.startsWith('data:image/') ||
      rawUrl.startsWith('blob:') ||
      doc.fileType?.startsWith('image/') ||
      doc.fileName?.match(/\.(jpg|jpeg|png|webp|gif)$/i))
  );

  return (
    <div
      onClick={onClick}
      className="relative h-48 bg-slate-200 overflow-hidden cursor-pointer flex items-center justify-center group/banner"
    >
      {isImageValid ? (
        <img
          src={rawUrl}
          alt={doc.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full bg-slate-200 flex flex-col items-center justify-center text-slate-500 p-4 select-none">
          <div className="w-12 h-12 rounded-2xl bg-slate-300/80 flex items-center justify-center text-slate-600 mb-2 shadow-2xs group-hover:scale-105 transition-transform">
            {doc.attachmentName ? (
              <FileText className="w-6 h-6 text-slate-600" />
            ) : (
              <Megaphone className="w-6 h-6 text-slate-600" />
            )}
          </div>
          <span className="text-xs font-bold text-slate-700">
            {doc.attachmentName ? 'Dokumen Lampiran' : 'Pengumuman'}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
            {doc.attachmentName ? doc.attachmentName : 'Tanpa foto sampul'}
          </span>
        </div>
      )}

      {/* Expiration Status Badge */}
      <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg backdrop-blur-md text-[10px] font-bold flex items-center gap-1.5 shadow-sm border ${expInfo.badgeClass}`}>
        <Clock className="w-3 h-3" />
        <span>{expInfo.label}</span>
      </div>

      {/* Department Distribution Badge */}
      <div className="absolute top-3 right-3 shadow-md">
        <DepartmentBadge department={doc.akses_dept} size="xs" />
      </div>

      {/* Document attachment indicator on banner */}
      {doc.attachmentName && isImageValid && (
        <div className="absolute bottom-2.5 left-3 px-2.5 py-1 rounded-lg bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 shadow-xs border border-white/20">
          <FileText className="w-3 h-3 text-indigo-300" />
          <span className="truncate max-w-[170px]">{doc.attachmentName}</span>
        </div>
      )}
    </div>
  );
};

interface AnnouncementsViewProps {
  documents: IntranetDocument[];
  currentUser: User;
  categories: CategoryMaster[];
  currentLang?: Language;
  onOpenPreview: (doc: IntranetDocument) => void;
  onRefresh: () => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  documents = [],
  currentUser,
  categories = [],
  currentLang = 'id',
  onOpenPreview,
  onRefresh,
}) => {
  const departments = getDepartments();
  const driveConfig = getDriveStorageConfig();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [sortOrder, setSortOrder] = useState<AnnouncementSortOption>('newest');
  const [sortField, setSortField] = useState<string>('uploadedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(6);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Auto-prune state notification
  const [autoPrunedNotice, setAutoPrunedNotice] = useState<string | null>(null);

  // Permissions & Role Control
  const isSuperAdmin = currentUser.role === 'admin';
  const isManager = currentUser.role === 'manager' || currentUser.role === 'hod';
  const isManagerOrAdmin = isSuperAdmin || isManager;
  const isStaffOrSpv = currentUser.role === 'staff' || currentUser.role === 'spv';
  const defaultDept = isSuperAdmin ? 'All Departments' : (currentUser.departemen || 'All Departments');

  // Upload Form States
  const todayStr = new Date().toISOString().split('T')[0];
  const [upTitle, setUpTitle] = useState('');
  const [upDept, setUpDept] = useState(defaultDept);
  const [upSubcat, setUpSubcat] = useState('Pengumuman');
  const [upKet, setUpKet] = useState('');
  const [upEffectiveDate, setUpEffectiveDate] = useState(todayStr);
  const [upExpiryDate, setUpExpiryDate] = useState(todayStr);
  const [photoInput, setPhotoInput] = useState<File | null>(null);
  const [docAttachmentInput, setDocAttachmentInput] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Edit Form States
  const [editDoc, setEditDoc] = useState<IntranetDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editKet, setEditKet] = useState('');
  const [editEffectiveDate, setEditEffectiveDate] = useState(todayStr);
  const [editExpiryDate, setEditExpiryDate] = useState(todayStr);
  const [editPhotoInput, setEditPhotoInput] = useState<File | null>(null);
  const [editDocAttachmentInput, setEditDocAttachmentInput] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Confirm State
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<IntranetDocument | null>(null);

  // Automatically prune announcements older than 7 days (1 week) on view load
  useEffect(() => {
    const pruneDays = driveConfig.autoPruneAnnouncementsDays || 7;
    const result = pruneExpiredAnnouncements(pruneDays, currentUser);
    if (result.deletedCount > 0) {
      setAutoPrunedNotice(
        `Sistem telah membersihkan otomatis ${result.deletedCount} pengumuman dan foto lama (> ${pruneDays} hari) agar penyimpanan tetap efisien.`
      );
      onRefresh();
    }
  }, []);

  // Department Filtering Logic
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

  const paginatedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helper: calculate expiration status and remaining time
  const getExpirationInfo = (doc: IntranetDocument) => {
    const now = Date.now();
    if (doc.expiryDate) {
      const expDate = new Date(`${doc.expiryDate}T23:59:59.999`);
      const expTime = expDate.getTime();
      const diffMs = expTime - now;
      const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      const isToday = doc.expiryDate === todayStr;

      if (diffMs < 0) {
        return {
          status: 'expired',
          label: 'Sudah Kedaluwarsa',
          badgeClass: 'bg-rose-900/90 text-rose-200 border-rose-500/40',
          tableBadge: 'bg-rose-50 text-rose-700 border-rose-200',
          days: 0,
          dateStr: doc.expiryDate,
        };
      } else if (isToday) {
        return {
          status: 'today',
          label: 'Kedaluwarsa Hari Ini',
          badgeClass: 'bg-amber-900/90 text-amber-200 border-amber-400 font-bold animate-pulse',
          tableBadge: 'bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse',
          days: 0,
          dateStr: doc.expiryDate,
        };
      } else {
        return {
          status: 'active',
          label: `Sisa ${days} hari`,
          badgeClass: 'bg-slate-900/80 text-amber-300 border-amber-400/30',
          tableBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          days,
          dateStr: doc.expiryDate,
        };
      }
    }

    // Fallback default 7 days from uploadedAt
    const pruneDays = driveConfig.autoPruneAnnouncementsDays || 7;
    const maxAgeMs = pruneDays * 24 * 60 * 60 * 1000;
    const elapsed = now - new Date(doc.uploadedAt).getTime();
    const remainingMs = maxAgeMs - elapsed;
    const days = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));

    return {
      status: days === 0 ? 'expired' : days <= 1 ? 'today' : 'active',
      label: days === 0 ? 'Sudah Kedaluwarsa' : days === 1 ? 'Sisa 1 hari' : `Sisa ${days} hari`,
      badgeClass: 'bg-slate-900/80 text-amber-300 border-amber-400/30',
      tableBadge: 'bg-slate-100 text-slate-700 border-slate-200',
      days,
      dateStr: doc.uploadedAt ? doc.uploadedAt.split('T')[0] : todayStr,
    };
  };

  const getRemainingDays = (uploadedAt: string) => {
    const pruneDays = driveConfig.autoPruneAnnouncementsDays || 7;
    const maxAgeMs = pruneDays * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(uploadedAt).getTime();
    const remainingMs = maxAgeMs - elapsed;
    const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return Math.max(0, days);
  };

  // Open Edit Modal
  const handleOpenEdit = (doc: IntranetDocument) => {
    setEditDoc(doc);
    setEditTitle(doc.title);
    setEditDept(isSuperAdmin ? doc.akses_dept : (currentUser.departemen || doc.akses_dept));
    setEditKet(doc.keterangan || '');
    setEditEffectiveDate(doc.effectiveDate || (doc.uploadedAt ? doc.uploadedAt.split('T')[0] : todayStr));
    setEditExpiryDate(doc.expiryDate || todayStr);
    setEditPhotoInput(null);
    setEditDocAttachmentInput(null);
    setRemovePhoto(false);
    setRemoveAttachment(false);
    setEditError('');
  };

  // Save Edit Announcement
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDoc) return;
    if (!editTitle.trim()) {
      setEditError('Judul pengumuman wajib diisi.');
      return;
    }

    const targetDept = isSuperAdmin ? editDept : (currentUser.departemen || editDoc.akses_dept);

    setIsSavingEdit(true);
    setEditError('');

    try {
      let updatedDoc: IntranetDocument = {
        ...editDoc,
        title: editTitle.trim(),
        akses_dept: targetDept,
        keterangan: editKet.trim(),
        effectiveDate: editEffectiveDate,
        expiryDate: editExpiryDate,
        updatedAt: new Date().toISOString(),
      };

      if (removePhoto) {
        updatedDoc.fileUrl = '';
        updatedDoc.thumbUrl = '';
        updatedDoc.previewUrl = '';
      }

      if (editPhotoInput) {
        const compressed = await processFileForFirestore(editPhotoInput);
        updatedDoc = {
          ...updatedDoc,
          fileUrl: compressed.dataUrl,
          previewUrl: compressed.dataUrl,
          downloadUrl: compressed.dataUrl,
          thumbUrl: compressed.dataUrl,
          fileName: compressed.fileName,
          fileType: compressed.mimeType,
          fileSize: formatBytes(compressed.compressedSizeBytes),
        };
      }

      if (removeAttachment) {
        updatedDoc.attachmentUrl = undefined;
        updatedDoc.attachmentName = undefined;
        updatedDoc.attachmentType = undefined;
        updatedDoc.attachmentSize = undefined;
      }

      if (editDocAttachmentInput) {
        const compressedDoc = await processFileForFirestore(editDocAttachmentInput);
        updatedDoc = {
          ...updatedDoc,
          attachmentUrl: compressedDoc.dataUrl,
          attachmentName: compressedDoc.fileName,
          attachmentType: compressedDoc.mimeType,
          attachmentSize: formatBytes(compressedDoc.compressedSizeBytes),
        };
      }

      updateDocument(updatedDoc, currentUser);
      setEditDoc(null);
      onRefresh();
    } catch (err: any) {
      setEditError(err?.message || 'Gagal menyimpan perubahan pengumuman.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = (docId: string) => {
    deleteDocument(docId, currentUser);
    setDeleteConfirmDoc(null);
    onRefresh();
  };

  // Upload handler with compressed Firestore image
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upTitle.trim()) {
      setUploadError('Judul pengumuman wajib diisi.');
      return;
    }

    const targetDept = isSuperAdmin ? upDept : (currentUser.departemen || 'All Departments');

    setIsUploading(true);
    setUploadError('');

    try {
      let fileUrl = '';
      let thumbUrl = '';
      let fileName = '';
      let fileType = '';
      let fileSize = '';

      if (photoInput) {
        const compressedPhoto = await processFileForFirestore(photoInput);
        fileUrl = compressedPhoto.dataUrl;
        thumbUrl = compressedPhoto.dataUrl;
        fileName = compressedPhoto.fileName;
        fileType = compressedPhoto.mimeType;
        fileSize = formatBytes(compressedPhoto.compressedSizeBytes);
      }

      let attachmentUrl: string | undefined = undefined;
      let attachmentName: string | undefined = undefined;
      let attachmentType: string | undefined = undefined;
      let attachmentSize: string | undefined = undefined;

      if (docAttachmentInput) {
        const compressedDoc = await processFileForFirestore(docAttachmentInput);
        attachmentUrl = compressedDoc.dataUrl;
        attachmentName = compressedDoc.fileName;
        attachmentType = compressedDoc.mimeType;
        attachmentSize = formatBytes(compressedDoc.compressedSizeBytes);
      }

      const newDoc: IntranetDocument = {
        id: `doc-${Date.now()}`,
        title: upTitle.trim(),
        category: 'Pengumuman',
        sub_kategori: upSubcat || 'Umum',
        akses_dept: targetDept,
        keterangan: upKet.trim(),
        fileUrl,
        previewUrl: fileUrl,
        downloadUrl: fileUrl,
        thumbUrl,
        fileName: fileName || (attachmentName ? attachmentName : 'Pengumuman.txt'),
        fileType: fileType || (attachmentType ? attachmentType : 'text/plain'),
        fileSize: fileSize || (attachmentSize ? attachmentSize : '1 KB'),
        attachmentUrl,
        attachmentName,
        attachmentType,
        attachmentSize,
        uploadedBy: currentUser.nama,
        uploadedByEmail: currentUser.email,
        uploadedAt: new Date().toISOString(),
        effectiveDate: upEffectiveDate,
        expiryDate: upExpiryDate,
      };

      addDocument(newDoc, currentUser);
      setShowUploadForm(false);
      setUpTitle('');
      setUpKet('');
      setPhotoInput(null);
      setDocAttachmentInput(null);
      onRefresh();
    } catch (err: any) {
      setUploadError(err?.message || 'Gagal mengunggah pengumuman ke penyimpanan.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
            <Megaphone className="w-3.5 h-3.5" />
            <span>{currentLang === 'id' ? 'Pusat Informasi & Pengumuman Internal' : 'Internal Notices & Announcements'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            {t('headerAnnouncementsTitle', currentLang)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            {t('headerAnnouncementsSubtitle', currentLang)}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-2">
            <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs text-xs font-semibold flex items-center gap-2 border border-white/10">
              <Building2 className="w-3.5 h-3.5 text-indigo-300" />
              <span>Departemen: <strong>{currentUser.departemen}</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs text-xs font-semibold flex items-center gap-2 border border-white/10">
              <Clock className="w-3.5 h-3.5 text-emerald-300" />
              <span>Retensi Otomatis: <strong>{driveConfig.autoPruneAnnouncementsDays || 7} Hari</strong></span>
            </div>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
          <Database className="w-96 h-96 text-white" />
        </div>
      </div>

      {/* Auto Pruned Notice */}
      {autoPrunedNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{autoPrunedNotice}</span>
          </div>
          <button
            onClick={() => setAutoPrunedNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Bar (Search, Filter, Sort, Upload Button) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-announcements"
              type="text"
              placeholder="Cari judul atau isi pengumuman..."
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

          {/* Filters, Sort & Upload Controls */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
            {/* Department Filter (Admin & Manager) */}
            {isManagerOrAdmin && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  id="filter-announcement-dept"
                  value={filterDept}
                  onChange={(e) => {
                    setFilterDept(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer text-xs"
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
              Menampilkan <strong>{filteredAnnouncements.length}</strong> pengumuman aktif
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

      {/* Upload Form */}
      {showUploadForm && isManagerOrAdmin && (
        <div className="bg-white p-6 rounded-3xl border-2 border-indigo-200 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Unggah Pengumuman & Foto ke Folder Terpusat
                </h3>
                {currentUser.role === 'admin' && (
                  <p className="text-xs text-slate-500">
                    Penyimpanan Cloud: <strong>{driveConfig.photosFolder}</strong> (Masa tayang: {driveConfig.autoPruneAnnouncementsDays || 7} hari)
                  </p>
                )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Distribusi Departemen *
                </label>
                {isSuperAdmin ? (
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
                ) : (
                  <div className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-800 flex items-center justify-between shadow-2xs">
                    <span className="flex items-center gap-1.5 truncate">
                      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{currentUser.departemen || 'Departemen Anda'}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 shrink-0">
                      Khusus Departemen
                    </span>
                  </div>
                )}
                {!isSuperAdmin && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Sebagai Manager, pengumuman otomatis hanya dirilis untuk departemen Anda.
                  </p>
                )}
              </div>
            </div>

            {/* Foto Sampul & Dokumen Lampiran Tambahan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              {/* Foto / Gambar Sampul */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Image className="w-4 h-4 text-indigo-600" />
                    <span>Foto / Banner Sampul (Opsional)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">JPG, PNG, WebP</span>
                </div>
                <input
                  id="up-announcement-photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoInput(e.target.files?.[0] || null)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                />
                <p className="text-[10px] text-slate-500">
                  Jika tidak diunggah foto, pratinjau kartu otomatis abu-abu netral tanpa foto acak.
                </p>
              </div>

              {/* Dokumen Lampiran Tambahan */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Dokumen Lampiran (Opsional)</span>
                  </label>
                  <span className="text-[10px] text-indigo-600 font-mono">PDF, Word, Excel</span>
                </div>
                <input
                  id="up-announcement-doc"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={(e) => setDocAttachmentInput(e.target.files?.[0] || null)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-indigo-200 bg-white"
                />
                <p className="text-[10px] text-indigo-700">
                  Unggah berkas SOP, memo dinas, atau formulir yang dapat langsung diunduh karyawan.
                </p>
              </div>
            </div>

            {/* Input Tanggal Berlaku & Tanggal Kedaluwarsa Otomatis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-150">
              <div>
                <label className="block text-xs font-bold text-indigo-950 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tanggal Mulai Berlaku *</span>
                </label>
                <input
                  type="date"
                  required
                  value={upEffectiveDate}
                  onChange={(e) => {
                    setUpEffectiveDate(e.target.value);
                    if (upExpiryDate < e.target.value) {
                      setUpExpiryDate(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-indigo-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <p className="text-[10px] text-indigo-700 mt-1">Default: hari ini saat submit pengumuman.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-950 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Tanggal Kedaluwarsa (Expired Date) *</span>
                </label>
                <input
                  type="date"
                  required
                  value={upExpiryDate}
                  min={upEffectiveDate}
                  onChange={(e) => setUpExpiryDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-rose-300 bg-white font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-[10px] text-rose-700 mt-1">
                  Default: hari ini saat submit. Setelah tanggal ini lewat, pengumuman otomatis terhapus dari sistem & cloud storage.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi / Keterangan Pengumuman
              </label>
              <textarea
                id="up-announcement-desc"
                rows={3}
                value={upKet}
                onChange={(e) => setUpKet(e.target.value)}
                placeholder="Tuliskan rincian isi pengumuman..."
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
                <span>
                  {isUploading
                    ? (currentLang === 'en' ? 'Uploading notice...' : 'Menyimpan pengumuman...')
                    : (currentLang === 'en' ? 'Publish Announcement' : 'Unggah Pengumuman')}
                </span>
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
          <h3 className="font-bold text-slate-800 text-base">Belum Ada Pengumuman Aktif</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Pengumuman yang telah terbit lebih dari 7 hari otomatis dibersihkan oleh sistem.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAnnouncements.map((doc) => {
              const expInfo = getExpirationInfo(doc);
              const folderPath = doc.driveFolderPath || getFirestoreStoragePath('Pengumuman', doc.akses_dept, doc.fileName);

              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:border-indigo-300"
                >
                  <div>
                    {/* Card Image Banner */}
                    <AnnouncementCardBanner
                      doc={doc}
                      expInfo={expInfo}
                      onClick={() => onOpenPreview(doc)}
                    />

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <div
                        onClick={() => onOpenPreview(doc)}
                        className="cursor-pointer space-y-1"
                      >
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                          {doc.keterangan || 'Tidak ada catatan tambahan untuk pengumuman ini.'}
                        </p>
                      </div>

                      {/* Document Attachment Widget */}
                      {doc.attachmentName && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                            <div className="truncate">
                              <span className="text-[10px] uppercase font-bold text-indigo-700 block">
                                Lampiran Dokumen
                              </span>
                              <span className="font-bold text-slate-800 text-[11px] truncate block">
                                {doc.attachmentName}
                              </span>
                            </div>
                          </div>
                          {doc.attachmentUrl && (
                            <a
                              href={doc.attachmentUrl}
                              download={doc.attachmentName}
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors flex items-center gap-1 shrink-0 shadow-xs"
                              title="Unduh Berkas Lampiran"
                            >
                              <Download className="w-3 h-3" />
                              <span>Unduh</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Expiration Dates Info */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-150">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          <span>Mulai: <strong>{doc.effectiveDate || (doc.uploadedAt ? doc.uploadedAt.split('T')[0] : todayStr)}</strong></span>
                        </span>
                        <span className="flex items-center gap-1 font-bold text-rose-700">
                          <Clock className="w-3 h-3 text-rose-500" />
                          <span>Exp: {doc.expiryDate || '7 Hari'}</span>
                        </span>
                      </div>

                      {/* Folder Location Indicator - Super Admin Only */}
                      {currentUser.role === 'admin' && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded-lg border border-slate-150 truncate">
                          <Database className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="truncate">{folderPath}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-medium truncate max-w-[120px]">
                      Oleh: <strong>{doc.uploadedBy}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Edit Button */}
                      {isManagerOrAdmin && (
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors flex items-center gap-1 border border-amber-200"
                          title="Perbaharui Pengumuman"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                        </button>
                      )}

                      {/* Delete Button */}
                      {isManagerOrAdmin && (
                        <button
                          onClick={() => setDeleteConfirmDoc(doc)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors flex items-center gap-1 border border-rose-200"
                          title="Hapus Pengumuman"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        </button>
                      )}

                      <button
                        onClick={() => onOpenPreview(doc)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition-colors shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
        /* Table View */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden w-full">
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <SortableHeader
                    field="title"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="pl-6 py-4"
                  >
                    {t('thNoticeTitle', currentLang)}
                  </SortableHeader>
                  <SortableHeader
                    field="akses_dept"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="py-4"
                  >
                    {t('thTargetDept', currentLang)}
                  </SortableHeader>
                  <th className="py-4 text-center">{t('thTimeLeftAutoDelete', currentLang)}</th>
                  <SortableHeader
                    field="uploadedBy"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="py-4"
                  >
                    {t('thPublishedBy', currentLang)}
                  </SortableHeader>
                  <th className="py-4 pr-6 text-right">{t('thAction', currentLang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedAnnouncements.map((doc) => {
                  const expInfo = getExpirationInfo(doc);
                  const folderPath = doc.driveFolderPath || getFirestoreStoragePath('Pengumuman', doc.akses_dept, doc.fileName);

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-indigo-50/40 transition-colors group"
                    >
                      <td
                        className="pl-6 py-4 cursor-pointer"
                        onClick={() => onOpenPreview(doc)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 shrink-0 flex items-center justify-center border border-slate-200">
                            {doc.thumbUrl &&
                            !doc.thumbUrl.includes('unsplash.com') &&
                            (doc.fileType?.startsWith('image/') || doc.thumbUrl.startsWith('data:image/')) ? (
                              <img src={doc.thumbUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500">
                                {doc.attachmentName ? (
                                  <FileText className="w-4 h-4 text-slate-600" />
                                ) : (
                                  <Megaphone className="w-4 h-4 text-slate-500" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="truncate max-w-sm">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                              {doc.title}
                            </div>
                            {doc.attachmentName && (
                              <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-semibold mt-0.5">
                                <FileText className="w-3 h-3 shrink-0" />
                                <span className="truncate">Lampiran: {doc.attachmentName}</span>
                              </div>
                            )}
                            {doc.keterangan && (
                              <div className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">
                                {doc.keterangan}
                              </div>
                            )}
                          </div>
                        </div>
                        {currentUser.role === 'admin' && (
                          <div className="flex items-center gap-1 text-[10px] text-indigo-600/80 font-mono mt-1.5 ml-13" title="Jalur Penyimpanan Cloud">
                            <Database className="w-3 h-3 shrink-0" />
                            <span className="truncate">{folderPath}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        <DepartmentBadge department={doc.akses_dept} size="xs" />
                      </td>
                      <td className="py-4 text-center">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${expInfo.tableBadge}`}>
                            {expInfo.label}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            Exp: {doc.expiryDate || '7 Hari'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 font-medium text-slate-700">
                        {doc.uploadedBy}
                      </td>
                      <td className="py-4 pr-6 text-right space-x-1.5 whitespace-nowrap">
                        {isManagerOrAdmin && (
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold transition-colors inline-flex items-center border border-amber-200"
                            title="Edit Pengumuman"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isManagerOrAdmin && (
                          <button
                            onClick={() => setDeleteConfirmDoc(doc)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition-colors inline-flex items-center border border-rose-200"
                            title="Hapus Pengumuman"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenPreview(doc)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition-colors shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

      {/* MODAL: EDIT PENGUMUMAN & GANTI FOTO/BERKAS */}
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
                    Perbaharui Pengumuman & Foto
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ID: {editDoc.id} • Tersimpan di Folder Media & Foto
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
                  Judul Pengumuman *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Distribusi Departemen *
                </label>
                {isSuperAdmin ? (
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-medium"
                  >
                    <option value="All Departments">All Departments (Semua Karyawan)</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-800 flex items-center justify-between shadow-2xs">
                    <span className="flex items-center gap-1.5 truncate">
                      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{currentUser.departemen || editDoc.akses_dept}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 shrink-0">
                      Khusus Departemen Anda
                    </span>
                  </div>
                )}
              </div>

              {/* Upload Ganti Foto / Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Foto / Banner Sampul</span>
                  </span>
                  {editDoc.fileUrl && !removePhoto && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Ada Foto Tersimpan
                    </span>
                  )}
                  {(!editDoc.fileUrl || removePhoto) && (
                    <span className="text-[10px] text-slate-500 font-medium">
                      Tanpa Foto (Abu-abu)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setEditPhotoInput(e.target.files?.[0] || null);
                      setRemovePhoto(false);
                    }}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                  />
                  {editPhotoInput && (
                    <button
                      type="button"
                      onClick={() => setEditPhotoInput(null)}
                      className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs shrink-0"
                      title="Batalkan foto baru"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {editDoc.fileUrl && !removePhoto && !editPhotoInput && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500 truncate max-w-xs font-mono">
                      {editDoc.fileName || 'Foto Sampul'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRemovePhoto(true)}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline"
                    >
                      Hapus Foto (Ubah jadi Abu-abu)
                    </button>
                  </div>
                )}
                {removePhoto && (
                  <p className="text-[10px] text-amber-700 font-semibold">
                    Foto akan dihapus. Kartu pengumuman akan tampil abu-abu tanpa foto.
                  </p>
                )}
              </div>

              {/* Upload Ganti / Tambah Dokumen Lampiran */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Dokumen Lampiran Tambahan</span>
                  </span>
                  {editDoc.attachmentName && !removeAttachment && (
                    <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-300">
                      Ada Lampiran
                    </span>
                  )}
                  {(!editDoc.attachmentName || removeAttachment) && (
                    <span className="text-[10px] text-slate-400">
                      Belum Ada Lampiran
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={(e) => {
                      setEditDocAttachmentInput(e.target.files?.[0] || null);
                      setRemoveAttachment(false);
                    }}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-indigo-200 bg-white"
                  />
                  {editDocAttachmentInput && (
                    <button
                      type="button"
                      onClick={() => setEditDocAttachmentInput(null)}
                      className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs shrink-0"
                      title="Batalkan dokumen baru"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {editDoc.attachmentName && !removeAttachment && !editDocAttachmentInput && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-600 truncate max-w-xs font-mono">
                      Lampiran saat ini: {editDoc.attachmentName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRemoveAttachment(true)}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline"
                    >
                      Hapus Lampiran
                    </button>
                  </div>
                )}
                {removeAttachment && (
                  <p className="text-[10px] text-amber-700 font-semibold">
                    Lampiran dokumen akan dihapus saat disimpan.
                  </p>
                )}
              </div>

              {/* Edit Tanggal Berlaku & Kedaluwarsa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tanggal Mulai Berlaku</span>
                  </label>
                  <input
                    type="date"
                    value={editEffectiveDate}
                    onChange={(e) => {
                      setEditEffectiveDate(e.target.value);
                      if (editExpiryDate < e.target.value) {
                        setEditExpiryDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Tanggal Kedaluwarsa *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editExpiryDate}
                    min={editEffectiveDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-rose-300 bg-white font-bold text-rose-900"
                  />
                  <p className="text-[10px] text-rose-600 mt-1">Otomatis terhapus setelah tanggal ini lewat.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan / Rincian Pengumuman
                </label>
                <textarea
                  rows={3}
                  value={editKet}
                  onChange={(e) => setEditKet(e.target.value)}
                  placeholder="Keterangan rilis pengumuman..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
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
                      <span>Menyimpan...</span>
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

      {/* MODAL: DELETE CONFIRMATION */}
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
              <h3 className="font-bold text-slate-900 text-base">Hapus Pengumuman?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus <strong>"{deleteConfirmDoc.title}"</strong> beserta foto dan berkas lampirannya?
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
                onClick={() => handleDeleteAnnouncement(deleteConfirmDoc.id)}
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
