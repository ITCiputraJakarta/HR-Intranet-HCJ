import React, { useState, useEffect } from 'react';
import { Hotel } from 'lucide-react';
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
    icon: 'w-3.5 h-3.5 stroke-[2.2]',
  },
  sm: {
    container: 'w-8 h-8 rounded-xl text-xs',
    icon: 'w-4 h-4 stroke-[2.2]',
  },
  md: {
    container: 'w-10 h-10 sm:w-11 sm:h-11 rounded-2xl',
    icon: 'w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]',
  },
  lg: {
    container: 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl',
    icon: 'w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]',
  },
  xl: {
    container: 'w-14 h-14 rounded-2xl text-xl',
    icon: 'w-7 h-7 stroke-[2.2]',
  },
  '2xl': {
    container: 'w-16 h-16 rounded-3xl text-2xl',
    icon: 'w-8 h-8 stroke-[2.2]',
  },
};

/**
 * UnifiedLogo: Standardized single-source logo component used across all pages
 * (Public Home, Career Vacancies, Login, Navbar, Sidebar, Intranet Dashboard, CMS Admin).
 * Automatically pulls the unified logo set by Super Admin.
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
      className={`bg-gradient-to-tr from-[#F48C06] to-[#ff9e24] flex items-center justify-center text-white font-bold shadow-md shadow-[#F48C06]/20 group-hover:scale-105 transition-transform duration-300 shrink-0 select-none ${cfg.container} ${className}`}
    >
      <Hotel className={cfg.icon} />
    </div>
  );
};
