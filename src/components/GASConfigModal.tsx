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
  RotateCcw,
  FolderTree,
  Trash2,
  Folder,
  Image,
  FileCheck,
  FileSpreadsheet,
  Building2,
  Clock
} from 'lucide-react';
import { GoogleDriveStorageConfig, SpreadsheetConfig, User } from '../types';
import {
  saveDriveStorageConfig,
  getDriveStorageConfig,
  extractDriveFolderId,
  addAccessLog,
  pruneExpiredAnnouncements
} from '../lib/storage';
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
import {
  connectGoogleDrive,
  getGoogleAccessToken,
  disconnectGoogleDrive,
  getConnectedGoogleUser
} from '../lib/authGoogle';

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
  const currentDriveConfig = getDriveStorageConfig();
  const [rootFolderName, setRootFolderName] = useState(currentDriveConfig.rootFolderName || 'Drive Utama Hotel Ciputra');
  const [rootFolderId, setRootFolderId] = useState(currentDriveConfig.rootFolderId || 'Intranet_Ciputra_Uploads');
  const [sharedDriveUrl, setSharedDriveUrl] = useState(currentDriveConfig.sharedDriveUrl || '');
  const [sopFolder, setSopFolder] = useState(currentDriveConfig.sopFolder || 'SOP');
  const [formsFolder, setFormsFolder] = useState(currentDriveConfig.formsFolder || 'Formulir Kerja');
  const [photosFolder, setPhotosFolder] = useState(currentDriveConfig.photosFolder || 'Foto & Media');
  const [useDepartmentSubfolders, setUseDepartmentSubfolders] = useState(currentDriveConfig.useDepartmentSubfolders !== false);
  const [autoPruneDays, setAutoPruneDays] = useState<number>(currentDriveConfig.autoPruneAnnouncementsDays || 7);

  const [activeTab, setActiveTab] = useState<'firebase' | 'rules' | 'credentials' | 'drive'>(initialTab);
  const [copiedRules, setCopiedRules] = useState(false);
  const [saveDriveSuccess, setSaveDriveSuccess] = useState(false);

  // Diagnostic State
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<FirebaseDiagnosticReport | null>(null);

  // Firestore Seed State
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Manual Prune State
  const [isPruning, setIsPruning] = useState(false);
  const [pruneResult, setPruneResult] = useState<{
    deletedCount: number;
    remainingCount: number;
    deletedTitles: string[];
  } | null>(null);

  // Editable Firebase Credentials State
  const [fbConfig, setFbConfig] = useState<FirebaseAppConfig>(() => getStoredFirebaseConfig());
  const [credSavedFeedback, setCredSavedFeedback] = useState<string | null>(null);

  // Live Google Drive OAuth state
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [driveConnectError, setDriveConnectError] = useState<string | null>(null);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);

  useEffect(() => {
    getGoogleAccessToken().then((token) => {
      setIsDriveConnected(Boolean(token));
      const user = getConnectedGoogleUser();
      if (user?.email) setGoogleUserEmail(user.email);
    });
  }, []);

  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    setDriveConnectError(null);
    try {
      const res = await connectGoogleDrive();
      setIsDriveConnected(true);
      if (res.user.email) setGoogleUserEmail(res.user.email);
    } catch (err: any) {
      console.warn('Connect Google Drive error:', err);
      setDriveConnectError(err?.message || 'Gagal mengotorisasi Google Drive.');
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    await disconnectGoogleDrive();
    setIsDriveConnected(false);
    setGoogleUserEmail(null);
  };

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
        message: err?.message || 'Gagal melakukan sinkronisasi data awal.',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredFirebaseConfig(fbConfig);
    setCredSavedFeedback('Kredensial Firebase berhasil disimpan! Memuat ulang modul database...');
    runDiagnostic();
    setTimeout(() => {
      setCredSavedFeedback(null);
    }, 4000);
  };

  const handleResetCredentials = () => {
    if (confirm('Kembalikan konfigurasi kredensial Firebase ke konfigurasi bawaan aplikasi?')) {
      resetStoredFirebaseConfig();
      setFbConfig(getStoredFirebaseConfig());
      setCredSavedFeedback('Kredensial Firebase dikembalikan ke bawaan.');
      runDiagnostic();
      setTimeout(() => {
        setCredSavedFeedback(null);
      }, 3000);
    }
  };

  const handleSaveDriveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveDriveStorageConfig(
      {
        rootFolderId: rootFolderId.trim() || 'Intranet_Ciputra_Uploads',
        rootFolderName: rootFolderName.trim() || 'Drive Utama Hotel Ciputra',
        sharedDriveUrl: sharedDriveUrl.trim(),
        sopFolder: sopFolder.trim() || 'SOP',
        formsFolder: formsFolder.trim() || 'Formulir Kerja',
        photosFolder: photosFolder.trim() || 'Foto & Media',
        useDepartmentSubfolders,
        autoPruneAnnouncementsDays: Number(autoPruneDays) || 7,
      },
      currentUser
    );

    onConfigSaved({
      ...updated,
      googleDriveFolderId: updated.rootFolderId,
      driveFolderId: updated.rootFolderId,
      autoSync: true,
      autoSyncEnabled: true,
    });

    setSaveDriveSuccess(true);
    setTimeout(() => setSaveDriveSuccess(false), 3000);
  };

  const handleManualPruneAnnouncements = () => {
    setIsPruning(true);
    try {
      const result = pruneExpiredAnnouncements(autoPruneDays, currentUser);
      setPruneResult(result);
    } catch (err: any) {
      console.warn('Manual prune error:', err);
    } finally {
      setIsPruning(false);
    }
  };

  const openSharedDriveLink = () => {
    const url = sharedDriveUrl.trim() || (rootFolderId ? `https://drive.google.com/drive/folders/${rootFolderId}` : 'https://drive.google.com');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Pusat Konfigurasi Cloud & Penyimpanan</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Vercel & Firestore Ready
                </span>
              </h2>
              <p className="text-xs text-indigo-200">
                Penyimpanan Database Firebase & Tata Kelola Folder Google Drive per Departemen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('firebase')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'firebase'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Status & Diagnostik Firebase</span>
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'drive'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Google Drive Shared Storage</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'rules'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Aturan Keamanan (Rules)</span>
          </button>

          <button
            onClick={() => setActiveTab('credentials')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'credentials'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Kredensial Firebase</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: FIREBASE DIAGNOSTIC */}
          {activeTab === 'firebase' && (
            <div className="space-y-5">
              {/* Diagnostic Box */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      Status Koneksi Firebase Firestore
                    </span>
                  </div>
                  <button
                    onClick={runDiagnostic}
                    disabled={isDiagnosing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs font-bold active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} />
                    <span>{isDiagnosing ? 'Memeriksa...' : 'Uji Ulang Koneksi'}</span>
                  </button>
                </div>

                {diagnosticReport ? (
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      diagnosticReport.status === 'CONNECTED'
                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/90 border-rose-200 text-rose-900'
                    }`}
                  >
                    {diagnosticReport.status === 'CONNECTED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold text-xs">{diagnosticReport.title}</p>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {diagnosticReport.message}
                      </p>
                      {diagnosticReport.troubleshootingSteps.length > 0 && (
                        <div className="pt-2 border-t border-rose-200/50 space-y-1">
                          <p className="font-bold text-[11px] text-rose-950">Langkah Perbaikan:</p>
                          <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                            {diagnosticReport.troubleshootingSteps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-slate-200 bg-white text-center text-slate-500">
                    Memuat status koneksi...
                  </div>
                )}
              </div>

              {/* Data Seeding to Firestore */}
              <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      Sinkronisasi Data Awal Master ke Firestore
                    </span>
                  </div>
                  <button
                    onClick={handleSeedFirestore}
                    disabled={isSeeding}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
                    <span>{isSeeding ? 'Menyinkronkan...' : 'Sinkronkan Master Data'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Menyimpan otomatis struktur departemen (FO, HK, ACCT, HR, FB, ENG, SM), kategori arsip, KPI, dan akun pengguna default ke Cloud Firestore.
                </p>

                {seedResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      seedResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {seedResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <p className="font-medium text-[11px]">{seedResult.message}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE DRIVE SHARED STORAGE MANAGER */}
          {activeTab === 'drive' && (
            <div className="space-y-6">
              {/* Google Drive Direct OAuth Authorization Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900">Koneksi Langsung Akun Google Drive</h3>
                        {isDriveConnected ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Terhubung
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Belum Terhubung
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {isDriveConnected && googleUserEmail
                          ? `Akun Google terotorisasi: ${googleUserEmail}`
                          : 'Hubungkan akun Google Drive untuk mengunggah berkas SOP, formulir kerja, dan pengumuman langsung ke folder Google Drive perusahaan.'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isDriveConnected ? (
                      <button
                        type="button"
                        onClick={handleDisconnectDrive}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all active:scale-95"
                      >
                        Putuskan Sesi
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectDrive}
                        disabled={isConnectingDrive}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <HardDrive className={`w-3.5 h-3.5 ${isConnectingDrive ? 'animate-bounce' : ''}`} />
                        <span>{isConnectingDrive ? 'Menghubungkan...' : 'Hubungkan Akun Google Drive'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {driveConnectError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{driveConnectError}</span>
                  </div>
                )}
              </div>

              {/* Vercel & Non-AppsScript Architecture Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-xs flex items-center gap-2">
                    <span>Arsitektur Bebas Google Apps Script (100% Vercel Hobby Free Compatible)</span>
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Aplikasi tidak lagi bergantung pada URL Web App Google Apps Script. Seluruh berkas PDF, dokumen, dan foto terhubung secara langsung dengan Firebase Firestore & Google Drive dengan struktur folder rapi per departemen tanpa batas kuota serverless.
                  </p>
                </div>
              </div>

              {/* Form Konfigurasi Google Drive */}
              <form onSubmit={handleSaveDriveConfig} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <HardDrive className="w-4 h-4 text-indigo-600" />
                    <span>Pengaturan Folder Utama & Shared Drive Google Drive</span>
                  </div>
                  {sharedDriveUrl && (
                    <button
                      type="button"
                      onClick={openSharedDriveLink}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Google Drive</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Folder Utama / Shared Drive
                    </label>
                    <input
                      type="text"
                      value={rootFolderName}
                      onChange={(e) => setRootFolderName(e.target.value)}
                      placeholder="Drive Utama Hotel Ciputra"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ID Folder / Kode Folder di Google Drive
                    </label>
                    <input
                      type="text"
                      value={rootFolderId}
                      onChange={(e) => setRootFolderId(e.target.value)}
                      placeholder="Intranet_Ciputra_Uploads"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tautan / URL Folder Shared Drive Google Drive
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={sharedDriveUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSharedDriveUrl(val);
                        const extractedId = extractDriveFolderId(val);
                        if (extractedId && extractedId !== val) {
                          setRootFolderId(extractedId);
                        }
                      }}
                      placeholder="https://drive.google.com/drive/folders/17QOXdBWg1STMYuE7RkYshNM6vSJ1Dq0u?usp=sharing"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono bg-slate-50"
                    />
                    <button
                      type="button"
                      onClick={openSharedDriveLink}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Uji Tautan</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Masukkan URL folder Google Drive atau Shared Drive perusahaan agar tim dapat membukanya langsung dengan sekali klik.
                  </p>
                </div>

                {/* VISUAL FOLDER STRUCTURE TREE AS REQUESTED */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 space-y-3 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-indigo-400 font-bold border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <FolderTree className="w-4 h-4 text-amber-400" />
                      <span className="text-white font-sans text-xs">Arsitektur Folder Otomatis (Hierarki Departemen):</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px]">
                      Struktur Aktif
                    </span>
                  </div>

                  <div className="space-y-1.5 leading-relaxed pl-2 text-slate-300">
                    <div className="flex items-center gap-2 text-amber-300 font-bold">
                      <Folder className="w-3.5 h-3.5 text-amber-400" />
                      <span>📁 {rootFolderName} (Folder Induk)</span>
                    </div>
                    
                    {/* SOP Folder */}
                    <div className="pl-6 border-l border-slate-800 space-y-1">
                      <div className="flex items-center gap-2 text-blue-400 font-bold">
                        <Folder className="w-3.5 h-3.5" />
                        <span>├── 📁 {sopFolder} (Standar Prosedur Operasional)</span>
                      </div>
                      <div className="pl-6 text-[10px] text-slate-400 space-y-0.5">
                        <p>│    ├── 📁 Front Office (FO)</p>
                        <p>│    ├── 📁 Housekeeping (HK)</p>
                        <p>│    ├── 📁 Accounting & Finance (ACCT)</p>
                        <p>│    ├── 📁 Human Resources (HR)</p>
                        <p>│    ├── 📁 Food & Beverage (FB)</p>
                        <p>│    ├── 📁 Engineering (ENG)</p>
                        <p>│    ├── 📁 Sales & Marketing (SM)</p>
                        <p>│    └── 📁 Security & Safety</p>
                      </div>

                      {/* Forms Folder */}
                      <div className="flex items-center gap-2 text-amber-400 font-bold pt-1">
                        <Folder className="w-3.5 h-3.5" />
                        <span>├── 📁 {formsFolder} (Formulir & Dokumen Kerja)</span>
                      </div>
                      <div className="pl-6 text-[10px] text-slate-400 space-y-0.5">
                        <p>│    ├── 📁 FO, HK, ACCT, HR, FB, ENG, SM, Security</p>
                      </div>

                      {/* Centralized Photos Folder */}
                      <div className="flex items-center gap-2 text-emerald-400 font-bold pt-1">
                        <Image className="w-3.5 h-3.5" />
                        <span>└── 📁 {photosFolder} (Folder Terpusat Foto & Banner Pengumuman)</span>
                      </div>
                      <div className="pl-6 text-[10px] text-slate-400">
                        <p className="text-emerald-300/80">Semua foto profil & banner dokumentasi disatukan di 1 folder ini agar rapi.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pembersihan Otomatis Pengumuman (> 7 Hari) */}
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-slate-900 text-xs">
                        Pembersihan Otomatis Pengumuman & Berkas (&gt; 7 Hari)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleManualPruneAnnouncements}
                      disabled={isPruning}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isPruning ? 'Membersihkan...' : 'Jalankan Pembersihan Sekarang'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Pengumuman yang sudah terbit lewat dari <strong>1 minggu (7 hari)</strong> akan otomatis dihapus permanen beserta berkas & fotonya dari Firestore dan browser agar kapasitas hosting Vercel & Firebase tetap ringan dan tidak menumpuk.
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <label className="text-xs font-bold text-slate-700">
                      Masa Retensi Pengumuman:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={autoPruneDays}
                        onChange={(e) => setAutoPruneDays(Math.max(1, Number(e.target.value)))}
                        className="w-20 px-3 py-1 text-xs rounded-xl border border-slate-300 bg-white font-bold text-center"
                      />
                      <span className="text-slate-600 font-semibold text-xs">Hari (Default: 7 Hari)</span>
                    </div>
                  </div>

                  {pruneResult && (
                    <div className="p-3 rounded-xl bg-white border border-amber-200 text-xs space-y-1">
                      <p className="font-bold text-amber-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>
                          {pruneResult.deletedCount > 0
                            ? `Berhasil membersihkan ${pruneResult.deletedCount} pengumuman kedaluwarsa!`
                            : 'Tidak ada pengumuman yang lewat dari 7 hari.'}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Pengumuman aktif yang tersimpan saat ini: {pruneResult.remainingCount} dokumen.
                      </p>
                    </div>
                  )}
                </div>

                {saveDriveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Konfigurasi Google Drive berhasil disimpan ke Firestore!</span>
                  </div>
                )}

                <div className="flex items-center justify-end pt-2 border-t border-slate-200">
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Pengaturan Google Drive</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: RULES SNIPPET */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-xs">Penerbitan Aturan Keamanan (Security Rules)</p>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    Salin aturan di bawah dan tempelkan di <strong>Firebase Console &gt; Firestore Database &gt; Tab Rules</strong> lalu klik <strong>Publish</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">firestore.rules</span>
                  <button
                    type="button"
                    onClick={handleCopyRules}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs active:scale-95"
                  >
                    {copiedRules ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRules ? 'Tersalin!' : 'Salin Aturan'}</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto leading-relaxed border border-slate-800">
                  <code>{FIRESTORE_RULES_SNIPPET}</code>
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: FIREBASE CREDENTIALS */}
          {activeTab === 'credentials' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-[11px] leading-relaxed">
                Kredensial Firebase menghubungkan aplikasi portal dengan project Cloud Firestore Anda. Diperbarui secara lokal dan persisten di browser.
              </div>

              {credSavedFeedback && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{credSavedFeedback}</span>
                </div>
              )}

              <form onSubmit={handleSaveCredentials} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Project ID
                    </label>
                    <input
                      type="text"
                      value={fbConfig.projectId || ''}
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
                      value={fbConfig.apiKey || ''}
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
                      value={fbConfig.authDomain || ''}
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
                      value={fbConfig.storageBucket || ''}
                      onChange={(e) => setFbConfig({ ...fbConfig, storageBucket: e.target.value })}
                      placeholder="hr-intranet-31ff4.firebasestorage.app"
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
        </div>
      </div>
    </div>
  );
};
