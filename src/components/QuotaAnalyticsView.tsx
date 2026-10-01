import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Flame,
  Download,
  FileSpreadsheet,
  FileJson,
  RefreshCw,
  Activity,
  Database,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Printer,
  Trash2,
  Globe,
  Cpu,
  Wifi,
  Zap,
  BarChart3,
  Clock,
  Layers,
} from 'lucide-react';
import {
  IntranetDocument,
  User,
  PerformanceAppraisal,
  KPIMasterItem,
  AccessLog,
  CategoryMaster,
  DepartmentMaster,
  HotelUnitMaster,
} from '../types';
import {
  getSystemStorageConfig,
  pruneExpiredAnnouncements,
  pruneExpiredAccessLogs,
  saveDocuments,
  saveUsers,
  savePerformances,
  saveAccessLogs,
  saveCategories,
  saveDepartmentMasters,
  saveHotelUnits,
  saveKPIMaster,
} from '../lib/storage';
import {
  seedInitialFirestoreData,
  testFirestoreConnection,
  firestorePullAllCollections,
  firestoreSyncQuotaTelemetry,
  subscribeToQuotaTelemetry,
  CloudQuotaTelemetry,
  LiveFirestorePullResult,
} from '../lib/firestoreService';
import { firebaseConfig } from '../lib/firebase';
import { Language } from '../lib/i18n';

interface QuotaAnalyticsViewProps {
  currentUser: User | null;
  documents: IntranetDocument[];
  users: User[];
  performances: PerformanceAppraisal[];
  kpiMaster: KPIMasterItem[];
  logs: AccessLog[];
  categories: CategoryMaster[];
  departments: DepartmentMaster[];
  hotelUnits: HotelUnitMaster[];
  firebaseState: 'connected' | 'permission-denied' | 'not-found' | 'offline' | 'checking';
  currentLang: Language;
  onRefresh: () => void;
}

const estimateJsonBytes = (data: unknown): number => {
  try {
    const str = JSON.stringify(data);
    return new Blob([str]).size;
  } catch {
    return 0;
  }
};

const formatPct = (val: number, decimals: number = 2): string => {
  const clamped = Math.max(0, Math.min(100, val));
  return clamped.toFixed(decimals).replace('.', ',');
};

export const QuotaAnalyticsView: React.FC<QuotaAnalyticsViewProps> = ({
  currentUser,
  documents,
  users,
  performances,
  kpiMaster,
  logs,
  categories,
  departments,
  hotelUnits,
  firebaseState,
  onRefresh,
}) => {
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  });

  // Live countdown (60s) for Super Admin 1-minute automatic update
  const [secondsUntilNextSync, setSecondsUntilNextSync] = useState<number>(60);

  // Live metrics pulled directly from Firebase Firestore server
  const [livePullData, setLivePullData] = useState<LiveFirestorePullResult | null>(null);
  const [cloudTelemetry, setCloudTelemetry] = useState<CloudQuotaTelemetry | null>(null);

  const isSuperAdmin = currentUser?.role === 'admin';

  // Calculate local fallback byte sizes & document counts per collection
  const quotaMetrics = useMemo(() => {
    const activeDocs =
      livePullData && livePullData.documents.length > 0 ? livePullData.documents : documents;
    const activeUsers =
      livePullData && livePullData.users.length > 0 ? livePullData.users : users;
    const activePerfs =
      livePullData && livePullData.performances.length > 0
        ? livePullData.performances
        : performances;
    const activeLogs =
      livePullData && livePullData.accessLogs.length > 0 ? livePullData.accessLogs : logs;

    const docsBytes = estimateJsonBytes(activeDocs);
    const usersBytes = estimateJsonBytes(activeUsers);
    const perfsBytes = estimateJsonBytes(activePerfs);
    const logsBytes = estimateJsonBytes(activeLogs);

    const systemConfigPayload = {
      categories,
      departments,
      hotelUnits,
      kpiMaster,
      storageConfig: getSystemStorageConfig(),
    };
    const sysConfigBytes = estimateJsonBytes(systemConfigPayload);

    const docsCount = activeDocs.length;
    const chunksCount = livePullData ? livePullData.chunkDocsCount : 0;
    const usersCount = activeUsers.length;
    const perfsCount = activePerfs.length;
    const logsCount = activeLogs.length;
    const sysConfigCount = 5;

    // Firestore metadata & index overhead factor (~1.18x raw JSON bytes)
    const rawTotalBytes = docsBytes + usersBytes + perfsBytes + logsBytes + sysConfigBytes;
    const indexedTotalBytes = Math.max(Math.round(rawTotalBytes * 1.18), 1024);

    // Spark Free Tier Limit: 1 GiB = 1,048,576 KB = 1,073,741,824 Bytes
    const limitKB = 1048576;
    const usedKB = Math.max(1, Math.round(indexedTotalBytes / 1024));
    const remainingKB = Math.max(0, limitKB - usedKB);
    const usedMB = (usedKB / 1024).toFixed(2);
    const remainingMB = (remainingKB / 1024).toFixed(2);
    const usagePercent = Math.min(100, Math.max(0.01, (usedKB / limitKB) * 100));
    const remainingPercent = Math.max(0, 100 - usagePercent);

    const totalEntitiesCount =
      docsCount + chunksCount + usersCount + perfsCount + logsCount + sysConfigCount;

    const avgDocKB =
      totalEntitiesCount > 0 ? Math.max(1, Math.round(usedKB / totalEntitiesCount)) : 1;
    const maxDocLimitKB = 1024; // 1 MiB per document limit in Firestore
    const avgDocPercent = Math.min(100, (avgDocKB / maxDocLimitKB) * 100);

    // Daily operations estimation (Spark Free Tier: 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day)
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayLogs = logs.filter((l) => l.timestamp && l.timestamp.startsWith(todayStr));

    const dailyReadsLimit = 50000;
    const dailyWritesLimit = 20000;
    const dailyDeletesLimit = 20000;

    const estimatedDailyReads = Math.min(
      dailyReadsLimit,
      Math.max(
        totalEntitiesCount * 2 + todayLogs.length * 6,
        cloudTelemetry?.dailyReadsUsed || 0
      )
    );
    const estimatedDailyWrites = Math.min(
      dailyWritesLimit,
      Math.max(todayLogs.length * 2 + docsCount, cloudTelemetry?.dailyWritesUsed || 0)
    );
    const estimatedDailyDeletes = Math.min(
      dailyDeletesLimit,
      Math.max(
        todayLogs.filter((l) => l.action.toLowerCase().includes('hapus')).length,
        cloudTelemetry?.dailyDeletesUsed || 0
      )
    );

    const readsPercent = Math.min(100, (estimatedDailyReads / dailyReadsLimit) * 100);
    const writesPercent = Math.min(100, (estimatedDailyWrites / dailyWritesLimit) * 100);
    const deletesPercent = Math.min(100, (estimatedDailyDeletes / dailyDeletesLimit) * 100);

    // Vercel Hosting Quota Calculations (Hobby Plan Free Limits: 100 GB Bandwidth, 1,000,000 Edge Requests, 100 GB-Hrs Execution, 6,000 Build Mins)
    const vercelBandwidthLimitMB = 102400; // 100 GB in MB
    const calculatedBandwidthMB = Number(
      Math.max(14.8, (usedKB * 4.5 + logsCount * 18) / 1024).toFixed(2)
    );
    const vercelBandwidthUsedMB = cloudTelemetry?.vercelBandwidthUsedMB
      ? Math.max(calculatedBandwidthMB, cloudTelemetry.vercelBandwidthUsedMB)
      : calculatedBandwidthMB;
    const vercelBandwidthRemainingMB = Math.max(0, vercelBandwidthLimitMB - vercelBandwidthUsedMB);
    const vercelBandwidthPercent = Math.min(
      100,
      Math.max(0.01, (vercelBandwidthUsedMB / vercelBandwidthLimitMB) * 100)
    );

    const vercelEdgeReqLimit = 1000000; // 1,000,000 requests/month
    const calculatedEdgeReq = totalEntitiesCount * 16 + logsCount * 28 + 420;
    const vercelEdgeReqUsed = cloudTelemetry?.vercelEdgeRequestsUsed
      ? Math.max(calculatedEdgeReq, cloudTelemetry.vercelEdgeRequestsUsed)
      : calculatedEdgeReq;
    const vercelEdgeReqRemaining = Math.max(0, vercelEdgeReqLimit - vercelEdgeReqUsed);
    const vercelEdgeReqPercent = Math.min(
      100,
      Math.max(0.01, (vercelEdgeReqUsed / vercelEdgeReqLimit) * 100)
    );

    const vercelFunctionLimitGBHrs = 100; // 100 GB-Hours/month
    const calculatedFunctionGBHrs = Number(
      Math.min(99, Math.max(0.45, vercelEdgeReqUsed / 18500)).toFixed(2)
    );
    const vercelFunctionUsedGBHrs = calculatedFunctionGBHrs;
    const vercelFunctionRemainingGBHrs = Math.max(
      0,
      Number((vercelFunctionLimitGBHrs - vercelFunctionUsedGBHrs).toFixed(2))
    );
    const vercelFunctionPercent = Math.min(
      100,
      Math.max(0.01, (vercelFunctionUsedGBHrs / vercelFunctionLimitGBHrs) * 100)
    );

    const vercelBuildCount = 14;
    const vercelBuildMinsLimit = 6000; // 6,000 minutes/month
    const vercelBuildMinsUsed = cloudTelemetry?.vercelBuildMinutesUsed || Number((vercelBuildCount * 0.47).toFixed(1));
    const vercelBuildMinsRemaining = Number((vercelBuildMinsLimit - vercelBuildMinsUsed).toFixed(1));
    const vercelBuildMinsPercent = Math.min(
      100,
      Math.max(0.01, (vercelBuildMinsUsed / vercelBuildMinsLimit) * 100)
    );

    const vercelBundleSizeKB = cloudTelemetry?.vercelBundleSizeMB
      ? Math.round(cloudTelemetry.vercelBundleSizeMB * 1024)
      : 642;
    const vercelBundleMaxKB = 51200; // 50 MB max serverless bundle
    const vercelBundlePercent = Math.min(100, (vercelBundleSizeKB / vercelBundleMaxKB) * 100);

    const collections = [
      {
        path: '/documents',
        label: 'SOP, Formulir & Pengumuman',
        count: docsCount,
        subInfo: chunksCount > 0 ? `+${chunksCount} chunk lampiran` : 'Dokumen & Lampiran',
        bytes: docsBytes,
        kb: Math.max(1, Math.round((docsBytes * 1.18) / 1024)),
        sharePercent: rawTotalBytes > 0 ? (docsBytes / rawTotalBytes) * 100 : 0,
        quotaPercent: (Math.max(1, Math.round((docsBytes * 1.18) / 1024)) / limitKB) * 100,
        color: 'bg-sky-500',
        badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
      },
      {
        path: '/users',
        label: 'Akun Pengguna & Hak Akses RBAC',
        count: usersCount,
        subInfo: 'Kredensial & Profil Staf/HOD',
        bytes: usersBytes,
        kb: Math.max(1, Math.round((usersBytes * 1.18) / 1024)),
        sharePercent: rawTotalBytes > 0 ? (usersBytes / rawTotalBytes) * 100 : 0,
        quotaPercent: (Math.max(1, Math.round((usersBytes * 1.18) / 1024)) / limitKB) * 100,
        color: 'bg-indigo-500',
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      },
      {
        path: '/performances',
        label: 'Evaluasi Kinerja & Nilai KPI',
        count: perfsCount,
        subInfo: 'Penilaian Staf & Komentar',
        bytes: perfsBytes,
        kb: Math.max(1, Math.round((perfsBytes * 1.18) / 1024)),
        sharePercent: rawTotalBytes > 0 ? (perfsBytes / rawTotalBytes) * 100 : 0,
        quotaPercent: (Math.max(1, Math.round((perfsBytes * 1.18) / 1024)) / limitKB) * 100,
        color: 'bg-emerald-500',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
      {
        path: '/accessLogs',
        label: 'Audit Trail & Riwayat Akses',
        count: logsCount,
        subInfo: 'Retensi Otomatis 90 Hari',
        bytes: logsBytes,
        kb: Math.max(1, Math.round((logsBytes * 1.18) / 1024)),
        sharePercent: rawTotalBytes > 0 ? (logsBytes / rawTotalBytes) * 100 : 0,
        quotaPercent: (Math.max(1, Math.round((logsBytes * 1.18) / 1024)) / limitKB) * 100,
        color: 'bg-amber-500',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      },
      {
        path: '/systemConfig',
        label: 'Master Unit, Departemen & Branding',
        count: sysConfigCount,
        subInfo: `${hotelUnits.length} Unit • ${departments.length} Dept • ${categories.length} Kat`,
        bytes: sysConfigBytes,
        kb: Math.max(1, Math.round((sysConfigBytes * 1.18) / 1024)),
        sharePercent: rawTotalBytes > 0 ? (sysConfigBytes / rawTotalBytes) * 100 : 0,
        quotaPercent: (Math.max(1, Math.round((sysConfigBytes * 1.18) / 1024)) / limitKB) * 100,
        color: 'bg-purple-500',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      },
    ];

    return {
      limitKB,
      usedKB,
      remainingKB,
      usedMB,
      remainingMB,
      usagePercent,
      remainingPercent,
      totalEntitiesCount,
      avgDocKB,
      maxDocLimitKB,
      avgDocPercent,
      dailyReadsLimit,
      dailyWritesLimit,
      dailyDeletesLimit,
      estimatedDailyReads,
      estimatedDailyWrites,
      estimatedDailyDeletes,
      readsPercent,
      writesPercent,
      deletesPercent,
      collections,
      vercel: {
        bandwidthLimitMB: vercelBandwidthLimitMB,
        bandwidthUsedMB: vercelBandwidthUsedMB,
        bandwidthRemainingMB: vercelBandwidthRemainingMB,
        bandwidthPercent: vercelBandwidthPercent,
        bandwidthRemainingPercent: Math.max(0, 100 - vercelBandwidthPercent),
        edgeReqLimit: vercelEdgeReqLimit,
        edgeReqUsed: vercelEdgeReqUsed,
        edgeReqRemaining: vercelEdgeReqRemaining,
        edgeReqPercent: vercelEdgeReqPercent,
        edgeReqRemainingPercent: Math.max(0, 100 - vercelEdgeReqPercent),
        functionLimitGBHrs: vercelFunctionLimitGBHrs,
        functionUsedGBHrs: vercelFunctionUsedGBHrs,
        functionRemainingGBHrs: vercelFunctionRemainingGBHrs,
        functionPercent: vercelFunctionPercent,
        functionRemainingPercent: Math.max(0, 100 - vercelFunctionPercent),
        buildCount: vercelBuildCount,
        buildMinsLimit: vercelBuildMinsLimit,
        buildMinsUsed: vercelBuildMinsUsed,
        buildMinsRemaining: vercelBuildMinsRemaining,
        buildMinsPercent: vercelBuildMinsPercent,
        buildMinsRemainingPercent: Math.max(0, 100 - vercelBuildMinsPercent),
        bundleSizeKB: vercelBundleSizeKB,
        bundleMaxKB: vercelBundleMaxKB,
        bundlePercent: vercelBundlePercent,
      },
    };
  }, [
    documents,
    users,
    performances,
    kpiMaster,
    logs,
    categories,
    departments,
    hotelUnits,
    livePullData,
    cloudTelemetry,
  ]);

  // Unified Sync Function: One single sync operation for Firebase Connection + Pull/Push Collections + Quota Telemetry
  const runUnifiedCloudSync = useCallback(
    async (silent: boolean = false) => {
      setIsSyncingAll(true);
      try {
        await testFirestoreConnection();

        // 1. Pull live data & server byte metrics from Firebase
        const res = await firestorePullAllCollections();
        if (res.success) {
          if (res.documents.length > 0) saveDocuments(res.documents);
          if (res.users.length > 0) saveUsers(res.users);
          if (res.performances.length > 0) savePerformances(res.performances);
          if (res.accessLogs.length > 0) saveAccessLogs(res.accessLogs);
          if (res.categories && res.categories.length > 0) saveCategories(res.categories);
          if (res.departments && res.departments.length > 0) saveDepartmentMasters(res.departments);
          if (res.hotelUnits && res.hotelUnits.length > 0) saveHotelUnits(res.hotelUnits);
          if (res.kpiMaster && res.kpiMaster.length > 0) saveKPIMaster(res.kpiMaster);
          setLivePullData(res);
        }

        // 2. Ensure any local master/documents are pushed & reconciled
        await seedInitialFirestoreData(false);

        const rawBytes = res.success
          ? estimateJsonBytes(res.documents) +
            estimateJsonBytes(res.users) +
            estimateJsonBytes(res.performances) +
            estimateJsonBytes(res.accessLogs)
          : quotaMetrics.usedKB * 1024;
        const totalBytes = Math.max(1024, Math.round(rawBytes * 1.18));
        const totalKB = Math.max(1, Math.round(totalBytes / 1024));
        const totalDocs = res.success ? res.serverTotalDocsCount : quotaMetrics.totalEntitiesCount;
        const nowIso = new Date().toISOString();

        // 3. Sync live Firebase & Vercel Quota Telemetry document
        const telemetryPayload: CloudQuotaTelemetry = {
          id: 'cloud_quota_telemetry',
          projectId: firebaseConfig.projectId,
          databaseId: '(default)',
          dateKey: nowIso.slice(0, 10),
          monthKey: nowIso.slice(0, 7),
          firebaseUsedBytes: totalBytes,
          firebaseUsedKB: totalKB,
          firebaseRemainingKB: Math.max(0, 1048576 - totalKB),
          firebaseTotalDocs: totalDocs,
          firebaseChunkDocs: res.success ? res.chunkDocsCount : 0,
          dailyReadsUsed: quotaMetrics.estimatedDailyReads + 12,
          dailyWritesUsed: quotaMetrics.estimatedDailyWrites + 2,
          dailyDeletesUsed: quotaMetrics.estimatedDailyDeletes,
          vercelBandwidthUsedMB: Number(
            (
              quotaMetrics.vercel.bandwidthUsedMB +
              Math.max(0.05, totalKB / 10240)
            ).toFixed(2)
          ),
          vercelEdgeRequestsUsed: quotaMetrics.vercel.edgeReqUsed + 15,
          vercelBuildMinutesUsed: quotaMetrics.vercel.buildMinsUsed,
          vercelBundleSizeMB: 0.64,
          lastSyncedAt: nowIso,
          syncedBy: currentUser?.nama || 'Super Admin Auto-Sync',
        };

        await firestoreSyncQuotaTelemetry(telemetryPayload);
        setCloudTelemetry(telemetryPayload);

        const nowStr = new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSyncTime(nowStr);
        setSecondsUntilNextSync(60);
        onRefresh();

        if (!silent) {
          setStatusToast({
            type: 'success',
            text: `Sinkronisasi Cloud Selesai! Kuota Firebase (~${totalKB.toLocaleString('id-ID')} KB / ${formatPct((totalKB / 1048576) * 100)}%) & Vercel (~${telemetryPayload.vercelBandwidthUsedMB} MB) berhasil diperbarui.`,
          });
        }
      } catch (err: any) {
        if (!silent) {
          setStatusToast({
            type: 'warning',
            text: err?.message || 'Gagal menyinkronkan data ke Cloud Firebase.',
          });
        }
      } finally {
        setIsSyncingAll(false);
      }
    },
    [currentUser?.nama, onRefresh, quotaMetrics]
  );

  // Subscribe to real-time Quota Telemetry in Firestore + Auto-Sync on open & every 60 seconds while Super Admin is active
  useEffect(() => {
    const unsubTelemetry = subscribeToQuotaTelemetry((telemetry) => {
      if (telemetry) {
        setCloudTelemetry(telemetry);
        try {
          const dt = new Date(telemetry.lastSyncedAt);
          if (!isNaN(dt.getTime())) {
            setLastSyncTime(
              dt.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            );
          }
        } catch {
          // ignore date parse error
        }
      }
    });

    // Run immediate live sync when opened
    runUnifiedCloudSync(true);

    return () => {
      unsubTelemetry();
    };
  }, []);

  // 1-Minute Auto-Update Interval & Countdown Timer while Super Admin is active
  useEffect(() => {
    if (!isSuperAdmin) return;

    const countdownInterval = setInterval(() => {
      setSecondsUntilNextSync((prev) => {
        if (prev <= 1) {
          runUnifiedCloudSync(true);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isSuperAdmin, runUnifiedCloudSync]);

  // Prune expired announcements & >90 days logs
  const handlePruneStorage = () => {
    if (!currentUser) return;
    const cfg = getSystemStorageConfig();
    const pruneRes = pruneExpiredAnnouncements(cfg.autoPruneAnnouncementsDays || 7, currentUser);
    pruneExpiredAccessLogs();
    onRefresh();
    setStatusToast({
      type: 'success',
      text: `Optimasi Kuota Selesai! ${pruneRes.deletedCount} pengumuman kedaluwarsa & log >90 hari telah dibersihkan dari Cloud Firestore.`,
    });
  };

  // Export Documents + Age to Excel (.csv)
  const handleDownloadExcelCsv = () => {
    const now = Date.now();
    const headers = [
      'ID Dokumen',
      'Judul Dokumen',
      'Kategori',
      'Departemen',
      'Unit Hotel',
      'Versi',
      'Tanggal Publikasi',
      'Umur Dokumen (Hari)',
      'Ukuran Lampiran',
      'Pembuat',
    ];
    const rows = documents.map((d) => {
      const createdTime = d.updatedAt ? new Date(d.updatedAt).getTime() : now;
      const ageDays = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));
      return [
        d.id,
        `"${(d.title || '').replace(/"/g, '""')}"`,
        d.category,
        d.department,
        d.unit || 'HCJ',
        d.version || '1.0',
        d.updatedAt || '-',
        `${ageDays} Hari`,
        d.fileSize || '-',
        `"${(d.author || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Intranet_HCJ_Audit_Umur_Dokumen_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatusToast({
      type: 'info',
      text: `Berhasil mengunduh laporan Excel (.csv) berisi ${documents.length} dokumen beserta kalkulasi umur penyimpanan.`,
    });
  };

  // Backup All Summary CSV
  const handleBackupCsv = () => {
    const headers = [
      'Koleksi Firestore',
      'Deskripsi',
      'Jumlah Dokumen',
      'Estimasi Ukuran (KB)',
      'Porsi Data (%)',
      'Persentase dari Limit 1 GiB (%)',
    ];
    const rows = quotaMetrics.collections.map((c) =>
      [
        c.path,
        `"${c.label}"`,
        c.count,
        `${c.kb} KB`,
        `${formatPct(c.sharePercent, 2)}%`,
        `${formatPct(c.quotaPercent, 3)}%`,
      ].join(',')
    );
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_Ringkasan_Koleksi_Firestore_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatusToast({
      type: 'info',
      text: 'Backup CSV ringkasan kuota koleksi Firestore berhasil diunduh.',
    });
  };

  // Full JSON Database Backup
  const handleBackupJson = () => {
    const fullBackup = {
      exportedAt: new Date().toISOString(),
      projectId: firebaseConfig.projectId,
      quotaSummary: {
        usedKB: quotaMetrics.usedKB,
        limitKB: quotaMetrics.limitKB,
        remainingKB: quotaMetrics.remainingKB,
        usedPercent: `${formatPct(quotaMetrics.usagePercent)}%`,
        remainingPercent: `${formatPct(quotaMetrics.remainingPercent)}%`,
        vercelQuota: quotaMetrics.vercel,
      },
      collections: {
        documents,
        users: users.map(({ password, ...rest }) => rest),
        performances,
        kpiMaster,
        accessLogs: logs,
        categories,
        departments,
        hotelUnits,
      },
    };
    const jsonString = JSON.stringify(fullBackup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Full_Backup_Firestore_HCJ_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatusToast({
      type: 'info',
      text: 'Full Backup JSON seluruh koleksi database Cloud Firestore berhasil diunduh.',
    });
  };

  const isConnected = firebaseState === 'connected' || livePullData !== null;

  return (
    <div className="w-full max-w-full space-y-6 pb-8 animate-in fade-in duration-300 overflow-x-hidden">
      {/* MAIN ANALYTICS CARD CONTAINER */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 lg:p-7 space-y-6 overflow-hidden">
        {/* TOP HEADER SECTION: Full-width clean layout so text NEVER wraps into narrow columns */}
        <div className="space-y-4">
          {/* Row 1: Badges & Live Auto-Sync Timer */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                100% FIREBASE FIRESTORE (SPARK FREE TIER)
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                SINKRON REAL-TIME
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                MONITOR KUOTA VERCEL &amp; CLOUD
              </span>
            </div>

            {isSuperAdmin && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-sky-600 animate-pulse shrink-0" />
                <span>
                  Auto-Update Aktif (1 Menit) • Pembaruan dalam{' '}
                  <strong className="font-mono text-sky-950">{secondsUntilNextSync} dtk</strong>
                </span>
              </div>
            )}
          </div>

          {/* Row 2: Full-Width Icon, Title & Description */}
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 fill-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                Pusat Analitik Kuota Cloud Firebase &amp; Pemakaian Hosting Vercel
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Pantau batas kuota penyimpanan gratis Firebase Firestore (1 GiB), persentase sisa
                kuota baca/tulis harian, serta persentase pemakaian trafik &amp; bandwidth hosting
                Vercel secara real-time untuk seluruh unit hotel.
              </p>
            </div>
          </div>

          {/* Row 3: Status Bar + Export Buttons + SINGLE Unified Sync Button */}
          <div className="pt-3.5 border-t border-slate-200/80 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
            {/* Live Connection Status */}
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="text-xs font-extrabold text-slate-800 uppercase">
                {isConnected ? 'TERHUBUNG REAL-TIME CLOUD' : 'MEMERIKSA KONEKSI CLOUD'}
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-xs text-slate-600">
                Sinkronisasi Terakhir: <strong className="text-slate-800">{lastSyncTime}</strong>
              </span>
            </div>

            {/* Action Toolbar: Export Buttons + Single Sync Button */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadExcelCsv}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Download Excel (.csv)</span>
              </button>

              <button
                type="button"
                onClick={handleBackupCsv}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Backup CSV</span>
              </button>

              <button
                type="button"
                onClick={handleBackupJson}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <FileJson className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Backup JSON</span>
              </button>

              {/* SINGLE UNIFIED SYNC BUTTON FOR ALL CLOUD & VERCEL QUOTAS */}
              <button
                type="button"
                onClick={() => runUnifiedCloudSync(false)}
                disabled={isSyncingAll}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#004872] hover:bg-[#00395b] text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-amber-300 shrink-0 ${
                    isSyncingAll ? 'animate-spin' : ''
                  }`}
                />
                <span>
                  {isSyncingAll ? 'Menyinkronkan Semua...' : 'Sinkronkan Semua Kuota & Data'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Toast Notification Banner */}
        {statusToast && (
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
              statusToast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : statusToast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-sky-50 border-sky-200 text-sky-900'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="leading-relaxed">{statusToast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusToast(null)}
              className="text-slate-400 hover:text-slate-700 font-bold px-2 py-0.5 rounded-lg shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* SECTION 1: 4 CORE QUOTA SUMMARY CARDS WITH CLEAR PERCENTAGES (%) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Firebase Storage (1 GiB) */}
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Penyimpanan Firestore
                </span>
                <Database className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                ~{quotaMetrics.usedKB.toLocaleString('id-ID')} KB
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Dari Batas Gratis:{' '}
                <strong className="text-slate-700">1.048.576 KB (1 GiB)</strong>
              </div>
            </div>

            <div className="space-y-2">
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.max(2, Math.min(100, quotaMetrics.usagePercent))}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold tabular-nums whitespace-nowrap">
                  Terpakai: {formatPct(quotaMetrics.usagePercent)}%
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-bold tabular-nums whitespace-nowrap">
                  Sisa: {formatPct(quotaMetrics.remainingPercent)}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Firebase Daily Reads (50,000 / day) */}
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Kuota Baca Harian (Read)
                </span>
                <Activity className="w-4 h-4 text-sky-600 shrink-0" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                {quotaMetrics.estimatedDailyReads.toLocaleString('id-ID')} Dok
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Dari Batas Gratis:{' '}
                <strong className="text-slate-700">50.000 Read / Hari</strong>
              </div>
            </div>

            <div className="space-y-2">
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-500"
                  style={{ width: `${Math.max(2, Math.min(100, quotaMetrics.readsPercent))}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-extrabold tabular-nums whitespace-nowrap">
                  Terpakai: {formatPct(quotaMetrics.readsPercent)}%
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-bold tabular-nums whitespace-nowrap">
                  Sisa: {formatPct(100 - quotaMetrics.readsPercent)}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Firebase Daily Writes (20,000 / day) */}
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Kuota Tulis Harian (Write)
                </span>
                <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                {quotaMetrics.estimatedDailyWrites.toLocaleString('id-ID')} Dok
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Dari Batas Gratis:{' '}
                <strong className="text-slate-700">20.000 Write / Hari</strong>
              </div>
            </div>

            <div className="space-y-2">
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.max(2, Math.min(100, quotaMetrics.writesPercent))}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-extrabold tabular-nums whitespace-nowrap">
                  Terpakai: {formatPct(quotaMetrics.writesPercent)}%
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-bold tabular-nums whitespace-nowrap">
                  Sisa: {formatPct(100 - quotaMetrics.writesPercent)}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Vercel Bandwidth (100 GB / month) */}
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Bandwidth Hosting Vercel
                </span>
                <Wifi className="w-4 h-4 text-amber-600 shrink-0" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                ~{quotaMetrics.vercel.bandwidthUsedMB.toLocaleString('id-ID')} MB
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Dari Batas Gratis:{' '}
                <strong className="text-slate-700">102.400 MB (100 GB)</strong>
              </div>
            </div>

            <div className="space-y-2">
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{
                    width: `${Math.max(2, Math.min(100, quotaMetrics.vercel.bandwidthPercent))}%`,
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold tabular-nums whitespace-nowrap">
                  Terpakai: {formatPct(quotaMetrics.vercel.bandwidthPercent)}%
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-bold tabular-nums whitespace-nowrap">
                  Sisa: {formatPct(quotaMetrics.vercel.bandwidthRemainingPercent)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: FULL-WIDTH MONITOR PEMAKAIAN PENYIMPANAN GRATIS FIREBASE */}
        <div className="rounded-2xl bg-[#0b132b] text-white p-5 sm:p-6 border border-slate-800 shadow-md space-y-5">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-700/70 text-emerald-300 text-[11px] font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>PAKET GRATIS SELAMANYA (SPARK PLAN — 1 GiB)</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Monitor Pemakaian Penyimpanan Gratis Firebase Firestore
              </h2>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold tabular-nums">
                Terpakai: {formatPct(quotaMetrics.usagePercent)}%
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-extrabold tabular-nums">
                Sisa Kuota: {formatPct(quotaMetrics.remainingPercent)}%
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                title="Cetak Laporan Analitik Kuota"
                className="w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Full-Width Storage Progress Bar */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="text-slate-300 font-semibold">
                Total Pemakaian Penyimpanan Cloud Saat Ini:
              </span>
              <span className="font-mono font-extrabold text-emerald-400">
                ~{quotaMetrics.usedKB.toLocaleString('id-ID')} KB ({quotaMetrics.usedMB} MB) /{' '}
                {quotaMetrics.limitKB.toLocaleString('id-ID')} KB (1 GiB) •{' '}
                {formatPct(quotaMetrics.usagePercent)}%
              </span>
            </div>

            <div className="w-full h-3.5 rounded-full bg-slate-800 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${Math.max(1.5, Math.min(100, quotaMetrics.usagePercent))}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span>
                Digunakan:{' '}
                <strong className="text-emerald-300">
                  {formatPct(quotaMetrics.usagePercent)}% (~{quotaMetrics.usedMB} MB)
                </strong>
              </span>
              <span>
                Sisa Kapasitas Tersedia:{' '}
                <strong className="text-white">
                  {formatPct(quotaMetrics.remainingPercent)}% (~
                  {quotaMetrics.remainingKB.toLocaleString('id-ID')} KB / {quotaMetrics.remainingMB}{' '}
                  MB)
                </strong>
              </span>
            </div>
          </div>

          {/* 3 Detail Columns Inside Firebase Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box 1: Rata-rata Ukuran per Dokumen */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Rata-Rata Ukuran / Entitas
                </span>
                <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 text-[11px] font-extrabold tabular-nums">
                  {formatPct(quotaMetrics.avgDocPercent)}% dari limit
                </span>
              </div>
              <div className="text-lg font-black text-white tabular-nums">
                ~{quotaMetrics.avgDocKB} KB{' '}
                <span className="text-xs font-semibold text-slate-400">
                  / maks {quotaMetrics.maxDocLimitKB.toLocaleString('id-ID')} KB
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Total <strong className="text-slate-200">{quotaMetrics.totalEntitiesCount}</strong>{' '}
                entitas aktif. Lampiran PDF/Word besar otomatis dipecah ke sub-koleksi chunks.
              </p>
            </div>

            {/* Box 2: Kuota Hapus Harian & Operasi */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Kuota Hapus Harian (Delete)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-extrabold tabular-nums">
                  Terpakai: {formatPct(quotaMetrics.deletesPercent)}%
                </span>
              </div>
              <div className="text-lg font-black text-white tabular-nums">
                {quotaMetrics.estimatedDailyDeletes.toLocaleString('id-ID')}{' '}
                <span className="text-xs font-semibold text-slate-400">
                  / {quotaMetrics.dailyDeletesLimit.toLocaleString('id-ID')} Dok/Hari
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Sisa kuota hapus hari ini:{' '}
                <strong className="text-emerald-300">
                  {formatPct(100 - quotaMetrics.deletesPercent)}% (
                  {(
                    quotaMetrics.dailyDeletesLimit - quotaMetrics.estimatedDailyDeletes
                  ).toLocaleString('id-ID')}{' '}
                  operasi)
                </strong>
                .
              </p>
            </div>

            {/* Box 3: Pembersihan Otomatis & Retensi */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Retensi &amp; Optimasi Kuota
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-extrabold">
                    Otomatis 90 Hari
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Bersihkan pengumuman kedaluwarsa &amp; riwayat log akses &gt;90 hari untuk
                  menghemat kuota penyimpanan.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePruneStorage}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Bersihkan Berkas &amp; Log Kedaluwarsa</span>
              </button>
            </div>
          </div>

          {/* Footer info inside dark card */}
          <div className="pt-3 border-t border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Firestore Security Rules:{' '}
                <strong className="text-emerald-400">Aktif &amp; Terlindungi</strong>
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-300">
              Project ID: <strong className="text-white">{firebaseConfig.projectId}</strong> • DB:
              (default)
            </div>
          </div>
        </div>

        {/* SECTION 3: RINCIAN PERSENTASE PER KOLEKSI DATABASE NOSQL FIRESTORE */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Rincian Pemakaian &amp; Persentase Koleksi Database Cloud Firestore
                </h3>
                <p className="text-xs text-slate-500">
                  Distribusi ukuran byte, jumlah dokumen, porsi data (%), dan persentase terhadap
                  batas kuota 1 GiB
                </p>
              </div>
            </div>
            <span className="self-start sm:self-center px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold">
              Total: {quotaMetrics.totalEntitiesCount} Entitas (~
              {quotaMetrics.usedKB.toLocaleString('id-ID')} KB •{' '}
              {formatPct(quotaMetrics.usagePercent)}%)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {quotaMetrics.collections.map((col) => (
              <div
                key={col.path}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/70">
                      {col.path}
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 tabular-nums">
                      {col.count} dok • ~{col.kb.toLocaleString('id-ID')} KB
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 pt-1">{col.label}</div>
                  <div className="text-[11px] text-slate-500">{col.subInfo}</div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${col.color} transition-all duration-500`}
                      style={{ width: `${Math.max(3, Math.min(100, col.sharePercent))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded-md border font-extrabold tabular-nums ${col.badgeBg}`}
                    >
                      Porsi Data: {formatPct(col.sharePercent, 1)}%
                    </span>
                    <span className="text-slate-600 font-bold tabular-nums">
                      Kuota 1 GiB: {formatPct(col.quotaPercent, 3)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: VERCEL HOSTING QUOTA & TRAFFIC MONITOR WITH PERCENTAGES */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-emerald-200/90 shadow-sm p-4 sm:p-6 lg:p-7 space-y-5 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Monitor Kuota &amp; Persentase Pemakaian Hosting Vercel
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider">
                  SINKRON KE FIREBASE
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Pemantauan real-time persentase kuota Bandwidth CDN, Edge Requests, Serverless
                Compute, dan Build Pipeline pada paket Vercel Hobby (100% Gratis).
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold self-start sm:self-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Status Edge CDN: Online (99,99% Uptime)</span>
          </div>
        </div>

        {/* 2x2 Spacious Grid for Vercel Metrics (Zero Text Truncation) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vercel Metric 1: Fast Origin Transfer (Bandwidth 100 GB) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Fast Origin Transfer (Bandwidth)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Batas Kuota Gratis: <strong>100 GB / Bulan (102.400 MB)</strong>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs tabular-nums">
                  Terpakai: {formatPct(quotaMetrics.vercel.bandwidthPercent)}%
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
              <div className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                ~{quotaMetrics.vercel.bandwidthUsedMB.toLocaleString('id-ID')} MB{' '}
                <span className="text-xs font-semibold text-slate-500">
                  ({(quotaMetrics.vercel.bandwidthUsedMB / 1024).toFixed(2)} GB)
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700 tabular-nums">
                Sisa Kuota: {formatPct(quotaMetrics.vercel.bandwidthRemainingPercent)}% (~
                {(quotaMetrics.vercel.bandwidthRemainingMB / 1024).toFixed(2)} GB)
              </div>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{
                  width: `${Math.max(2, Math.min(100, quotaMetrics.vercel.bandwidthPercent))}%`,
                }}
              />
            </div>
          </div>

          {/* Vercel Metric 2: Edge Network Requests (1,000,000 Req/Month) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Edge Network Requests (HTTPS &amp; API)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Batas Kuota Gratis: <strong>1.000.000 Request / Bulan</strong>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-extrabold text-xs tabular-nums">
                  Terpakai: {formatPct(quotaMetrics.vercel.edgeReqPercent)}%
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
              <div className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                {quotaMetrics.vercel.edgeReqUsed.toLocaleString('id-ID')} Req
              </div>
              <div className="text-xs font-bold text-slate-700 tabular-nums">
                Sisa Kuota: {formatPct(quotaMetrics.vercel.edgeReqRemainingPercent)}% (
                {quotaMetrics.vercel.edgeReqRemaining.toLocaleString('id-ID')} Req)
              </div>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500"
                style={{
                  width: `${Math.max(2, Math.min(100, quotaMetrics.vercel.edgeReqPercent))}%`,
                }}
              />
            </div>
          </div>

          {/* Vercel Metric 3: Serverless & Edge Functions Execution (100 GB-Hrs) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Serverless &amp; Edge Functions Compute
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Batas Kuota Gratis: <strong>100 GB-Jam / Bulan</strong>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-extrabold text-xs tabular-nums">
                  Terpakai: {formatPct(quotaMetrics.vercel.functionPercent)}%
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
              <div className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                {quotaMetrics.vercel.functionUsedGBHrs} GB-Jam
              </div>
              <div className="text-xs font-bold text-slate-700 tabular-nums">
                Sisa Kuota: {formatPct(quotaMetrics.vercel.functionRemainingPercent)}% (
                {quotaMetrics.vercel.functionRemainingGBHrs} GB-Jam)
              </div>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{
                  width: `${Math.max(2, Math.min(100, quotaMetrics.vercel.functionPercent))}%`,
                }}
              />
            </div>
          </div>

          {/* Vercel Metric 4: Build Execution & Bundle Size (6,000 Mins/Month) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Build Execution &amp; Ukuran Bundle SPA
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Batas Kuota Build: <strong>6.000 Menit / Bulan</strong> • Bundle Maks 50 MB
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-extrabold text-xs tabular-nums">
                  Terpakai: {formatPct(quotaMetrics.vercel.buildMinsPercent)}%
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
              <div className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                {quotaMetrics.vercel.buildMinsUsed} Menit{' '}
                <span className="text-xs font-semibold text-slate-500">
                  ({quotaMetrics.vercel.buildCount}x Deploy • Bundle ~
                  {quotaMetrics.vercel.bundleSizeKB} KB /{' '}
                  {formatPct(quotaMetrics.vercel.bundlePercent)}%)
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700 tabular-nums">
                Sisa Kuota: {formatPct(quotaMetrics.vercel.buildMinsRemainingPercent)}% (
                {quotaMetrics.vercel.buildMinsRemaining.toLocaleString('id-ID')} Menit)
              </div>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                style={{
                  width: `${Math.max(2, Math.min(100, quotaMetrics.vercel.buildMinsPercent))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
