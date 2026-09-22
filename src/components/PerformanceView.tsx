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
  Eye
} from 'lucide-react';
import { PerformanceAppraisal, User, KPIRowItem, KPIMasterItem } from '../types';
import { savePerformanceItem, getDepartments } from '../lib/storage';
import { AppraisalPrintModal } from './AppraisalPrintModal';
import { DepartmentBadge } from '../lib/departmentColors';

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
  const [activeForm, setActiveForm] = useState<PerformanceAppraisal | null>(null);
  const [previewAppraisal, setPreviewAppraisal] = useState<PerformanceAppraisal | null>(null);
  const [searchName, setSearchName] = useState('');
  const [filterYear, setFilterYear] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const isStaff = currentUser.role === 'staff' || currentUser.role === 'spv';
  const isHod = currentUser.role === 'hod';
  const isAdmin = currentUser.role === 'admin';

  const safePerformances = performances || [];
  const safeKpiMaster = kpiMaster || [];

  // Filter list
  let list = [...safePerformances];
  if (isStaff) {
    list = list.filter((p) => p.email.toLowerCase() === currentUser.email.toLowerCase());
  } else if (isHod) {
    list = list.filter((p) => p.departemen === currentUser.departemen);
  } else if (filterDept !== 'All') {
    list = list.filter((p) => p.departemen === filterDept);
  }

  if (filterYear !== 'All') {
    list = list.filter((p) => String(p.periode) === filterYear);
  }
  if (filterType !== 'All') {
    list = list.filter((p) => p.tipe === filterType);
  }
  if (filterStatus !== 'All') {
    list = list.filter((p) => p.status === filterStatus);
  }
  if (searchName.trim()) {
    const q = searchName.toLowerCase();
    list = list.filter((p) => p.nama.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  }

  // Create new Form
  const handleOpenNewForm = () => {
    // Find active KPIs for this user's department and role
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
    // 1. KPI Calculation
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

    // Scale 1 - 5
    let trans = 1;
    if (kpiSum >= 96) trans = 5;
    else if (kpiSum >= 90) trans = 4;
    else if (kpiSum >= 85) trans = 3;
    else if (kpiSum >= 75) trans = 2;
    form.kpiTranslatedScore = trans;

    // 2. Behaviour (7 competencies)
    const bValues = Object.values(form.behaviourScores);
    const bAvg = bValues.reduce((a, b) => a + b, 0) / (bValues.length || 7);
    form.avgBehaviour = Number(bAvg.toFixed(2));

    // 3. Formula: 50% KPI + 45% Behaviour + 5% Compliance
    const wKpi = trans * 0.5;
    const wBeh = bAvg * 0.45;
    const wComp = form.complianceScore * 0.05;
    const grand = Number((wKpi + wBeh + wComp).toFixed(2));
    form.finalGrandTotal = grand;

    // Grade assignment
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

  // If in Form View
  if (activeForm) {
    const isOwner = activeForm.email === currentUser.email;
    const canScore =
      isAdmin ||
      (!isOwner &&
        (currentUser.role === 'manager' ||
          currentUser.role === 'hod' ||
          currentUser.role === 'spv'));
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
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Pilar & Indikator Objektif</th>
                    <th className="py-3 px-3 text-center">Bobot</th>
                    <th className="py-3 px-4">Target Standard</th>
                    <th className="py-3 px-4 bg-emerald-50 text-emerald-900">Hasil Aktual</th>
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
                      <td className="py-2.5 px-3">
                        <textarea
                          rows={2}
                          disabled={!canEditSelf && !canScore}
                          value={kpi.actual || ''}
                          onChange={(e) => handleKpiChange(idx, 'actual', e.target.value)}
                          placeholder="Ketik pencapaian aktual karyawan..."
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
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

          {/* Section 2: Core Behaviour & Leadership (45%) */}
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
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  A. Perilaku Inti (Core)
                </h4>
                {[
                  { key: 'beh-1', label: '1. Integrity (Integritas & Kejujuran)' },
                  { key: 'beh-2', label: '2. Stewardship (Tanggung Jawab Asset)' },
                  { key: 'beh-3', label: '3. Achieving Results (Fokus Hasil Kerja)' },
                  { key: 'beh-4', label: '4. Personal Development (Kemauan Belajar)' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-700 font-medium">{item.label}</span>
                    <select
                      disabled={!canScore}
                      value={activeForm.behaviourScores[item.key] || 3}
                      onChange={(e) => handleBehaviourChange(item.key, Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-slate-300 font-bold bg-white text-xs"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  B. Kepemimpinan & Sikap (Leadership)
                </h4>
                {[
                  { key: 'beh-5', label: '5. Presence (Keteladanan & Kehadiran)' },
                  { key: 'beh-6', label: '6. Team Development (Dukungan Rekan Tim)' },
                  { key: 'beh-7', label: '7. Solutions (Inisiatif & Solutif)' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-700 font-medium">{item.label}</span>
                    <select
                      disabled={!canScore}
                      value={activeForm.behaviourScores[item.key] || 3}
                      onChange={(e) => handleBehaviourChange(item.key, Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-slate-300 font-bold bg-white text-xs"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Compliance & Discipline (5%) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Compliance & Kedisiplinan (Bobot 5%)
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200">
                Poin Disiplin: {activeForm.complianceScore.toFixed(1)} / 5.0
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-800">Catatan Sanksi & Surat Peringatan:</span>
                <p className="text-[11px] text-slate-500">
                  Apakah karyawan pernah menerima Surat Peringatan (SP) selama periode berjalan?
                </p>
              </div>
              <select
                disabled={!canScore}
                value={activeForm.complianceScore}
                onChange={(e) => {
                  const updated = { ...activeForm, complianceScore: Number(e.target.value) };
                  calculateGrandTotal(updated);
                  setActiveForm(updated);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold"
              >
                <option value={5}>Tidak Ada Sanksi (Skor 5.0)</option>
                <option value={4}>SP 1 (Skor 4.0)</option>
                <option value={3}>SP 2 (Skor 3.0)</option>
                <option value={2}>SP 3 / Skorsing (Skor 2.0)</option>
              </select>
            </div>
          </div>

          {/* Grand Total Summary Display */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="grid grid-cols-3 gap-4 text-center pb-6 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">KPI (50%)</span>
                <p className="text-xl font-bold text-amber-400 mt-1">
                  {(activeForm.kpiTranslatedScore * 0.5).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Sikap (45%)</span>
                <p className="text-xl font-bold text-sky-400 mt-1">
                  {(activeForm.avgBehaviour * 0.45).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Disiplin (5%)</span>
                <p className="text-xl font-bold text-rose-400 mt-1">
                  {(activeForm.complianceScore * 0.05).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="pt-6 text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                TOTAL SKOR AKHIR KINERJA
              </span>
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                {activeForm.finalGrandTotal.toFixed(2)}
                <span className="text-lg font-normal text-slate-400 ml-1">/ 5.00</span>
              </div>
              <div className="pt-2">
                <span
                  className={`inline-block px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider ${
                    activeForm.finalGrade === 'E'
                      ? 'bg-emerald-500 text-white'
                      : activeForm.finalGrade === 'G'
                      ? 'bg-blue-500 text-white'
                      : activeForm.finalGrade === 'M'
                      ? 'bg-amber-500 text-slate-900 font-bold'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  PREDIKAT:{' '}
                  {activeForm.finalGrade === 'E'
                    ? 'E - EXCELLENT'
                    : activeForm.finalGrade === 'G'
                    ? 'G - GREAT'
                    : activeForm.finalGrade === 'M'
                    ? 'M - MEET EXPECTATION'
                    : 'U - UNDER PERFORMANCE'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Self Review & Manager Feedback */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                4
              </span>
              <h3 className="font-bold text-slate-900 text-sm">
                Catatan Evaluasi, Ulasan STAR & Umpan Balik
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pencapaian Terbaik (Self Review)
                </label>
                <textarea
                  rows={3}
                  disabled={!canEditSelf && !isAdmin}
                  value={activeForm.starBest || ''}
                  onChange={(e) => setActiveForm({ ...activeForm, starBest: e.target.value })}
                  placeholder="Deskripsikan proyek atau keberhasilan utama Anda..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tantangan & Solusi yang Diterapkan
                </label>
                <textarea
                  rows={3}
                  disabled={!canEditSelf && !isAdmin}
                  value={activeForm.starChallenge || ''}
                  onChange={(e) =>
                    setActiveForm({ ...activeForm, starChallenge: e.target.value })
                  }
                  placeholder="Tantangan kerja dan bagaimana Anda mengatasinya..."
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
                onChange={(e) =>
                  setActiveForm({ ...activeForm, managerFeedback: e.target.value })
                }
                placeholder="Ketik ulasan dan catatan evaluasi kinerja karyawan secara langsung..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>

            {/* HR Recommendation */}
            {(isAdmin || currentUser.role === 'manager' || currentUser.role === 'hod') && (
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
                    disabled={!isAdmin}
                    value={activeForm.hrNote || ''}
                    onChange={(e) => setActiveForm({ ...activeForm, hrNote: e.target.value })}
                    placeholder="Contoh: Diajukan untuk sertifikasi perhotelan Q3..."
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

        {/* Print Modal for Active Form */}
        {previewAppraisal && (
          <AppraisalPrintModal
            appraisal={previewAppraisal}
            onClose={() => setPreviewAppraisal(null)}
          />
        )}
      </div>
    );
  }

  // List View of Appraisals
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Evaluasi Kinerja Karyawan (Performance Appraisal)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Sistem penilaian terstruktur berbobot KPI (50%), Sikap (45%), dan Disiplin (5%)
            </p>
          </div>
        </div>

        <button
          id="btn-new-appraisal"
          onClick={handleOpenNewForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Isi Form Baru</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-perf-emp"
            type="text"
            placeholder="Cari karyawan..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
          >
            <option value="All">Semua Tahun</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
          >
            <option value="All">Semua Tipe</option>
            <option value="Mid-Year">Mid-Year</option>
            <option value="Year-End">Year-End</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
          >
            <option value="All">Semua Status</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="On Check">On Check</option>
            <option value="Approved">Approved</option>
          </select>

          {!isStaff && (
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
            >
              <option value="All">Semua Departemen</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Periode</th>
                <th className="py-3.5 px-4">Karyawan</th>
                <th className="py-3.5 px-4">Departemen</th>
                <th className="py-3.5 px-4 text-center">Capaian KPI</th>
                <th className="py-3.5 px-4 text-center">Skor Akhir</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Belum ada formulir appraisal yang sesuai.
                  </td>
                </tr>
              ) : (
                list.map((item) => (
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
                      <span className="font-bold text-slate-900 block">{item.nama}</span>
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
      </div>

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
