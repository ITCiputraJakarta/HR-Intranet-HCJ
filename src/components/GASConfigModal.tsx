import React, { useState, useEffect } from 'react';
import {
  Flame,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  RefreshCw,
  Database,
  Link,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
  Cloud,
  Key,
  ShieldAlert,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { SpreadsheetConfig, User } from '../types';
import { GOOGLE_DRIVE_STORAGE_SCRIPT } from '../lib/appsScriptCode';
import { saveSpreadsheetConfig, getSpreadsheetConfig, addAccessLog } from '../lib/storage';
import {
  seedInitialFirestoreData,
  testFirestoreConnection,
  FirebaseDiagnosticReport
} from '../lib/firestoreService';
import {
  firebaseProjectId,
  firestoreDatabaseId,
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  resetStoredFirebaseConfig,
  FirebaseAppConfig
} from '../lib/firebase';

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

interface GASConfigModalProps {
  currentUser: User;
  onClose: () => void;
  onConfigSaved: (newCfg: SpreadsheetConfig) => void;
  initialTab?: 'firebase' | 'rules' | 'credentials' | 'drive';
}

export const GASConfigModal: React.FC<GASConfigModalProps> = ({
  currentUser,
  onClose,
  onConfigSaved,
  initialTab = 'firebase',
}) => {
  const currentConfig = getSpreadsheetConfig();
  const [webAppUrl, setWebAppUrl] = useState(currentConfig.webAppUrl || currentConfig.gasWebAppUrl || '');
  const [folderId, setFolderId] = useState(currentConfig.driveFolderId || currentConfig.googleDriveFolderId || 'Intranet_Ciputra_Uploads');

  const [activeTab, setActiveTab] = useState<'firebase' | 'rules' | 'credentials' | 'drive'>(initialTab);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  // Diagnostic State
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<FirebaseDiagnosticReport | null>(null);

  // Firestore Seed State
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Drive Test Ping State
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<{
    success: boolean;
    message: string;
    serverTime?: string;
  } | null>(null);

  // Editable Firebase Credentials State
  const [fbConfig, setFbConfig] = useState<FirebaseAppConfig>(() => getStoredFirebaseConfig());
  const [credSavedFeedback, setCredSavedFeedback] = useState<string | null>(null);

  // Run initial diagnostic on modal open
  useEffect(() => {
    runDiagnostic();
  }, []);

  const runDiagnostic = async () => {
    setIsDiagnosing(true);
    try {
      const rep = await testFirestoreConnection();
      setDiagnosticReport(rep);
    } catch (err: any) {
      setDiagnosticReport({
        success: false,
        status: 'UNKNOWN',
        title: 'Galat Diagnostik',
        message: err?.message || 'Gagal menjalankan uji koneksi Firestore.',
        troubleshootingSteps: ['Periksa koneksi internet Anda.'],
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_DRIVE_STORAGE_SCRIPT);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2500);
  };

  const handleSeedFirestore = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const res = await seedInitialFirestoreData(true);
      setSeedResult({
        success: res.seeded,
        message: res.message || 'Sinkronisasi data awal ke Firebase Firestore berhasil!',
      });
      if (res.seeded) {
        runDiagnostic();
      }
    } catch (err: any) {
      setSeedResult({
        success: false,
        message: err.message || 'Gagal sinkronisasi ke Firestore.',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSaveDriveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SpreadsheetConfig = {
      ...currentConfig,
      gasWebAppUrl: webAppUrl.trim(),
      webAppUrl: webAppUrl.trim(),
      googleDriveFolderId: folderId.trim() || 'Intranet_Ciputra_Uploads',
      driveFolderId: folderId.trim() || 'Intranet_Ciputra_Uploads',
      autoSync: true,
      autoSyncEnabled: true,
      lastSync: new Date().toISOString(),
      lastSyncTimestamp: new Date().toISOString(),
    };

    saveSpreadsheetConfig(updated);
    onConfigSaved(updated);

    addAccessLog({
      user: currentUser,
      actionCategory: 'SYSTEM',
      action: 'Konfigurasi Google Drive & Cloud Diperbarui',
      target: updated.driveFolderId,
      status: 'SUCCESS',
      details: `Google Drive Web App URL: ${updated.webAppUrl || 'Default Internal'}, Folder: ${updated.driveFolderId}. Database aktif: Firebase Firestore.`,
    });

    onClose();
  };

  const handleTestDriveConnection = async () => {
    if (!webAppUrl.trim()) {
      setDriveTestResult({
        success: false,
        message: 'Masukkan URL Google Apps Script Web App untuk Google Drive terlebih dahulu.',
      });
      return;
    }

    setIsTestingDrive(true);
    setDriveTestResult(null);

    try {
      const response = await fetch('/api/gas/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webAppUrl: webAppUrl.trim() }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        setDriveTestResult({
          success: true,
          message: data.message || 'Koneksi ke Google Drive Storage Engine berhasil!',
          serverTime: data.serverTime,
        });
      } else {
        setDriveTestResult({
          success: false,
          message: data?.message || data?.error || 'Gagal terhubung ke Google Apps Script Drive.',
        });
      }
    } catch (err: any) {
      setDriveTestResult({
        success: false,
        message: `Galat jaringan: ${err.message || 'Network error'}`,
      });
    } finally {
      setIsTestingDrive(false);
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredFirebaseConfig(fbConfig);
    setCredSavedFeedback('Kredensial Firebase berhasil disimpan! Muat ulang (Refresh) halaman untuk menerapkan ke seluruh sesi.');
    setTimeout(() => {
      runDiagnostic();
    }, 500);
  };

  const handleResetCredentials = () => {
    if (confirm('Kembalikan konfigurasi Firebase ke nilai bawaan proyek (hr-intranet-31ff4)?')) {
      resetStoredFirebaseConfig();
      setFbConfig(getStoredFirebaseConfig());
      setCredSavedFeedback('Kredensial dikembalikan ke pengaturan awal proyek.');
      setTimeout(() => {
        runDiagnostic();
      }, 500);
    }
  };

  const projectUrl = `https://console.firebase.google.com/project/${fbConfig.projectId || 'hr-intranet-31ff4'}/firestore/rules`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20">
              <Flame className="w-5 h-5 fill-amber-500 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Pusat Konfigurasi & Diagnostik Firebase
                </h2>
                {diagnosticReport?.status === 'CONNECTED' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online & Terhubung
                  </span>
                ) : diagnosticReport?.status === 'PERMISSION_DENIED' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Izin Rules Diperlukan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    {diagnosticReport?.status || 'Memeriksa...'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Proyek: <strong className="text-slate-800 font-mono">{fbConfig.projectId || 'hr-intranet-31ff4'}</strong> • Sinkronisasi real-time & penyimpanan berkas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-2 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('firebase')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'firebase'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Status & Diagnostik</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'rules'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Aturan Keamanan (Rules)</span>
            {diagnosticReport?.status === 'PERMISSION_DENIED' && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('credentials')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'credentials'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Kredensial Firebase</span>
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'drive'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Google Drive Storage</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: STATUS & DIAGNOSTIK */}
          {activeTab === 'firebase' && (
            <div className="space-y-6">
              
              {/* Architecture Info Banner */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-blue-500/10 border border-indigo-200/60 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-600 fill-amber-500" />
                  <span className="text-xs font-bold text-slate-900">Arsitektur Cloud Firestore Terhubung</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Database portal intranet berjalan di <strong>Cloud Firestore</strong> (Proyek: <code className="font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">{fbConfig.projectId}</code>). Seluruh data dokumen SOP, master departemen, kategori, KPI, dan log akses disinkronkan secara otomatis.
                </p>
              </div>

              {/* Live Diagnostic Card */}
              <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Cloud className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Hasil Uji Koneksi Firestore Real-Time
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Menjalankan probe baca dan status endpoint Cloud Firestore
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={runDiagnostic}
                    disabled={isDiagnosing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} />
                    <span>{isDiagnosing ? 'Menguji...' : 'Uji Koneksi Ulang'}</span>
                  </button>
                </div>

                {/* Diagnostic Result Container */}
                {diagnosticReport && (
                  <div className={`p-4 rounded-xl text-xs space-y-3 border ${
                    diagnosticReport.status === 'CONNECTED'
                      ? 'bg-emerald-950/50 text-emerald-200 border-emerald-800/80'
                      : diagnosticReport.status === 'PERMISSION_DENIED'
                      ? 'bg-amber-950/50 text-amber-200 border-amber-800/80'
                      : 'bg-rose-950/50 text-rose-200 border-rose-800/80'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      {diagnosticReport.status === 'CONNECTED' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-white">
                          {diagnosticReport.title}
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          {diagnosticReport.message}
                        </p>
                        {diagnosticReport.details && (
                          <div className="p-2 bg-black/40 rounded font-mono text-[10px] text-slate-400 break-all">
                            {diagnosticReport.details}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action button if permission denied */}
                    {diagnosticReport.status === 'PERMISSION_DENIED' && (
                      <div className="pt-2 flex flex-wrap gap-2 border-t border-amber-800/60">
                        <button
                          type="button"
                          onClick={() => setActiveTab('rules')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Buka Tab Aturan Keamanan & Salin Rules</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={projectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors"
                        >
                          <span>Buka Firebase Console</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Troubleshooting list if present */}
                    {diagnosticReport.troubleshootingSteps.length > 0 && diagnosticReport.status !== 'PERMISSION_DENIED' && (
                      <div className="pt-2 border-t border-slate-700/60 space-y-1">
                        <div className="text-[11px] font-bold text-slate-300">Langkah Penyelesaian:</div>
                        <ul className="list-disc list-inside space-y-1 text-slate-300">
                          {diagnosticReport.troubleshootingSteps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Project Parameters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block font-medium">Firebase Project ID</span>
                    <span className="font-mono text-emerald-300 font-semibold">{fbConfig.projectId || 'hr-intranet-31ff4'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block font-medium">Firestore Database ID</span>
                    <span className="font-mono text-cyan-300 font-semibold">{fbConfig.firestoreDatabaseId || '(default)'}</span>
                  </div>
                </div>

                {/* Seed Initial Data Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      Inisialisasi Master Data Awal
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Muat daftar akun demo, departemen Ciputra, SOP acuan, dan KPI ke Firestore.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSeedFirestore}
                    disabled={isSeeding}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 shrink-0 self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
                    <span>{isSeeding ? 'Menyimpan...' : 'Inisialisasi Master Data'}</span>
                  </button>
                </div>

                {seedResult && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                    seedResult.success
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                  }`}>
                    {seedResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="leading-relaxed">{seedResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ATURAN KEAMANAN (FIRESTORE RULES) */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-amber-950">
                    Konfigurasi Aturan Akses (Firestore Security Rules)
                  </h3>
                </div>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  Jika Anda melihat pesan <strong>"Missing or insufficient permissions"</strong>, ini berarti Cloud Firestore di proyek Firebase Anda (<code>{fbConfig.projectId}</code>) sedang dalam mode terkunci (default). Anda perlu mempublikasikan aturan baca & tulis di Firebase Console agar seluruh karyawan dapat membuka portal.
                </p>
              </div>

              {/* Action: Copy Rules Box */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Skrip Aturan Firestore (firestore.rules)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRules}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
                  >
                    {copiedRules ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRules ? 'Tersalin ke Clipboard!' : 'Salin Aturan Rules'}</span>
                  </button>
                </div>

                <pre className="p-4 bg-slate-900 text-amber-200 text-xs font-mono rounded-2xl overflow-x-auto leading-relaxed border border-slate-800">
                  <code>{FIRESTORE_RULES_SNIPPET}</code>
                </pre>
              </div>

              {/* Step-by-step checklist */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 text-sm">
                  Cara Memperbaiki Izin Rules di Firebase Console:
                </h4>
                <ol className="list-decimal list-inside space-y-2.5 text-slate-700 leading-relaxed">
                  <li>
                    Buka halaman Aturan Firestore di browser Anda:{' '}
                    <a
                      href={projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 font-bold underline inline-flex items-center gap-1"
                    >
                      Firebase Console &gt; Firestore Rules <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    Pilih menu <strong>Build</strong> di sebelah kiri &gt; klik <strong>Firestore Database</strong>.
                  </li>
                  <li>
                    Klik tab <strong>Rules</strong> di bagian atas.
                  </li>
                  <li>
                    Hapus kode aturan yang ada di editor, lalu <strong>tempel (paste)</strong> kode aturan yang disalin di atas.
                  </li>
                  <li>
                    Klik tombol biru <strong>Publish</strong> di sudut kanan atas.
                  </li>
                  <li>
                    Kembali ke tab <strong>Status & Diagnostik</strong> di modal ini dan klik <strong>"Uji Koneksi Ulang"</strong>!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: KREDENSIAL FIREBASE */}
          {activeTab === 'credentials' && (
            <div className="space-y-5">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-950">Pengaturan Kredensial Firebase Web SDK</span>
                </div>
                <p className="text-xs text-indigo-800/80 leading-relaxed">
                  Anda dapat meninjau dan memperbarui API Key atau Project ID jika ada perubahan pada Firebase Console.
                </p>
              </div>

              {credSavedFeedback && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{credSavedFeedback}</span>
                </div>
              )}

              <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Project ID
                    </label>
                    <input
                      type="text"
                      value={fbConfig.projectId}
                      onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                      placeholder="hr-intranet-31ff4"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono bg-slate-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      API Key
                    </label>
                    <input
                      type="text"
                      value={fbConfig.apiKey}
                      onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono bg-slate-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Auth Domain
                    </label>
                    <input
                      type="text"
                      value={fbConfig.authDomain}
                      onChange={(e) => setFbConfig({ ...fbConfig, authDomain: e.target.value })}
                      placeholder="hr-intranet-31ff4.firebaseapp.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Storage Bucket
                    </label>
                    <input
                      type="text"
                      value={fbConfig.storageBucket}
                      onChange={(e) => setFbConfig({ ...fbConfig, storageBucket: e.target.value })}
                      placeholder="hr-intranet-31ff4.firebasestorage.app"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      App ID
                    </label>
                    <input
                      type="text"
                      value={fbConfig.appId}
                      onChange={(e) => setFbConfig({ ...fbConfig, appId: e.target.value })}
                      placeholder="1:282386309612:web:..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Messaging Sender ID
                    </label>
                    <input
                      type="text"
                      value={fbConfig.messagingSenderId}
                      onChange={(e) => setFbConfig({ ...fbConfig, messagingSenderId: e.target.value })}
                      placeholder="282386309612"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Measurement ID (Google Analytics)
                    </label>
                    <input
                      type="text"
                      value={fbConfig.measurementId || ''}
                      onChange={(e) => setFbConfig({ ...fbConfig, measurementId: e.target.value })}
                      placeholder="G-Q62YDK838M"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Firestore Database ID
                    </label>
                    <input
                      type="text"
                      value={fbConfig.firestoreDatabaseId || '(default)'}
                      onChange={(e) => setFbConfig({ ...fbConfig, firestoreDatabaseId: e.target.value })}
                      placeholder="(default)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono bg-slate-50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleResetCredentials}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset ke Bawaan</span>
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                  >
                    Simpan Kredensial Firebase
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: GOOGLE DRIVE STORAGE & SCRIPT */}
          {activeTab === 'drive' && (
            <div className="space-y-6">
              
              {/* Form Konfigurasi Google Drive */}
              <form onSubmit={handleSaveDriveConfig} className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <HardDrive className="w-4 h-4 text-indigo-600" />
                  <span>Pengaturan Penyimpanan Berkas & Foto (Google Drive)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama / ID Folder di Google Drive
                  </label>
                  <input
                    type="text"
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    placeholder="Intranet_Ciputra_Uploads"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono bg-slate-50"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Folder tempat menyimpan file PDF, formulir kerja, dan foto yang diunggah karyawan.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL Google Apps Script Web App (Opsional untuk Direct Drive Upload)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={webAppUrl}
                      onChange={(e) => setWebAppUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono bg-slate-50"
                    />
                    <button
                      type="button"
                      onClick={handleTestDriveConnection}
                      disabled={isTestingDrive}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingDrive ? 'animate-spin' : ''}`} />
                      <span>{isTestingDrive ? 'Menguji...' : 'Uji Koneksi Drive'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Deploy kode Google Apps Script sebagai Web App (Who has access: Anyone) untuk upload langsung ke Google Drive.
                  </p>
                </div>

                {/* Ping Result Box */}
                {driveTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                      driveTestResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {driveTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{driveTestResult.message}</p>
                      {driveTestResult.serverTime && (
                        <p className="text-[10px] opacity-75 mt-0.5">
                          Waktu Server Drive: {driveTestResult.serverTime}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end pt-2 border-t border-slate-200">
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    Simpan Pengaturan Drive
                  </button>
                </div>
              </form>

              {/* Code.gs script section */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Skrip Google Apps Script (Code.gs)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Tersalin!' : 'Salin Skrip Code.gs'}</span>
                  </button>
                </div>

                <pre className="p-4 bg-slate-900 text-slate-200 text-xs font-mono rounded-2xl overflow-x-auto max-h-[220px] leading-relaxed border border-slate-800">
                  <code>{GOOGLE_DRIVE_STORAGE_SCRIPT}</code>
                </pre>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
