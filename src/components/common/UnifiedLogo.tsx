import React, { useState, useEffect } from 'react';
import { getAppBranding, subscribeToAppBranding } from '../../lib/branding';
import { sanitizeSafeUrl } from '../../lib/security';

export interface UnifiedLogoProps {
  customLogoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  imageClassName?: string;
  alt?: string;
}

const sizeConfig = {
  xs: {
    container: 'w-7 h-7 rounded-lg text-xs',
    svg: 'w-5 h-5',
  },
  sm: {
    container: 'w-8 h-8 rounded-xl text-xs',
    svg: 'w-6 h-6',
  },
  md: {
    container: 'w-10 h-10 sm:w-11 sm:h-11 rounded-2xl',
    svg: 'w-7 h-7 sm:w-8 sm:h-8',
  },
  lg: {
    container: 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl',
    svg: 'w-8 h-8 sm:w-9 sm:h-9',
  },
  xl: {
    container: 'w-14 h-14 rounded-2xl text-xl',
    svg: 'w-10 h-10',
  },
  '2xl': {
    container: 'w-16 h-16 rounded-3xl text-2xl',
    svg: 'w-11 h-11',
  },
};

/**
 * UnifiedLogo: Standardized single-source logo component used across all pages
 * (Public Home, Career Vacancies, Login, Navbar, Sidebar, Intranet Dashboard, CMS Admin).
 * Renders the bespoke Hotel Ciputra Jakarta architectural crest when no custom upload is active.
 */
export const UnifiedLogo: React.FC<UnifiedLogoProps> = ({
  customLogoUrl,
  size = 'md',
  className = '',
  imageClassName = '',
  alt = 'Logo Hotel Ciputra Jakarta',
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(
    customLogoUrl !== undefined ? customLogoUrl : getAppBranding().customLogoUrl
  );

  useEffect(() => {
    if (customLogoUrl !== undefined) {
      setLogoUrl(customLogoUrl);
      return;
    }
    const unsub = subscribeToAppBranding((b) => {
      setLogoUrl(b.customLogoUrl);
    });
    return () => unsub();
  }, [customLogoUrl]);

  const cfg = sizeConfig[size] || sizeConfig.md;
  const safeLogoUrl = sanitizeSafeUrl(logoUrl, { allowDataImage: true });

  if (safeLogoUrl) {
    return (
      <div
        className={`relative overflow-hidden bg-white flex items-center justify-center shadow-md shadow-[#F48C06]/15 border border-orange-100/80 group-hover:scale-105 transition-transform duration-300 shrink-0 ${cfg.container} ${className}`}
      >
        <img
          src={safeLogoUrl}
          alt={alt}
          className={`w-full h-full object-contain p-0.5 select-none ${imageClassName}`}
          loading="eager"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#1B1F5A] via-[#2F327D] to-[#232766] border border-[#F48C06]/40 flex items-center justify-center shadow-md shadow-[#2F327D]/25 group-hover:scale-105 transition-transform duration-300 shrink-0 select-none ${cfg.container} ${className}`}
      aria-label={alt}
      title="Hotel Ciputra Jakarta • Portal Intranet"
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cfg.svg}
        aria-hidden="true"
      >
        {/* Inner Luxury Crest Frame */}
        <rect
          x="3.5"
          y="3.5"
          width="41"
          height="41"
          rx="10"
          stroke="url(#hcjGold)"
          strokeWidth="1.4"
          strokeOpacity="0.65"
        />
        {/* Crown Hospitality Diamond */}
        <path
          d="M24 8.5L26.6 11.4L24 14.3L21.4 11.4L24 8.5Z"
          fill="url(#hcjGold)"
        />
        <circle cx="17.5" cy="12" r="1.2" fill="#FBBF24" fillOpacity="0.85" />
        <circle cx="30.5" cy="12" r="1.2" fill="#FBBF24" fillOpacity="0.85" />
        {/* Architectural Twin-Tower Hospitality Monogram ("H" Crest) */}
        <path
          d="M14 17.5H18.5V24.2H29.5V17.5H34V35.5H29.5V28.3H18.5V35.5H14V17.5Z"
          fill="#FFFFFF"
        />
        {/* Warm Ciputra Gold Horizon Accent */}
        <path
          d="M11.5 38.2H36.5"
          stroke="url(#hcjGold)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="hcjGold" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" />
            <stop offset="0.5" stopColor="#F48C06" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

