/**
 * Single source of truth for application version & IT-BG release metadata.
 * Update APP_VERSION_NUMBER whenever a new release ships — all footers and
 * version dialogs across Public Home, Career, Login, and Dashboard stay synced.
 */
export const APP_VERSION_NUMBER = '5.234';
export const APP_DEV_OWNER = 'IT-BG';
export const APP_DEV_LABEL = `${APP_DEV_OWNER} dev v ${APP_VERSION_NUMBER}`;
export const APP_RELEASE_DATE = '24 November 2026';

export interface ReleaseChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}

export const APP_RELEASE_HISTORY: ReleaseChangelogEntry[] = [
  {
    version: APP_DEV_LABEL,
    date: APP_RELEASE_DATE,
    highlights: [
      'Pembaruan halaman Kebijakan Privasi Portal yang lebih ringkas dan jelas.',
      'Penyelarasan penomoran versi terpusat IT-BG dev di seluruh halaman.',
      'Penyempurnaan tampilan info publik, halaman karir, dan stabilitas akses.',
    ],
  },
];
