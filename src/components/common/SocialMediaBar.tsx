import React from 'react';
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Phone,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { SocialMediaItem } from '../../types';
import { getAppBranding, subscribeToAppBranding } from '../../lib/branding';
import { sanitizeSafeUrl } from '../../lib/security';

// Modern SVG Icons for platforms not built-in with Lucide or specific styling
export const TikTokIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.42a6.34 6.34 0 0 0-.86-.06 6.33 6.33 0 0 0-5.48 9.5 6.34 6.34 0 0 0 8.63 2.15A6.29 6.29 0 0 0 15.82 15V8.5a8.28 8.28 0 0 0 4.77 1.5V6.55c-.33 0-.67-.05-1-.14v.28Z" />
  </svg>
);

export const XTwitterIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662a11.835 11.835 0 0 0 5.711 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.415" />
  </svg>
);

export const renderSocialIcon = (id: string, className = 'w-4 h-4') => {
  switch (id) {
    case 'instagram':
      return <Instagram className={className} />;
    case 'facebook':
      return <Facebook className={className} />;
    case 'linkedin':
      return <Linkedin className={className} />;
    case 'youtube':
      return <Youtube className={className} />;
    case 'tiktok':
      return <TikTokIcon className={className} />;
    case 'twitter':
      return <XTwitterIcon className={className} />;
    case 'whatsapp':
      return <WhatsAppIcon className={className} />;
    default:
      return <ExternalLink className={className} />;
  }
};

export interface SocialMediaBarProps {
  socialLinks?: SocialMediaItem[];
  variant?: 'dashboard' | 'footer' | 'pill' | 'compact';
  className?: string;
  showLabels?: boolean;
}

export const SocialMediaBar: React.FC<SocialMediaBarProps> = ({
  socialLinks: customLinks,
  variant = 'dashboard',
  className = '',
  showLabels = false,
}) => {
  const [links, setLinks] = React.useState<SocialMediaItem[]>(
    customLinks || getAppBranding().socialLinks || []
  );

  React.useEffect(() => {
    if (customLinks) {
      setLinks(customLinks);
      return;
    }
    const unsub = subscribeToAppBranding((b) => {
      setLinks(b.socialLinks || []);
    });
    return () => unsub();
  }, [customLinks]);

  // Only render active/enabled links that pass safe scheme validation (http/https only)
  const activeLinks = links
    .filter((l) => l.enabled && l.url && l.url.trim().length > 0)
    .map((l) => ({
      ...l,
      safeUrl: sanitizeSafeUrl(l.url, { allowDataImage: false, allowRelative: false }),
    }))
    .filter((l): l is SocialMediaItem & { safeUrl: string } => Boolean(l.safeUrl));

  if (activeLinks.length === 0) {
    return null;
  }

  if (variant === 'footer') {
    return (
      <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
        {activeLinks.map((item) => (
          <a
            key={item.id}
            href={item.safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.name}
            title={`${item.name}${item.handle ? ` (${item.handle})` : ''}`}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#F48C06] text-white flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-sm"
          >
            {renderSocialIcon(item.id, 'w-4 h-4')}
          </a>
        ))}
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {activeLinks.map((item) => (
          <a
            key={item.id}
            href={item.safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-slate-700 hover:text-[#F48C06] text-xs transition shadow-2xs"
          >
            {renderSocialIcon(item.id, 'w-3.5 h-3.5 text-[#F48C06]')}
            <span className="font-medium text-[11px]">{item.name}</span>
          </a>
        ))}
      </div>
    );
  }

  // Dashboard variant: Elegant soft modern buttons in the dashboard footer
  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 flex-wrap ${className}`}>
      {activeLinks.map((item) => (
        <a
          key={item.id}
          href={item.safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.name}
          title={`${item.name}: ${item.handle || item.safeUrl}`}
          className="group relative p-1.5 sm:p-2 rounded-xl bg-white hover:bg-[#FFF3E4] text-[#2F327D] hover:text-[#F48C06] border border-sky-200/80 hover:border-[#F48C06]/40 transition-all duration-200 shadow-2xs hover:shadow-xs flex items-center justify-center cursor-pointer"
        >
          {renderSocialIcon(item.id, 'w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110')}
          
          {showLabels && (
            <span className="ml-1.5 text-[11px] font-medium hidden sm:inline">
              {item.name}
            </span>
          )}

          {/* Mini hover tooltip */}
          <span className="absolute bottom-full mb-1.5 hidden group-hover:block z-30 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-medium whitespace-nowrap shadow-md pointer-events-none">
            {item.name}
          </span>
        </a>
      ))}
    </div>
  );
};
