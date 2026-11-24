import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ShieldCheck,
  Code2,
  X,
  Lock,
  FileCheck2,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Info,
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
            className="bg-white rounded-[24px] sm:rounded-[28px] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[88vh] cursor-default"
          >
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-[#1a1c4b] to-[#2F327D] text-white flex items-center justify-between gap-3 shrink-0 border-b-4 border-[#F48C06]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  {activeTab === 'privacy' ? (
                    <ShieldCheck className="w-5 h-5 text-[#F48C06]" />
                  ) : (
                    <Code2 className="w-5 h-5 text-[#F48C06]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold truncate">
                    {activeTab === 'privacy' ? 'Kebijakan Privasi Portal' : APP_DEV_LABEL}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-white/75 truncate">
                    Hotel Ciputra Jakarta
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
            <div className="px-5 sm:px-6 pt-3 pb-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0 flex-wrap">
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
            <div data-lenis-prevent className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5 text-slate-700 text-xs sm:text-sm leading-relaxed">
              {activeTab === 'privacy' ? (
                <>
                  <div className="p-3.5 rounded-2xl bg-[#FFF3E4]/70 border border-orange-200/80 text-slate-700">
                    <p className="text-xs sm:text-[13px] leading-relaxed">
                      Portal ini dikelola oleh <strong>Hotel Ciputra Jakarta</strong> untuk menyajikan informasi
                      resmi, pengumuman publik, serta layanan karir dengan tetap menjaga privasi dan kenyamanan
                      pengunjung.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center gap-2 font-bold text-[#2F327D] text-xs sm:text-[13px]">
                        <UserCheck className="w-4 h-4 text-[#F48C06] shrink-0" />
                        <span>Penggunaan Data</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Informasi yang Anda kirimkan (seperti data lamaran kerja atau akses akun resmi) hanya
                        digunakan untuk kebutuhan layanan terkait.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center gap-2 font-bold text-[#2F327D] text-xs sm:text-[13px]">
                        <Lock className="w-4 h-4 text-[#F48C06] shrink-0" />
                        <span>Privasi Berkas Pelamar</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Data kandidat dan berkas CV yang dikirim melalui halaman Karir ditangani secara tertutup oleh
                        tim rekrutmen dan tidak disebarluaskan.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center gap-2 font-bold text-[#2F327D] text-xs sm:text-[13px]">
                        <FileCheck2 className="w-4 h-4 text-[#F48C06] shrink-0" />
                        <span>Batasan Akses</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Konten publik hanya menampilkan informasi resmi untuk umum, sedangkan area portal internal
                        dikhususkan bagi pihak berwenang.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center gap-2 font-bold text-[#2F327D] text-xs sm:text-[13px]">
                        <Info className="w-4 h-4 text-[#F48C06] shrink-0" />
                        <span>Pembaruan Informasi</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Ketentuan privasi ini dapat disesuaikan sewaktu-waktu mengikuti kebutuhan layanan portal resmi
                        Hotel Ciputra Jakarta.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1a1c4b] to-[#2F327D] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F48C06] text-white text-[11px] font-bold mb-1.5">
                        <Sparkles className="w-3 h-3" />
                        <span>Versi Aktif</span>
                      </div>
                      <h4 className="text-lg font-bold tracking-tight font-mono">
                        {APP_DEV_LABEL}
                      </h4>
                      <p className="text-xs text-white/75 mt-0.5">
                        Pembaruan rilis: {APP_RELEASE_DATE}
                      </p>
                    </div>
                    <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-[11px] text-white/90 shrink-0">
                      <div className="font-semibold">Hotel Ciputra Jakarta</div>
                      <div className="text-white/70">Official Portal System</div>
                    </div>
                  </div>

                  {APP_RELEASE_HISTORY.map((rel) => (
                    <div
                      key={rel.version}
                      className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <span className="font-bold text-[#2F327D] font-mono text-xs">
                          Catatan Pembaruan ({rel.version})
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
                </>
              )}
            </div>

            {/* Footer Action */}
            <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
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
