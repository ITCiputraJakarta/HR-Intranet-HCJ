import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Download,
  Filter,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Info,
  Clock,
  User as UserIcon,
  ShieldCheck,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  X,
  ArrowDownAZ,
  ArrowUpZA,
} from 'lucide-react';
import { AccessLog, User, ActionCategory, LogStatus } from '../types';
import { DEPARTMENTS } from '../data/initialData';
import { clearAccessLogs } from '../lib/storage';
import { TablePagination } from './TablePagination';
import { SortableHeader } from './SortableHeader';

interface AccessLogsViewProps {
  logs: AccessLog[];
  currentUser: User;
  onRefresh: () => void;
}

export const AccessLogsView: React.FC<AccessLogsViewProps> = ({
  logs = [],
  currentUser,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterDept, setFilterDept] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const safeLogs = logs || [];

  // Filter logs
  let filtered = [...safeLogs];

  if (filterCategory !== 'All') {
    filtered = filtered.filter((l) => l.actionCategory === filterCategory);
  }

  if (filterDept !== 'All') {
    filtered = filtered.filter((l) => l.departemen === filterDept);
  }

  if (filterStatus !== 'All') {
    filtered = filtered.filter((l) => l.status === filterStatus);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.userName.toLowerCase().includes(q) ||
        l.userEmail.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q) ||
        (l.details && l.details.toLowerCase().includes(q))
    );
  }

  filtered.sort((a, b) => {
    let comp = 0;
    if (sortField === 'timestamp') {
      comp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    } else if (sortField === 'userName') {
      comp = a.userName.localeCompare(b.userName, 'id', { sensitivity: 'base' });
    } else if (sortField === 'actionCategory') {
      comp = a.actionCategory.localeCompare(b.actionCategory, 'id', { sensitivity: 'base' });
    } else if (sortField === 'target') {
      comp = a.target.localeCompare(b.target, 'id', { sensitivity: 'base' });
    } else if (sortField === 'status') {
      comp = a.status.localeCompare(b.status, 'id', { sensitivity: 'base' });
    }
    return sortDirection === 'asc' ? comp : -comp;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const paginatedLogs = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics
  const totalCount = safeLogs.length;
  const successCount = safeLogs.filter((l) => l.status === 'SUCCESS').length;
  const warningCount = safeLogs.filter((l) => l.status === 'WARNING').length;
  const failedCount = safeLogs.filter((l) => l.status === 'FAILED').length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100;

  // Export to CSV for Google Spreadsheet
  const handleExportCSV = () => {
    const headers = [
      'ID Log',
      'Waktu (UTC)',
      'Nama Karyawan',
      'Email',
      'Peran (Role)',
      'Departemen',
      'Kategori',
      'Aksi Dilakukan',
      'Target / Objek',
      'Status',
      'Rincian Detail',
      'Alamat IP',
      'User Agent',
    ];

    const rows = filtered.map((l) => [
      l.id,
      l.timestamp,
      `"${l.userName.replace(/"/g, '""')}"`,
      l.userEmail,
      l.role,
      `"${l.departemen.replace(/"/g, '""')}"`,
      l.actionCategory,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.target.replace(/"/g, '""')}"`,
      l.status,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.ipAddress || '-',
      `"${(l.userAgent || '-').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Log_Akses_Intranet_Ciputra_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearLogs = () => {
    setShowClearConfirm(true);
  };

  const confirmClearLogs = () => {
    clearAccessLogs(currentUser);
    setShowClearConfirm(false);
    onRefresh();
  };

  const getCategoryBadge = (cat: ActionCategory) => {
    switch (cat) {
      case 'AUTH':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DOCUMENT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'USER_MGMT':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'APPRAISAL':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'KPI_CONFIG':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusBadge = (status: LogStatus) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>SUCCESS</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>WARNING</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>FAILED</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-slate-900 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Sistem Log Akses Terstruktur (AccessLogs)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pencatatan real-time seluruh autentikasi, akses berkas Google Drive, dan modifikasi data
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-logs"
            onClick={onRefresh}
            className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Muat Ulang Log"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor CSV Spreadsheet</span>
          </button>
          {currentUser.role === 'admin' && (
            <button
              id="btn-clear-logs"
              onClick={handleClearLogs}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
              title="Bersihkan Riwayat Log"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 1-Week Retention Policy Banner */}
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 shadow-2xs">
        <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
        <div className="flex-1">
          <span className="font-bold">Kebijakan Retensi Log 1 Minggu:</span> Sistem otomatis menjaga riwayat aktivitas dari 7 hari ke belakang (1 minggu) dari detik ini. Data log yang lebih dari 7 hari otomatis dibersihkan secara berkala agar penyimpanan database tetap optimal dan tidak menumpuk.
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-indigo-200/80 text-indigo-900 font-extrabold text-[10px] tracking-wider uppercase shrink-0">
          7 HARI AKTIF
        </span>
      </div>

      {/* Metric Cards - Clickable Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setFilterStatus('All');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
            filterStatus === 'All'
              ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-indigo-200'
          }`}
          title="Klik untuk melihat semua aktivitas"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500">
              Total Aktivitas
            </span>
            {filterStatus === 'All' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Aktif</span>
            )}
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Seluruh Sesi & Aksi</span>
        </div>

        <div
          onClick={() => {
            setFilterStatus(filterStatus === 'SUCCESS' ? 'All' : 'SUCCESS');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
            filterStatus === 'SUCCESS'
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
          title="Klik untuk filter status Berhasil (SUCCESS)"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-emerald-600">
              Berhasil (Success)
            </span>
            {filterStatus === 'SUCCESS' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Aktif</span>
            )}
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-1">{successCount}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Tingkat Keberhasilan {successRate}%</span>
        </div>

        <div
          onClick={() => {
            setFilterStatus(filterStatus === 'WARNING' ? 'All' : 'WARNING');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
            filterStatus === 'WARNING'
              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
          title="Klik untuk filter status Peringatan (WARNING)"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-amber-600">
              Peringatan (Warning)
            </span>
            {filterStatus === 'WARNING' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Aktif</span>
            )}
          </div>
          <p className="text-2xl font-black text-amber-600 mt-1">{warningCount}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Sesi Dibatasi / Pending</span>
        </div>

        <div
          onClick={() => {
            setFilterStatus(filterStatus === 'FAILED' ? 'All' : 'FAILED');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
            filterStatus === 'FAILED'
              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-rose-200'
          }`}
          title="Klik untuk filter status Gagal / Ditolak (FAILED)"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-rose-600">
              Gagal / Ditolak
            </span>
            {filterStatus === 'FAILED' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">Aktif</span>
            )}
          </div>
          <p className="text-2xl font-black text-rose-600 mt-1">{failedCount}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Kredensial Tidak Sah</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-logs"
              type="text"
              placeholder="Cari user, email, aksi, sasaran..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdowns */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap justify-end">
            <select
              id="filter-log-category"
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="All">Semua Kategori</option>
              <option value="AUTH">AUTH (Autentikasi)</option>
              <option value="DOCUMENT">DOCUMENT (Berkas Drive)</option>
              <option value="USER_MGMT">USER_MGMT (Kelola User)</option>
              <option value="APPRAISAL">APPRAISAL (Evaluasi Kinerja)</option>
              <option value="KPI_CONFIG">KPI_CONFIG (Konfigurasi KPI)</option>
              <option value="SYSTEM">SYSTEM (Sistem & Master)</option>
            </select>

            <select
              id="filter-log-dept"
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="All">Semua Departemen</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              id="filter-log-status"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="All">Semua Status</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="WARNING">WARNING</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>

        {/* Results summary and reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Menampilkan <strong>{filtered.length}</strong> dari <strong>{safeLogs.length}</strong> catatan log
          </div>

          {(searchQuery || filterCategory !== 'All' || filterDept !== 'All' || filterStatus !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('All');
                setFilterDept('All');
                setFilterStatus('All');
                setCurrentPage(1);
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold text-xs inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <SortableHeader
                  field="timestamp"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="py-3.5 px-5"
                >
                  Waktu (Timestamp)
                </SortableHeader>
                <SortableHeader
                  field="userName"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="py-3.5 px-4"
                >
                  Pengguna / Operator
                </SortableHeader>
                <SortableHeader
                  field="actionCategory"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="py-3.5 px-4"
                >
                  Kategori & Aksi
                </SortableHeader>
                <SortableHeader
                  field="target"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="py-3.5 px-4"
                >
                  Target / Berkas
                </SortableHeader>
                <SortableHeader
                  field="status"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                  className="py-3.5 px-4 text-center"
                >
                  Status
                </SortableHeader>
                <th className="py-3.5 px-5 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada catatan log yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {new Date(log.timestamp).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {log.userEmail}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 uppercase">
                          {log.role}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          {log.departemen}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getCategoryBadge(
                          log.actionCategory
                        )}`}
                      >
                        {log.actionCategory}
                      </span>
                      <p className="font-semibold text-slate-800 mt-1 text-xs">
                        {log.action}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-slate-700 font-semibold block text-xs truncate max-w-[200px]">
                        {log.target}
                      </span>
                      {log.details && (
                        <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">
                          {log.details}
                        </span>
                      )}
                    </td>

                    <td
                      className="py-3.5 px-4 text-center whitespace-nowrap cursor-pointer hover:opacity-80"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterStatus(log.status);
                        setCurrentPage(1);
                      }}
                      title={`Klik untuk filter status ${log.status}`}
                    >
                      {getStatusBadge(log.status)}
                    </td>

                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Rincian</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={[10, 25, 50, 100]}
          onPageChange={(page) => setCurrentPage(page)}
          onItemsPerPageChange={(newCount) => {
            setItemsPerPage(newCount);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Log Detail Inspector Modal */}
      {selectedLog && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLog(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full border border-slate-200 space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Rincian Log Akses Terstruktur
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    ID Log
                  </span>
                  <span className="font-mono font-bold text-slate-800">{selectedLog.id}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Status
                  </span>
                  <div className="mt-0.5">{getStatusBadge(selectedLog.status)}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Waktu Eksekusi
                </span>
                <span className="font-bold text-slate-800">
                  {new Date(selectedLog.timestamp).toLocaleString('id-ID', {
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Pengguna
                </span>
                <p className="font-bold text-slate-900 text-sm">{selectedLog.userName}</p>
                <p className="text-slate-500 font-mono text-[11px]">{selectedLog.userEmail}</p>
                <div className="flex gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[10px] uppercase">
                    Role: {selectedLog.role}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-semibold rounded text-[10px]">
                    Dept: {selectedLog.departemen}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Aksi & Sasaran
                </span>
                <p className="font-bold text-indigo-700 mt-0.5">{selectedLog.action}</p>
                <p className="font-semibold text-slate-800 mt-1">Target: {selectedLog.target}</p>
                {selectedLog.details && (
                  <p className="text-slate-600 mt-1 pt-1 border-t border-slate-200/60 leading-relaxed">
                    {selectedLog.details}
                  </p>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 font-mono text-[11px]">
                <span className="text-slate-400 text-[10px] uppercase font-bold block font-sans">
                  Metadata Jaringan
                </span>
                <p className="text-slate-700 mt-0.5">IP: {selectedLog.ipAddress || '127.0.0.1'}</p>
                <p className="text-slate-500 text-[10px] mt-0.5 truncate">
                  UA: {selectedLog.userAgent || '-'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Logs Confirmation Modal */}
      {showClearConfirm && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowClearConfirm(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 cursor-default"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Bersihkan Riwayat Log?</h4>
                <p className="text-xs text-slate-500 mt-0.5">Tindakan keamanan penting.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              Apakah Anda yakin ingin membersihkan riwayat log akses? Tindakan ini akan dicatat sebagai log audit keamanan baru.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmClearLogs}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
              >
                Ya, Bersihkan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
