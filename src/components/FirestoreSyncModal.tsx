import React, { useState, useEffect } from 'react';
import {
  X,
  Flame,
  CheckCircle2,
  RefreshCw,
  Clock,
  ShieldCheck,
  FileCheck2,
  Trash2,
  Users,
  Database,
  Layers,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { User } from '../types';
import {
  getDocuments,
  getUsers,
  getAccessLogs,
  pruneExpiredAnnouncements,
  pruneExpiredAccessLogs,
  getSystemStorageConfig,
  saveSystemStorageConfig,
} from '../lib/storage';
import {
  testFirestoreConnection,
  seedInitialFirestoreData,
  FirebaseDiagnosticReport,
} from '../lib/firestoreService';
import { getBackdropProps } from '../lib/modalHelper';

interface FirestoreSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onRefreshAll?: () => void;
}

export const FirestoreSyncModal: React.FC<FirestoreSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRefreshAll,
}) => {
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [report, setReport] = useState<FirebaseDiagnosticReport | null>(null);
  const [cleanMessage, setCleanMessage] = useState<string | null>(null);
  const [autoPruneDays, setAutoPruneDays] = useState<number>(7);

  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
      const cfg = getSystemStorageConfig();
      setAutoPruneDays(cfg.autoPruneAnnouncementsDays || 7);
      setCleanMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const docs = getDocuments();
  const users = getUsers();
  const logs = getAccessLogs();
  const annCount = docs.filter((d) => d.category === 'Pengumuman').length;

  const handleTestConnection = async () => {
    setIsChecking(true);
    try {
      const res = await testFirestoreConnection();
      setReport(res);
    } catch (e: any) {
      setReport({
        success: false,
        status: 'UNKNOWN',
        title: 'Gagal Menguji Koneksi',
        message: e?.message || 'Gagal tersambung ke Firestore',
        troubleshootingSteps: [],
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleForceSeed = async () => {
    setIsSeeding(true);
    setCleanMessage(null);
    try {
      const res = await seedInitialFirestoreData(true);
      setCleanMessage(res.message);
      await handleTestConnection();
      if (onRefreshAll) onRefreshAll();
    } finally {
      setIsSeeding(false);
    }
  };

  const handleRunPrune = () => {
    if (!currentUser) return;
    const pruneRes = pruneExpiredAnnouncements(autoPruneDays, currentUser);
    pruneExpiredAccessLogs();

    setCleanMessage(
      `Pembersihan selesai! ${pruneRes.deletedCount} pengumuman kedaluwarsa & log berumur >3 bulan (90 hari) dibersihkan dari Firestore.`
    );
    if (onRefreshAll) onRefreshAll();
  };

  const handleSavePruneDays = (days: number) => {
    setAutoPruneDays(days);
    saveSystemStorageConfig({ autoPruneAnnouncementsDays: days }, currentUser || undefined);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      {...getBackdropProps(onClose)}
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-linear-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-100 shadow-inner">
              <Flame className="w-5 h-5 fill-amber-200 text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
                Status Koneksi &amp; Sinkronisasi Sistem
              </h3>
              <p className="text-xs text-amber-100/90 mt-0.5">
                Sinkronisasi Data &amp; Pemeliharaan Sistem Hotel Ciputra Jakarta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-sm">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              report?.success
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-amber-50/80 border-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-4 h-4 mt-1 rounded-full shrink-0 ${
                  report?.success
                    ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse'
                    : 'bg-amber-500 ring-4 ring-amber-100'
                }`}
              />
              <div>
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span>{report?.title || 'Menguji Koneksi ke Cloud Firestore...'}</span>
                  {report?.success && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                      Online & Real-time
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {report?.message || 'Memverifikasi akses baca/tulis ke database...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleTestConnection}
                disabled={isChecking}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-amber-600' : ''}`}
                />
                <span>{isChecking ? 'Menguji...' : 'Uji Koneksi'}</span>
              </button>
              <button
                onClick={handleForceSeed}
                disabled={isSeeding}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Sinkronkan data master ke Cloud Firestore"
              >
                <span>{isSeeding ? 'Menyinkronkan...' : 'Sinkronkan Master'}</span>
              </button>
            </div>
          </div>

          {/* Troubleshooting Steps if Permission Denied or Not Found */}
          {report && !report.success && report.troubleshootingSteps.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Panduan Perbaikan Koneksi ({report.status})</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-rose-800">
                {report.troubleshootingSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Real-time Synced Collections Stats */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Statistik Koleksi Data Terintegrasi</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-medium">Akun User</span>
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="text-xl font-black text-slate-900 tabular-nums">{users.length}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Pengguna aktif</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-medium">Dokumen Total</span>
                  <Database className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-xl font-black text-slate-900 tabular-nums">{docs.length}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">SOP & Formulir</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-medium">Pengumuman</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-xl font-black text-slate-900 tabular-nums">{annCount}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Internal broadcast</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-medium">Riwayat Log</span>
                  <FileCheck2 className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div className="text-xl font-black text-slate-900 tabular-nums">{logs.length}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Retensi 3 bulan</div>
              </div>
            </div>
          </div>

          {/* Retention & Auto-Pruning Settings */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Retensi & Kebersihan Penyimpanan Otomatis</span>
                </h5>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pengumuman kedaluwarsa & Access Log &gt;3 bulan (90 hari) dibersihkan otomatis.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={autoPruneDays}
                  onChange={(e) => handleSavePruneDays(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  <option value={3}>3 Hari</option>
                  <option value={7}>7 Hari (1 Minggu)</option>
                  <option value={14}>14 Hari (2 Minggu)</option>
                  <option value={30}>30 Hari (1 Bulan)</option>
                </select>
              </div>
            </div>

            {cleanMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{cleanMessage}</span>
              </div>
            )}

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={handleRunPrune}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Bersihkan Berkas & Log Kedaluwarsa</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Sistem Informasi Internal • Hotel Ciputra Jakarta</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
