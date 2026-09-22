import React, { useState } from 'react';
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
  HardDrive,
  AlertTriangle
} from 'lucide-react';
import { IntranetDocument, User } from '../types';
import { addAccessLog, deleteDocument, getDocuments, saveDocuments } from '../lib/storage';
import { DepartmentBadge } from '../lib/departmentColors';

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

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editTitle, setEditTitle] = useState(doc.title);
  const [editDept, setEditDept] = useState(doc.akses_dept);
  const [editKeterangan, setEditKeterangan] = useState(doc.keterangan || '');

  const canManage = currentUser.role === 'admin' || currentUser.role === 'manager';

  const handleDownload = () => {
    // Record structured access log for document download
    addAccessLog({
      user: currentUser,
      actionCategory: 'DOCUMENT',
      action: 'Unduh Dokumen Google Drive',
      target: doc.title,
      status: 'SUCCESS',
      details: `File ID ${doc.id} (${doc.fileName}) diunduh melalui link DriveApp publik.`,
    });

    // Open download url
    const link = window.document.createElement('a');
    link.href = doc.downloadUrl || doc.fileUrl;
    link.target = '_blank';
    link.download = doc.fileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return;
    const updated: IntranetDocument = {
      ...doc,
      title: editTitle.trim(),
      akses_dept: editDept,
      keterangan: editKeterangan.trim(),
    };

    const allDocs = getDocuments();
    saveDocuments(allDocs.map((d) => (d.id === updated.id ? updated : d)));

    if (typeof onUpdate === 'function') {
      onUpdate(updated);
    }

    addAccessLog({
      user: currentUser,
      actionCategory: 'DOCUMENT',
      action: 'Edit Data Dokumen',
      target: updated.title,
      status: 'SUCCESS',
      details: `Judul atau distribusi dokumen diperbarui. Distribusi: ${updated.akses_dept}`,
    });

    if (typeof onRefresh === 'function') {
      onRefresh();
    }

    setIsEditing(false);
  };

  const handleConfirmDelete = () => {
    deleteDocument(doc.id, currentUser);
    if (typeof onDelete === 'function') {
      onDelete(doc.id);
    }
    if (typeof onRefresh === 'function') {
      onRefresh();
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  const isImage =
    doc.fileType.startsWith('image/') ||
    doc.fileName.endsWith('.jpg') ||
    doc.fileName.endsWith('.png') ||
    doc.fileName.endsWith('.jpeg');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-400/30 text-indigo-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block">
                Google Drive Storage • {doc.category}
              </span>
              <h3 className="text-base font-bold text-white truncate max-w-lg">
                {doc.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Preview Canvas (Image / Document Box) */}
          <div className="rounded-2xl overflow-hidden bg-slate-950/5 border border-slate-200 flex items-center justify-center min-h-[260px] max-h-[380px]">
            {isImage ? (
              <img
                src={doc.fileUrl}
                alt={doc.title}
                className="w-full h-full max-h-[380px] object-contain"
              />
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
                <button
                  onClick={() => window.open(doc.fileUrl, '_blank')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka Viewer Lengkap</span>
                </button>
              </div>
            )}
          </div>

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
                    Keterangan & Isi Pengumuman:
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {doc.keterangan}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Editing view */
            <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                Edit Informasi Dokumen
              </h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Dokumen
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
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
                  <option value="Front Office">Front Office</option>
                  <option value="Housekeeping">Housekeeping</option>
                  <option value="Food & Beverage">Food & Beverage</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Accounting & Finance">Accounting & Finance</option>
                  <option value="Human Resources (HR)">Human Resources (HR)</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="Security">Security</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  rows={3}
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
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
                  <span>Edit Data</span>
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
            <button
              onClick={() => window.open(doc.fileUrl, '_blank')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Drive Link</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Dokumen</span>
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
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
                Dokumen <strong>"{doc.title}"</strong> ({doc.category}) akan dihapus dari arsip intranet.
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
