import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Image as ImageIcon,
  Layout,
  MessageSquare,
  HelpCircle,
  Eye,
  Flame,
  Check,
  Upload,
  Link,
  X,
  Shield,
  Layers,
  ArrowRight,
  Briefcase,
  Star,
  Quote,
  Compass,
  FileText,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Info,
  Hotel
} from 'lucide-react';
import { HomeCmsContent, HomeCmsTestimonial, HomeCmsServiceItem, User } from '../types';
import {
  getHomeCmsContent,
  saveHomeCmsContent,
  DEFAULT_HOME_CMS,
} from '../lib/cmsService';
import {
  getAppBranding,
  subscribeToAppBranding,
  uploadCustomLogo,
  resetCustomLogo,
  AppBranding
} from '../lib/branding';
import { compressImageFile } from '../lib/fileCompressor';
import { getBackdropProps } from '../lib/modalHelper';

interface HomeCmsAdminViewProps {
  currentUser: User;
  onPreviewPublicHome?: () => void;
}

type SectionKey = 'hero' | 'services' | 'about' | 'testimonials' | 'news' | 'security' | 'footer';

interface ImageUploadFieldProps {
  label: string;
  helperText?: string;
  value: string;
  onChange: (url: string) => void;
  aspectRatio?: 'landscape' | 'square' | 'portrait';
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  helperText,
  value,
  onChange,
  aspectRatio = 'landscape',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setUploadError('Harap pilih file gambar (JPG, PNG, atau WebP)');
        return;
      }
      if (file.size > 1.5 * 1024 * 1024) {
        setUploadError('Ukuran gambar melebihi batas 1.5MB. Harap gunakan gambar yang lebih ringkas.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onChange(reader.result);
        }
      };
      reader.onerror = () => {
        setUploadError('Gagal membaca berkas gambar.');
      };
      reader.readAsDataURL(file);
    }
  };

  const previewClasses =
    aspectRatio === 'square'
      ? 'w-20 h-20 rounded-2xl'
      : aspectRatio === 'portrait'
      ? 'w-24 h-32 rounded-2xl'
      : 'w-36 h-24 rounded-2xl';

  return (
    <div className="space-y-2 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-normal text-[#2F327D]">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setIsUrlMode(!isUrlMode)}
          className="text-[11px] text-[#F48C06] hover:underline inline-flex items-center gap-1 cursor-pointer font-normal"
        >
          {isUrlMode ? (
            <>
              <Upload className="w-3 h-3" />
              <span>Ganti ke Upload Berkas</span>
            </>
          ) : (
            <>
              <Link className="w-3 h-3" />
              <span>Ganti ke Input URL</span>
            </>
          )}
        </button>
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-500 font-normal">{helperText}</p>
      )}

      {/* Upload or URL Input */}
      {isUrlMode ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-orange-50/50 border border-slate-200 hover:border-[#F48C06] text-xs font-normal text-[#2F327D] hover:text-[#F48C06] shadow-2xs transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#F48C06]" />
            <span>Pilih Berkas Foto / Upload</span>
          </button>
          <span className="text-[11px] text-slate-400 font-normal">
            Format: PNG, JPG, WebP (Maks 1.5MB)
          </span>
        </div>
      )}

      {uploadError && (
        <p className="text-[11px] text-rose-600 font-normal">{uploadError}</p>
      )}

      {/* Image Preview */}
      {value && (
        <div className="flex items-center gap-3 pt-2">
          <div className={`overflow-hidden border border-slate-200 shadow-2xs bg-white shrink-0 ${previewClasses}`}>
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-normal border border-emerald-200">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Gambar Siap Tampil</span>
            </span>
            <p className="text-[10.5px] text-slate-400 truncate font-mono">
              {value.startsWith('data:') ? 'Berkas Base64 Tersimpan' : value}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export const HomeCmsAdminView: React.FC<HomeCmsAdminViewProps> = ({
  currentUser,
  onPreviewPublicHome,
}) => {
  const [formData, setFormData] = useState<HomeCmsContent>(getHomeCmsContent());
  const [activeSection, setActiveSection] = useState<SectionKey>('hero');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [branding, setBranding] = useState<AppBranding>(() => getAppBranding());
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAppBranding((b) => setBranding(b));
    return () => unsub();
  }, []);

  // Testimonial modal state
  const [newTestimonialName, setNewTestimonialName] = useState('');
  const [newTestimonialRole, setNewTestimonialRole] = useState('');
  const [newTestimonialQuote, setNewTestimonialQuote] = useState('');
  const [newTestimonialPhoto, setNewTestimonialPhoto] = useState('');
  const [newTestimonialRating, setNewTestimonialRating] = useState(5);
  const [showAddTestimonial, setShowAddTestimonial] = useState(false);

  // Navigator Sections List
  const navSections: Array<{ key: SectionKey; label: string; icon: React.ReactNode; desc: string }> = [
    {
      key: 'hero',
      label: '1. Hero Banner & Visual',
      icon: <Sparkles className="w-4 h-4 text-[#F48C06]" />,
      desc: 'Logo resmi, latar belakang, judul, narasi, CTA & foto utama',
    },
    {
      key: 'services',
      label: '2. Layanan Terintegrasi',
      icon: <Layers className="w-4 h-4 text-indigo-600" />,
      desc: '2 kartu pilar layanan: Arsip SOP & Evaluasi Kinerja (KPI)',
    },
    {
      key: 'about',
      label: '3. Mengapa Portal Penting',
      icon: <Compass className="w-4 h-4 text-emerald-600" />,
      desc: 'Penjelasan fitur, foto aktivitas & statistik efisiensi',
    },
    {
      key: 'testimonials',
      label: '4. Testimoni Karyawan',
      icon: <MessageSquare className="w-4 h-4 text-amber-600" />,
      desc: 'Daftar ulasan karyawan, foto profil, rating & jabatan',
    },
    {
      key: 'news',
      label: '5. Berita & Pengumuman',
      icon: <FileText className="w-4 h-4 text-sky-600" />,
      desc: 'Sinkronisasi pengumuman intranet ke beranda publik',
    },
    {
      key: 'security',
      label: '6. Jaminan Keamanan Data',
      icon: <Shield className="w-4 h-4 text-teal-600" />,
      desc: 'Banner jaminan keamanan sistem & multi-role audit',
    },
    {
      key: 'footer',
      label: '7. Kontak & Informasi Footer',
      icon: <Mail className="w-4 h-4 text-rose-600" />,
      desc: 'Nomor telepon, email resmi, alamat & hak cipta',
    },
  ];

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const url = await uploadCustomLogo(file, currentUser.email);
      setBranding((prev) => ({ ...prev, customLogoUrl: url }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleResetLogo = async () => {
    setIsUploadingLogo(true);
    try {
      await resetCustomLogo(currentUser.email);
      setBranding((prev) => ({ ...prev, customLogoUrl: null }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleHeroBgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBg(true);
    try {
      const compressed = await compressImageFile(file, 1600, 0.85);
      setFormData((prev) => ({ ...prev, heroImageUrl: compressed.dataUrl }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    await saveHomeCmsContent(formData);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        'Kembalikan seluruh konten Halaman Beranda ke pengaturan standar Hotel Ciputra Jakarta?'
      )
    ) {
      setFormData(DEFAULT_HOME_CMS);
      saveHomeCmsContent(DEFAULT_HOME_CMS);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleAddTestimonial = () => {
    if (!newTestimonialName.trim() || !newTestimonialQuote.trim()) return;
    const newT: HomeCmsTestimonial = {
      id: `t-${Date.now()}`,
      name: newTestimonialName.trim(),
      role: newTestimonialRole.trim() || 'Staf Hotel Ciputra',
      quote: newTestimonialQuote.trim(),
      photoUrl:
        newTestimonialPhoto.trim() ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
      rating: newTestimonialRating,
    };
    setFormData((prev) => ({
      ...prev,
      testimonials: [...prev.testimonials, newT],
    }));
    setNewTestimonialName('');
    setNewTestimonialRole('');
    setNewTestimonialQuote('');
    setNewTestimonialPhoto('');
    setShowAddTestimonial(false);
  };

  const handleDeleteTestimonial = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      testimonials: prev.testimonials.filter((t) => t.id !== id),
    }));
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-orange-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-normal bg-[#FFF3E4] text-[#F48C06] border border-[#F48C06]/30">
              CMS Super Admin
            </span>
            <span className="text-xs text-slate-400 font-normal">
              Sinkronisasi Cloud Firestore & LocalStorage
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-normal text-[#2F327D] tracking-tight">
            Navigator & Pengelola Konten Beranda (Home CMS)
          </h2>
          <p className="text-xs text-[#696984] font-normal mt-0.5">
            Gunakan panel navigator di sebelah kiri untuk berpindah dan mengedit seluruh bagian beranda utama secara terperinci.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onPreviewPublicHome && (
            <button
              type="button"
              onClick={onPreviewPublicHome}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-[#F48C06] text-xs font-normal text-[#2F327D] hover:text-[#F48C06] transition flex items-center gap-1.5 cursor-pointer bg-white shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-[#F48C06]" />
              <span>Lihat Tampilan Beranda</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-normal text-slate-600 transition flex items-center gap-1 cursor-pointer shadow-2xs"
            title="Reset ke Template Awal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Standar</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-[#F48C06] hover:bg-[#e07f04] text-white text-xs font-normal shadow-md shadow-[#F48C06]/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <span>Menyimpan...</span>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Konten Beranda berhasil disimpan dan langsung disinkronkan ke halaman utama!</span>
        </div>
      )}

      {/* 2. MAIN LAYOUT: LEFT NAVIGATOR + RIGHT FORM EDITOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT NAVIGATOR SIDEBAR */}
        <aside className="lg:col-span-4 xl:col-span-3 bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3 sticky top-24">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-normal text-[#2F327D]">
              <Compass className="w-4 h-4 text-[#F48C06]" />
              <span>Navigator Konten</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">
              7 Bagian Lengkap
            </span>
          </div>

          <nav className="space-y-1.5">
            {navSections.map((sec) => {
              const isActive = activeSection === sec.key;
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => setActiveSection(sec.key)}
                  className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3 ${
                    isActive
                      ? 'bg-[#FFF3E4] border border-[#F48C06]/40 shadow-xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-white shadow-2xs' : 'bg-slate-100'}`}>
                    {sec.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs leading-snug font-normal ${
                        isActive ? 'text-[#F48C06] font-semibold' : 'text-[#2F327D]'
                      }`}
                    >
                      {sec.label}
                    </p>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                      {sec.desc}
                    </p>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-[#F48C06] shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-normal space-y-1">
            <p className="flex items-center gap-1.5 text-[#2F327D]">
              <Info className="w-3.5 h-3.5 text-[#F48C06]" />
              <span>Dukungan Upload Gambar:</span>
            </p>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Anda dapat mengunggah file JPG/PNG dari komputer/HP Anda secara langsung tanpa perlu hosting eksternal.
            </p>
          </div>
        </aside>

        {/* RIGHT CONTENT EDITOR PANEL */}
        <main className="lg:col-span-8 xl:col-span-9 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-xs space-y-6 text-xs">
          {/* SECTION 1: HERO */}
          {activeSection === 'hero' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-normal text-[#2F327D]">
                  1. Pengaturan Hero Banner & Visual
                </h3>
                <p className="text-slate-500 font-normal mt-0.5">
                  Atur logo resmi portal, visual latar belakang/hero, judul utama, narasi, dan CTA beranda.
                </p>
              </div>

              {/* Logo & Background Configuration */}
              <div className="p-4 sm:p-5 rounded-2xl bg-orange-50/70 border border-orange-200/90 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#2F327D]">
                    <Hotel className="w-4 h-4 text-[#F48C06]" />
                    <span>Pengaturan Logo Resmi Portal & Latar Belakang (Background)</span>
                  </div>
                  <span className="text-[10px] text-[#F48C06] font-normal bg-white px-2.5 py-0.5 rounded-full border border-orange-200 w-fit">
                    Otomatis Sinkron ke Seluruh Halaman
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Logo Box */}
                  <div className="bg-white p-3.5 rounded-xl border border-orange-100 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-700">Logo Portal / Hotel</label>
                      {branding.customLogoUrl && (
                        <button
                          type="button"
                          onClick={handleResetLogo}
                          disabled={isUploadingLogo}
                          className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                        >
                          Reset ke Default
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {branding.customLogoUrl ? (
                        <img
                          src={branding.customLogoUrl}
                          alt="Custom Logo"
                          className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-200"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-[#F48C06] rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-sm">
                          <Hotel className="w-7 h-7 stroke-[2.2]" />
                        </div>
                      )}
                      <div className="flex-1 space-y-1.5">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#F48C06] text-xs font-medium cursor-pointer border border-[#F48C06]/30 transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploadingLogo ? 'Mengunggah...' : 'Ganti Logo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            disabled={isUploadingLogo}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[10px] text-slate-400">
                          Format PNG/JPG transparan. Tampil di header, login & footer portal.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hero Background / Main Image Box */}
                  <div className="bg-white p-3.5 rounded-xl border border-orange-100 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-700">Foto Utama / Latar Hero</label>
                      <span className="text-[10px] text-slate-400">Visual Beranda</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <img
                        src={formData.heroImageUrl}
                        alt="Hero Visual"
                        className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-200"
                      />
                      <div className="flex-1 space-y-1.5">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer border border-slate-200 transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploadingBg ? 'Mengunggah...' : 'Ganti Foto Hero'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleHeroBgChange}
                            disabled={isUploadingBg}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[10px] text-slate-400">
                          Foto staf profesional atau interior Hotel Ciputra Jakarta.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Kata Sorotan Oranye
                  </label>
                  <input
                    type="text"
                    value={formData.heroTitleHighlight}
                    onChange={(e) =>
                      setFormData({ ...formData, heroTitleHighlight: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                    placeholder="Portal Internal"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Kelanjutan Judul Hero
                  </label>
                  <input
                    type="text"
                    value={formData.heroTitleSuffix}
                    onChange={(e) =>
                      setFormData({ ...formData, heroTitleSuffix: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                    placeholder="& Informasi Karir Hotel Ciputra Jakarta"
                  />
                </div>
              </div>

              {/* Subtitle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-normal">
                    Deskripsi Narasi Hero
                  </label>
                  <span className={`text-[11px] font-normal ${formData.heroSubtitle.length >= 480 ? 'text-rose-600' : 'text-slate-400'}`}>
                    Maks. 500 karakter • {formData.heroSubtitle.length}/500
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={formData.heroSubtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, heroSubtitle: e.target.value })
                  }
                  placeholder="Ketik deskripsi pembuka hero beranda..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 resize-y min-h-[85px] focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  💡 Kolom dapat ditarik ke bawah untuk melihat teks panjang.
                </p>
              </div>

              {/* Buttons Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Teks Tombol Utama (Kiri)
                  </label>
                  <input
                    type="text"
                    value={formData.ctaExploreText}
                    onChange={(e) =>
                      setFormData({ ...formData, ctaExploreText: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="Jelajahi Portal"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Teks Tombol Karir (Kanan)
                  </label>
                  <input
                    type="text"
                    value={formData.ctaVideoText}
                    onChange={(e) =>
                      setFormData({ ...formData, ctaVideoText: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="Lowongan Karir"
                  />
                </div>
              </div>

              {/* Hero Image Upload */}
              <div className="pt-2">
                <ImageUploadField
                  label="Foto Utama Hero Banner"
                  helperText="Unggah foto staf profesional atau interior Hotel Ciputra Jakarta untuk visual utama beranda."
                  value={formData.heroImageUrl}
                  onChange={(val) => setFormData({ ...formData, heroImageUrl: val })}
                  aspectRatio="portrait"
                />
              </div>

              {/* Floating Cards Settings */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-normal text-[#2F327D]">
                  Dua Kartu Mengambang di Atas Foto Hero
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Floating Card 1 */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
                    <p className="font-normal text-[#2F327D]">Kartu 1 (Kiri Atas):</p>
                    <div>
                      <label className="text-[11px] text-slate-500 font-normal">Sub-label</label>
                      <input
                        type="text"
                        value={formData.floatingCard1.subtitle}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            floatingCard1: {
                              ...formData.floatingCard1,
                              subtitle: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-normal">Judul Kartu</label>
                      <input
                        type="text"
                        value={formData.floatingCard1.title}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            floatingCard1: {
                              ...formData.floatingCard1,
                              title: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white mt-0.5"
                      />
                    </div>
                  </div>

                  {/* Floating Card 2 */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
                    <p className="font-normal text-[#2F327D]">Kartu 2 (Kanan Bawah):</p>
                    <div>
                      <label className="text-[11px] text-slate-500 font-normal">Nama / Pengirim</label>
                      <input
                        type="text"
                        value={formData.floatingCard2.name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            floatingCard2: {
                              ...formData.floatingCard2,
                              name: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-normal">Pesan Notifikasi</label>
                      <input
                        type="text"
                        value={formData.floatingCard2.message}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            floatingCard2: {
                              ...formData.floatingCard2,
                              message: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white mt-0.5"
                      />
                    </div>
                    <div className="pt-1">
                      <ImageUploadField
                        label="Foto Avatar Notifikasi"
                        value={formData.floatingCard2.avatarUrl}
                        onChange={(val) =>
                          setFormData({
                            ...formData,
                            floatingCard2: {
                              ...formData.floatingCard2,
                              avatarUrl: val,
                            },
                          })
                        }
                        aspectRatio="square"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: SERVICES */}
          {activeSection === 'services' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-normal text-[#2F327D]">
                  2. Layanan Terintegrasi
                </h3>
                <p className="text-slate-500 font-normal mt-0.5">
                  Atur judul dan tiga pilar layanan operasional Hotel Ciputra yang ditampilkan di beranda.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Judul Bagian
                  </label>
                  <input
                    type="text"
                    value={formData.servicesTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, servicesTitle: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Subtitle Bagian
                  </label>
                  <input
                    type="text"
                    value={formData.servicesSubtitle}
                    onChange={(e) =>
                      setFormData({ ...formData, servicesSubtitle: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* 3 Services Cards */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-normal text-[#2F327D]">
                  Daftar Kartu Layanan (3 Item):
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formData.services.map((svc, idx) => (
                    <div
                      key={svc.id}
                      className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-normal text-[#2F327D]">
                          Layanan #{idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white border border-slate-200 text-slate-600">
                          {svc.color}
                        </span>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-500 font-normal">Judul Layanan</label>
                        <input
                          type="text"
                          value={svc.title}
                          onChange={(e) => {
                            const next = [...formData.services];
                            next[idx].title = e.target.value;
                            setFormData({ ...formData, services: next });
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white mt-0.5"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[11px] text-slate-500 font-normal">Deskripsi</label>
                          <span className={`text-[10px] font-normal ${svc.description.length >= 280 ? 'text-rose-600' : 'text-slate-400'}`}>
                            Maks. 300 • {svc.description.length}/300
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          maxLength={300}
                          value={svc.description}
                          onChange={(e) => {
                            const next = [...formData.services];
                            next[idx].description = e.target.value;
                            setFormData({ ...formData, services: next });
                          }}
                          placeholder="Deskripsi layanan..."
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white mt-0.5 resize-y min-h-[75px] text-[11px] focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: ABOUT (MENGAPA PORTAL INI PENTING) */}
          {activeSection === 'about' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-normal text-[#2F327D]">
                  3. Mengapa Portal Ini Penting (Fitur Unggulan)
                </h3>
                <p className="text-slate-500 font-normal mt-0.5">
                  Atur narasi keunggulan, dua foto aktivitas hotel, angka statistik efisiensi, dan dua fitur terintegrasi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Label Tag Atas
                  </label>
                  <input
                    type="text"
                    value={formData.aboutTag}
                    onChange={(e) =>
                      setFormData({ ...formData, aboutTag: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="SISTEM TERINTEGRASI HOTEL CIPUTRA"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Judul Utama
                  </label>
                  <input
                    type="text"
                    value={formData.aboutTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, aboutTitle: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-normal">
                    Deskripsi Narasi
                  </label>
                  <span className={`text-[11px] font-normal ${formData.aboutDescription.length >= 580 ? 'text-rose-600' : 'text-slate-400'}`}>
                    Maks. 600 karakter • {formData.aboutDescription.length}/600
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={600}
                  value={formData.aboutDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, aboutDescription: e.target.value })
                  }
                  placeholder="Deskripsi mengenai sistem dan integrasi portal..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 resize-y min-h-[90px] focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  💡 Kolom dapat ditarik ke bawah untuk melihat teks panjang.
                </p>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Angka Statistik Highlight (e.g. 100%)
                  </label>
                  <input
                    type="text"
                    value={formData.aboutStatNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, aboutStatNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-[#F48C06]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Label Keterangan Statistik
                  </label>
                  <input
                    type="text"
                    value={formData.aboutStatLabel}
                    onChange={(e) =>
                      setFormData({ ...formData, aboutStatLabel: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* 2 Photos Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <ImageUploadField
                  label="Foto Aktivitas Hotel 1"
                  helperText="Visual perhotelan atau briefing staf"
                  value={formData.aboutImage1}
                  onChange={(val) => setFormData({ ...formData, aboutImage1: val })}
                  aspectRatio="landscape"
                />
                <ImageUploadField
                  label="Foto Aktivitas Hotel 2"
                  helperText="Visual fasilitas tamu atau jamuan restoran"
                  value={formData.aboutImage2}
                  onChange={(val) => setFormData({ ...formData, aboutImage2: val })}
                  aspectRatio="landscape"
                />
              </div>

              {/* 2 Features */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-normal text-[#2F327D]">
                  Dua Poin Fitur Tambahan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-normal text-[#2F327D]">Fitur #1:</p>
                    <input
                      type="text"
                      value={formData.aboutFeature1Title}
                      onChange={(e) =>
                        setFormData({ ...formData, aboutFeature1Title: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      placeholder="Judul Fitur 1"
                    />
                    <div className="space-y-0.5">
                      <div className="flex justify-end">
                        <span className="text-[10px] text-slate-400 font-normal">
                          Maks. 250 • {formData.aboutFeature1Desc.length}/250
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={250}
                        value={formData.aboutFeature1Desc}
                        onChange={(e) =>
                          setFormData({ ...formData, aboutFeature1Desc: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white resize-y min-h-[65px] text-[11px]"
                        placeholder="Deskripsi Fitur 1"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-normal text-[#2F327D]">Fitur #2:</p>
                    <input
                      type="text"
                      value={formData.aboutFeature2Title}
                      onChange={(e) =>
                        setFormData({ ...formData, aboutFeature2Title: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      placeholder="Judul Fitur 2"
                    />
                    <div className="space-y-0.5">
                      <div className="flex justify-end">
                        <span className="text-[10px] text-slate-400 font-normal">
                          Maks. 250 • {formData.aboutFeature2Desc.length}/250
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={250}
                        value={formData.aboutFeature2Desc}
                        onChange={(e) =>
                          setFormData({ ...formData, aboutFeature2Desc: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white resize-y min-h-[65px] text-[11px]"
                        placeholder="Deskripsi Fitur 2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: TESTIMONIALS */}
          {activeSection === 'testimonials' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-normal text-[#2F327D]">
                    4. Testimoni Karyawan & Staf
                  </h3>
                  <p className="text-slate-500 font-normal mt-0.5">
                    Kelola apa yang dikatakan rekan-rekan staf mengenai efisiensi portal intranet HCJ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTestimonial(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#F48C06] text-white font-normal text-xs flex items-center gap-1.5 hover:bg-[#e07f04] cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Testimoni</span>
                </button>
              </div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Judul Bagian Testimoni
                  </label>
                  <input
                    type="text"
                    value={formData.testimonialsTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, testimonialsTitle: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Subtitle Bagian
                  </label>
                  <input
                    type="text"
                    value={formData.testimonialsSubtitle}
                    onChange={(e) =>
                      setFormData({ ...formData, testimonialsSubtitle: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Testimonials List */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-normal text-[#2F327D]">
                  Daftar Testimoni Aktif ({formData.testimonials.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.testimonials.map((t, idx) => (
                    <div
                      key={t.id}
                      className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3 relative group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={t.photoUrl}
                            alt={t.name}
                            className="w-11 h-11 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <p className="font-normal text-[#2F327D] text-xs">{t.name}</p>
                            <p className="text-[11px] text-slate-400">{t.role}</p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 italic font-normal line-clamp-3">
                          &ldquo;{t.quote}&rdquo;
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: t.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTestimonial(t.id)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-normal p-1 cursor-pointer flex items-center gap-1"
                          title="Hapus Testimoni"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Testimonial Modal */}
              {showAddTestimonial && (
                <div
                  className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
                  {...getBackdropProps(() => setShowAddTestimonial(false))}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 cursor-default"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h4 className="font-normal text-sm text-[#2F327D]">
                        Tambah Testimoni Karyawan
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowAddTestimonial(false)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">Nama Karyawan</label>
                      <input
                        type="text"
                        value={newTestimonialName}
                        onChange={(e) => setNewTestimonialName(e.target.value)}
                        placeholder="Contoh: Sarah Angelina"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">Jabatan & Departemen</label>
                      <input
                        type="text"
                        value={newTestimonialRole}
                        onChange={(e) => setNewTestimonialRole(e.target.value)}
                        placeholder="Contoh: Guest Relations Officer"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-600">Isi Kutipan / Ulasan</label>
                        <span className={`text-[10px] font-normal ${newTestimonialQuote.length >= 380 ? 'text-rose-600' : 'text-slate-400'}`}>
                          Maks. 400 karakter • {newTestimonialQuote.length}/400
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={400}
                        value={newTestimonialQuote}
                        onChange={(e) => setNewTestimonialQuote(e.target.value)}
                        placeholder="Kesan menggunakan portal intranet..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl resize-y min-h-[80px]"
                      />
                    </div>

                    <ImageUploadField
                      label="Foto Profil Karyawan"
                      value={newTestimonialPhoto}
                      onChange={(val) => setNewTestimonialPhoto(val)}
                      aspectRatio="square"
                    />

                    <div>
                      <label className="block text-slate-600 mb-1">Rating Bintang (1 - 5)</label>
                      <select
                        value={newTestimonialRating}
                        onChange={(e) => setNewTestimonialRating(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ (5 Bintang)</option>
                        <option value={4}>⭐⭐⭐⭐ (4 Bintang)</option>
                        <option value={3}>⭐⭐⭐ (3 Bintang)</option>
                      </select>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddTestimonial(false)}
                        className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 cursor-pointer hover:bg-slate-50"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleAddTestimonial}
                        className="flex-1 py-2 rounded-xl bg-[#F48C06] text-white hover:bg-[#e07f04] cursor-pointer"
                      >
                        Simpan Testimoni
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: NEWS & ANNOUNCEMENTS */}
          {activeSection === 'news' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-normal text-[#2F327D]">
                  5. Pengumuman & Berita Terkini
                </h3>
                <p className="text-slate-500 font-normal mt-0.5">
                  Berita dan pengumuman pada beranda publik diambil secara otomatis dari arsip pengumuman intranet yang berstatus aktif.
                </p>
              </div>

              <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-200 space-y-2">
                <div className="flex items-center gap-2 text-[#F48C06] font-normal">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sinkronisasi Otomatis Aktif</span>
                </div>
                <p className="text-slate-600 font-normal leading-relaxed">
                  Setiap dokumen yang diunggah ke menu <strong>Pengumuman & Berita</strong> di dalam portal internal dengan kategori <em>Pengumuman</em> akan langsung tampil pada kartu berita beranda publik.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 6: SECURITY GUARANTEE */}
          {activeSection === 'security' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-normal text-[#2F327D]">
                  6. Jaminan Keamanan & Enkripsi Data
                </h3>
                <p className="text-slate-500 font-normal mt-0.5">
                  Pengaturan standar keamanan internal dan sertifikasi kepatuhan sistem.
                </p>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-normal text-[#2F327D] text-xs">
                      Proteksi Multi-Role & Audit Log Otomatis
                    </h4>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Setiap aktivitas login, perubahan data dokumen, dan appraisal terekam dalam log audit Cloud Firestore.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: FOOTER & CONTACT */}
          {activeSection === 'footer' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-normal text-[#2F327D]">
                  7. Kontak HRD & Informasi Footer
                </h3>
                <p className="text-slate-500 font-normal mt-0.5">
                  Atur alamat hotel, email kontak, dan nomor telepon resmi pada footer beranda.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Email Kontak Resmi
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, contactEmail: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Nomor Telepon Resmi
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPhone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-normal">
                    Alamat Lengkap Hotel
                  </label>
                  <span className={`text-[11px] font-normal ${formData.contactAddress.length >= 280 ? 'text-rose-600' : 'text-slate-400'}`}>
                    Maks. 300 karakter • {formData.contactAddress.length}/300
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={formData.contactAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, contactAddress: e.target.value })
                  }
                  placeholder="Ketik alamat resmi hotel..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl resize-y min-h-[75px]"
                />
              </div>
            </div>
          )}

          {/* Sticky Bottom Save Action Bar */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-normal">
              Perubahan disimpan ke sistem lokal dan Cloud Firestore secara otomatis saat tombol ditekan.
            </span>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#F48C06] hover:bg-[#e07f04] text-white text-xs font-normal shadow-md shadow-[#F48C06]/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <span>Menyimpan...</span>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};
