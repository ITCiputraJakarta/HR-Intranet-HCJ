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
  FileText,
  Grid,
} from 'lucide-react';
import { User } from '../types';
import { Language } from '../lib/i18n';
import {
  getAppBranding,
  saveAppBranding,
  uploadCustomLogo,
  resetCustomLogo,
  uploadCustomBg,
  resetCustomBg,
  uploadGalleryImage,
  resetGalleryImage,
  subscribeToAppBranding,
  AppBranding,
  DEFAULT_BRANDING,
  DEFAULT_GALLERY_CAPTIONS,
  GalleryItemCaption,
} from '../lib/branding';
import { addAccessLog } from '../lib/storage';
import { UnifiedLogo } from './common/UnifiedLogo';

import defaultHeroBright from '../assets/images/hero_bright_hotel_lounge_1790666713075.jpg';
import defaultGallery1 from '../assets/images/gallery_hotel_decor_lounge_1790666726376.jpg';
import defaultGallery2 from '../assets/images/gallery_hotel_suite_bed_1790666738422.jpg';
import defaultGallery3 from '../assets/images/gallery_hotel_artisan_wall_1790666750842.jpg';
import defaultGallery4 from '../assets/images/gallery_hotel_pantry_cafe_1790666762438.jpg';

const DEFAULT_GALLERY = [defaultGallery1, defaultGallery2, defaultGallery3, defaultGallery4];

interface BrandingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  currentLang?: Language;
  onBrandingSaved?: () => void;
}

export const BrandingSettingsModal: React.FC<BrandingSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLang = 'id',
  onBrandingSaved,
}) => {
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);

  const [activeSection, setActiveSection] = useState<'main' | 'gallery' | 'text'>('main');
  const [branding, setBranding] = useState<AppBranding>(getAppBranding());

  // Editable Hero Showcase fields (Marina Bay Sands Style)
  const [heroBadge, setHeroBadge] = useState(
    branding.heroBadge || DEFAULT_BRANDING.heroBadge
  );
  const [heroTitle, setHeroTitle] = useState(
    branding.heroTitle || DEFAULT_BRANDING.heroTitle
  );
  const [heroDescription, setHeroDescription] = useState(
    branding.heroDescription || DEFAULT_BRANDING.heroDescription
  );

  // Editable Gallery Captions (4 items: tag, title, subtitle)
  const [galleryCaptions, setGalleryCaptions] = useState<GalleryItemCaption[]>(
    branding.galleryCaptions || DEFAULT_GALLERY_CAPTIONS
  );

  // Editable Header & Footer text fields
  const [appName, setAppName] = useState(branding.appName);
  const [subTitle, setSubTitle] = useState(branding.subTitle);
  const [footerTitle, setFooterTitle] = useState(
    branding.footerTitle || DEFAULT_BRANDING.footerTitle
  );
  const [footerDescription, setFooterDescription] = useState(
    branding.footerDescription || DEFAULT_BRANDING.footerDescription
  );
  const [footerBottomTitle, setFooterBottomTitle] = useState(
    branding.footerBottomTitle || DEFAULT_BRANDING.footerBottomTitle
  );
  const [galleryTitle, setGalleryTitle] = useState(
    branding.galleryTitle || DEFAULT_BRANDING.galleryTitle
  );
  const [footerContact, setFooterContact] = useState(
    branding.footerContact || DEFAULT_BRANDING.footerContact
  );
  const [creatorSignature, setCreatorSignature] = useState(
    branding.creatorSignature || DEFAULT_BRANDING.creatorSignature
  );

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [uploadingGalleryIdx, setUploadingGalleryIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const isId = currentLang === 'id';

  useEffect(() => {
    if (isOpen) {
      const current = getAppBranding();
      setBranding(current);
      setHeroBadge(current.heroBadge || DEFAULT_BRANDING.heroBadge);
      setHeroTitle(current.heroTitle || DEFAULT_BRANDING.heroTitle);
      setHeroDescription(current.heroDescription || DEFAULT_BRANDING.heroDescription);
      setGalleryCaptions(
        current.galleryCaptions && current.galleryCaptions.length === 4
          ? current.galleryCaptions.map((c) => ({ ...c }))
          : DEFAULT_GALLERY_CAPTIONS.map((c) => ({ ...c }))
      );
      setAppName(current.appName || DEFAULT_BRANDING.appName);
      setSubTitle(current.subTitle ?? DEFAULT_BRANDING.subTitle);
      setFooterTitle(current.footerTitle ?? DEFAULT_BRANDING.footerTitle);
      setFooterDescription(current.footerDescription ?? DEFAULT_BRANDING.footerDescription);
      setFooterBottomTitle(current.footerBottomTitle ?? DEFAULT_BRANDING.footerBottomTitle);
      setGalleryTitle(current.galleryTitle ?? DEFAULT_BRANDING.galleryTitle);
      setFooterContact(current.footerContact ?? DEFAULT_BRANDING.footerContact);
      setCreatorSignature(current.creatorSignature || DEFAULT_BRANDING.creatorSignature);
      setFeedback(null);
    }
    const unsub = subscribeToAppBranding((updated) => {
      setBranding(updated);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

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
            Hanya Super Admin yang berwenang mengubah logo, foto utama, galeri, dan narasi tampilan
            awal portal.
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
      setFeedback({ type: 'error', text: 'Berkas logo harus berupa gambar.' });
      return;
    }

    setIsUploadingLogo(true);
    setFeedback(null);
    try {
      const newLogoUrl = await uploadCustomLogo(file, currentUser.email);
      setBranding((prev) => ({ ...prev, customLogoUrl: newLogoUrl }));
      setFeedback({
        type: 'success',
        text: 'Logo berhasil diunggah & disinkronkan ke tampilan awal dan header!',
      });
      addAccessLog({
        user: currentUser,
        actionCategory: 'SYSTEM',
        action: 'Update Logo Portal HCJ',
        target: file.name,
        status: 'SUCCESS',
        details: `Super Admin ${currentUser.nama} memperbarui logo portal.`,
      });
      onBrandingSaved?.();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal mengunggah logo.' });
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleResetLogo = async () => {
    setIsUploadingLogo(true);
    setFeedback(null);
    try {
      await resetCustomLogo(currentUser.email);
      setBranding((prev) => ({ ...prev, customLogoUrl: null }));
      setFeedback({ type: 'success', text: 'Logo dikembalikan ke ikon default.' });
      onBrandingSaved?.();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal reset logo.' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleBgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', text: 'Foto latar harus berupa gambar.' });
      return;
    }

    setIsUploadingBg(true);
    setFeedback(null);
    try {
      const newBgUrl = await uploadCustomBg(file, currentUser.email);
      setBranding((prev) => ({ ...prev, customBgUrl: newBgUrl }));
      setFeedback({
        type: 'success',
        text: 'Foto utama tampilan awal berhasil diperbarui di Cloud Firestore!',
      });
      addAccessLog({
        user: currentUser,
        actionCategory: 'SYSTEM',
        action: 'Update Foto Utama Tampilan Awal',
        target: file.name,
        status: 'SUCCESS',
        details: `Super Admin ${currentUser.nama} mengubah foto latar tampilan awal.`,
      });
      onBrandingSaved?.();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal mengunggah foto.' });
    } finally {
      setIsUploadingBg(false);
      if (bgInputRef.current) bgInputRef.current.value = '';
    }
  };

  const handleResetBg = async () => {
    setIsUploadingBg(true);
    setFeedback(null);
    try {
      await resetCustomBg(currentUser.email);
      setBranding((prev) => ({ ...prev, customBgUrl: null }));
      setFeedback({ type: 'success', text: 'Foto utama dikembalikan ke default.' });
      onBrandingSaved?.();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal reset foto.' });
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleSaveHeroShowcaseText = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      await saveAppBranding(
        {
          heroBadge: heroBadge.trim() || DEFAULT_BRANDING.heroBadge,
          heroTitle: heroTitle.trim() || DEFAULT_BRANDING.heroTitle,
          heroDescription: heroDescription.trim() || DEFAULT_BRANDING.heroDescription,
        },
        currentUser.email
      );
      setFeedback({
        type: 'success',
        text: 'Kata-kata & Narasi Hero Utama pada halaman login berhasil diperbarui di Cloud Firestore!',
      });
      onBrandingSaved?.();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal menyimpan narasi hero.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGalleryFileChange = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', text: 'Foto galeri harus berupa gambar.' });
      return;
    }

    setUploadingGalleryIdx(index);
    setFeedback(null);
    try {
      await uploadGalleryImage(index, file, currentUser.email);
      setFeedback({
        type: 'success',
        text: `Foto Galeri & Highlight #${index + 1} berhasil diperbarui!`,
      });
      onBrandingSaved?.();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal mengunggah foto galeri.' });
    } finally {
      setUploadingGalleryIdx(null);
      const ref = galleryInputRefs.current[index];
      if (ref) ref.value = '';
    }
  };

  const handleResetGallerySlot = async (index: number) => {
    setUploadingGalleryIdx(index);
    setFeedback(null);
    try {
      await resetGalleryImage(index, currentUser.email);
      setFeedback({
        type: 'success',
        text: `Foto Galeri & Highlight #${index + 1} dikembalikan ke default.`,
      });
      onBrandingSaved?.();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal mereset foto galeri.' });
    } finally {
      setUploadingGalleryIdx(null);
    }
  };

  const handleCaptionChange = (
    idx: number,
    field: keyof GalleryItemCaption,
    value: string
  ) => {
    setGalleryCaptions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSaveGalleryCaptions = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      await saveAppBranding(
        {
          galleryCaptions,
          galleryTitle: galleryTitle.trim() || DEFAULT_BRANDING.galleryTitle,
        },
        currentUser.email
      );
      setFeedback({
        type: 'success',
        text: 'Judul & kata-kata pada ke-4 foto galeri tampilan awal berhasil disimpan ke Cloud Firestore!',
      });
      onBrandingSaved?.();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal menyimpan kata-kata galeri.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTextBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) return;

    setIsSaving(true);
    setFeedback(null);
    try {
      await saveAppBranding(
        {
          appName: appName.trim(),
          subTitle: subTitle.trim(),
          heroBadge: heroBadge.trim() || DEFAULT_BRANDING.heroBadge,
          heroTitle: heroTitle.trim() || DEFAULT_BRANDING.heroTitle,
          heroDescription: heroDescription.trim() || DEFAULT_BRANDING.heroDescription,
          footerTitle: footerTitle.trim(),
          footerDescription: footerDescription.trim(),
          footerBottomTitle: footerBottomTitle.trim(),
          galleryTitle: galleryTitle.trim(),
          galleryCaptions,
          footerContact: footerContact.trim(),
          creatorSignature: creatorSignature.trim() || DEFAULT_BRANDING.creatorSignature,
        },
        currentUser.email
      );

      setFeedback({
        type: 'success',
        text: 'Seluruh teks Header, Hero, dan Footer berhasil disimpan ke Cloud Firestore!',
      });
      onBrandingSaved?.();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal menyimpan pengaturan.' });
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
        className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 cursor-default flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#005a8d] text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900">
                {isId
                  ? 'Pengaturan Tampilan Awal (Gaya Marina Bay Sands), Foto & Kata-Kata'
                  : 'Landing Page Showcase, Photos & Editorial Text Settings'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isId
                  ? 'Khusus Super Admin • Ubah foto & kata-kata tampilan awal secara real-time'
                  : 'Super Admin Only • Real-Time Synced with Cloud Firestore'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="px-6 pt-3 bg-slate-50/60 border-b border-slate-200 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSection('main')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'main'
                ? 'border-[#005a8d] text-[#005a8d] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{isId ? '1. Logo, Foto & Kata-Kata Hero' : '1. Logo, Hero Photo & Text'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('gallery')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'gallery'
                ? 'border-[#005a8d] text-[#005a8d] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>
              {isId
                ? '2. 4 Foto & Kata-Kata Galeri / Highlight'
                : '2. 4 Gallery Photos & Captions'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('text')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'text'
                ? 'border-[#005a8d] text-[#005a8d] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isId ? '3. Header & Footer Bawah' : '3. Header & Footer Text'}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{feedback.text}</span>
            </div>
          )}

          {activeSection === 'main' && (
            <div className="space-y-5">
              {/* 1. Custom Logo & Main Hero Photo Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Custom Logo Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {isId ? 'Logo Pojok Kiri Atas' : 'Top-Left Logo'}
                    </span>
                    <span className="text-[11px] text-[#005a8d] font-semibold">
                      {branding.customLogoUrl ? 'Logo Kustom Aktif' : 'Logo Default'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <UnifiedLogo customLogoUrl={branding.customLogoUrl} size="2xl" />

                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoFileChange}
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#005a8d] hover:bg-[#004872] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isUploadingLogo ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Ganti Logo</span>
                          </>
                        )}
                      </button>

                      {branding.customLogoUrl && (
                        <button
                          type="button"
                          onClick={handleResetLogo}
                          disabled={isUploadingLogo}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Default</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Hero Photo Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {isId ? 'Foto Latar Utama (Hero Login)' : 'Main Login Hero Photo'}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      {branding.customBgUrl ? 'Foto Kustom Aktif' : 'Foto Default'}
                    </span>
                  </div>

                  <div className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <img
                      src={branding.customBgUrl || defaultHeroBright}
                      alt="Hero Preview"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={bgInputRef}
                      onChange={handleBgFileChange}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => bgInputRef.current?.click()}
                      disabled={isUploadingBg}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isUploadingBg ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Ganti Foto Utama</span>
                        </>
                      )}
                    </button>

                    {branding.customBgUrl && (
                      <button
                        type="button"
                        onClick={handleResetBg}
                        disabled={isUploadingBg}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Marina Bay Sands Editorial Hero Text Settings */}
              <form
                onSubmit={handleSaveHeroShowcaseText}
                className="p-4 sm:p-5 rounded-2xl bg-sky-50/50 border border-sky-200/90 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-[#004872]">
                      Kata-Kata &amp; Narasi Hero Utama (Sisi Kiri Halaman Login)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Tampil di sisi kiri foto utama halaman login (seperti gaya editorial Marina
                      Bay Sands)
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Label Kategori / Badge Atas Hero
                  </label>
                  <input
                    type="text"
                    value={heroBadge}
                    onChange={(e) => setHeroBadge(e.target.value)}
                    placeholder="LUXURY HOSPITALITY • SWISS-BELHOTEL INTERNATIONAL"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#005a8d] font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Judul Besar Hero Utama (Headline)
                  </label>
                  <input
                    type="text"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="Keanggunan Layanan & Standar Operasional Kelas Dunia"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#005a8d] font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deskripsi / Narasi Hero Utama
                  </label>
                  <textarea
                    rows={2}
                    value={heroDescription}
                    onChange={(e) => setHeroDescription(e.target.value)}
                    placeholder="Selamat datang di Portal Digital Eksekutif & Karyawan Hotel Ciputra Jakarta..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#005a8d] text-slate-800"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-[#005a8d] hover:bg-[#004872] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Kata-Kata Hero</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeSection === 'gallery' && (
            <form onSubmit={handleSaveGalleryCaptions} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-slate-600">
                  {isId
                    ? 'Atur 4 foto fasilitas beserta kategori, judul, dan kata-kata penjelasannya (dapat diklik pada halaman login untuk mengganti tampilan slide):'
                    : 'Customize the 4 highlight photos and their editorial titles & descriptions:'}
                </p>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-[#005a8d] hover:bg-[#004872] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Semua Kata-Kata Galeri</span>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((idx) => {
                  const customImg = branding.galleryImages?.[idx];
                  const activeImg = customImg || DEFAULT_GALLERY[idx];
                  const isBusy = uploadingGalleryIdx === idx;
                  const cap = galleryCaptions[idx] || DEFAULT_GALLERY_CAPTIONS[idx];

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0">
                          <img
                            src={activeImg}
                            alt={`Galeri ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <span className="text-xs font-extrabold text-[#004872] block">
                            Slide &amp; Galeri Foto #{idx + 1}
                          </span>
                          <input
                            type="file"
                            ref={(el) => {
                              galleryInputRefs.current[idx] = el;
                            }}
                            onChange={(e) => handleGalleryFileChange(idx, e)}
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => galleryInputRefs.current[idx]?.click()}
                              disabled={isBusy}
                              className="py-1.5 px-3 rounded-lg bg-[#005a8d] hover:bg-[#004872] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="w-3 h-3" />
                                  <span>Ganti Foto</span>
                                </>
                              )}
                            </button>
                            {customImg && (
                              <button
                                type="button"
                                onClick={() => handleResetGallerySlot(idx)}
                                disabled={isBusy}
                                className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold cursor-pointer"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1 border-t border-slate-200/80">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">
                            Label Kategori (Tag)
                          </label>
                          <input
                            type="text"
                            value={cap.tag}
                            onChange={(e) => handleCaptionChange(idx, 'tag', e.target.value)}
                            placeholder="SUITES & ACCOMMODATION"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">
                            Judul Foto / Fasilitas
                          </label>
                          <input
                            type="text"
                            value={cap.title}
                            onChange={(e) => handleCaptionChange(idx, 'title', e.target.value)}
                            placeholder="Executive & Presidential Suites"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">
                            Kata-Kata Penjelasan Singkat
                          </label>
                          <input
                            type="text"
                            value={cap.subtitle}
                            onChange={(e) => handleCaptionChange(idx, 'subtitle', e.target.value)}
                            placeholder="Kemewahan akomodasi berstandar internasional..."
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </form>
          )}

          {activeSection === 'text' && (
            <form onSubmit={handleSaveTextBranding} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isId ? 'Judul Header Kiri Atas' : 'Top-Left Header Title'}
                  </label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Intranet HCJ"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#005a8d] font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isId ? 'Subjudul Portal (Internal)' : 'Portal Subtitle'}
                  </label>
                  <input
                    type="text"
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                    placeholder="Hotel Ciputra Jakarta"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#005a8d] text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isId ? 'Judul Kiri Bawah (Footer)' : 'Bottom-Left Heading'}
                  </label>
                  <input
                    type="text"
                    value={footerTitle}
                    onChange={(e) => setFooterTitle(e.target.value)}
                    placeholder="Hotel Ciputra Jakarta"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#005a8d] font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isId ? 'Judul Galeri Kanan Bawah' : 'Bottom-Right Gallery Heading'}
                  </label>
                  <input
                    type="text"
                    value={galleryTitle}
                    onChange={(e) => setGalleryTitle(e.target.value)}
                    placeholder="Destinasi & Fasilitas Unggulan Hotel"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#005a8d] font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isId ? 'Deskripsi Kiri Bawah (Footer)' : 'Bottom-Left Description'}
                </label>
                <textarea
                  rows={2}
                  value={footerDescription}
                  onChange={(e) => setFooterDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#005a8d] text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isId ? 'Kontak Bantuan IT & HRD (Footer)' : 'IT & HRD Contact'}
                  </label>
                  <input
                    type="text"
                    value={footerContact}
                    onChange={(e) => setFooterContact(e.target.value)}
                    placeholder="Layanan Bantuan IT & HRD: it@hotelciputra.com"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#005a8d] font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isId ? 'Signatur Pengembang' : 'Signature'}
                  </label>
                  <input
                    type="text"
                    value={creatorSignature}
                    onChange={(e) => setCreatorSignature(e.target.value)}
                    placeholder="JBagas"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#005a8d] text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#005a8d] hover:bg-[#004872] rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan Teks</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
