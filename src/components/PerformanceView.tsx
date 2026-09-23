import React, { useState } from 'react';
import {
  Award,
  Plus,
  Search,
  Filter,
  Printer,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Building2,
  User as UserIcon,
  ChevronRight,
  Clock,
  FileCheck2,
  Save,
  Eye,
  X,
  RotateCcw,
  BarChart3,
  TrendingUp,
  Users,
  ShieldCheck,
  Check,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';
import { PerformanceAppraisal, User, KPIRowItem, KPIMasterItem, UserRole } from '../types';
import { savePerformanceItem, getDepartments } from '../lib/storage';
import { AppraisalPrintModal } from './AppraisalPrintModal';
import { DepartmentBadge } from '../lib/departmentColors';
import { TablePagination } from './TablePagination';
import { SortableHeader } from './SortableHeader';

interface PerformanceViewProps {
  performances: PerformanceAppraisal[];
  kpiMaster: KPIMasterItem[];
  currentUser: User;
  onRefresh: () => void;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({
  performances = [],
  kpiMaster = [],
  currentUser,
  onRefresh,
}) => {
  const departments = getDepartments();
  const [activeTab, setActiveTab] = useState<'results' | 'forms'>('results');
  const [activeForm, setActiveForm] = useState<PerformanceAppraisal | null>(null);
  const [previewAppraisal, setPreviewAppraisal] = useState<PerformanceAppraisal | null>(null);
  const [selectedSubordinate, setSelectedSubordinate] = useState<PerformanceAppraisal | null>(null);

  // Filter & Search states
  const [searchName, setSearchName] = useState('');
  const [filterYear, setFilterYear] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterGrade, setFilterGrade] = useState('All');

  // Sorting and pagination
  const [sortField, setSortField] = useState<string>('periode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Role detection
  const isSuperAdmin = currentUser.role === 'admin';
  const isManager = currentUser.role === 'manager' || currentUser.role === 'hod';
  const isStaff = currentUser.role === 'staff' || currentUser.role === 'spv';

  const safePerformances = performances || [];
  const safeKpiMaster = kpiMaster || [];

  // ---------------------------------------------------------------------------
  // SCOPED LIST BASED ON USER ROLE
  // - Super Admin: views all employees across all departments
  // - Manager/HOD: views all subordinates in their own department
  // - Staff/SPV: views their own evaluations
  // ---------------------------------------------------------------------------
  let scopedList = [...safePerformances];
  if (isStaff) {
    scopedList = scopedList.filter(
      (p) => p.email.toLowerCase() === currentUser.email.toLowerCase()
    );
  } else if (isManager) {
    scopedList = scopedList.filter((p) => p.departemen === currentUser.departemen);
  } else if (isSuperAdmin) {
    if (filterDept !== 'All') {
      scopedList = scopedList.filter((p) => p.departemen === filterDept);
    }
  }

  // Filter application
  if (filterYear !== 'All') {
    scopedList = scopedList.filter((p) => String(p.periode) === filterYear);
  }
  if (filterType !== 'All') {
    scopedList = scopedList.filter((p) => p.tipe === filterType);
  }
  if (filterStatus !== 'All') {
    scopedList = scopedList.filter((p) => p.status === filterStatus);
  }
  if (filterGrade !== 'All') {
    scopedList = scopedList.filter((p) => p.finalGrade === filterGrade);
  }
  if (searchName.trim()) {
    const q = searchName.toLowerCase();
    scopedList = scopedList.filter(
      (p) => p.nama.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    );
  }

  // Sorting
  const sortedList = [...scopedList].sort((a, b) => {
    let comp = 0;
    if (sortField === 'periode') {
      if (a.periode !== b.periode) {
        comp = Number(a.periode) - Number(b.periode);
      } else {
        comp = a.tipe.localeCompare(b.tipe);
      }
    } else if (sortField === 'nama') {
      comp = a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
    } else if (sortField === 'departemen') {
      comp = a.departemen.localeCompare(b.departemen, 'id', { sensitivity: 'base' });
    } else if (sortField === 'kpiTotalScore') {
      comp = a.kpiTotalScore - b.kpiTotalScore;
    } else if (sortField === 'finalGrandTotal') {
      comp = a.finalGrandTotal - b.finalGrandTotal;
    } else if (sortField === 'status') {
      comp = a.status.localeCompare(b.status);
    }
    return sortDirection === 'asc' ? comp : -comp;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(
        field === 'periode' || field === 'kpiTotalScore' || field === 'finalGrandTotal'
          ? 'desc'
          : 'asc'
      );
    }
    setCurrentPage(1);
  };

  const paginatedList = sortedList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasActiveFilters =
    searchName.trim() !== '' ||
    filterYear !== 'All' ||
    (isSuperAdmin && filterDept !== 'All') ||
    filterType !== 'All' ||
    filterStatus !== 'All' ||
    filterGrade !== 'All';

  const handleResetFilters = () => {
    setSearchName('');
    setFilterYear('All');
    if (isSuperAdmin) setFilterDept('All');
    setFilterType('All');
    setFilterStatus('All');
    setFilterGrade('All');
    setCurrentPage(1);
  };

  // ---------------------------------------------------------------------------
  // KPI RESULT METRICS CALCULATIONS
  // ---------------------------------------------------------------------------
  const totalSubordinates = scopedList.length;
  const avgKpiScore =
    totalSubordinates > 0
      ? (scopedList.reduce((acc, curr) => acc + curr.kpiTotalScore, 0) / totalSubordinates).toFixed(1)
      : '0.0';
  const avgFinalScore =
    totalSubordinates > 0
      ? (scopedList.reduce((acc, curr) => acc + curr.finalGrandTotal, 0) / totalSubordinates).toFixed(2)
      : '0.00';
  const countE = scopedList.filter((p) => p.finalGrade === 'E').length;
  const countG = scopedList.filter((p) => p.finalGrade === 'G').length;
  const countM = scopedList.filter((p) => p.finalGrade === 'M').length;
  const countU = scopedList.filter((p) => p.finalGrade === 'U').length;

  // ---------------------------------------------------------------------------
  // CREATE / EDIT APPRAISAL FORM LOGIC
  // ---------------------------------------------------------------------------
  const handleOpenNewForm = () => {
    const activeKpis = safeKpiMaster.filter(
      (k) =>
        k.departemen === currentUser.departemen &&
        k.target_role === currentUser.role &&
        k.status === 'Active'
    );

    const kpiRows: KPIRowItem[] =
      activeKpis.length > 0
        ? activeKpis.map((k) => ({
            pillar: k.pillar,
            objective: k.objective,
            weight: k.weight,
            target: k.target,
            actual: '',
            achieved_yn: '',
            achieved_pct: 0,
          }))
        : [
            {
              pillar: 'Guest Satisfaction',
              objective: 'Mencapai skor kepuasan ulasan check-in tamu minimal 92%.',
              weight: 40,
              target: 'Nilai CSAT >= 92%.',
              actual: '',
              achieved_yn: '',
              achieved_pct: 0,
            },
            {
              pillar: 'Operational Speed',
              objective: 'Waktu pelayanan rata-rata check-in <= 3 menit.',
              weight: 30,
              target: 'Rata-rata check-in <= 180 detik.',
              actual: '',
              achieved_yn: '',
              achieved_pct: 0,
            },
            {
              pillar: 'Up-Selling & Room Revenue',
              objective: 'Melakukan upselling tipe kamar minimal 10 transaksi.',
              weight: 30,
              target: '>= 10 room upselling.',
              actual: '',
              achieved_yn: '',
              achieved_pct: 0,
            },
          ];

    const newForm: PerformanceAppraisal = {
      id: `perf-${Date.now()}`,
      periode: 2026,
      tipe: 'Mid-Year',
      email: currentUser.email,
      nama: currentUser.nama,
      departemen: currentUser.departemen,
      role: currentUser.role,
      status: 'Draft',
      kpis: kpiRows,
      kpiTotalScore: 0,
      kpiTranslatedScore: 1,
      behaviourScores: {
        'beh-1': 3,
        'beh-2': 3,
        'beh-3': 3,
        'beh-4': 3,
        'beh-5': 3,
        'beh-6': 3,
        'beh-7': 3,
      },
      avgBehaviour: 3.0,
      complianceScore: 5.0,
      finalGrandTotal: 1.0,
      finalGrade: 'U',
      starBest: '',
      starChallenge: '',
      managerFeedback: '',
      hrRecommendation: 'Stay in current position',
      hrNote: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    calculateGrandTotal(newForm);
    setActiveForm(newForm);
  };

  const calculateGrandTotal = (form: PerformanceAppraisal) => {
    let kpiSum = 0;
    form.kpis.forEach((k) => {
      if (k.achieved_yn === 'Yes') {
        k.achieved_pct = k.weight;
        kpiSum += k.weight;
      } else {
        k.achieved_pct = 0;
      }
    });
    form.kpiTotalScore = kpiSum;

    let trans = 1;
    if (kpiSum >= 96) trans = 5;
    else if (kpiSum >= 90) trans = 4;
    else if (kpiSum >= 85) trans = 3;
    else if (kpiSum >= 75) trans = 2;
    form.kpiTranslatedScore = trans;

    const bValues = Object.values(form.behaviourScores);
    const bAvg = bValues.reduce((a, b) => a + b, 0) / (bValues.length || 7);
    form.avgBehaviour = Number(bAvg.toFixed(2));

    const wKpi = trans * 0.5;
    const wBeh = bAvg * 0.45;
    const wComp = form.complianceScore * 0.05;
    const grand = Number((wKpi + wBeh + wComp).toFixed(2));
    form.finalGrandTotal = grand;

    if (grand >= 4.5) form.finalGrade = 'E';
    else if (grand >= 3.5) form.finalGrade = 'G';
    else if (grand >= 2.5) form.finalGrade = 'M';
    else form.finalGrade = 'U';
  };

  const handleKpiChange = (index: number, field: keyof KPIRowItem, value: any) => {
    if (!activeForm) return;
    const updated = { ...activeForm };
    updated.kpis = [...updated.kpis];
    updated.kpis[index] = { ...updated.kpis[index], [field]: value };
    calculateGrandTotal(updated);
    setActiveForm(updated);
  };

  const handleBehaviourChange = (key: string, val: number) => {
    if (!activeForm) return;
    const updated = {
      ...activeForm,
      behaviourScores: { ...activeForm.behaviourScores, [key]: val },
    };
    calculateGrandTotal(updated);
    setActiveForm(updated);
  };

  const handleSaveForm = () => {
    if (!activeForm) return;
    savePerformanceItem(activeForm, currentUser);
    setActiveForm(null);
    onRefresh();
  };

  // ---------------------------------------------------------------------------
  // IF IN FORM EDITING / FILLING VIEW
  // ---------------------------------------------------------------------------
  if (activeForm) {
    const isOwner = activeForm.email.toLowerCase() === currentUser.email.toLowerCase();
    const canScore =
      isSuperAdmin ||
      (!isOwner && (isManager || currentUser.role === 'spv'));
    const canEditSelf =
      isOwner && (activeForm.status === 'Draft' || activeForm.status === 'Submitted');

    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12 print:p-0 print:m-0">
        {/* Form Action Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
          <button
            onClick={() => setActiveForm(null)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              id="btn-preview-print-form"
              onClick={() => setPreviewAppraisal(activeForm)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all border border-indigo-200/80 shadow-2xs"
              title="Buka pratinjau cetak A4 dan simpan PDF"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Pratinjau & Cetak PDF (A4)</span>
            </button>
            <button
              onClick={handleSaveForm}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Simpan & Proses Data</span>
            </button>
          </div>
        </div>

        {/* Form Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">
                Hotel Ciputra Jakarta • Human Resources Department
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Dokumen Evaluasi Kinerja (Performance Appraisal)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Status Form:</span>
              <select
                value={activeForm.status}
                disabled={!canScore && activeForm.status !== 'Draft'}
                onChange={(e) =>
                  setActiveForm({
                    ...activeForm,
                    status: e.target.value as PerformanceAppraisal['status'],
                  })
                }
                className="px-3 py-1 text-xs font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700"
              >
                <option value="Draft">Draft (Simpan Sementara)</option>
                <option value="Submitted">Submitted (Diajukan ke Atasan)</option>
                <option value="On Check">On Check (Sedang Dinilai)</option>
                <option value="Approved">Approved (Selesai)</option>
              </select>
            </div>
          </div>

          {/* Employee Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Karyawan</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{activeForm.nama}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Departemen</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{activeForm.departemen}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Periode</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {activeForm.periode} ({activeForm.tipe})
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Jabatan (Role)</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5 uppercase">{activeForm.role}</p>
            </div>
          </div>

          {/* Section 1: KPI (50%) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h3 className="font-bold text-slate-900 text-sm">
                Key Performance Indicators (Bobot 50%)
              </h3>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Pilar & Indikator Objektif</th>
                    <th className="py-3 px-3 text-center">Bobot</th>
                    <th className="py-3 px-4">Target Standard</th>
                    <th className="py-3 px-4 bg-emerald-50 text-emerald-900">Hasil Aktual (Inputan)</th>
                    <th className="py-3 px-3 text-center bg-amber-50 text-amber-900">Achieved</th>
                    <th className="py-3 px-3 text-center bg-amber-50 text-amber-900">Skor %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeForm.kpis.map((kpi, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 max-w-xs">
                        <strong className="text-slate-900 block">{kpi.pillar}</strong>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">{kpi.objective}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700 bg-slate-50/50">
                        {kpi.weight}%
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{kpi.target}</td>
                      <td className="py-2.5 px-3 bg-emerald-50/20">
                        <textarea
                          rows={2}
                          disabled={!canEditSelf && !canScore}
                          value={kpi.actual || ''}
                          onChange={(e) => handleKpiChange(idx, 'actual', e.target.value)}
                          placeholder="Ketik pencapaian aktual karyawan..."
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <select
                          disabled={!canScore}
                          value={kpi.achieved_yn || ''}
                          onChange={(e) => handleKpiChange(idx, 'achieved_yn', e.target.value)}
                          className="px-2 py-1 text-xs font-bold rounded-lg border border-amber-300 bg-amber-50 text-amber-900"
                        >
                          <option value="">-</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-indigo-700 text-sm">
                        {kpi.achieved_pct || 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td colSpan={5} className="py-2.5 px-4 text-right">
                      Total Pencapaian KPI:
                    </td>
                    <td className="py-2.5 px-3 text-center text-indigo-600 text-base">
                      {activeForm.kpiTotalScore}%
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="py-2.5 px-4 text-right">
                      Terjemahan Skala (1 - 5):
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-900 text-base">
                      {activeForm.kpiTranslatedScore} / 5
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 2: Core Behaviour (45%) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Core Behaviour & Leadership (Bobot 45%)
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
                Rata-rata: {activeForm.avgBehaviour.toFixed(2)} / 5.0
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'beh-1', name: 'Integrity', desc: 'Integritas, kejujuran & etika standar Ciputra' },
                { key: 'beh-2', name: 'Professionalism', desc: 'Sikap profesional, kerapian & tata krama' },
                { key: 'beh-3', name: 'Passion', desc: 'Semangat melayani tamu & dedikasi kerja' },
                { key: 'beh-4', name: 'Continuous Improvement', desc: 'Inovasi kerja & keinginan belajar' },
                { key: 'beh-5', name: 'Accountability', desc: 'Tanggung jawab atas tugas yang diberikan' },
                { key: 'beh-6', name: 'Teamwork', desc: 'Kerjasama tim dan komunikasi efektif' },
                { key: 'beh-7', name: 'Solutions & Care', desc: 'Solutif, ramah dan cepat tanggap' },
              ].map((beh) => (
                <div
                  key={beh.key}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3"
                >
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">{beh.name}</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">{beh.desc}</p>
                  </div>
                  <select
                    disabled={!canScore}
                    value={activeForm.behaviourScores[beh.key] || 3}
                    onChange={(e) => handleBehaviourChange(beh.key, Number(e.target.value))}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-800 focus:ring-1 focus:ring-indigo-600 shrink-0"
                  >
                    <option value={5}>5 - Sangat Baik</option>
                    <option value={4}>4 - Baik</option>
                    <option value={3}>3 - Cukup</option>
                    <option value={2}>2 - Kurang</option>
                    <option value={1}>1 - Sangat Kurang</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Summary / Final Result */}
          <div className="p-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                Total Perhitungan Nilai Kinerja Akhir
              </span>
              <span className="text-xs text-indigo-200">
                Formula: (50% KPI) + (45% Sikap) + (5% Disiplin)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[10px] text-slate-300 uppercase block">Capaian KPI</span>
                <span className="text-lg font-black text-indigo-300">{activeForm.kpiTotalScore}%</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ({activeForm.kpiTranslatedScore}/5 skala)
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[10px] text-slate-300 uppercase block">Rata Sikap (45%)</span>
                <span className="text-lg font-black text-sky-300">{activeForm.avgBehaviour.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">dari 5.00</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[10px] text-slate-300 uppercase block">Disiplin (5%)</span>
                <span className="text-lg font-black text-emerald-300">
                  {activeForm.complianceScore.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">dari 5.00</span>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-600/40 border border-indigo-400/40">
                <span className="text-[10px] text-indigo-200 uppercase block">Skor Akhir & Grade</span>
                <span className="text-xl font-black text-white">
                  {activeForm.finalGrandTotal.toFixed(2)}
                </span>
                <span className="inline-block ml-1 px-2 py-0.5 rounded text-[11px] font-black bg-white text-indigo-900">
                  {activeForm.finalGrade}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Qualitative Reviews */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">
              Catatan Kualitatif, Umpan Balik & Rekomendasi
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pencapaian Terbaik (Self Review)
                </label>
                <textarea
                  rows={3}
                  disabled={!canEditSelf && !isSuperAdmin}
                  value={activeForm.starBest || ''}
                  onChange={(e) => setActiveForm({ ...activeForm, starBest: e.target.value })}
                  placeholder="Deskripsikan pencapaian utama Anda..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tantangan & Solusi yang Diterapkan
                </label>
                <textarea
                  rows={3}
                  disabled={!canEditSelf && !isSuperAdmin}
                  value={activeForm.starChallenge || ''}
                  onChange={(e) => setActiveForm({ ...activeForm, starChallenge: e.target.value })}
                  placeholder="Tantangan kerja dan bagaimana solusinya..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
              </div>
            </div>

            {/* Manager Feedback */}
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
              <label className="block text-xs font-bold text-amber-900">
                Umpan Balik Manajer (Manager Overall Feedback)
              </label>
              <textarea
                rows={3}
                disabled={!canScore}
                value={activeForm.managerFeedback || ''}
                onChange={(e) => setActiveForm({ ...activeForm, managerFeedback: e.target.value })}
                placeholder="Ketik ulasan evaluasi kinerja karyawan secara objektif..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>

            {/* HR Recommendation */}
            {(isSuperAdmin || isManager) && (
              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-indigo-900 mb-1">
                    Rekomendasi HR / Manajer
                  </label>
                  <select
                    disabled={!canScore}
                    value={activeForm.hrRecommendation || 'Stay in current position'}
                    onChange={(e) =>
                      setActiveForm({ ...activeForm, hrRecommendation: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-bold text-slate-800"
                  >
                    <option value="Promote">Promosikan (Promote)</option>
                    <option value="Stay in current position">Tetap di Posisi Saat Ini</option>
                    <option value="Need Training">Membutuhkan Pelatihan Khusus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-900 mb-1">
                    Catatan Khusus HR
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={activeForm.hrNote || ''}
                    onChange={(e) => setActiveForm({ ...activeForm, hrNote: e.target.value })}
                    placeholder="Contoh: Diajukan untuk sertifikasi Q3..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Bottom Actions */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 print:hidden">
            <button
              onClick={() => setPreviewAppraisal(activeForm)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold border border-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Pratinjau Lembar Cetak A4</span>
            </button>

            <button
              onClick={handleSaveForm}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>SIMPAN & PROSES DATA APPRAISAL</span>
            </button>
          </div>
        </div>

        {/* Print Modal */}
        {previewAppraisal && (
          <AppraisalPrintModal
            appraisal={previewAppraisal}
            onClose={() => setPreviewAppraisal(null)}
          />
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN VIEW: RESULT KPI & APPRAISALS
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">
                Evaluasi Kinerja & Capaian KPI Karyawan
              </h1>
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                  <ShieldCheck className="w-3 h-3 text-purple-600" />
                  Super Admin (Semua Departemen)
                </span>
              ) : isManager ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                  <Users className="w-3 h-3 text-blue-600" />
                  Manager Dept: {currentUser.departemen}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Staff View
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isSuperAdmin
                ? 'Melihat hasil skor kinerja & capaian KPI seluruh karyawan di seluruh departemen hotel.'
                : isManager
                ? `Melihat hasil skor capaian KPI dan rincian inputan kinerja seluruh bawahan di departemen ${currentUser.departemen}.`
                : 'Melihat rekap pencapaian KPI dan formulir evaluasi kinerja mandiri.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            id="btn-new-appraisal"
            onClick={handleOpenNewForm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Isi Form Baru</span>
          </button>
        </div>
      </div>

      {/* Main View Mode Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 pt-3 rounded-2xl shadow-2xs overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('results');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'results'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Rekap & Hasil Skor KPI (Result KPI)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700">
            {scopedList.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('forms');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'forms'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Daftar Formulir Penilaian (Appraisal Forms)</span>
        </button>
      </div>

      {/* KPI Result Statistics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {isManager ? 'Bawahan Dinilai' : 'Total Karyawan'}
            </span>
            <span className="text-xl font-black text-slate-900 leading-none block mt-1">
              {totalSubordinates}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {isManager ? `Dept. ${currentUser.departemen}` : 'Seluruh Dept'}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Rata Capaian KPI
            </span>
            <span className="text-xl font-black text-indigo-600 leading-none block mt-1">
              {avgKpiScore}%
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Hasil Input Indikator</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Rata Skor Akhir
            </span>
            <span className="text-xl font-black text-slate-900 leading-none block mt-1">
              {avgFinalScore}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Skala 1.00 - 5.00</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Predikat Kinerja
            </span>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                {countE} E
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">
                {countG} G
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800">
                {countM} M
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">
                {countU} U
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Sebaran Nilai</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-perf-emp"
              type="text"
              placeholder="Cari nama bawahan / karyawan atau email..."
              value={searchName}
              onChange={(e) => {
                setSearchName(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 focus:bg-white transition-all"
            />
            {searchName && (
              <button
                onClick={() => {
                  setSearchName('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-dashed border-slate-300 shrink-0"
              title="Reset semua filter pencarian"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          {/* Department Filter: Disabled for Manager, Editable for Super Admin */}
          {isSuperAdmin ? (
            <select
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
            >
              <option value="All">Semua Departemen (Lintas Hotel)</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          ) : isManager ? (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 border border-slate-200"
              title="Manager hanya dapat melihat bawahan dalam departemennya sendiri"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Dept: {currentUser.departemen}</span>
            </div>
          ) : null}

          <select
            value={filterYear}
            onChange={(e) => {
              setFilterYear(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
          >
            <option value="All">Semua Tahun</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
          >
            <option value="All">Semua Tipe</option>
            <option value="Mid-Year">Mid-Year</option>
            <option value="Year-End">Year-End</option>
          </select>

          <select
            value={filterGrade}
            onChange={(e) => {
              setFilterGrade(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
          >
            <option value="All">Semua Predikat</option>
            <option value="E">E - Excellent (&gt;= 4.50)</option>
            <option value="G">G - Great (3.50 - 4.49)</option>
            <option value="M">M - Meet (2.50 - 3.49)</option>
            <option value="U">U - Under (&lt; 2.50)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
          >
            <option value="All">Semua Status</option>
            <option value="Approved">Approved</option>
            <option value="Submitted">Submitted</option>
            <option value="On Check">On Check</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      {/* TAB CONTENT: 1. RESULT KPI VIEW (Default & Primary) */}
      {activeTab === 'results' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-xs text-slate-800">
                Tabel Hasil Capaian KPI & Rekap Skor Kinerja Bawahan
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Klik pada baris atau nama bawahan untuk melihat detail rincian inputan
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[920px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <SortableHeader
                    field="nama"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-5"
                  >
                    Karyawan / Bawahan
                  </SortableHeader>
                  <SortableHeader
                    field="departemen"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4"
                  >
                    Departemen & Jabatan
                  </SortableHeader>
                  <SortableHeader
                    field="periode"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4 text-center"
                  >
                    Periode
                  </SortableHeader>
                  <SortableHeader
                    field="kpiTotalScore"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4 text-center bg-indigo-50/50"
                  >
                    Skor Capaian KPI (%)
                  </SortableHeader>
                  <th className="py-3.5 px-3 text-center">Skala KPI (1-5)</th>
                  <th className="py-3.5 px-3 text-center">Sikap (45%)</th>
                  <th className="py-3.5 px-3 text-center">Disiplin (5%)</th>
                  <SortableHeader
                    field="finalGrandTotal"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4 text-center bg-emerald-50/50"
                  >
                    Skor Akhir & Grade
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
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Tidak ada data skor KPI bawahan yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedSubordinate(item)}
                      className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {item.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block">
                              {item.nama}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {item.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <DepartmentBadge department={item.departemen} size="sm" />
                        <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {item.role}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{item.periode}</span>
                        <span className="text-[10px] text-slate-500">{item.tipe}</span>
                      </td>

                      {/* Skor Capaian KPI (% Hasil Inputan) */}
                      <td className="py-4 px-4 text-center bg-indigo-50/20">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <span className="font-black text-sm">{item.kpiTotalScore}%</span>
                        </div>
                      </td>

                      {/* Skala KPI (1-5) */}
                      <td className="py-4 px-3 text-center font-bold text-slate-700">
                        {item.kpiTranslatedScore} / 5
                      </td>

                      {/* Sikap (45%) */}
                      <td className="py-4 px-3 text-center text-slate-700 font-medium">
                        {item.avgBehaviour.toFixed(2)}
                      </td>

                      {/* Disiplin (5%) */}
                      <td className="py-4 px-3 text-center text-slate-700 font-medium">
                        {item.complianceScore.toFixed(1)}
                      </td>

                      {/* Skor Akhir & Grade */}
                      <td className="py-4 px-4 text-center bg-emerald-50/20 whitespace-nowrap">
                        <span className="font-black text-slate-900 text-sm">
                          {item.finalGrandTotal.toFixed(2)}
                        </span>
                        <span
                          className={`ml-1.5 px-2 py-0.5 rounded text-[10px] font-black ${
                            item.finalGrade === 'E'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : item.finalGrade === 'G'
                              ? 'bg-blue-600 text-white'
                              : item.finalGrade === 'M'
                              ? 'bg-amber-500 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {item.finalGrade}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            item.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : item.status === 'On Check'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSubordinate(item);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition-all inline-flex items-center gap-1 border border-indigo-200/80 shadow-2xs"
                          title="Lihat rincian hasil inputan indikator KPI"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Rincian Inputan</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewAppraisal(item);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all inline-flex items-center gap-1 shadow-2xs"
                          title="Pratinjau Lembar Cetak A4"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>Cetak A4</span>
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
            totalItems={sortedList.length}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={[5, 10, 20, 50]}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(newCount) => {
              setItemsPerPage(newCount);
              setCurrentPage(1);
            }}
          />
        </div>
      ) : (
        /* TAB CONTENT: 2. APPRAISAL FORMS LIST VIEW */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-xs text-slate-800">
                Daftar Dokumen Formulir Appraisal (Edit / Penilaian Lengkap)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Klik "Buka Form" untuk mengedit nilai, umpan balik atasan, atau mengubah status
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <SortableHeader
                    field="periode"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-5"
                  >
                    Periode & Tipe
                  </SortableHeader>
                  <SortableHeader
                    field="nama"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4"
                  >
                    Karyawan
                  </SortableHeader>
                  <SortableHeader
                    field="departemen"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4"
                  >
                    Departemen
                  </SortableHeader>
                  <SortableHeader
                    field="kpiTotalScore"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4 text-center"
                  >
                    Capaian KPI
                  </SortableHeader>
                  <SortableHeader
                    field="finalGrandTotal"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    className="py-3.5 px-4 text-center"
                  >
                    Skor Akhir
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
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Belum ada formulir appraisal yang sesuai kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setActiveForm(item)}
                    >
                      <td className="py-4 px-5">
                        <span className="font-bold text-slate-900 block">{item.periode}</span>
                        <span className="text-[11px] text-slate-500">{item.tipe}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 block group-hover:text-indigo-600 transition-colors">
                          {item.nama}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{item.email}</span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <DepartmentBadge department={item.departemen} size="sm" />
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-indigo-600 text-sm">
                        {item.kpiTotalScore}%
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-black text-slate-900 text-sm">
                          {item.finalGrandTotal.toFixed(2)}
                        </span>
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 text-white">
                          {item.finalGrade}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            item.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : item.status === 'On Check'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewAppraisal(item);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition-all inline-flex items-center gap-1.5 border border-indigo-200/80 shadow-2xs"
                          title="Pratinjau Lembar Cetak A4 dan Cetak PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Pratinjau & Cetak A4</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveForm(item);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all inline-flex items-center gap-1 shadow-2xs"
                          title="Buka form untuk edit / lihat rincian"
                        >
                          <span>Buka Form</span>
                          <ChevronRight className="w-3.5 h-3.5" />
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
            totalItems={sortedList.length}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={[5, 10, 20, 50]}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(newCount) => {
              setItemsPerPage(newCount);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* MODAL: SUBORDINATE DETAILED KPI RESULT & INPUTS                         */}
      {/* ----------------------------------------------------------------------- */}
      {selectedSubordinate && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedSubordinate(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] cursor-default"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400/40 text-indigo-300 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                    Hasil Inputan Capaian KPI • {selectedSubordinate.departemen}
                  </span>
                  <h3 className="text-base font-bold text-white truncate max-w-md">
                    {selectedSubordinate.nama} ({selectedSubordinate.periode} {selectedSubordinate.tipe})
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedSubordinate(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Scorecard Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase block">
                    Capaian KPI (50%)
                  </span>
                  <span className="text-xl font-black text-indigo-900 block mt-1">
                    {selectedSubordinate.kpiTotalScore}%
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Skala: {selectedSubordinate.kpiTranslatedScore} / 5
                  </span>
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-sky-700 uppercase block">
                    Sikap (45%)
                  </span>
                  <span className="text-xl font-black text-sky-900 block mt-1">
                    {selectedSubordinate.avgBehaviour.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">dari 5.00</span>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                    Disiplin (5%)
                  </span>
                  <span className="text-xl font-black text-emerald-900 block mt-1">
                    {selectedSubordinate.complianceScore.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">dari 5.00</span>
                </div>

                <div className="p-3 bg-slate-900 text-white rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase block">
                    Skor Akhir & Grade
                  </span>
                  <span className="text-xl font-black text-white block mt-1">
                    {selectedSubordinate.finalGrandTotal.toFixed(2)}
                  </span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white uppercase">
                    Predikat: {selectedSubordinate.finalGrade}
                  </span>
                </div>
              </div>

              {/* Subordinate Information Pill */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-slate-500">Jabatan / Role: </span>
                  <strong className="text-slate-900 uppercase">{selectedSubordinate.role}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Email: </span>
                  <strong className="font-mono text-slate-700">{selectedSubordinate.email}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Status Evaluasi: </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {selectedSubordinate.status}
                  </span>
                </div>
              </div>

              {/* Breakdown of Inputted KPI Rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Rincian Sasaran & Hasil Inputan Capaian Aktual KPI
                  </h4>
                  <span className="text-[11px] font-bold text-indigo-600">
                    Total Capaian: {selectedSubordinate.kpiTotalScore}%
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs min-w-[650px]">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Pilar & Objektif</th>
                        <th className="py-2.5 px-2 text-center">Bobot</th>
                        <th className="py-2.5 px-3">Target Standar</th>
                        <th className="py-2.5 px-3 bg-emerald-50 text-emerald-900">
                          Hasil Aktual (Inputan)
                        </th>
                        <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-900">
                          Tercapai
                        </th>
                        <th className="py-2.5 px-2 text-center">Skor %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSubordinate.kpis.map((kpi, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 max-w-[200px]">
                            <strong className="text-slate-900 block">{kpi.pillar}</strong>
                            <p className="text-[11px] text-slate-500 mt-0.5">{kpi.objective}</p>
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-700 bg-slate-50/40">
                            {kpi.weight}%
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-[180px]">
                            {kpi.target}
                          </td>
                          <td className="py-3 px-3 bg-emerald-50/40 font-medium text-emerald-950">
                            {kpi.actual ? (
                              <span>{kpi.actual}</span>
                            ) : (
                              <span className="text-slate-400 italic">Belum ada input</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {kpi.achieved_yn === 'Yes' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" />
                                Yes
                              </span>
                            ) : kpi.achieved_yn === 'No' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <X className="w-3 h-3" />
                                No
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center font-black text-indigo-700 text-sm">
                            {kpi.achieved_pct || 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Feedback & Qualitative Notes */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Ulasan Kualitatif & Umpan Balik Atasan
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">
                      Pencapaian Terbaik Bawahan:
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      {selectedSubordinate.starBest || 'Tidak ada catatan.'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">
                      Tantangan yang Dihadapi:
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      {selectedSubordinate.starChallenge || 'Tidak ada catatan.'}
                    </p>
                  </div>
                </div>

                {selectedSubordinate.managerFeedback && (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs">
                    <span className="font-bold text-amber-900 block mb-1">
                      Umpan Balik Manajer / HOD:
                    </span>
                    <p className="text-amber-900 leading-relaxed font-medium">
                      "{selectedSubordinate.managerFeedback}"
                    </p>
                  </div>
                )}

                {selectedSubordinate.hrRecommendation && (
                  <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <span className="text-indigo-600 font-bold block">Rekomendasi HR:</span>
                      <strong className="text-indigo-950 font-bold">
                        {selectedSubordinate.hrRecommendation}
                      </strong>
                    </div>
                    {selectedSubordinate.hrNote && (
                      <div className="text-right max-w-xs">
                        <span className="text-slate-400 text-[10px] block">Catatan HR:</span>
                        <span className="text-slate-600">{selectedSubordinate.hrNote}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSubordinate(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveForm(selectedSubordinate);
                    setSelectedSubordinate(null);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Buka Form Lengkap
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewAppraisal(selectedSubordinate);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak A4 / PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal for List View */}
      {previewAppraisal && (
        <AppraisalPrintModal
          appraisal={previewAppraisal}
          onClose={() => setPreviewAppraisal(null)}
        />
      )}
    </div>
  );
};
