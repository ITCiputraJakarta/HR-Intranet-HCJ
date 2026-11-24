import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnimatePresence, motion } from 'motion/react';
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
  Megaphone,
  UserCheck,
  Clock,
  Bell,
  Award,
  Coffee,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { HomeCmsContent, IntranetDocument } from '../../types';
import { getHomeCmsContent, subscribeToHomeCms } from '../../lib/cmsService';
import { getAppBranding, subscribeToAppBranding, AppBranding } from '../../lib/branding';
import { getBackdropProps } from '../../lib/modalHelper';
import { UnifiedLogo } from '../common/UnifiedLogo';
import { SocialMediaBar } from '../common/SocialMediaBar';
import { useLenis } from '../common/MotionLenisProvider';
import { sanitizeSafeUrl } from '../../lib/security';
import defaultHotelLounge from '../../assets/images/hero_bright_hotel_lounge_1790666713075.jpg';
import defaultHotelSuite from '../../assets/images/gallery_hotel_suite_bed_1790666738422.jpg';

gsap.registerPlugin(ScrollTrigger);

interface PublicHomeViewProps {
  onNavigateToLogin: () => void;
  onNavigateToCareer: () => void;
  announcements?: IntranetDocument[];
  onOpenAnnouncementPreview?: (doc: IntranetDocument) => void;
}

function cleanPublicBadge(tag?: string): string {
  if (!tag) return '';
  const lower = tag.toLowerCase().trim();
  if (
    lower.includes('all unit') ||
    lower.includes('all units') ||
    lower.includes('all depart') ||
    lower.includes('all dept') ||
    lower.includes('semua unit') ||
    lower.includes('semua depart') ||
    lower.includes('semua dept') ||
    lower.includes('seluruh unit') ||
    lower.includes('seluruh depart')
  ) {
    return '';
  }
  return tag;
}

function renderFloatingIcon(iconName?: string) {
  switch (iconName) {
    case 'clock':
      return <Clock className="w-5 h-5" />;
    case 'bell':
      return <Bell className="w-5 h-5" />;
    case 'award':
      return <Award className="w-5 h-5" />;
    case 'coffee':
      return <Coffee className="w-5 h-5" />;
    case 'zap':
      return <Zap className="w-5 h-5" />;
    case 'shield':
      return <ShieldCheck className="w-5 h-5" />;
    case 'briefcase':
      return <Briefcase className="w-5 h-5" />;
    case 'calendar':
    default:
      return <Calendar className="w-5 h-5" />;
  }
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
    desc: string;
    imgUrl: string;
    attachmentName?: string;
  } | null>(null);
  const [isPhotoMaximized, setIsPhotoMaximized] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { lenis, scrollToTop } = useLenis();

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

  // Filter latest active published announcements for the public news section (prevent leaking internal-only or expired announcements)
  const publishedNews = announcements
    .filter((a) => {
      if (a.category !== 'Pengumuman' || !a.isPublic) return false;
      if (a.expiryDate) {
        const expTs = new Date(`${a.expiryDate}T23:59:59.999`).getTime();
        if (!isNaN(expTs) && expTs < Date.now()) return false;
      }
      return true;
    })
    .slice(0, 3);

  const handleScrollTop = () => {
    const modalScroller = rootRef.current?.closest('.overflow-y-auto');
    if (modalScroller) {
      modalScroller.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      scrollToTop(false);
    }
  };

  const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const target = rootRef.current?.querySelector(sectionId) as HTMLElement | null;
    if (!target) return;
    const modalScroller = rootRef.current?.closest('.overflow-y-auto');
    if (modalScroller) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (lenis) {
      lenis.scrollTo(target, { duration: 0.9 });
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const modalScroller = root.closest('.overflow-y-auto') as HTMLElement | null;
    const scrollerTarget = modalScroller || undefined;

    const ctx = gsap.context(() => {
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      heroTl
        .from('[data-gsap="hero-badge"]', {
          y: 16,
          opacity: 0,
          duration: 0.5,
          clearProps: 'transform,opacity',
        })
        .from(
          '[data-gsap="hero-title"]',
          {
            y: 24,
            opacity: 0,
            duration: 0.65,
            clearProps: 'transform,opacity',
          },
          '-=0.32'
        )
        .from(
          '[data-gsap="hero-subtitle"]',
          {
            y: 18,
            opacity: 0,
            duration: 0.55,
            clearProps: 'transform,opacity',
          },
          '-=0.4'
        )
        .from(
          '[data-gsap="hero-cta"]',
          {
            y: 16,
            opacity: 0,
            duration: 0.5,
            clearProps: 'transform,opacity',
          },
          '-=0.35'
        )
        .from(
          '[data-gsap="hero-photo"]',
          {
            scale: 0.95,
            y: 24,
            opacity: 0,
            duration: 0.75,
            clearProps: 'transform,opacity',
          },
          '-=0.55'
        )
        .from(
          '[data-gsap="hero-float"]',
          {
            y: 18,
            scale: 0.92,
            opacity: 0,
            duration: 0.5,
            stagger: 0.14,
            clearProps: 'transform,opacity',
          },
          '-=0.35'
        );

      gsap.from('[data-gsap="services-header"]', {
        y: 22,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '#layanan',
          scroller: scrollerTarget,
          start: 'top 88%',
          once: true,
        },
      });

      gsap.from('[data-gsap="service-card"]', {
        y: 28,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '#layanan',
          scroller: scrollerTarget,
          start: 'top 80%',
          once: true,
        },
      });

      gsap.from('[data-gsap="about-photos"]', {
        x: -26,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '#panduan',
          scroller: scrollerTarget,
          start: 'top 84%',
          once: true,
        },
      });

      gsap.from('[data-gsap="about-content"]', {
        x: 26,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '#panduan',
          scroller: scrollerTarget,
          start: 'top 84%',
          once: true,
        },
      });

      gsap.from('[data-gsap="news-header"]', {
        y: 20,
        opacity: 0,
        duration: 0.55,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '[data-gsap="news-section"]',
          scroller: scrollerTarget,
          start: 'top 88%',
          once: true,
        },
      });

      gsap.from('[data-gsap="news-card"]', {
        y: 26,
        opacity: 0,
        duration: 0.55,
        stagger: 0.12,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '[data-gsap="news-section"]',
          scroller: scrollerTarget,
          start: 'top 82%',
          once: true,
        },
      });
    }, root);

    const refreshId = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      window.clearTimeout(refreshId);
      ctx.revert();
    };
  }, [publishedNews.length]);

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-white text-[#696984] font-sans antialiased overflow-x-hidden selection:bg-[#F48C06] selection:text-white"
    >
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="absolute top-0 left-0 w-full z-50 py-5 sm:py-6 px-4 sm:px-8 md:px-16 lg:px-24 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={handleScrollTop}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <UnifiedLogo customLogoUrl={branding.customLogoUrl} size="lg" />
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
            onClick={handleScrollTop}
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
            onClick={(e) => handleScrollToSection(e, '#layanan')}
            className="text-[#2F327D] font-normal hover:text-[#F48C06] text-sm transition-colors cursor-pointer"
          >
            Layanan
          </a>
          <a
            href="#panduan"
            onClick={(e) => handleScrollToSection(e, '#panduan')}
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
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 z-40 lg:hidden flex flex-col bg-white pt-24 px-6 pb-8 shadow-2xl"
          >
            <nav className="flex flex-col gap-4 text-base">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleScrollTop();
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
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleScrollToSection(e, '#layanan');
                }}
                className="py-2 font-normal text-[#2F327D] hover:text-[#F48C06] border-b border-slate-100"
              >
                Layanan Terintegrasi
              </a>
              <a
                href="#panduan"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleScrollToSection(e, '#panduan');
                }}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HERO SECTION WITH CURVED BOTTOM & FLOATING UI CARDS */}
      <section className="relative bg-[#FFF3E4] pt-32 sm:pt-40 pb-36 sm:pb-44 px-4 sm:px-8 md:px-16 lg:px-24 flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-16 min-h-[92vh] overflow-hidden">
        {/* Left Content (Main Typography & CTA) */}
        <div className="w-full lg:w-1/2 z-20 text-center lg:text-left">
          <div
            data-gsap="hero-badge"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#F48C06]/30 text-[#F48C06] text-xs font-normal mb-5 shadow-2xs mx-auto lg:mx-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sistem Informasi Terpadu Hotel Ciputra Jakarta</span>
          </div>

          <h1
            data-gsap="hero-title"
            className="text-2xl sm:text-4xl md:text-5xl lg:text-[52px] font-normal text-[#2F327D] leading-[1.2] mb-5 sm:mb-6 tracking-tight break-words"
          >
            <span className="text-[#F48C06] font-normal">
              {content.heroTitleHighlight || 'Portal Internal'}
            </span>{' '}
            {content.heroTitleSuffix || '& Informasi Karir Hotel Ciputra Jakarta'}
          </h1>

          <p
            data-gsap="hero-subtitle"
            className="text-sm sm:text-lg text-[#696984] mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal"
          >
            {content.heroSubtitle}
          </p>

          <div
            data-gsap="hero-cta"
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6"
          >
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="w-full sm:w-auto text-center bg-[#F48C06] text-white font-normal px-8 py-3.5 sm:py-4 rounded-full shadow-xl shadow-[#F48C06]/30 hover:bg-[#e07f04] hover:-translate-y-1 transition duration-300 text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <span>{content.ctaExploreText || 'Jelajahi Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onNavigateToCareer}
              className="w-full sm:w-auto flex items-center justify-center gap-3.5 text-[#2F327D] font-normal hover:text-[#F48C06] transition group py-2 sm:py-0 cursor-pointer"
            >
              <div className="w-11 h-11 sm:w-14 sm:h-14 bg-white rounded-full shadow-md flex items-center justify-center text-[#F48C06] text-xl group-hover:scale-110 transition duration-300 border border-slate-100 shrink-0">
                <Briefcase className="w-5 h-5 text-[#F48C06]" />
              </div>
              <span className="text-left leading-tight">
                <span className="block text-xs sm:text-base font-normal text-[#2F327D]">
                  Lowongan Karir
                </span>
                <span className="block text-[11px] sm:text-xs text-[#696984]">
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
              data-gsap="hero-photo"
              src={sanitizeSafeUrl(content.heroImageUrl, { allowDataImage: true }) || defaultHotelLounge}
              alt="Profesional Hotel Ciputra Jakarta"
              className="relative z-10 rounded-[32px] sm:rounded-[44px] rounded-br-[60px] sm:rounded-br-[110px] shadow-2xl object-cover object-top w-full h-[320px] sm:h-[480px] lg:h-[520px] border-4 border-white"
            />

            {/* Floating Card 1: Apresiasi / Shift / Operasional (positioned cleanly at bottom-left edge away from face) */}
            <div
              data-gsap="hero-float"
              className="hidden sm:flex absolute -bottom-7 left-0 sm:-left-6 md:-left-10 bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.1)] border border-white items-center gap-3 z-30 transition-transform hover:scale-105 duration-300"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center text-[#F48C06] shrink-0 shadow-2xs">
                {renderFloatingIcon(content.floatingCard1.icon)}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-[10px] sm:text-[11px] text-[#696984] font-normal">
                    {content.floatingCard1.subtitle || 'Update Sistem'}
                  </p>
                  {content.floatingCard1.badgeText && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                      {content.floatingCard1.badgeText}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[#2F327D] font-bold whitespace-nowrap">
                  {content.floatingCard1.title || 'Jadwal Shift Terkini'}
                </p>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center ml-1 shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>

            {/* Floating Card 2: HR / Manajemen / Pengumuman (hidden on extra small screens to prevent overlap) */}
            <div
              data-gsap="hero-float"
              className="hidden sm:flex absolute bottom-16 -right-2 sm:-right-6 md:-right-8 bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.1)] border border-white items-center gap-3 z-30 w-60 sm:w-72 transition-transform hover:scale-105 duration-300"
            >
              {(() => {
                const safeAvatarUrl = sanitizeSafeUrl(content.floatingCard2.avatarUrl, {
                  allowDataImage: true,
                });
                return safeAvatarUrl && !safeAvatarUrl.includes('unsplash.com') ? (
                  <img
                    src={safeAvatarUrl}
                    alt="HR Avatar"
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-[#F48C06] shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#2F327D] to-[#1E2050] text-white flex items-center justify-center font-bold text-xs border-2 border-[#F48C06] shrink-0 shadow-2xs">
                    <span>{content.floatingCard2.roleTag || 'HR'}</span>
                  </div>
                );
              })()}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs sm:text-sm text-[#2F327D] font-bold leading-tight truncate">
                    {content.floatingCard2.name || 'Bpk. Hendra (HR)'}
                  </p>
                  {content.floatingCard2.badgeText && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-[#F48C06] shrink-0">
                      {content.floatingCard2.badgeText}
                    </span>
                  )}
                </div>
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
          <div data-gsap="services-header">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#2F327D] mb-4 tracking-tight">
              Layanan <span className="text-[#F48C06] font-normal">Terintegrasi</span>
            </h2>
            <p className="text-[#696984] max-w-2xl mx-auto mb-12 sm:mb-16 text-base sm:text-lg font-normal leading-relaxed">
              {content.servicesSubtitle}
            </p>
          </div>

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
                  data-gsap="service-card"
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
      <section id="panduan" className="py-16 sm:py-24 bg-slate-50/70 overflow-hidden relative border-t border-slate-100">
        <div className="container mx-auto px-4 sm:px-8 md:px-16 flex flex-col lg:flex-row items-center gap-10 lg:gap-20">
          {/* Left Asymmetric Photo Grid */}
          <div data-gsap="about-photos" className="w-full lg:w-1/2 relative max-w-lg mx-auto">
            <div className="absolute top-0 left-0 w-full h-full bg-[#F48C06]/10 rounded-[40px] transform rotate-3 scale-105 -z-10" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {(() => {
                const safeAbout1 = sanitizeSafeUrl(content.aboutImage1, { allowDataImage: true });
                const safeAbout2 = sanitizeSafeUrl(content.aboutImage2, { allowDataImage: true });
                return (
                  <>
                    <img
                      src={safeAbout1 && !safeAbout1.includes('unsplash.com') ? safeAbout1 : defaultHotelLounge}
                      alt="Fasilitas Hotel Ciputra Jakarta"
                      className="w-full h-48 sm:h-64 object-cover rounded-[24px] sm:rounded-[28px] rounded-br-sm shadow-md mt-4 sm:mt-6"
                    />
                    <img
                      src={safeAbout2 && !safeAbout2.includes('unsplash.com') ? safeAbout2 : defaultHotelSuite}
                      alt="Akomodasi Hotel Ciputra Jakarta"
                      className="w-full h-48 sm:h-64 object-cover rounded-[24px] sm:rounded-[28px] rounded-tl-sm shadow-md"
                    />
                  </>
                );
              })()}
            </div>

            {/* Floating 100% Data Badge */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-md px-5 sm:px-8 py-3.5 sm:py-5 rounded-2xl shadow-xl z-20 flex flex-col items-center border border-slate-100">
              <span className="text-xl sm:text-3xl font-normal text-[#2F327D] mb-0.5">
                {content.aboutStatNumber || '100%'}
              </span>
              <span className="text-[11px] sm:text-sm font-normal text-[#696984] whitespace-nowrap">
                {content.aboutStatLabel || 'Transparansi Data'}
              </span>
            </div>
          </div>

          {/* Right Text Content */}
          <div data-gsap="about-content" className="w-full lg:w-1/2 text-center lg:text-left">
            <div className="inline-block bg-orange-100 text-[#F48C06] font-normal px-4 py-1.5 rounded-full text-xs sm:text-sm mb-4 mx-auto lg:mx-0">
              {content.aboutTag}
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#2F327D] mb-4 sm:mb-5 leading-tight tracking-tight break-words">
              {content.aboutTitle}
            </h2>

            <p className="text-[#696984] mb-6 sm:mb-8 leading-relaxed text-xs sm:text-base font-normal max-w-xl mx-auto lg:mx-0">
              {content.aboutDescription}
            </p>

            <ul className="space-y-4 mb-8 text-left max-w-xl mx-auto lg:mx-0">
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
              className="inline-flex items-center justify-center lg:justify-start gap-2 text-[#F48C06] font-normal hover:text-[#d37704] transition group text-sm sm:text-base cursor-pointer mx-auto lg:mx-0"
            >
              <span>{content.aboutCtaText || 'Baca Pedoman Perusahaan'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIALS: APA KATA MEREKA? */}
      {activeTestimonial && (
        <section className="py-16 sm:py-24 bg-white relative">
          <div className="container mx-auto px-4 sm:px-8 md:px-16">
            <div className="flex flex-col md:flex-row items-center gap-10 lg:gap-16">
              {/* Left Title & Indicator */}
              <div className="w-full md:w-5/12 relative z-10 text-center md:text-left">
                <div className="w-14 h-1 bg-[#F48C06] mb-4 sm:mb-5 rounded-full mx-auto md:mx-0" />
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#2F327D] mb-3 sm:mb-4 leading-tight tracking-tight">
                  Apa Kata <span className="text-[#F48C06] font-normal">Mereka?</span>
                </h2>
                <p className="text-[#696984] mb-6 sm:mb-8 leading-relaxed text-xs sm:text-base font-normal max-w-md mx-auto md:mx-0">
                  {content.testimonialsSubtitle}
                </p>

                {/* Slider Indicators */}
                <div className="flex gap-2.5 justify-center md:justify-start">
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
                <div className="absolute -inset-2 sm:-inset-3 bg-[#FFF3E4] rounded-[32px] sm:rounded-[36px] -z-10 transform -rotate-1" />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTestimonial.id || activeTestimonialIdx}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row gap-5 sm:gap-8 items-center border border-gray-100 relative overflow-hidden text-center sm:text-left"
                  >
                    <Quote className="absolute top-2 right-4 w-16 sm:w-20 h-16 sm:h-20 text-[#F48C06]/10 pointer-events-none" />

                    {/* Photo */}
                    <div className="shrink-0 relative">
                      {(() => {
                        const safeTestimonialPhoto = sanitizeSafeUrl(activeTestimonial.photoUrl, {
                          allowDataImage: true,
                        });
                        return safeTestimonialPhoto ? (
                          <img
                            src={safeTestimonialPhoto}
                            alt={activeTestimonial.name}
                            className="w-20 h-20 sm:w-32 sm:h-32 object-cover rounded-full border-4 border-white shadow-md mx-auto"
                          />
                        ) : (
                          <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#2F327D] to-[#1E2050] text-white flex items-center justify-center font-bold text-2xl sm:text-3xl border-4 border-white shadow-md mx-auto">
                            {(activeTestimonial.name || 'S').charAt(0).toUpperCase()}
                          </div>
                        );
                      })()}
                      <div className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 bg-[#F48C06] rounded-full flex items-center justify-center text-white text-xs border-2 border-white shadow-2xs">
                        <Quote className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-white" />
                      </div>
                    </div>

                    {/* Quote & Author */}
                    <div>
                      <div className="flex text-amber-400 gap-1 text-sm mb-2.5 justify-center sm:justify-start">
                        {[...Array(activeTestimonial.rating || 5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-[#2F327D] font-normal italic leading-relaxed mb-3 sm:mb-4 text-xs sm:text-sm break-words">
                        "{activeTestimonial.quote}"
                      </p>
                      <div>
                        <h4 className="font-normal text-[#2F327D] text-sm sm:text-base">
                          {activeTestimonial.name}
                        </h4>
                        <p className="text-[#696984] text-[11px] sm:text-xs font-normal">
                          {activeTestimonial.role}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. BERITA & PENGUMUMAN */}
      <section data-gsap="news-section" className="py-16 sm:py-24 bg-slate-50 border-t border-gray-100">
        <div className="container mx-auto px-4 sm:px-8 md:px-16">
          <div data-gsap="news-header" className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 mb-8 sm:mb-12 text-center sm:text-left">
            <div className="max-w-xl">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#2F327D] mb-2 sm:mb-3 tracking-tight">
                Berita & <span className="text-[#F48C06] font-normal">Pengumuman</span>
              </h2>
              <p className="text-[#696984] text-xs sm:text-base font-normal">
                Informasi terbaru seputar manajemen, kebijakan hotel, event karyawan, dan aktivitas internal kita.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="bg-white border border-gray-200 text-[#2F327D] font-normal px-5 py-2.5 rounded-full hover:bg-gray-50 transition text-xs sm:text-sm shadow-2xs whitespace-nowrap cursor-pointer"
            >
              Lihat Semua di Portal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {publishedNews.length > 0 ? (
              publishedNews.map((item) => {
                const badge = cleanPublicBadge(item.sub_kategori);
                const safeThumb = sanitizeSafeUrl(item.thumbUrl, { allowDataImage: true });
                const safeFile = sanitizeSafeUrl(item.fileUrl, { allowDataImage: true });
                const hasValidPhoto = Boolean(
                  (safeThumb && !safeThumb.includes('unsplash.com')) ||
                  (item.fileType?.startsWith('image/') && safeFile && !safeFile.includes('unsplash.com')) ||
                  (item.fileName?.match(/\.(jpg|jpeg|png|webp|gif)$/i) && safeFile && !safeFile.includes('unsplash.com'))
                );
                const photoSrc = (safeThumb && !safeThumb.includes('unsplash.com'))
                  ? safeThumb
                  : (safeFile && !safeFile.includes('unsplash.com'))
                  ? safeFile
                  : '';

                return (
                  <article
                    key={item.id}
                    data-gsap="news-card"
                    onClick={() => {
                      setZoomedNewsItem({
                        id: item.id,
                        title: item.title,
                        date: item.effectiveDate || item.uploadedAt?.slice(0, 10) || 'Terbaru',
                        tag: badge,
                        desc: item.keterangan || 'Pengumuman resmi operasional dan manajemen Hotel Ciputra Jakarta.',
                        imgUrl: photoSrc,
                        attachmentName: item.attachmentName,
                      });
                      setIsPhotoMaximized(false);
                    }}
                    className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer flex flex-col"
                  >
                    {hasValidPhoto && photoSrc ? (
                      <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-100">
                        <img
                          src={photoSrc}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        {badge ? (
                          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-[#2F327D] text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs border border-orange-200">
                            <span>{badge}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="relative h-48 sm:h-52 bg-gradient-to-br from-[#2F327D] to-[#1E2050] flex flex-col items-center justify-center text-white p-4 select-none">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                          <Megaphone className="w-6 h-6 text-[#F48C06]" />
                        </div>
                        <span className="text-[11px] font-semibold text-orange-200 tracking-wider uppercase text-center px-2 line-clamp-1">
                          {badge || 'Pengumuman Resmi'}
                        </span>
                        {badge ? (
                          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-[#2F327D] text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs border border-orange-200">
                            <span>{badge}</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                    <div className="p-5 sm:p-6 flex-1 flex flex-col text-center sm:text-left">
                      <p className="text-[11px] text-[#696984] mb-2 flex items-center justify-center sm:justify-start gap-1.5 font-normal">
                        <Calendar className="w-3 h-3 text-[#F48C06]" />
                        <span>{item.effectiveDate || item.uploadedAt?.slice(0, 10)}</span>
                      </p>
                      <h3 className="text-base sm:text-lg font-bold text-[#2F327D] mb-2 group-hover:text-[#F48C06] transition line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-[#696984] text-xs mb-5 line-clamp-3 leading-relaxed flex-1 font-normal">
                        {item.keterangan || item.attachmentName || 'Klik untuk membaca detail pengumuman resmi.'}
                      </p>
                      <div className="flex justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToLogin();
                          }}
                          className="text-[#F48C06] font-semibold text-xs inline-flex items-center gap-1 hover:text-[#d97706] hover:gap-2 transition-all cursor-pointer"
                        >
                          Baca Selengkapnya (Login) <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="md:col-span-3 bg-white rounded-[24px] p-10 sm:p-12 border border-dashed border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#F48C06] flex items-center justify-center mx-auto border border-orange-100">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#2F327D]">
                  Belum Ada Pengumuman Publik
                </h3>
                <p className="text-xs sm:text-sm text-[#696984] max-w-md mx-auto leading-relaxed font-normal">
                  Saat ini belum ada pengumuman yang dipublikasikan oleh Super Admin ke halaman beranda. Karyawan internal dapat masuk ke portal untuk melihat pengumuman departemen.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#FFF3E4] hover:bg-[#ffe5c4] text-[#F48C06] text-xs font-semibold transition cursor-pointer"
                  >
                    <span>Masuk Portal Karyawan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
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
              <UnifiedLogo customLogoUrl={branding.customLogoUrl} size="md" />
              <span className="text-white font-bold brand-top-left-bold text-xl sm:text-2xl tracking-tight leading-none">
                Hotel Ciputra<br />
                <span className="text-xs font-normal text-white/70">Jakarta</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed mb-6 font-normal max-w-md">
              Portal Internal dan Sistem Informasi Karir terpadu yang didedikasikan untuk operasional dan pengembangan SDM di lingkungan Hotel Ciputra Jakarta.
            </p>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#F48C06] font-semibold mb-2.5">Media Sosial Resmi:</p>
              <SocialMediaBar variant="footer" socialLinks={branding.socialLinks} />
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="lg:col-span-3 lg:col-start-7">
            <h4 className="text-white font-normal text-base mb-5">Tautan Cepat</h4>
            <ul className="space-y-3 text-xs sm:text-sm font-normal">
              <li>
                <button
                  onClick={handleScrollTop}
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
                <a
                  href="#panduan"
                  onClick={(e) => handleScrollToSection(e, '#panduan')}
                  className="hover:text-[#F48C06] transition"
                >
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
      <AnimatePresence>
        {zoomedNewsItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            data-lenis-prevent
            {...getBackdropProps(() => {
              setZoomedNewsItem(null);
              setIsPhotoMaximized(false);
            })}
            className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/80 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl max-w-4xl lg:max-w-5xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[94vh] cursor-default"
            >
              {/* Modal Header */}
              <div className="px-4 sm:px-7 py-3 sm:py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 truncate max-w-[65%] sm:max-w-none min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F48C06] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-[#2F327D] uppercase tracking-wider truncate">
                    Detail Berita & Pengumuman
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setZoomedNewsItem(null);
                      setIsPhotoMaximized(false);
                    }}
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Tutup Popup"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Scrollable Body */}
              <div data-lenis-prevent className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-4 sm:space-y-6">
              {/* Fit Image Hero Banner: Tampil pas & utuh jika memiliki foto */}
              {(() => {
                const safeZoomedImg = sanitizeSafeUrl(zoomedNewsItem.imgUrl, { allowDataImage: true });
                return safeZoomedImg && !safeZoomedImg.includes('unsplash.com') ? (
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center p-2 sm:p-4 w-full shadow-inner min-h-[220px] max-h-[70vh] sm:max-h-[76vh]">
                    <img
                      src={safeZoomedImg}
                      alt={zoomedNewsItem.title}
                      className="w-auto h-auto max-w-full max-h-[64vh] sm:max-h-[72vh] object-contain rounded-xl shadow-md transition-all duration-300"
                    />
                  </div>
                ) : (
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#2F327D] to-[#1E2050] text-white p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-md">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                    <Megaphone className="w-7 h-7 text-[#F48C06]" />
                  </div>
                  <span className="text-xs font-semibold text-orange-200 uppercase tracking-widest">
                    {cleanPublicBadge(zoomedNewsItem.tag) || 'Pengumuman Resmi Operasional'}
                  </span>
                  <h3 className="text-base sm:text-xl font-bold mt-1 text-white max-w-xl">
                    {zoomedNewsItem.title}
                  </h3>
                </div>
                );
              })()}

              {/* Meta & Title */}
              <div className="space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-500 font-normal">
                  {cleanPublicBadge(zoomedNewsItem.tag) ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-[#F48C06] border border-orange-200">
                      {cleanPublicBadge(zoomedNewsItem.tag)}
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-[#F48C06]" />
                    <span>{zoomedNewsItem.date}</span>
                  </span>
                </div>

                <h3 className="text-base sm:text-2xl md:text-3xl font-bold text-[#2F327D] leading-snug break-words">
                  {zoomedNewsItem.title}
                </h3>
              </div>

              {/* Full Keterangan / Isi Rincian */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center sm:text-left">
                  Keterangan & Rincian Pengumuman:
                </h4>
                <div className="p-4 sm:p-6 bg-slate-50/90 rounded-2xl border border-slate-200/80 text-slate-700 text-xs sm:text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal break-words text-center sm:text-left">
                  {zoomedNewsItem.desc}
                </div>
              </div>

              {/* Info Lampiran Dokumen jika ada */}
              {zoomedNewsItem.attachmentName && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-50/80 border border-sky-200 flex flex-col sm:flex-row items-center text-center sm:text-left gap-3 text-sky-900 text-xs sm:text-sm">
                  <FileText className="w-5 h-5 text-sky-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold block">Tersedia Berkas Lampiran Resmi:</span>
                    <span className="text-sky-700 font-mono text-xs break-all">{zoomedNewsItem.attachmentName}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Redirection to Employee Login */}
            <div className="p-3.5 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <p className="text-xs text-slate-500 text-center sm:text-left">
                Untuk mengunduh dokumen resmi dan berinteraksi dengan pengumuman ini, silakan masuk ke portal karyawan.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setZoomedNewsItem(null);
                    setIsPhotoMaximized(false);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition cursor-pointer text-center"
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
                  className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-[#F48C06] hover:bg-[#e07f04] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#F48C06]/20 hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] whitespace-nowrap text-center"
                >
                  <span>Selengkapnya (Login Karyawan)</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
