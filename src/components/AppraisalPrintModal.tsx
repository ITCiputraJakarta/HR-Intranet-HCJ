import React, { useState } from 'react';
import {
  Printer,
  X,
  Building2,
  CheckCircle2,
  Info,
  Award,
  PenTool,
  QrCode,
  FileCheck
} from 'lucide-react';
import { PerformanceAppraisal } from '../types';
import { DepartmentBadge } from '../lib/departmentColors';

interface AppraisalPrintModalProps {
  appraisal: PerformanceAppraisal;
  onClose: () => void;
}

export const AppraisalPrintModal: React.FC<AppraisalPrintModalProps> = ({
  appraisal,
  onClose,
}) => {
  const [zoom, setZoom] = useState<'fit' | '85%' | '100%'>('fit');
  const [sigMode, setSigMode] = useState<'wet' | 'digital'>('wet');
  const [showTips, setShowTips] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  const getZoomClass = () => {
    switch (zoom) {
      case '100%':
        return 'scale-100';
      case '85%':
        return 'scale-85 origin-top';
      default:
        return 'scale-90 sm:scale-100 origin-top';
    }
  };

  const getPredicateLabel = (grade: string) => {
    switch (grade) {
      case 'E':
        return { code: 'E', title: 'EXCELLENT', desc: 'Melampaui Target (4.50 - 5.00)' };
      case 'G':
        return { code: 'G', title: 'GREAT', desc: 'Sangat Baik (3.75 - 4.49)' };
      case 'M':
        return { code: 'M', title: 'MEET EXPECTATION', desc: 'Sesuai Standar (3.00 - 3.74)' };
      default:
        return { code: 'U', title: 'UNDER PERFORMANCE', desc: 'Perlu Perbaikan (< 3.00)' };
    }
  };

  const predicate = getPredicateLabel(appraisal.finalGrade);

  const behaviourDetails = [
    { key: 'beh-1', name: 'Integrity', desc: 'Integritas, kejujuran & etika' },
    { key: 'beh-2', name: 'Stewardship', desc: 'Tanggung jawab aset & efisiensi' },
    { key: 'beh-3', name: 'Achieving Results', desc: 'Fokus target & mutu kerja' },
    { key: 'beh-4', name: 'Personal Dev.', desc: 'Kemauan belajar & inisiatif' },
    { key: 'beh-5', name: 'Presence', desc: 'Grooming, teladan & presensi' },
    { key: 'beh-6', name: 'Team Dev.', desc: 'Kerjasama tim & komunikasi' },
    { key: 'beh-7', name: 'Solutions', desc: 'Solutif, ramah & cepat tanggap' },
  ];

  const currentDateFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const docRegNumber = `HCJ/HRD-PA/${appraisal.periode}/${appraisal.id.replace('perf-', '').slice(0, 6).toUpperCase()}`;

  return (
    <div className="print-modal-overlay fixed inset-0 z-50 flex flex-col bg-slate-900/85 backdrop-blur-xs animate-in fade-in duration-150 overflow-hidden print:overflow-visible print:static print:h-auto print:bg-white print:p-0">
      
      {/* Top Floating Control Bar (Hidden when printing) */}
      <header className="no-print bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-white leading-tight">
                Pratinjau Cetak Evaluasi Kinerja (A4 Compact PDF)
              </h3>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                A4 Certified
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {appraisal.nama} • {appraisal.departemen} • {appraisal.periode} ({appraisal.tipe})
            </p>
          </div>
        </div>

        {/* Controls & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Signature Mode Toggle */}
          <div className="flex items-center bg-slate-800 rounded-xl p-0.5 text-[11px] border border-slate-700">
            <button
              onClick={() => setSigMode('wet')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-semibold transition-colors ${
                sigMode === 'wet' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
              title="Kolom tanda tangan basah manual dengan garis dan titimangsa"
            >
              <PenTool className="w-3 h-3" />
              <span>TTD Manual</span>
            </button>
            <button
              onClick={() => setSigMode('digital')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-semibold transition-colors ${
                sigMode === 'digital' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
              title="Tanda tangan dengan QR-Code verifikasi sistem portal"
            >
              <QrCode className="w-3 h-3" />
              <span>TTD Digital / QR</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="hidden md:flex items-center gap-1 bg-slate-800 rounded-xl p-0.5 text-[11px] border border-slate-700">
            <button
              onClick={() => setZoom('fit')}
              className={`px-2 py-1 rounded-lg font-semibold transition-colors ${
                zoom === 'fit' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Fit
            </button>
            <button
              onClick={() => setZoom('85%')}
              className={`px-2 py-1 rounded-lg font-semibold transition-colors ${
                zoom === '85%' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              85%
            </button>
            <button
              onClick={() => setZoom('100%')}
              className={`px-2 py-1 rounded-lg font-semibold transition-colors ${
                zoom === '100%' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              100%
            </button>
          </div>

          {/* Print PDF Trigger Button */}
          <button
            id="btn-print-appraisal-modal"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95"
            title="Cetak dokumen atau simpan sebagai PDF A4"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Tutup Pratinjau"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Helpful Print Tip Bar (Dismissible, Hidden on Print) */}
      {showTips && (
        <div className="no-print bg-indigo-950/90 border-b border-indigo-800/80 px-4 py-1.5 text-[11px] text-indigo-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              <strong>Petunjuk Cetak PDF A4:</strong> Pilih <em>Destination: Save as PDF</em>, Paper size <em>A4</em>, Margins <em>Default / Minimum</em>, dan pastikan centang <em>"Background graphics"</em> aktif.
            </span>
          </div>
          <button
            onClick={() => setShowTips(false)}
            className="text-indigo-400 hover:text-indigo-200 text-xs font-semibold ml-2 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Scrollable Preview Canvas Background */}
      <div
        onClick={onClose}
        className="flex-1 overflow-y-auto p-2 sm:p-6 bg-slate-950/70 flex justify-center items-start print:p-0 print:bg-white print:overflow-visible cursor-pointer"
      >
        
        {/* ========================================================================= */}
        {/* A4 PRINTABLE DOCUMENT CONTAINER                                            */}
        {/* Dimensions tuned for exact standard A4 portrait (210mm x 297mm)          */}
        {/* Compact padding & tight typography ensuring zero vertical spillover       */}
        {/* ========================================================================= */}
        <div
          id="appraisal-print-document"
          onClick={(e) => e.stopPropagation()}
          className={`bg-white text-slate-900 w-full max-w-[794px] p-5 sm:p-7 shadow-2xl rounded-sm border border-slate-300 print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full transition-transform ${getZoomClass()} cursor-default`}
          style={{ boxSizing: 'border-box' }}
        >
          {/* 1. KOP SURAT RESMI HOTEL CIPUTRA JAKARTA */}
          <div className="border-b-2 border-slate-900 pb-2 mb-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 border border-amber-500/40">
                  <Building2 className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">
                    HOTEL CIPUTRA JAKARTA
                  </h1>
                  <p className="text-[9.5px] sm:text-[10px] font-bold tracking-widest text-slate-700 uppercase mt-0.5">
                    HUMAN RESOURCES DEPARTMENT • PERFORMANCE MANAGEMENT SYSTEM
                  </p>
                  <p className="text-[8.5px] text-slate-500">
                    Jl. Letjen S. Parman No.11, Grogol, Jakarta Barat 11470 • Telp: (021) 566-0640 • www.hotelciputra.com
                  </p>
                </div>
              </div>

              {/* Document Reference Box */}
              <div className="text-right shrink-0">
                <div className="inline-block border border-slate-800 px-2 py-0.5 text-[8.5px] text-slate-800 bg-slate-50 font-mono leading-tight text-left">
                  <div>NO: <strong>{docRegNumber}</strong></div>
                  <div>KLASIFIKASI: <strong>RAHASIA / CONFIDENTIAL</strong></div>
                  <div>TGL CETAK: <strong>{currentDateFormatted}</strong></div>
                </div>
              </div>
            </div>

            {/* Sub-header Banner */}
            <div className="mt-1.5 pt-1 border-t border-slate-300 flex items-center justify-between text-[10px]">
              <span className="font-extrabold uppercase tracking-wide text-slate-900">
                FORMULIR PENILAIAN EVALUASI KINERJA KARYAWAN (PERFORMANCE APPRAISAL)
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[9px] font-extrabold uppercase tracking-wider">
                STATUS: {appraisal.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* 2. IDENTITAS KARYAWAN (COMPACT GRID TABLE) */}
          <div className="mb-2 border border-slate-300 rounded overflow-hidden text-[10px]">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-slate-200 divide-x divide-slate-200">
                  <td className="w-1/6 bg-slate-100 px-2 py-1 font-bold text-slate-700">Nama Karyawan</td>
                  <td className="w-2/6 px-2 py-1 font-extrabold text-slate-900">{appraisal.nama}</td>
                  <td className="w-1/6 bg-slate-100 px-2 py-1 font-bold text-slate-700">Departemen</td>
                  <td className="w-2/6 px-2 py-1 font-bold text-slate-900">
                    <span className="inline-flex items-center gap-1">
                      <DepartmentBadge department={appraisal.departemen} size="sm" />
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-slate-200 divide-x divide-slate-200">
                  <td className="bg-slate-100 px-2 py-1 font-bold text-slate-700">Jabatan / Role</td>
                  <td className="px-2 py-1 font-bold text-slate-800 uppercase">{appraisal.role}</td>
                  <td className="bg-slate-100 px-2 py-1 font-bold text-slate-700">Periode Penilaian</td>
                  <td className="px-2 py-1 font-bold text-slate-800">
                    Tahun {appraisal.periode} ({appraisal.tipe})
                  </td>
                </tr>
                <tr className="divide-x divide-slate-200">
                  <td className="bg-slate-100 px-2 py-1 font-bold text-slate-700">Email Akun</td>
                  <td className="px-2 py-1 text-slate-600 font-mono text-[9px]">{appraisal.email}</td>
                  <td className="bg-slate-100 px-2 py-1 font-bold text-slate-700">Tanggal Pengajuan</td>
                  <td className="px-2 py-1 text-slate-700">
                    {new Date(appraisal.updatedAt || appraisal.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3. RINGKASAN REKAPITULASI SKOR & PREDIKAT (COMPACT OFFICIAL SUMMARY) */}
          <div className="mb-2 border-2 border-slate-800 rounded bg-slate-50 p-2">
            <div className="grid grid-cols-4 gap-1.5 text-center divide-x divide-slate-300">
              {/* Pillar 1: KPI */}
              <div className="px-1">
                <span className="text-[8.5px] font-bold text-slate-500 uppercase block">1. KPI (Bobot 50%)</span>
                <span className="text-xs font-black text-slate-900 block leading-tight">
                  {appraisal.kpiTranslatedScore.toFixed(2)} / 5.0
                </span>
                <span className="text-[8.5px] text-slate-600 font-medium block">
                  Capaian {appraisal.kpiTotalScore}% &rarr; Bobot: <strong>{(appraisal.kpiTranslatedScore * 0.5).toFixed(2)}</strong>
                </span>
              </div>

              {/* Pillar 2: Sikap Kerja */}
              <div className="px-1">
                <span className="text-[8.5px] font-bold text-slate-500 uppercase block">2. Sikap Kerja (45%)</span>
                <span className="text-xs font-black text-slate-900 block leading-tight">
                  {appraisal.avgBehaviour.toFixed(2)} / 5.0
                </span>
                <span className="text-[8.5px] text-slate-600 font-medium block">
                  Rata-rata 7 aspek &rarr; Bobot: <strong>{(appraisal.avgBehaviour * 0.45).toFixed(2)}</strong>
                </span>
              </div>

              {/* Pillar 3: Disiplin */}
              <div className="px-1">
                <span className="text-[8.5px] font-bold text-slate-500 uppercase block">3. Disiplin (5%)</span>
                <span className="text-xs font-black text-slate-900 block leading-tight">
                  {appraisal.complianceScore.toFixed(1)} / 5.0
                </span>
                <span className="text-[8.5px] text-slate-600 font-medium block">
                  Sanksi &rarr; Bobot: <strong>{(appraisal.complianceScore * 0.05).toFixed(2)}</strong>
                </span>
              </div>

              {/* Grand Total & Predicate */}
              <div className="px-1 bg-slate-900 text-white rounded p-1">
                <span className="text-[8.5px] font-bold text-slate-300 uppercase block">SKOR AKHIR</span>
                <span className="text-sm font-black text-amber-400 block leading-none">
                  {appraisal.finalGrandTotal.toFixed(2)} <span className="text-[9px] text-slate-300 font-normal">/ 5.00</span>
                </span>
                <span className="text-[9px] font-black text-white tracking-wider block mt-0.5">
                  PREDIKAT: {predicate.code} ({predicate.title})
                </span>
              </div>
            </div>
          </div>

          {/* 4. BAGIAN 1: TABEL INDIKATOR KPI (BOBOT 50%) */}
          <div className="mb-2">
            <div className="flex items-center justify-between pb-0.5 mb-1 border-b border-slate-400">
              <span className="font-extrabold text-[9.5px] uppercase tracking-wide text-slate-900">
                BAGIAN I: KEY PERFORMANCE INDICATORS (BOBOT 50%)
              </span>
              <span className="text-[8.5px] font-bold text-slate-600">
                Total Capaian: {appraisal.kpiTotalScore}% | Konversi Skala: {appraisal.kpiTranslatedScore}/5.0
              </span>
            </div>

            <table className="w-full text-[9px] border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                  <th className="border border-slate-300 py-0.5 px-1 text-center w-5">No</th>
                  <th className="border border-slate-300 py-0.5 px-1.5 text-left">Pilar & Indikator Sasaran Objektif</th>
                  <th className="border border-slate-300 py-0.5 px-1 text-center w-10">Bobot</th>
                  <th className="border border-slate-300 py-0.5 px-1.5 text-left">Target Standard</th>
                  <th className="border border-slate-300 py-0.5 px-1.5 text-left">Realisasi Aktual</th>
                  <th className="border border-slate-300 py-0.5 px-1 text-center w-10">Capai</th>
                  <th className="border border-slate-300 py-0.5 px-1 text-center w-12">Skor %</th>
                </tr>
              </thead>
              <tbody>
                {appraisal.kpis.map((k, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="border border-slate-300 py-0.5 px-1 text-center font-bold text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 py-0.5 px-1.5">
                      <strong className="text-slate-900 block">{k.pillar}</strong>
                      <span className="text-[8px] text-slate-600 block">{k.objective}</span>
                    </td>
                    <td className="border border-slate-300 py-0.5 px-1 text-center font-bold text-slate-700 bg-slate-50">
                      {k.weight}%
                    </td>
                    <td className="border border-slate-300 py-0.5 px-1.5 text-slate-700">{k.target}</td>
                    <td className="border border-slate-300 py-0.5 px-1.5 text-slate-800 font-medium">
                      {k.actual || '-'}
                    </td>
                    <td className="border border-slate-300 py-0.5 px-1 text-center font-bold">
                      <span className={k.achieved_yn === 'Yes' ? 'text-emerald-700' : 'text-rose-700'}>
                        {k.achieved_yn || '-'}
                      </span>
                    </td>
                    <td className="border border-slate-300 py-0.5 px-1 text-center font-black text-slate-900 bg-slate-50">
                      {k.achieved_pct || 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t border-slate-300 text-[9px]">
                  <td colSpan={2} className="border border-slate-300 py-0.5 px-1.5 text-right">
                    Total Bobot & Rata-rata Skor KPI:
                  </td>
                  <td className="border border-slate-300 py-0.5 px-1 text-center text-slate-900 font-black">
                    {appraisal.kpis.reduce((acc, curr) => acc + (curr.weight || 0), 0)}%
                  </td>
                  <td colSpan={3} className="border border-slate-300 py-0.5 px-1.5 text-right">
                    Total Nilai Pencapaian KPI:
                  </td>
                  <td className="border border-slate-300 py-0.5 px-1 text-center text-slate-900 font-black">
                    {appraisal.kpiTotalScore}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 5. BAGIAN 2 & 3: PERILAKU KERJA (45%) & KEDISIPLINAN (5%) COMPACT TWO COLUMNS */}
          <div className="mb-2 grid grid-cols-2 gap-2 text-[9px]">
            {/* 7 Behaviour competencies */}
            <div className="border border-slate-300 rounded p-1.5 bg-white">
              <div className="flex items-center justify-between pb-0.5 mb-1 border-b border-slate-200">
                <span className="font-extrabold text-[9px] uppercase text-slate-900">
                  BAGIAN II: PERILAKU & SIKAP (45%)
                </span>
                <span className="font-black text-slate-800">
                  Rata-rata: {appraisal.avgBehaviour.toFixed(2)} / 5.0
                </span>
              </div>
              <table className="w-full border-collapse">
                <tbody>
                  {behaviourDetails.map((b, i) => (
                    <tr key={b.key} className="border-b border-slate-100">
                      <td className="py-0.5 text-slate-700">
                        <strong>{i + 1}. {b.name}</strong> - <span className="text-[8px] text-slate-500">{b.desc}</span>
                      </td>
                      <td className="py-0.5 text-right font-black text-slate-900 w-8">
                        {appraisal.behaviourScores[b.key] || 3} / 5
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Compliance & HR Recommendations */}
            <div className="border border-slate-300 rounded p-1.5 bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-0.5 mb-1 border-b border-slate-200">
                  <span className="font-extrabold text-[9px] uppercase text-slate-900">
                    BAGIAN III: KEDISIPLINAN (5%)
                  </span>
                  <span className="font-black text-slate-800">
                    Skor: {appraisal.complianceScore.toFixed(1)} / 5.0
                  </span>
                </div>
                <div className="text-[8.5px] text-slate-700 space-y-1 mb-1.5">
                  <div className="flex items-center justify-between bg-slate-50 p-1 rounded border border-slate-200">
                    <span>Catatan Sanksi / Surat Peringatan:</span>
                    <strong className="text-slate-900">
                      {appraisal.complianceScore >= 5
                        ? 'Bebas Sanksi (Nir-Pelanggaran)'
                        : appraisal.complianceScore >= 4
                        ? 'Pernah SP 1'
                        : appraisal.complianceScore >= 3
                        ? 'Pernah SP 2'
                        : 'Pernah SP 3 / Skorsing'}
                    </strong>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-1">
                  <span className="font-extrabold text-[9px] uppercase text-slate-900 block mb-0.5">
                    REKOMENDASI HR & MANAJEMEN:
                  </span>
                  <div className="bg-slate-100 p-1 rounded border border-slate-300 text-[8.5px]">
                    <div>
                      Rekomendasi: <strong>{appraisal.hrRecommendation || 'Tetap di posisi saat ini (Maintain)'}</strong>
                    </div>
                    {appraisal.hrNote && (
                      <div className="text-slate-600 mt-0.5 italic">
                        Catatan: {appraisal.hrNote}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-1 text-[8px] text-slate-500 italic bg-amber-50/70 p-0.5 rounded border border-amber-200/60">
                Skala: 5 (Istimewa), 4 (Baik Sekali), 3 (Sesuai Standar), 2 (Kurang), 1 (Sangat Kurang).
              </div>
            </div>
          </div>

          {/* 6. CATATAN STAR & UMPAN BALIK ATASAN */}
          <div className="mb-2 border border-slate-300 rounded p-1.5 text-[8.5px] bg-slate-50/60">
            <span className="font-extrabold text-[9px] uppercase text-slate-900 block mb-0.5">
              BAGIAN IV: ULASAN & CATATAN EVALUASI KERJA
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white p-1 rounded border border-slate-200">
                <strong className="text-slate-800 block text-[8.5px]">Pencapaian Terbaik (Self Review):</strong>
                <p className="text-slate-600 mt-0.5 line-clamp-2 leading-tight">
                  {appraisal.starBest || 'Tidak ada catatan khusus.'}
                </p>
              </div>
              <div className="bg-white p-1 rounded border border-slate-200">
                <strong className="text-slate-800 block text-[8.5px]">Tantangan & Solusi:</strong>
                <p className="text-slate-600 mt-0.5 line-clamp-2 leading-tight">
                  {appraisal.starChallenge || 'Tidak ada catatan khusus.'}
                </p>
              </div>
            </div>
            {appraisal.managerFeedback && (
              <div className="mt-1 bg-white p-1 rounded border border-slate-200">
                <strong className="text-slate-800 block text-[8.5px]">Umpan Balik Atasan Langsung:</strong>
                <p className="text-slate-600 mt-0.5 line-clamp-2 leading-tight">
                  {appraisal.managerFeedback}
                </p>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 7. BAGIAN TANDA TANGAN RESMI 3-KOLOM (OFFICIAL SIGNATURE BLOCK)            */}
          {/* ========================================================================= */}
          <div className="border border-slate-400 rounded p-2 bg-white page-break-avoid">
            <div className="flex items-center justify-between text-[8.5px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 border-b border-slate-200 pb-1">
              <span>LEMBAR PENGESAHAN & PERNYATAAN EVALUASI KINERJA</span>
              <span className="text-slate-500 font-mono">Jakarta Barat, {currentDateFormatted}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[9px] text-center">
              {/* Column 1: Karyawan yang Dinilai */}
              <div className="flex flex-col justify-between border border-slate-200 rounded p-1.5 bg-slate-50/50 min-h-[95px]">
                <div>
                  <span className="text-[8px] text-slate-500 uppercase block">Mengetahui & Menyetujui,</span>
                  <strong className="text-slate-900 block text-[9.5px] mt-0.5">Karyawan yang Dinilai</strong>
                </div>

                {/* Signature blank space or digital stamp */}
                <div className="h-10 flex items-center justify-center my-1">
                  {sigMode === 'digital' ? (
                    <div className="border border-emerald-600/70 bg-emerald-50/60 rounded px-2 py-0.5 text-center">
                      <span className="text-[7.5px] font-black text-emerald-800 tracking-wider block uppercase">
                        VERIFIED BY INTRANET PORTAL
                      </span>
                      <span className="text-[6.5px] font-mono text-emerald-700 block">
                        E-SIGN: {appraisal.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[8px] text-slate-300 italic">Tanda Tangan Asli</span>
                  )}
                </div>

                <div>
                  <div className="border-b border-slate-800 mx-2 mb-0.5" />
                  <strong className="text-slate-900 text-[9.5px] block truncate">{appraisal.nama}</strong>
                  <span className="text-[8px] text-slate-500 block font-mono">Tgl: ____ / ____ / 2026</span>
                </div>
              </div>

              {/* Column 2: Atasan Langsung / Penilai */}
              <div className="flex flex-col justify-between border border-slate-200 rounded p-1.5 bg-slate-50/50 min-h-[95px]">
                <div>
                  <span className="text-[8px] text-slate-500 uppercase block">Dievaluasi & Dinilai oleh,</span>
                  <strong className="text-slate-900 block text-[9.5px] mt-0.5">Atasan Langsung / Penilai</strong>
                </div>

                {/* Signature blank space or digital stamp */}
                <div className="h-10 flex items-center justify-center my-1">
                  {sigMode === 'digital' ? (
                    <div className="border border-indigo-600/70 bg-indigo-50/60 rounded px-2 py-0.5 text-center">
                      <span className="text-[7.5px] font-black text-indigo-800 tracking-wider block uppercase">
                        SUPERVISOR APPROVED
                      </span>
                      <span className="text-[6.5px] font-mono text-indigo-700 block">
                        REG: HCJ-SPV-EVAL
                      </span>
                    </div>
                  ) : (
                    <span className="text-[8px] text-slate-300 italic">Tanda Tangan Asli</span>
                  )}
                </div>

                <div>
                  <div className="border-b border-slate-800 mx-2 mb-0.5" />
                  <strong className="text-slate-900 text-[9.5px] block">( Supervisor / Manager )</strong>
                  <span className="text-[8px] text-slate-500 block font-mono">Tgl: ____ / ____ / 2026</span>
                </div>
              </div>

              {/* Column 3: Head of Department / HR Director */}
              <div className="flex flex-col justify-between border border-slate-200 rounded p-1.5 bg-slate-50/50 min-h-[95px]">
                <div>
                  <span className="text-[8px] text-slate-500 uppercase block">Diverifikasi & Disahkan oleh,</span>
                  <strong className="text-slate-900 block text-[9.5px] mt-0.5">Head of Dept / HR Director</strong>
                </div>

                {/* Signature blank space or digital stamp with company stamp */}
                <div className="h-10 flex items-center justify-center my-1">
                  {sigMode === 'digital' ? (
                    <div className="border-2 border-indigo-700/80 bg-indigo-50 rounded-lg px-2 py-0.5 text-center shadow-xs">
                      <div className="text-[7.5px] font-black text-indigo-900 uppercase">
                        HOTEL CIPUTRA JAKARTA
                      </div>
                      <div className="text-[6.5px] font-bold text-amber-700 uppercase">
                        HRD VALIDATED • SAH
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 h-8 border border-dashed border-slate-300 rounded flex items-center justify-center text-[7px] text-slate-400">
                      Cap & TTD
                    </div>
                  )}
                </div>

                <div>
                  <div className="border-b border-slate-800 mx-2 mb-0.5" />
                  <strong className="text-slate-900 text-[9.5px] block">( HOD / HRD Manager )</strong>
                  <span className="text-[8px] text-slate-500 block font-mono">Tgl: ____ / ____ / 2026</span>
                </div>
              </div>
            </div>

            {/* Legal Notice Footer */}
            <div className="mt-1.5 pt-1 border-t border-slate-200 flex items-center justify-between text-[7.5px] text-slate-500">
              <span className="truncate">
                Arsip resmi terverifikasi Hotel Ciputra Jakarta. Dilarang menggandakan tanpa izin tertulis dari HRD.
              </span>
              <span className="font-mono shrink-0 ml-2 font-bold">
                Dokumen Sah A4 • Ref: {docRegNumber}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
