import React, { useState, useEffect } from 'react';
import {
  Hotel,
  Calendar,
  Check,
  Play,
  ArrowRight,
  Shield,
  Star,
  Quote,
  Mail,
  Facebook,
  Instagram,
  Linkedin,
  IdCard,
  TrendingUp,
  Heart,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  ExternalLink,
  Lock,
  Briefcase,
  Building2,
  ZoomIn,
  ZoomOut,
  FileText,
} from 'lucide-react';
import { HomeCmsContent, IntranetDocument } from '../../types';
import { getHomeCmsContent, subscribeToHomeCms } from '../../lib/cmsService';
import { getAppBranding, subscribeToAppBranding, AppBranding } from '../../lib/branding';
import { getBackdropProps } from '../../lib/modalHelper';

interface PublicHomeViewProps {
  onNavigateToLogin: () => void;
  onNavigateToCareer: () => void;
  announcements?: IntranetDocument[];
  onOpenAnnouncementPreview?: (doc: IntranetDocument) => void;
}

export const PublicHomeView: React.FC<PublicHomeViewProps> = ({
  onNavigateToLogin,
  onNavigateToCareer,
  announcements = [],
  onOpenAnnouncementPreview,
}) => {
  const [content, setContent] = useState<HomeCmsContent>(getHomeCmsContent());
  const [branding, setBranding] = useState<AppBranding>(() => getAppBranding());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState(0);
  const [zoomedNewsItem, setZoomedNewsItem] = useState<{
    id: string;
    title: string;
    date: string;
    tag: string;
    dept?: string;
    desc: string;
    imgUrl: string;
    attachmentName?: string;
  } | null>(null);
  const [isPhotoMaximized, setIsPhotoMaximized] = useState(false);

  useEffect(() => {
    const unsub = subscribeToHomeCms((data) => setContent(data));
    const unsubBrand = subscribeToAppBranding((brand) => setBranding(brand));
    return () => {
      unsub();
      unsubBrand();
    };
  }, []);

  const activeTestimonial =
    content.testimonials && content.testimonials.length > 0
      ? content.testimonials[activeTestimonialIdx % content.testimonials.length]
      : null;

  // Filter latest published announcements for the public news section (prevent leaking internal-only announcements)
  const publishedNews = announcements
    .filter((a) => a.category === 'Pengumuman' && Boolean(a.isPublic))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-[#696984] font-sans antialiased overflow-x-hidden selection:bg-[#F48C06] selection:text-white">
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="absolute top-0 left-0 w-full z-50 py-5 sm:py-6 px-4 sm:px-8 md:px-16 lg:px-24 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          {branding.customLogoUrl ? (
            <img
              src={branding.customLogoUrl}
              alt="Logo Hotel Ciputra"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover shadow-lg shadow-[#F48C06]/30 group-hover:scale-105 transition-transform duration-300 shrink-0"
            />
          ) : (
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#F48C06] rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-[#F48C06]/30 group-hover:scale-105 transition-transform duration-300 shrink-0">
              <Hotel className="w-6 h-6 stroke-[2.2]" />
            </div>
          )}
          <div>
            <span className="text-[#2F327D] font-bold brand-top-left-bold text-xl sm:text-2xl tracking-tight leading-none block">
              Hotel Ciputra
            </span>
            <span className="text-xs sm:text-sm font-normal text-[#696984]">
              Jakarta
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 xl:gap-10">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-[#F48C06] font-semibold text-sm transition-colors cursor-pointer"
          >
            Beranda
          </button>
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="text-[#2F327D] font-normal hover:text-[#F48C06] text-sm transition-colors cursor-pointer"
          >
            Portal Internal
          </button>
          <button
            type="button"
            onClick={onNavigateToCareer}
            className="text-[#2F327D] font-normal hover:text-[#F48C06] text-sm transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Lowongan Karir</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-[#F48C06]/15 text-[#F48C06] border border-[#F48C06]/30">
              Rekrutmen
            </span>
          </button>
          <a
            href="#layanan"
            className="text-[#2F327D] font-normal hover:text-[#F48C06] text-sm transition-colors cursor-pointer"
          >
            Layanan
          </a>
          <a
            href="#panduan"
            className="text-[#2F327D] font-normal hover:text-[#F48C06] text-sm transition-colors cursor-pointer"
          >
            Panduan
          </a>
        </nav>

        {/* Action Button: Login Karyawan */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToCareer}
            className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-normal text-[#2F327D] hover:bg-slate-100 transition-all border border-slate-200 cursor-pointer"
          >
            Cari Lowongan
          </button>
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="bg-[#F48C06] text-white font-normal px-6 sm:px-7 py-2.5 sm:py-3 rounded-full shadow-lg shadow-[#F48C06]/30 hover:bg-[#e07f04] hover:-translate-y-0.5 transition duration-300 text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Login Karyawan</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-[#2F327D] hover:text-[#F48C06] transition-colors rounded-xl focus:outline-none cursor-pointer"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex flex-col bg-white pt-24 px-6 pb-8 shadow-2xl animate-in fade-in duration-200">
          <nav className="flex flex-col gap-4 text-base">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-left py-2 font-semibold text-[#F48C06] border-b border-slate-100"
            >
              Beranda
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateToCareer();
              }}
              className="text-left py-2 font-normal text-[#2F327D] hover:text-[#F48C06] border-b border-slate-100 flex items-center justify-between"
            >
              <span>Lowongan Karir</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-[#F48C06]/15 text-[#F48C06]">
                Rekrutmen
              </span>
            </button>
            <a
              href="#layanan"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 font-normal text-[#2F327D] hover:text-[#F48C06] border-b border-slate-100"
            >
              Layanan Terintegrasi
            </a>
            <a
              href="#panduan"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 font-normal text-[#2F327D] hover:text-[#F48C06] border-b border-slate-100"
            >
              Tentang & Panduan
            </a>
          </nav>

          <div className="mt-auto pt-6 flex flex-col gap-3">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateToCareer();
              }}
              className="w-full py-3 rounded-full text-center border border-slate-200 text-[#2F327D] font-normal text-sm"
            >
              Peluang Karir Hotel
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateToLogin();
              }}
              className="w-full py-3 bg-[#F48C06] text-white rounded-full text-center font-normal text-sm shadow-md"
            >
              Login Karyawan
            </button>
          </div>
        </div>
      )}

      {/* 2. HERO SECTION WITH CURVED BOTTOM & FLOATING UI CARDS */}
      <section className="relative bg-[#FFF3E4] pt-32 sm:pt-40 pb-36 sm:pb-44 px-4 sm:px-8 md:px-16 lg:px-24 flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-16 min-h-[92vh] overflow-hidden">
        {/* Left Content (Main Typography & CTA) */}
        <div className="w-full lg:w-1/2 z-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#F48C06]/30 text-[#F48C06] text-xs font-normal mb-5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sistem Informasi Terpadu Hotel Ciputra Jakarta</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-normal text-[#2F327D] leading-[1.18] mb-6 tracking-tight">
            <span className="text-[#F48C06] font-normal">
              {content.heroTitleHighlight || 'Portal Internal'}
            </span>{' '}
            {content.heroTitleSuffix || '& Informasi Karir Hotel Ciputra Jakarta'}
          </h1>

          <p className="text-base sm:text-lg text-[#696984] mb-8 sm:mb-10 max-w-xl leading-relaxed font-normal">
            {content.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="w-full sm:w-auto text-center bg-[#F48C06] text-white font-normal px-8 py-3.5 sm:py-4 rounded-full shadow-xl shadow-[#F48C06]/30 hover:bg-[#e07f04] hover:-translate-y-1 transition duration-300 text-base flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <span>{content.ctaExploreText || 'Jelajahi Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onNavigateToCareer}
              className="w-full sm:w-auto flex items-center justify-center gap-3.5 text-[#2F327D] font-normal hover:text-[#F48C06] transition group py-2 sm:py-0 cursor-pointer"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full shadow-md flex items-center justify-center text-[#F48C06] text-xl group-hover:scale-110 transition duration-300 border border-slate-100 shrink-0">
                <Briefcase className="w-5 h-5 text-[#F48C06]" />
              </div>
              <span className="text-left leading-tight">
                <span className="block text-sm sm:text-base font-normal text-[#2F327D]">
                  Lowongan Karir
                </span>
                <span className="block text-xs text-[#696984]">
                  Lihat Posisi Terbuka →
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Right Content: Hero Image & Floating Cards */}
        <div className="w-full lg:w-1/2 relative z-20 mt-6 lg:mt-0 flex justify-center">
          <div className="relative w-full max-w-md sm:max-w-lg">
            {/* Background Circle Backdrop */}
            <div className="absolute inset-0 bg-[#F48C06]/15 rounded-full scale-105 transform translate-y-6 -translate-x-4 pointer-events-none" />

            {/* Main Hero Photo */}
            <img
              src={content.heroImageUrl}
              alt="Profesional Hotel Ciputra Jakarta"
              className="relative z-10 rounded-[36px] sm:rounded-[44px] rounded-br-[80px] sm:rounded-br-[110px] shadow-2xl object-cover w-full h-[380px] sm:h-[480px] lg:h-[520px] border-4 border-white"
            />

            {/* Floating Card 1: Shift & Jadwal */}
            <div className="absolute top-12 -left-3 sm:-left-8 md:-left-12 bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.1)] border border-white flex items-center gap-3 z-30 animate-pulse">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center text-[#F48C06] shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10.5px] sm:text-xs text-[#696984] font-normal mb-0.5">
                  {content.floatingCard1.subtitle || 'Update Sistem'}
                </p>
                <p className="text-xs sm:text-sm text-[#2F327D] font-normal whitespace-nowrap">
                  {content.floatingCard1.title || 'Jadwal Shift Terkini'}
                </p>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center ml-1 shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>

            {/* Floating Card 2: HR Notification */}
            <div className="absolute bottom-16 -right-2 sm:-right-6 md:-right-8 bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.1)] border border-white flex items-center gap-3 z-30 w-56 sm:w-64">
              <img
                src={content.floatingCard2.avatarUrl}
                alt="HR Avatar"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-[#F48C06] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-[#2F327D] font-normal leading-tight truncate">
                  {content.floatingCard2.name || 'Bpk. Hendra (HR)'}
                </p>
                <p className="text-[10.5px] sm:text-xs text-[#696984] mt-0.5 line-clamp-1 font-normal">
                  {content.floatingCard2.message || 'Notifikasi HR: Panduan Cuti...'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Curved Bottom Wave SVG Divider */}
        <div className="absolute bottom-[-1px] left-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="block w-full h-[60px] sm:h-[90px] md:h-[120px]"
          >
            <path
              d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </section>

      {/* 3. LAYANAN TERINTEGRASI */}
      <section id="layanan" className="py-20 sm:py-24 bg-white relative">
        <div className="container mx-auto px-4 sm:px-8 md:px-16 text-center z-10 relative">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#2F327D] mb-4 tracking-tight">
            Layanan <span className="text-[#F48C06] font-normal">Terintegrasi</span>
          </h2>
          <p className="text-[#696984] max-w-2xl mx-auto mb-12 sm:mb-16 text-base sm:text-lg font-normal leading-relaxed">
            {content.servicesSubtitle}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {content.services.map((item, idx) => {
              const bgIcons = [
                'bg-indigo-50 text-[#2F327D]',
                'bg-orange-50 text-[#F48C06]',
                'bg-teal-50 text-[#65C2B4]',
              ];
              const iconClass = bgIcons[idx % bgIcons.length];
              return (
                <div
                  key={item.id}
                  onClick={onNavigateToLogin}
                  className="bg-white p-8 sm:p-10 rounded-[32px] shadow-[0_20px_50px_rgba(47,50,125,0.06)] border border-gray-100 flex flex-col items-center group hover:-translate-y-2 hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  <div
                    className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center text-3xl mb-7 group-hover:scale-105 transition duration-300 shadow-2xs ${iconClass}`}
                  >
                    {idx === 0 && <IdCard className="w-10 h-10" />}
                    {idx === 1 && <TrendingUp className="w-10 h-10" />}
                    {idx === 2 && <Heart className="w-10 h-10" />}
                  </div>
                  <h3 className="text-lg sm:text-xl font-normal text-[#2F327D] mb-3 text-center">
                    {item.title}
                  </h3>
                  <p className="text-[#696984] text-center text-sm leading-relaxed font-normal">
                    {item.description}
                  </p>
                  <span className="mt-5 text-xs text-[#F48C06] font-normal inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    Akses Fitur <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. ABOUT SECTION: MENGAPA PORTAL INI PENTING */}
      <section id="panduan" className="py-20 sm:py-24 bg-slate-50/70 overflow-hidden relative border-t border-slate-100">
        <div className="container mx-auto px-4 sm:px-8 md:px-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Left Asymmetric Photo Grid */}
          <div className="w-full lg:w-1/2 relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[#F48C06]/10 rounded-[40px] transform rotate-3 scale-105 -z-10" />
            <div className="grid grid-cols-2 gap-4">
              <img
                src={content.aboutImage1}
                alt="Training Internal"
                className="w-full h-56 sm:h-64 object-cover rounded-[28px] rounded-br-sm shadow-md mt-6"
              />
              <img
                src={content.aboutImage2}
                alt="Diskusi Tim"
                className="w-full h-56 sm:h-64 object-cover rounded-[28px] rounded-tl-sm shadow-md"
              />
            </div>

            {/* Floating 100% Data Badge */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-md px-6 sm:px-8 py-4 sm:py-5 rounded-2xl shadow-xl z-20 flex flex-col items-center border border-slate-100">
              <span className="text-2xl sm:text-3xl font-normal text-[#2F327D] mb-0.5">
                {content.aboutStatNumber || '100%'}
              </span>
              <span className="text-xs sm:text-sm font-normal text-[#696984]">
                {content.aboutStatLabel || 'Transparansi Data'}
              </span>
            </div>
          </div>

          {/* Right Text Content */}
          <div className="w-full lg:w-1/2">
            <div className="inline-block bg-orange-100 text-[#F48C06] font-normal px-4 py-1.5 rounded-full text-xs sm:text-sm mb-5">
              {content.aboutTag}
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#2F327D] mb-5 leading-tight tracking-tight">
              {content.aboutTitle}
            </h2>

            <p className="text-[#696984] mb-8 leading-relaxed text-sm sm:text-base font-normal">
              {content.aboutDescription}
            </p>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-blue-50 text-[#2F327D] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-normal text-[#2F327D] text-sm sm:text-base">
                    {content.aboutFeature1Title}
                  </h4>
                  <p className="text-[#696984] text-xs sm:text-sm mt-0.5 font-normal">
                    {content.aboutFeature1Desc}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-blue-50 text-[#2F327D] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-normal text-[#2F327D] text-sm sm:text-base">
                    {content.aboutFeature2Title}
                  </h4>
                  <p className="text-[#696984] text-xs sm:text-sm mt-0.5 font-normal">
                    {content.aboutFeature2Desc}
                  </p>
                </div>
              </li>
            </ul>

            <button
              type="button"
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-2 text-[#F48C06] font-normal hover:text-[#d37704] transition group text-sm sm:text-base cursor-pointer"
            >
              <span>{content.aboutCtaText || 'Baca Pedoman Perusahaan'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIALS: APA KATA MEREKA? */}
      {activeTestimonial && (
        <section className="py-20 sm:py-24 bg-white relative">
          <div className="container mx-auto px-4 sm:px-8 md:px-16">
            <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-16">
              {/* Left Title & Indicator */}
              <div className="w-full md:w-5/12 relative z-10">
                <div className="w-14 h-1 bg-[#F48C06] mb-5 rounded-full" />
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#2F327D] mb-4 leading-tight tracking-tight">
                  Apa Kata <span className="text-[#F48C06] font-normal">Mereka?</span>
                </h2>
                <p className="text-[#696984] mb-8 leading-relaxed text-sm sm:text-base font-normal">
                  {content.testimonialsSubtitle}
                </p>

                {/* Slider Indicators */}
                <div className="flex gap-2.5">
                  {content.testimonials.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveTestimonialIdx(idx)}
                      className={`h-2.5 rounded-full transition-all cursor-pointer ${
                        activeTestimonialIdx === idx
                          ? 'w-8 bg-[#F48C06]'
                          : 'w-2.5 bg-gray-200 hover:bg-gray-300'
                      }`}
                      aria-label={`Testimonial ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Right Testimonial Card */}
              <div className="w-full md:w-7/12 relative">
                <div className="absolute -inset-3 bg-[#FFF3E4] rounded-[36px] -z-10 transform -rotate-1" />

                <div className="bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row gap-6 sm:gap-8 items-center border border-gray-100 relative overflow-hidden">
                  <Quote className="absolute top-2 right-4 w-20 h-20 text-[#F48C06]/10 pointer-events-none" />

                  {/* Photo */}
                  <div className="shrink-0 relative">
                    <img
                      src={activeTestimonial.photoUrl}
                      alt={activeTestimonial.name}
                      className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-full border-4 border-white shadow-md"
                    />
                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#F48C06] rounded-full flex items-center justify-center text-white text-xs border-2 border-white shadow-2xs">
                      <Quote className="w-3.5 h-3.5 fill-white" />
                    </div>
                  </div>

                  {/* Quote & Author */}
                  <div>
                    <div className="flex text-amber-400 gap-1 text-sm mb-3">
                      {[...Array(activeTestimonial.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-[#2F327D] font-normal italic leading-relaxed mb-4 text-xs sm:text-sm">
                      "{activeTestimonial.quote}"
                    </p>
                    <div>
                      <h4 className="font-normal text-[#2F327D] text-base">
                        {activeTestimonial.name}
                      </h4>
                      <p className="text-[#696984] text-xs font-normal">
                        {activeTestimonial.role}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. BERITA & PENGUMUMAN */}
      <section className="py-20 sm:py-24 bg-slate-50 border-t border-gray-100">
        <div className="container mx-auto px-4 sm:px-8 md:px-16">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10 sm:mb-12">
            <div className="max-w-xl">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#2F327D] mb-3 tracking-tight">
                Berita & <span className="text-[#F48C06] font-normal">Pengumuman</span>
              </h2>
              <p className="text-[#696984] text-sm sm:text-base font-normal">
                Informasi terbaru seputar manajemen, kebijakan hotel, event karyawan, dan aktivitas internal kita.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="bg-white border border-gray-200 text-[#2F327D] font-normal px-5 py-2 rounded-full hover:bg-gray-50 transition text-xs sm:text-sm shadow-2xs whitespace-nowrap cursor-pointer"
            >
              Lihat Semua di Portal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {publishedNews.length > 0 ? (
              publishedNews.map((item) => (
                <article
                  key={item.id}
                  onClick={() => {
                    setZoomedNewsItem({
                      id: item.id,
                      title: item.title,
                      date: item.effectiveDate || item.uploadedAt?.slice(0, 10) || 'Terbaru',
                      tag: item.sub_kategori || 'Pengumuman Resmi',
                      dept: item.akses_dept && !item.akses_dept.toLowerCase().includes('all') ? item.akses_dept : undefined,
                      desc: item.keterangan || 'Pengumuman resmi operasional dan manajemen Hotel Ciputra Jakarta.',
                      imgUrl:
                        item.thumbUrl ||
                        item.fileUrl ||
                        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
                      attachmentName: item.attachmentName,
                    });
                    setIsPhotoMaximized(false);
                  }}
                  className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer flex flex-col"
                >
                  <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-100">
                    <img
                      src={
                        item.thumbUrl ||
                        item.fileUrl ||
                        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
                      }
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    {/* Clean Category Badge - Completely without All unit or all departement */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-[#2F327D] text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs border border-orange-200">
                      <span>{item.sub_kategori || 'Pengumuman Resmi'}</span>
                    </div>
                    {/* Specific Department only if not All Departments */}
                    {item.akses_dept && !item.akses_dept.toLowerCase().includes('all') && (
                      <div className="absolute top-3 right-3 bg-[#2F327D]/90 backdrop-blur-md text-white text-[9px] font-medium px-2.5 py-1 rounded-full uppercase tracking-wider shadow-2xs">
                        {item.akses_dept}
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <p className="text-[11px] text-[#696984] mb-2 flex items-center gap-1.5 font-normal">
                      <Calendar className="w-3 h-3 text-[#F48C06]" />
                      <span>{item.effectiveDate || item.uploadedAt?.slice(0, 10)}</span>
                    </p>
                    <h3 className="text-base sm:text-lg font-normal text-[#2F327D] mb-2 group-hover:text-[#F48C06] transition line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-[#696984] text-xs mb-5 line-clamp-3 leading-relaxed flex-1 font-normal">
                      {item.keterangan || item.attachmentName || 'Klik untuk membaca detail pengumuman resmi.'}
                    </p>
                    <span className="text-[#F48C06] font-semibold text-xs inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Baca Selengkapnya <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>
              ))
            ) : (
              // Default preview articles if none are uploaded yet
              [
                {
                  tag: 'Manajemen',
                  date: '12 Oktober 2026',
                  title: 'Hasil Evaluasi Kinerja Kuartal 3 & Target Operasional Q4',
                  desc: 'Rangkuman pencapaian tim Front Office, F&B, dan Housekeeping serta persiapan menyambut musim liburan.',
                  img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                },
                {
                  tag: 'Event Karyawan',
                  date: '05 Oktober 2026',
                  title: 'Pendaftaran Employee Gathering 2026 Dibuka',
                  desc: 'Segera daftarkan diri dan keluarga untuk acara silaturahmi tahunan kita dengan ragam doorprize menarik.',
                  img: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                },
                {
                  tag: 'Sistem Internal',
                  date: '01 Oktober 2026',
                  title: 'Pembaruan Fitur Pengajuan & SOP Digital V2.0',
                  desc: 'Modul digitalisasi formulir dan arsip dokumen kini lebih cepat serta terintegrasi cloud database.',
                  img: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                },
              ].map((defItem, idx) => (
                <article
                  key={idx}
                  onClick={() => {
                    setZoomedNewsItem({
                      id: `def-${idx}`,
                      title: defItem.title,
                      date: defItem.date,
                      tag: defItem.tag,
                      desc: defItem.desc,
                      imgUrl: defItem.img,
                    });
                    setIsPhotoMaximized(false);
                  }}
                  className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer flex flex-col"
                >
                  <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-100">
                    <img
                      src={defItem.img}
                      alt={defItem.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-[#2F327D] text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs border border-orange-200">
                      {defItem.tag}
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <p className="text-[11px] text-[#696984] mb-2 flex items-center gap-1.5 font-normal">
                      <Calendar className="w-3 h-3 text-[#F48C06]" />
                      <span>{defItem.date}</span>
                    </p>
                    <h3 className="text-base sm:text-lg font-normal text-[#2F327D] mb-2 group-hover:text-[#F48C06] transition line-clamp-2">
                      {defItem.title}
                    </h3>
                    <p className="text-[#696984] text-xs mb-5 line-clamp-3 leading-relaxed flex-1 font-normal">
                      {defItem.desc}
                    </p>
                    <span className="text-[#F48C06] font-semibold text-xs inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Baca Selengkapnya <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-[#1a1c4b] pt-16 sm:pt-20 pb-10 text-white/70 border-t-8 border-[#F48C06] relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-8 md:px-16 relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-14">
          {/* Col 1: Brand */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3 mb-5">
              {branding.customLogoUrl ? (
                <img
                  src={branding.customLogoUrl}
                  alt="Logo Hotel Ciputra"
                  className="w-11 h-11 rounded-xl object-cover shadow-md"
                />
              ) : (
                <div className="w-11 h-11 bg-[#F48C06] rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-md">
                  <Hotel className="w-6 h-6 stroke-[2.2]" />
                </div>
              )}
              <span className="text-white font-bold brand-top-left-bold text-xl sm:text-2xl tracking-tight leading-none">
                Hotel Ciputra<br />
                <span className="text-xs font-normal text-white/70">Jakarta</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed mb-6 font-normal max-w-md">
              Portal Internal dan Sistem Informasi Karir terpadu yang didedikasikan untuk operasional dan pengembangan SDM di lingkungan Hotel Ciputra Jakarta.
            </p>
            <div className="flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center hover:bg-[#F48C06] hover:text-white transition duration-300"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center hover:bg-[#F48C06] hover:text-white transition duration-300"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center hover:bg-[#F48C06] hover:text-white transition duration-300"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="lg:col-span-3 lg:col-start-7">
            <h4 className="text-white font-normal text-base mb-5">Tautan Cepat</h4>
            <ul className="space-y-3 text-xs sm:text-sm font-normal">
              <li>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-[#F48C06] transition text-left cursor-pointer"
                >
                  Beranda Utama
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToLogin}
                  className="hover:text-[#F48C06] transition text-left cursor-pointer"
                >
                  Portal Login Karyawan
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToCareer}
                  className="hover:text-[#F48C06] transition text-left cursor-pointer"
                >
                  Lowongan Karir Terkini
                </button>
              </li>
              <li>
                <a href="#panduan" className="hover:text-[#F48C06] transition">
                  SOP & Panduan IT
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Karir & Pelatihan */}
          <div className="lg:col-span-3">
            <h4 className="text-white font-normal text-base mb-5">Karir & Pelatihan</h4>
            <ul className="space-y-3 text-xs sm:text-sm font-normal">
              <li>
                <button
                  onClick={onNavigateToCareer}
                  className="hover:text-[#F48C06] transition text-left cursor-pointer"
                >
                  Lowongan Internal & Eksternal
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToLogin}
                  className="hover:text-[#F48C06] transition text-left cursor-pointer"
                >
                  Penilaian Kinerja (KPI)
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToLogin}
                  className="hover:text-[#F48C06] transition text-left cursor-pointer"
                >
                  Modul Pelatihan
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToLogin}
                  className="hover:text-[#F48C06] transition text-left cursor-pointer"
                >
                  Struktur Organisasi
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="container mx-auto px-4 sm:px-8 md:px-16 pt-8 border-t border-white/10 text-xs sm:text-sm flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="font-normal text-white/60">
            &copy; 2026 Hotel Ciputra Jakarta. All Rights Reserved.
          </p>
          <div className="flex gap-5 text-white/50 text-xs font-normal">
            <button
              onClick={onNavigateToLogin}
              className="hover:text-white transition cursor-pointer"
            >
              Kebijakan Privasi Portal
            </button>
            <span>•</span>
            <button
              onClick={onNavigateToLogin}
              className="hover:text-white transition cursor-pointer"
            >
              Syarat & Ketentuan IT
            </button>
          </div>
        </div>
      </footer>

      {/* POPUP ZOOM BESAR DENGAN KETERANGAN LENGKAP & REDIRECT KE LOGIN KARYAWAN */}
      {zoomedNewsItem && (
        <div
          {...getBackdropProps(() => {
            setZoomedNewsItem(null);
            setIsPhotoMaximized(false);
          })}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[28px] sm:rounded-[32px] shadow-2xl max-w-4xl lg:max-w-5xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] cursor-default animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="px-5 sm:px-7 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F48C06]" />
                <span className="text-xs sm:text-sm font-bold text-[#2F327D] uppercase tracking-wider truncate">
                  Detail Berita & Pengumuman
                </span>
                {zoomedNewsItem.dept && (
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                    {zoomedNewsItem.dept}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPhotoMaximized(!isPhotoMaximized)}
                  className="p-2 text-slate-500 hover:text-[#2F327D] hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  title={isPhotoMaximized ? 'Perkecil Tampilan Foto' : 'Perbesar Zoom Foto'}
                >
                  {isPhotoMaximized ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomedNewsItem(null);
                    setIsPhotoMaximized(false);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  title="Tutup Popup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
              {/* Zoomable Hero Banner */}
              <div
                className={`relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 group transition-all duration-300 ${
                  isPhotoMaximized ? 'min-h-[460px] sm:min-h-[580px] max-h-[75vh]' : 'h-64 sm:h-80 md:h-96'
                } flex items-center justify-center`}
              >
                <img
                  src={zoomedNewsItem.imgUrl}
                  alt={zoomedNewsItem.title}
                  className={`w-full h-full ${
                    isPhotoMaximized ? 'object-contain' : 'object-cover'
                  } transition-transform duration-500`}
                />
                <button
                  type="button"
                  onClick={() => setIsPhotoMaximized(!isPhotoMaximized)}
                  className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                >
                  {isPhotoMaximized ? (
                    <>
                      <ZoomOut className="w-3.5 h-3.5" />
                      <span>Tampilan Normal</span>
                    </>
                  ) : (
                    <>
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Zoom Penuh</span>
                    </>
                  )}
                </button>
              </div>

              {/* Meta & Title */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-normal">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-[#F48C06] border border-orange-200">
                    {zoomedNewsItem.tag}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-[#F48C06]" />
                    <span>{zoomedNewsItem.date}</span>
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#2F327D] leading-snug">
                  {zoomedNewsItem.title}
                </h3>
              </div>

              {/* Full Keterangan / Isi Rincian */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Keterangan & Rincian Pengumuman:
                </h4>
                <div className="p-5 sm:p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal">
                  {zoomedNewsItem.desc}
                </div>
              </div>

              {/* Info Lampiran Dokumen jika ada */}
              {zoomedNewsItem.attachmentName && (
                <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 flex items-center gap-3 text-sky-900 text-xs sm:text-sm">
                  <FileText className="w-5 h-5 text-sky-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Tersedia Berkas Lampiran Resmi:</span>
                    <span className="text-sky-700 font-mono text-xs">{zoomedNewsItem.attachmentName}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Redirection to Employee Login */}
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <p className="text-xs text-slate-500 text-center sm:text-left">
                Untuk mengunduh dokumen resmi dan berinteraksi dengan pengumuman ini, silakan masuk ke portal karyawan.
              </p>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setZoomedNewsItem(null);
                    setIsPhotoMaximized(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomedNewsItem(null);
                    setIsPhotoMaximized(false);
                    onNavigateToLogin();
                  }}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-[#F48C06] hover:bg-[#e07f04] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#F48C06]/20 hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <span>Selengkapnya (Login Karyawan)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
