import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Calendar,
  Building2,
  User as UserIcon,
  Tag,
  FileText,
  Trash2,
  Edit3,
  Check,
  Database,
  AlertTriangle,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  Megaphone
} from 'lucide-react';
import { IntranetDocument, User } from '../types';
import { addAccessLog, deleteDocument, updateDocument, getDepartments } from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';
import {
  processFileForFirestore,
  formatBytes,
  downloadFileFromDataUrl,
  openFileFromDataUrl,
  dataUrlToBlob,
} from '../lib/fileCompressor';

interface DocumentPreviewModalProps {
  document: IntranetDocument | null;
  currentUser: User;
  onClose: () => void;
  onUpdate?: (updatedDoc: IntranetDocument) => void;
  onDelete?: (docId: string) => void;
  onRefresh?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document: doc,
  currentUser,
  onClose,
  onUpdate,
  onDelete,
  onRefresh,
}) => {
  if (!doc) return null;

  const departments = getDepartments();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editTitle, setEditTitle] = useState(doc.title);
  const [editDept, setEditDept] = useState(doc.akses_dept);
  const [editKeterangan, setEditKeterangan] = useState(doc.keterangan || '');
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const canManage =
    currentUser.role === 'admin' ||
    currentUser.role === 'hod' ||
    currentUser.role === 'manager';
  const folderPath = `${doc.category} / ${doc.akses_dept} / ${doc.fileName}`;

  const handleDownload = () => {
    addAccessLog({
      user: currentUser,
      actionCategory: 'DOCUMENT',
      action: 'Unduh Dokumen',
      target: doc.title,
      status: 'SUCCESS',
      details: `Berkas ID ${doc.id} (${doc.fileName}) diunduh.`,
    });

    downloadFileFromDataUrl(doc.downloadUrl || doc.fileUrl, doc.fileName);
  };

  const handleOpenExternal = () => {
    openFileFromDataUrl(doc.fileUrl || doc.downloadUrl, doc.fileName);
  };

  const handleDownloadAttachment = () => {
    if (!doc.attachmentUrl) return;
    downloadFileFromDataUrl(doc.attachmentUrl, doc.attachmentName || 'Lampiran');
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      setEditError('Judul dokumen wajib diisi.');
      return;
    }

    setIsSaving(true);
    setEditError('');

    try {
      let updated: IntranetDocument = {
        ...doc,
        title: editTitle.trim(),
        akses_dept: editDept,
        keterangan: editKeterangan.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (replacementFile) {
        const compressed = await processFileForFirestore(replacementFile);
        updated = {
          ...updated,
          fileUrl: compressed.dataUrl,
          previewUrl: compressed.dataUrl,
          downloadUrl: compressed.dataUrl,
          thumbUrl: compressed.mimeType.startsWith('image/') ? compressed.dataUrl : (updated.thumbUrl || ''),
          fileName: compressed.fileName,
          fileType: compressed.mimeType,
          fileSize: formatBytes(compressed.compressedSizeBytes),
        };
      }

      // Save to local storage & Firestore
      await updateDocument(updated, currentUser);

      if (typeof onUpdate === 'function') {
        onUpdate(updated);
      }

      if (typeof onRefresh === 'function') {
        onRefresh();
      }

      setIsEditing(false);
      setReplacementFile(null);
    } catch (err: any) {
      setEditError(err?.message || 'Gagal menyimpan perubahan berkas.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    await deleteDocument(doc.id, currentUser);
    if (typeof onDelete === 'function') {
      onDelete(doc.id);
    }
    if (typeof onRefresh === 'function') {
      onRefresh();
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  const isImage = Boolean(
    doc.fileUrl &&
      (doc.fileType?.startsWith('image/') ||
        doc.fileName?.endsWith('.jpg') ||
        doc.fileName?.endsWith('.png') ||
        doc.fileName?.endsWith('.jpeg') ||
        doc.fileName?.endsWith('.webp') ||
        doc.fileUrl.startsWith('data:image/'))
  );

  const isPdf = Boolean(
    doc.fileUrl &&
      (doc.fileType === 'application/pdf' ||
        doc.fileName?.toLowerCase().endsWith('.pdf') ||
        doc.fileUrl.startsWith('data:application/pdf'))
  );

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (!isPdf || !doc.fileUrl) {
      setPdfPreviewUrl('');
      return;
    }
    if (doc.fileUrl.startsWith('data:')) {
      const blob = dataUrlToBlob(doc.fileUrl);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      }
    }
    setPdfPreviewUrl(doc.fileUrl);
  }, [doc.fileUrl, isPdf]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-white via-[#f5f9fe] to-[#eaf3fc] border-b border-sky-200/90 text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-[#005a8d]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#005a8d] uppercase tracking-wider block">
                Penyimpanan Cloud • {doc.category}
              </span>
              <h3 className="text-base font-bold text-slate-900 truncate max-w-lg">
                {doc.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Storage Location Banner - Super Admin Only */}
          {currentUser.role === 'admin' && (
            <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900 font-mono">
              <div className="flex items-center gap-2 truncate">
                <Database className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-slate-500 font-sans">Penyimpanan Cloud:</span>
                <span className="font-bold truncate text-indigo-800">{folderPath}</span>
              </div>
              {doc.updatedAt && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-sans font-bold shrink-0">
                  Diedit
                </span>
              )}
            </div>
          )}

          {/* Preview Canvas (Image / PDF / Document Box) */}
          <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center min-h-[220px] max-h-[420px]">
            {isImage ? (
              <img
                src={doc.fileUrl}
                alt={doc.title}
                className="w-full h-full max-h-[420px] object-contain"
              />
            ) : isPdf && pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                title={doc.title}
                className="w-full h-[380px] border-0 bg-white"
              />
            ) : doc.category === 'Pengumuman' ? (
              <div className="p-8 text-center space-y-3 w-full bg-slate-200 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-300 text-slate-600 flex items-center justify-center shadow-xs">
                  {doc.attachmentName ? <FileText className="w-8 h-8" /> : <Megaphone className="w-8 h-8" />}
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">Pengumuman Tanpa Gambar Sampul</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {doc.attachmentName
                      ? `Tersedia berkas lampiran: ${doc.attachmentName}`
                      : 'Tampilan netral abu-abu tanpa foto'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{doc.fileName}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Format: {doc.fileType || 'Dokumen PDF / Berkas Digital'} • {doc.fileSize || '1.5 MB'}
                  </p>
                </div>
                {doc.fileUrl && (
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka Viewer Lengkap</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Lampiran Dokumen Tambahan */}
          {doc.attachmentUrl && (
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 truncate">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                    Dokumen Lampiran Tambahan
                  </span>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {doc.attachmentName || 'Dokumen Lampiran'}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {doc.attachmentType || 'Dokumen'} {doc.attachmentSize ? `• ${doc.attachmentSize}` : ''}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadAttachment}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Dokumen</span>
              </button>
            </div>
          )}

          {/* Details / Edit Form */}
          {!isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
                    Distribusi
                  </span>
                  <DepartmentBadge department={doc.akses_dept} size="xs" />
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Kategori
                  </span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">
                    {doc.sub_kategori || doc.category}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Pengunggah
                  </span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">
                    {doc.uploadedBy}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Tanggal Terbit
                  </span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">
                    {new Date(doc.uploadedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {doc.keterangan && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Keterangan & Catatan Berkas:
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {doc.keterangan}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Editing view */
            <div className="space-y-3.5 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Edit Informasi & Ganti Berkas
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Tersinkron ke Firebase</span>
              </div>

              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Dokumen *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Distribusi Departemen
                </label>
                <select
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                >
                  <option value="All Departments">All Departments (Seluruh Karyawan)</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Ganti Berkas */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                  <span>Ganti Berkas / Upload File Baru (Opsional)</span>
                  <span className="text-[10px] text-amber-800 font-mono">File saat ini: {doc.fileName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    onChange={(e) => setReplacementFile(e.target.files?.[0] || null)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                  />
                  {replacementFile && (
                    <button
                      type="button"
                      onClick={() => setReplacementFile(null)}
                      className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-normal text-slate-700">
                    Deskripsi / Keterangan
                  </label>
                  <span className={`text-[11px] font-normal ${editKeterangan.length >= 950 ? 'text-rose-600' : 'text-slate-400'}`}>
                    Maks. 1.000 karakter • {editKeterangan.length}/1000
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white resize-y min-h-[85px]"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  💡 Kolom dapat ditarik ke bawah untuk melihat teks panjang.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canManage && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit / Ganti Berkas</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Berkas</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {doc.fileUrl && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Berkas</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Dokumen</span>
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDeleteConfirm(false);
            }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 cursor-default"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Hapus Berkas Ini?</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                Dokumen <strong>"{doc.title}"</strong> ({doc.category}) akan dihapus dari Firebase Firestore.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
