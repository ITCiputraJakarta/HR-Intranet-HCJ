import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  CheckCircle2,
  Building2,
  Sparkles,
  ShieldAlert,
  Loader2,
  Info
} from 'lucide-react';
import { User } from '../types';
import { Language, t } from '../lib/i18n';
import {
  getAppBranding,
  saveAppBranding,
  uploadCustomLogo,
  resetCustomLogo,
  AppBranding
} from '../lib/branding';
import { addAccessLog } from '../lib/storage';

interface BrandingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  currentLang?: Language;
}

export const BrandingSettingsModal: React.FC<BrandingSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLang = 'id',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [branding, setBranding] = useState<AppBranding>(getAppBranding());
  const [appName, setAppName] = useState(branding.appName);
  const [subTitle, setSubTitle] = useState(branding.subTitle);
  const [creatorSignature, setCreatorSignature] = useState(branding.creatorSignature || 'Created by Bagas Prasetyo • 2026');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isId = currentLang === 'id';

  useEffect(() => {
    if (isOpen) {
      const current = getAppBranding();
      setBranding(current);
      setAppName(current.appName);
      setSubTitle(current.subTitle);
      setCreatorSignature(current.creatorSignature || 'Created by Bagas Prasetyo • 2026');
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Super Admin security check
  if (currentUser.role !== 'admin') {
    return (
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 cursor-default"
        >
          <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Akses Dibatasi</h3>
          <p className="text-xs text-slate-600">
            Hanya Super Admin yang berwenang mengubah logo dan nama portal Intranet HCJ.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({
        type: 'error',
        text: isId ? 'Berkas harus berupa gambar (PNG, JPG, SVG, WebP).' : 'File must be an image.',
      });
      return;
    }

    setIsUploading(true);
    setFeedback(null);
    try {
      const newLogoUrl = await uploadCustomLogo(file, currentUser.email);
      setBranding((prev) => ({ ...prev, customLogoUrl: newLogoUrl }));
      setFeedback({
        type: 'success',
        text: isId
          ? 'Logo baru berhasil diunggah dan dikompresi ke format ultra-ringan!'
          : 'New logo uploaded and compressed to lightweight format!',
      });

      addAccessLog({
        user: currentUser,
        actionCategory: 'SYSTEM',
        action: 'Update Logo Portal HCJ',
        target: file.name,
        status: 'SUCCESS',
        details: `Super Admin ${currentUser.nama} memperbarui logo portal Intranet HCJ.`,
      });
    } catch (err: any) {
      console.error('Upload logo error:', err);
      setFeedback({
        type: 'error',
        text: err?.message || (isId ? 'Gagal mengunggah logo.' : 'Failed to upload logo.'),
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetLogo = async () => {
    const confirmed = window.confirm(
      isId
        ? 'Kembalikan logo portal ke logo default sistem?'
        : 'Reset portal logo to system default?'
    );
    if (!confirmed) return;

    setIsUploading(true);
    try {
      await resetCustomLogo(currentUser.email);
      setBranding((prev) => ({ ...prev, customLogoUrl: null }));
      setFeedback({
        type: 'success',
        text: isId ? 'Logo dikembalikan ke default.' : 'Logo reset to default.',
      });

      addAccessLog({
        user: currentUser,
        actionCategory: 'SYSTEM',
        action: 'Reset Logo Portal HCJ',
        target: 'Default Hotel Icon',
        status: 'SUCCESS',
        details: `Super Admin ${currentUser.nama} mereset logo portal ke default icon.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal reset logo.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveTextBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) return;

    setIsSaving(true);
    try {
      await saveAppBranding(
        {
          appName: appName.trim(),
          subTitle: subTitle.trim(),
          creatorSignature: creatorSignature.trim() || 'Created by Bagas Prasetyo • 2026',
        },
        currentUser.email
      );

      setFeedback({
        type: 'success',
        text: isId
          ? 'Identitas portal berhasil disimpan dan disinkronkan ke seluruh sistem!'
          : 'Portal branding successfully saved and synced across system!',
      });

      addAccessLog({
        user: currentUser,
        actionCategory: 'SYSTEM',
        action: 'Update Identitas Portal HCJ',
        target: appName.trim(),
        status: 'SUCCESS',
        details: `Nama portal diubah menjadi "${appName.trim()}" oleh Super Admin.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal menyimpan nama portal.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 cursor-default"
      >
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">
                {isId ? 'Pengaturan Logo & Identitas Portal' : 'Portal Logo & Branding Settings'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isId
                  ? 'Khusus Super Admin • Berlaku di Login Page & Pojok Kiri Atas'
                  : 'Super Admin Only • Applied on Login & Top-Left Corner'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-3 rounded-2xl flex items-start gap-2.5 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Logo Section */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {isId ? 'Logo Portal Saat Ini' : 'Current Portal Logo'}
              </span>
              <span className="text-[11px] text-indigo-600 font-semibold">
                {branding.customLogoUrl ? (isId ? 'Logo Kustom Aktif' : 'Custom Logo Active') : (isId ? 'Default Icon' : 'Default Icon')}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Preview Box */}
              <div className="w-20 h-20 rounded-2xl bg-white border-2 border-indigo-100 shadow-sm flex items-center justify-center p-2 overflow-hidden shrink-0">
                {branding.customLogoUrl ? (
                  <img
                    src={branding.customLogoUrl}
                    alt="Current Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoFileChange}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  id="custom-logo-file-input"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isId ? 'Mengompres & Menyimpan...' : 'Compressing...'}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>{isId ? 'Pilih & Upload Logo Baru' : 'Upload New Logo'}</span>
                    </>
                  )}
                </button>

                {branding.customLogoUrl && (
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    disabled={isUploading}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isId ? 'Kembalikan ke Default' : 'Reset to Default'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                {isId
                  ? 'Logo otomatis dioptimasi ke WebP ukuran ultra-kecil (<25KB) agar tidak membebani kuota bulanan Firestore dan tampil tajam di semua perangkat.'
                  : 'Logos are automatically compressed to ultra-light WebP (<25KB) to preserve Firestore quota.'}
              </span>
            </div>
          </div>

          {/* Text Branding Form */}
          <form onSubmit={handleSaveTextBranding} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isId ? 'Nama Singkat Portal' : 'Short Portal Name'}
              </label>
              <input
                type="text"
                required
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Intranet HCJ"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {isId ? 'Default: "Intranet HCJ"' : 'Default: "Intranet HCJ"'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isId ? 'Subjudul / Keterangan Portal' : 'Portal Subtitle'}
              </label>
              <input
                type="text"
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                placeholder="Portal Dokumen & Evaluasi Kinerja"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isId ? 'Tanda Tangan / Signatur Pengembang' : 'Developer Signature'}
              </label>
              <input
                type="text"
                value={creatorSignature}
                onChange={(e) => setCreatorSignature(e.target.value)}
                placeholder="Created by Bagas Prasetyo • 2026"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Default: &quot;Created by Bagas Prasetyo • 2026 ttd&quot;
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {isId ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isId ? 'Menyimpan...' : 'Saving...'}</span>
                  </>
                ) : (
                  <span>{isId ? 'Simpan Perubahan' : 'Save Changes'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
