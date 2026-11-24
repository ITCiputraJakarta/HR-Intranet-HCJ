import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ShieldCheck,
  Code2,
  X,
  Lock,
  FileText,
  Database,
  Clock,
  Mail,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { APP_DEV_LABEL, APP_RELEASE_DATE, APP_RELEASE_HISTORY } from '../../lib/appVersion';
import { getBackdropProps } from '../../lib/modalHelper';

export type PortalLegalTab = 'privacy' | 'release';

interface PortalLegalModalProps {
  isOpen: boolean;
  initialTab?: PortalLegalTab;
  onClose: () => void;
}

export const PortalLegalModal: React.FC<PortalLegalModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<PortalLegalTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          data-lenis-prevent
          {...getBackdropProps(onClose)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm cursor-pointer"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[24px] sm:rounded-[28px] shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] cursor-default"
          >
            {/* Header */}
            <div className="px-5 sm:px-7 py-4 bg-gradient-to-r from-[#1a1c4b] to-[#2F327D] text-white flex items-center justify-between gap-3 shrink-0 border-b-4 border-[#F48C06]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  {activeTab === 'privacy' ? (
                    <ShieldCheck className="w-5 h-5 text-[#F48C06]" />
                  ) : (
                    <Code2 className="w-5 h-5 text-[#F48C06]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold truncate">
                    {activeTab === 'privacy'
                      ? 'Kebijakan Privasi Portal'
                      : `Informasi Sistem & Rilis (${APP_DEV_LABEL})`}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-white/70 truncate">
                    Portal Intranet &amp; Karir Resmi • Hotel Ciputra Jakarta
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer shrink-0"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="px-5 sm:px-7 pt-3.5 pb-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'bg-[#2F327D] text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-[#2F327D]/40'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Kebijakan Privasi Portal</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('release')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'release'
                    ? 'bg-[#F48C06] text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-[#F48C06]/50'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{APP_DEV_LABEL}</span>
              </button>
            </div>

            {/* Body */}
            <div data-lenis-prevent className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4 text-slate-700 text-xs sm:text-sm leading-relaxed">
              {activeTab === 'privacy' ? (
                <>
                  <div className="p-4 rounded-2xl bg-[#FFF3E4]/70 border border-orange-200/80 text-slate-700">
                    <p className="font-semibold text-[#2F327D] mb-1">
                      Komitmen Privasi &amp; Keamanan Informasi Internal
                    </p>
                    <p className="text-xs leading-relaxed">
                      Portal Intranet &amp; Arsip Digital serta Portal Karir Hotel Ciputra Jakarta mengelola data
                      akun karyawan, arsip operasional (SOP &amp; Formulir), penilaian kinerja (KPI), dan berkas
                      lamaran kandidat secara terbatas sesuai prinsip kebutuhan operasional dan otorisasi peran.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-[#2F327D] text-xs sm:text-sm">
                        <Lock className="w-4 h-4 text-[#F48C06] shrink-0" />
                        <span>1. Akun, Google SSO &amp; Sesi</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Hanya nama, email kerja terverifikasi, departemen, unit, dan role yang dicatat. Kata sandi
                        disimpan dalam format hash satu arah, sedangkan login Google SSO wajib melewati verifikasi
                        status <strong>Approved</strong> dari Super Admin sebelum sesi aktif diterbitkan.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-[#2F327D] text-xs sm:text-sm">
                        <FileText className="w-4 h-4 text-[#F48C06] shrink-0" />
                        <span>2. Kerahasiaan SOP &amp; Publikasi</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Dokumen SOP, Formulir, dan nilai KPI bersifat rahasia internal dan tidak pernah disimpan di
                        penyimpanan browser lokal publik. Hanya pengumuman foto resmi yang diizinkan tayang di
                        Beranda Publik oleh Super Admin.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-[#2F327D] text-xs sm:text-sm">
                        <Database className="w-4 h-4 text-[#F48C06] shrink-0" />
                        <span>3. Data Pelamar Karir &amp; CV PDF</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Data identitas dan file CV PDF pelamar pada halaman Lowongan Karir divalidasi ukuran serta
                        keamanan formulirnya, lalu hanya dapat dibaca dan ditinjau oleh tim HRD / Super Admin
                        berwenang untuk proses rekrutmen Hotel Ciputra Jakarta.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-[#2F327D] text-xs sm:text-sm">
                        <Clock className="w-4 h-4 text-[#F48C06] shrink-0" />
                        <span>4. Log Audit &amp; Retensi 90 Hari</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Aktivitas autentikasi, akses dokumen, dan manajemen akun dicatat untuk audit keamanan
                        operasional dan dibersihkan otomatis apabila melampaui masa retensi 90 hari di Cloud
                        Firestore.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4 text-[#2F327D] shrink-0" />
                      <span>
                        Pertanyaan privasi, pembaruan akses, atau penonaktifan akun hubungi{' '}
                        <strong className="text-[#2F327D]">it@hotelciputra.com</strong>
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono shrink-0">
                      {APP_DEV_LABEL}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#1a1c4b] to-[#2F327D] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F48C06] text-white text-[11px] font-bold mb-2">
                        <Sparkles className="w-3 h-3" />
                        <span>Versi Aktif Portal</span>
                      </div>
                      <h4 className="text-lg sm:text-xl font-bold tracking-tight font-mono">
                        {APP_DEV_LABEL}
                      </h4>
                      <p className="text-xs text-white/75 mt-0.5">
                        Pembaruan Build: {APP_RELEASE_DATE} • Sinkron otomatis di seluruh halaman
                      </p>
                    </div>
                    <div className="px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-[11px] font-mono text-white/90 shrink-0">
                      <div>Engine: React + Express + Firestore</div>
                      <div>Owner: IT Department HCJ</div>
                    </div>
                  </div>

                  {APP_RELEASE_HISTORY.map((rel) => (
                    <div
                      key={rel.version}
                      className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <span className="font-bold text-[#2F327D] font-mono text-xs sm:text-sm">
                          {rel.version}
                        </span>
                        <span className="text-[11px] text-slate-500">{rel.date}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {rel.highlights.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-600">
                    <p className="font-bold text-[#2F327D]">Ketentuan Penggunaan Sistem IT</p>
                    <p>
                      Akses intranet hanya diperuntukkan bagi karyawan dan manajemen aktif Hotel Ciputra Jakarta.
                      Pengguna wajib menjaga kerahasiaan akun Google/kata sandi masing-masing dan tidak menyebarkan
                      dokumen internal ke pihak luar tanpa persetujuan Manajemen.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer Action */}
            <div className="px-5 sm:px-7 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 font-mono">{APP_DEV_LABEL}</span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#2F327D] hover:bg-[#1a1c4b] text-white font-semibold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
