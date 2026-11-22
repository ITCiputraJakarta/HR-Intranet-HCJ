import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Save,
  RotateCcw,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  CareerCmsContent,
  CareerJobPosting,
  CareerApplication,
  User,
} from '../types';
import {
  getCareerCmsContent,
  saveCareerCmsContent,
  getCareerJobs,
  saveCareerJobs,
  addOrUpdateCareerJob,
  deleteCareerJob,
  getCareerApplications,
  updateApplicationStatus,
  deleteCareerApplication,
  subscribeToCareerJobs,
  subscribeToCareerApplications,
  DEFAULT_CAREER_CMS,
} from '../lib/cmsService';
import { getBackdropProps } from '../lib/modalHelper';
import { UnifiedLogo } from './common/UnifiedLogo';
import { sanitizeSafeUrl } from '../lib/security';
import { dataUrlToBlob, downloadFileFromDataUrl } from '../lib/fileCompressor';

interface CareerCmsAdminViewProps {
  currentUser: User;
  onPreviewPublicCareer?: () => void;
}

export const CareerCmsAdminView: React.FC<CareerCmsAdminViewProps> = ({
  currentUser,
  onPreviewPublicCareer,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'jobs' | 'applicants'>('jobs');
  const [cmsContent, setCmsContent] = useState<CareerCmsContent>(getCareerCmsContent());
  const [jobs, setJobs] = useState<CareerJobPosting[]>(getCareerJobs());
  const [applications, setApplications] = useState<CareerApplication[]>(getCareerApplications());

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Job Modal
  const [editingJob, setEditingJob] = useState<CareerJobPosting | null>(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobFormTitle, setJobFormTitle] = useState('');
  const [jobFormDept, setJobFormDept] = useState('Food & Beverage');
  const [jobFormExp, setJobFormExp] = useState('1 - 2 Tahun');
  const [jobFormDeadline, setJobFormDeadline] = useState('Terbuka');
  const [jobFormType, setJobFormType] = useState<'Full-time' | 'Kontrak' | 'Magang' | 'Daily Worker'>('Full-time');
  const [jobFormDesc, setJobFormDesc] = useState('');
  const [jobFormReqs, setJobFormReqs] = useState('');
  const [jobFormStatus, setJobFormStatus] = useState<'Open' | 'Closed'>('Open');

  // Applicant filters & preview modal
  const [applicantFilterDept, setApplicantFilterDept] = useState('All');
  const [applicantFilterStatus, setApplicantFilterStatus] = useState('All');
  const [applicantSearch, setApplicantSearch] = useState('');
  const [selectedApplicant, setSelectedApplicant] = useState<CareerApplication | null>(null);
  const [previewPdfModal, setPreviewPdfModal] = useState<CareerApplication | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  useEffect(() => {
    const rawData = previewPdfModal?.cvFileData;
    if (!rawData) {
      setPreviewBlobUrl(null);
      return;
    }
    const safeRemote = sanitizeSafeUrl(rawData, {
      allowDataImage: false,
      allowDataDocument: false,
      allowBlob: true,
      allowRelative: false,
    });
    if (safeRemote && !safeRemote.startsWith('data:')) {
      setPreviewBlobUrl(safeRemote);
      return;
    }
    if (rawData.startsWith('data:application/pdf')) {
      try {
        const blob = dataUrlToBlob(rawData);
        const objectUrl = URL.createObjectURL(blob);
        setPreviewBlobUrl(objectUrl);
        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      } catch {
        setPreviewBlobUrl(null);
        return;
      }
    }
    setPreviewBlobUrl(null);
  }, [previewPdfModal]);

  useEffect(() => {
    const unsubJobs = subscribeToCareerJobs((j) => setJobs(j));
    const unsubApps = subscribeToCareerApplications((a) => setApplications(a));
    return () => {
      unsubJobs();
      unsubApps();
    };
  }, []);

  const handleSaveContent = async () => {
    setIsSaving(true);
    await saveCareerCmsContent(cmsContent);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetContent = () => {
    setPendingConfirm({
      title: 'Kembalikan Konten Karir?',
      message: 'Kembalikan teks halaman karir ke pengaturan standar?',
      onConfirm: () => {
        setCmsContent(DEFAULT_CAREER_CMS);
        saveCareerCmsContent(DEFAULT_CAREER_CMS);
      },
    });
  };

  const handleOpenJobModal = (job?: CareerJobPosting) => {
    if (job) {
      setEditingJob(job);
      setJobFormTitle(job.title);
      setJobFormDept(job.department);
      setJobFormExp(job.experience);
      setJobFormDeadline(job.deadline);
      setJobFormType(job.jobType || 'Full-time');
      setJobFormDesc(job.description);
      setJobFormReqs(job.requirements?.join('\n') || '');
      setJobFormStatus(job.status);
    } else {
      setEditingJob(null);
      setJobFormTitle('');
      setJobFormDept('Food & Beverage');
      setJobFormExp('1 - 2 Tahun');
      setJobFormDeadline('Terbuka');
      setJobFormType('Full-time');
      setJobFormDesc('');
      setJobFormReqs('');
      setJobFormStatus('Open');
    }
    setIsJobModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobFormTitle.trim()) return;

    const reqArray = jobFormReqs
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    const jobToSave: CareerJobPosting = {
      id: editingJob ? editingJob.id : `job-${Date.now()}`,
      title: jobFormTitle.trim(),
      department: jobFormDept,
      experience: jobFormExp.trim(),
      deadline: jobFormDeadline.trim(),
      jobType: jobFormType,
      description: jobFormDesc.trim(),
      requirements: reqArray,
      status: jobFormStatus,
      createdAt: editingJob ? editingJob.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addOrUpdateCareerJob(jobToSave);
    setIsJobModalOpen(false);
  };

  const handleDeleteJob = (jobId: string) => {
    setPendingConfirm({
      title: 'Hapus Lowongan Kerja?',
      message: 'Hapus posisi lowongan kerja ini secara permanen?',
      onConfirm: async () => {
        await deleteCareerJob(jobId);
      },
    });
  };

  const handleToggleJobStatus = async (job: CareerJobPosting) => {
    const updated: CareerJobPosting = {
      ...job,
      status: job.status === 'Open' ? 'Closed' : 'Open',
      updatedAt: new Date().toISOString(),
    };
    await addOrUpdateCareerJob(updated);
  };

  const handleUpdateAppStatus = async (
    appId: string,
    status: 'Pending' | 'Reviewed' | 'Interview' | 'Rejected'
  ) => {
    await updateApplicationStatus(appId, status);
  };

  const handleDeleteApp = (appId: string) => {
    setPendingConfirm({
      title: 'Hapus Data Lamaran?',
      message: 'Hapus data lamaran pelamar ini beserta berkas CV PDF?',
      onConfirm: async () => {
        await deleteCareerApplication(appId);
        if (selectedApplicant?.id === appId) setSelectedApplicant(null);
        if (previewPdfModal?.id === appId) setPreviewPdfModal(null);
      },
    });
  };

  const handleDownloadCv = (app: CareerApplication) => {
    if (!app.cvFileData) {
      setFeedbackNotice('File CV tidak ditemukan pada data lamaran ini.');
      setTimeout(() => setFeedbackNotice(null), 4000);
      return;
    }
    const targetName = app.cvFileName || `CV_${app.fullName.replace(/\s+/g, '_')}.pdf`;
    downloadFileFromDataUrl(app.cvFileData, targetName);
  };

  // Filter applications
  const filteredApps = applications.filter((app) => {
    if (applicantFilterDept !== 'All' && app.department !== applicantFilterDept) {
      return false;
    }
    if (applicantFilterStatus !== 'All' && app.status !== applicantFilterStatus) {
      return false;
    }
    if (applicantSearch.trim()) {
      const q = applicantSearch.toLowerCase();
      const match =
        app.fullName.toLowerCase().includes(q) ||
        app.jobTitle.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        app.phone.includes(q);
      if (!match) return false;
    }
    return true;
  });

  const pendingCount = applications.filter((a) => a.status === 'Pending').length;

  return (
    <div className="space-y-5 text-xs">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-normal bg-orange-50 text-[#F48C06] border border-orange-200">
              CMS Karir & Rekrutmen HRD
            </span>
            <span className="text-slate-400 font-normal">
              Batas File CV Maksimal 1 MB (PDF)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-normal text-[#2F327D] tracking-tight">
            Kelola Lowongan Karir & Berkas Pelamar
          </h2>
          <p className="text-slate-500 font-normal mt-0.5">
            Atur postingan lowongan kerja, kualifikasi pelamar, serta unduh dan tinjau berkas CV (PDF 1MB) yang masuk secara terpusat.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onPreviewPublicCareer && (
            <button
              type="button"
              onClick={onPreviewPublicCareer}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:border-[#F48C06] font-normal text-slate-700 hover:text-[#F48C06] transition flex items-center gap-1.5 cursor-pointer bg-white"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Lihat Halaman Karir</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenJobModal()}
            className="px-4 py-2 rounded-xl bg-[#F48C06] hover:bg-[#e07f04] text-white font-normal shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Posting Lowongan Baru</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Pengaturan halaman Karir berhasil disimpan & disinkronkan ke Firebase.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-2xl gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('jobs')}
          className={`py-3 px-3.5 font-normal border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'jobs'
              ? 'border-[#F48C06] text-[#F48C06] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Lowongan Pekerjaan ({jobs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('applicants')}
          className={`py-3 px-3.5 font-normal border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'applicants'
              ? 'border-[#F48C06] text-[#F48C06] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Pelamar & CV ({applications.length})</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-normal">
              {pendingCount} Baru
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`py-3 px-3.5 font-normal border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'content'
              ? 'border-[#F48C06] text-[#F48C06] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Pengaturan Tampilan Halaman Karir</span>
        </button>
      </div>

      {/* Tab 1: POST CAREER (LOWONGAN PEKERJAAN) */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-b-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-normal text-[#2F327D]">
                Daftar Posisi Lowongan Aktif & Tertutup
              </h3>
              <p className="text-slate-500 font-normal">
                Posisi yang berstatus "Open" akan langsung muncul pada accordion halaman karir publik.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenJobModal()}
              className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#F48C06] border border-orange-200 font-normal flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Lowongan</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-normal">
                      {job.department}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-normal ${
                        job.status === 'Open'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {job.status === 'Open' ? '• Buka' : 'Ditutup'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Tipe: {job.jobType || 'Full-time'}
                    </span>
                  </div>

                  <h4 className="text-base font-normal text-[#2F327D]">
                    {job.title}
                  </h4>
                  <p className="text-slate-600 max-w-2xl font-normal leading-relaxed line-clamp-2">
                    {job.description}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span>Pengalaman: {job.experience}</span>
                    <span>•</span>
                    <span>Batas: {job.deadline}</span>
                    <span>•</span>
                    <span>
                      Pelamar:{' '}
                      {applications.filter((a) => a.jobId === job.id).length} orang
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleJobStatus(job)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-normal transition cursor-pointer ${
                      job.status === 'Open'
                        ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {job.status === 'Open' ? 'Tutup Lowongan' : 'Buka Lowongan'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenJobModal(job)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-[#F48C06] hover:border-[#F48C06] transition cursor-pointer"
                    title="Edit Posisi"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteJob(job.id)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 transition cursor-pointer"
                    title="Hapus Posisi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: APPLICANTS & CV REPOSITORY (MAX 1MB PDF) */}
      {activeTab === 'applicants' && (
        <div className="bg-white rounded-b-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-normal text-[#2F327D]">
                Daftar Pelamar Kerja & Berkas CV (Maksimal 1 MB PDF)
              </h3>
              <p className="text-slate-500 font-normal">
                Setiap pelamar mengirimkan form data diri lengkap serta berkas CV berformat PDF yang dibatasi 1MB.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-normal">
                Total Berkas CV Masuk: {applications.length}
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama pelamar, posisi, email..."
                value={applicantSearch}
                onChange={(e) => setApplicantSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Departemen:</span>
              <select
                value={applicantFilterDept}
                onChange={(e) => setApplicantFilterDept(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="All">Semua Departemen</option>
                <option value="Food & Beverage">Food & Beverage</option>
                <option value="Front Office">Front Office</option>
                <option value="Housekeeping">Housekeeping</option>
                <option value="Sales & Marketing">Sales & Marketing</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Engineering">Engineering</option>
                <option value="Accounting & Finance">Accounting & Finance</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Status:</span>
              <select
                value={applicantFilterStatus}
                onChange={(e) => setApplicantFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="All">Semua Status</option>
                <option value="Pending">Pending (Belum Diulas)</option>
                <option value="Reviewed">Direview</option>
                <option value="Interview">Wawancara</option>
                <option value="Rejected">Ditolak</option>
              </select>
            </div>
          </div>

          {/* Applicants Table */}
          {filteredApps.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
              <p>Belum ada pelamar yang cocok dengan kriteria pencarian.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-normal">
                    <th className="p-3">Nama Pelamar</th>
                    <th className="p-3">Posisi Dilamar</th>
                    <th className="p-3">Kontak & Domisili</th>
                    <th className="p-3">Berkas CV (PDF ≤ 1MB)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3">
                        <p className="font-normal text-[#2F327D]">{app.fullName}</p>
                        <p className="text-[11px] text-slate-400">
                          Pendidikan: {app.education || '-'} • {app.submittedAt?.slice(0, 10)}
                        </p>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-orange-50 text-[#F48C06] border border-orange-200 font-normal block w-fit mb-0.5">
                          {app.department}
                        </span>
                        <p className="font-normal text-slate-700">{app.jobTitle}</p>
                      </td>
                      <td className="p-3 text-[11px]">
                        <p className="text-slate-700 font-normal">{app.email}</p>
                        <p className="text-slate-500">{app.phone} • {app.domisili}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewPdfModal(app)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:border-[#F48C06] text-slate-600 hover:text-[#F48C06] transition flex items-center gap-1 cursor-pointer bg-white"
                            title="Pratinjau CV"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#F48C06]" />
                            <span className="text-[11px] truncate max-w-[110px]">
                              {app.cvFileName || 'CV.pdf'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadCv(app)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                            title="Unduh Berkas PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {app.cvFileSize ? (app.cvFileSize / 1024).toFixed(0) : '0'} KB (Maks 1MB)
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          value={app.status}
                          onChange={(e) =>
                            handleUpdateAppStatus(
                              app.id,
                              e.target.value as 'Pending' | 'Reviewed' | 'Interview' | 'Rejected'
                            )
                          }
                          className={`px-2 py-1 rounded-lg border text-[11px] font-normal cursor-pointer ${
                            app.status === 'Interview'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : app.status === 'Reviewed'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : app.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Reviewed">Direview</option>
                          <option value="Interview">Wawancara</option>
                          <option value="Rejected">Ditolak</option>
                        </select>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteApp(app.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Hapus data pelamar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: CAREER PAGE CONTENT SETTINGS */}
      {activeTab === 'content' && (
        <div className="bg-white rounded-b-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-normal text-[#2F327D]">
                Teks & Visual Halaman Karir Publik
              </h3>
              <p className="text-slate-500 font-normal">
                Sesuaikan headline hero banner, gambar latar, 4 kartu budaya kerja, dan kontak HRD.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResetContent}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-normal text-slate-600 transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={handleSaveContent}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-xl bg-[#F48C06] hover:bg-[#e07f04] text-white font-normal shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Tampilan</span>
              </button>
            </div>
          </div>

          {/* Unified Logo Synchronization Banner */}
          <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <UnifiedLogo size="md" />
              <div>
                <span className="text-xs font-bold text-[#2F327D] block">
                  Logo Resmi Portal & Halaman Karir
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Satu pengaturan terpusat di CMS Utama. Otomatis tampil seragam di header dan footer karir publik.
                </span>
              </div>
            </div>
            <span className="text-[10px] text-[#F48C06] font-semibold bg-white px-2.5 py-1 rounded-full border border-orange-200 shrink-0 w-fit">
              Tersinkronisasi Otomatis
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-normal mb-1">
                  Judul Hero Karir
                </label>
                <input
                  type="text"
                  value={cmsContent.heroTitle}
                  onChange={(e) =>
                    setCmsContent({ ...cmsContent, heroTitle: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  placeholder="JOIN OUR TEAM"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-normal mb-1">
                  URL Gambar Latar Hero
                </label>
                <input
                  type="text"
                  value={cmsContent.heroBgUrl}
                  onChange={(e) =>
                    setCmsContent({ ...cmsContent, heroBgUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-[11px]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-normal">
                  Deskripsi Narasi Hero
                </label>
                <span className={`text-[11px] font-normal ${cmsContent.heroSubtitle.length >= 480 ? 'text-rose-600' : 'text-slate-400'}`}>
                  Maks. 500 karakter • {cmsContent.heroSubtitle.length}/500
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={500}
                value={cmsContent.heroSubtitle}
                onChange={(e) =>
                  setCmsContent({ ...cmsContent, heroSubtitle: e.target.value })
                }
                placeholder="Narasi pembuka halaman karir..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl resize-y min-h-[75px] focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-normal text-[#2F327D] mb-3">
                4 Kartu Manfaat & Budaya Kami
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cmsContent.benefits.map((b, idx) => (
                  <div
                    key={b.id || idx}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                  >
                    <span className="text-[10px] font-normal uppercase text-[#F48C06] block">
                      Manfaat #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={b.title}
                      onChange={(e) => {
                        const copy = [...cmsContent.benefits];
                        copy[idx] = { ...copy[idx], title: e.target.value };
                        setCmsContent({ ...cmsContent, benefits: copy });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      placeholder="Judul Manfaat"
                    />
                    <div className="space-y-0.5">
                      <div className="flex justify-end">
                        <span className="text-[10px] text-slate-400 font-normal">
                          Maks. 300 • {b.description.length}/300
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={300}
                        value={b.description}
                        onChange={(e) => {
                          const copy = [...cmsContent.benefits];
                          copy[idx] = { ...copy[idx], description: e.target.value };
                          setCmsContent({ ...cmsContent, benefits: copy });
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white resize-y min-h-[65px]"
                        placeholder="Deskripsi Manfaat"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-normal mb-1">
                  Email Kontak HRD
                </label>
                <input
                  type="email"
                  value={cmsContent.contactEmail}
                  onChange={(e) =>
                    setCmsContent({ ...cmsContent, contactEmail: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-normal mb-1">
                  Telepon Kontak
                </label>
                <input
                  type="text"
                  value={cmsContent.contactPhone}
                  onChange={(e) =>
                    setCmsContent({ ...cmsContent, contactPhone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-normal mb-1">
                  Alamat Hotel
                </label>
                <input
                  type="text"
                  value={cmsContent.contactAddress}
                  onChange={(e) =>
                    setCmsContent({ ...cmsContent, contactAddress: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: POST / EDIT JOB OPENING */}
      {isJobModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
          {...getBackdropProps(() => {
            setIsJobModalOpen(false);
            setEditingJob(null);
          })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-normal text-[#2F327D]">
                {editingJob ? 'Edit Lowongan Pekerjaan' : 'Tambah Lowongan Pekerjaan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsJobModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="p-5 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-700 font-normal mb-1">
                  Judul Posisi Lowongan *
                </label>
                <input
                  type="text"
                  required
                  value={jobFormTitle}
                  onChange={(e) => setJobFormTitle(e.target.value)}
                  placeholder="Contoh: Barista, Duty Manager, Guest Relation Officer"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Departemen *
                  </label>
                  <select
                    value={jobFormDept}
                    onChange={(e) => setJobFormDept(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Front Office">Front Office</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Sales & Marketing">Sales & Marketing</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Accounting & Finance">Accounting & Finance</option>
                    <option value="General & IT">General & IT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Tipe Pekerjaan *
                  </label>
                  <select
                    value={jobFormType}
                    onChange={(e) => setJobFormType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Kontrak">Kontrak</option>
                    <option value="Magang">Magang / Internship</option>
                    <option value="Daily Worker">Daily Worker</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Pengalaman Kerja *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobFormExp}
                    onChange={(e) => setJobFormExp(e.target.value)}
                    placeholder="Fresh Graduate / 1 - 2 Tahun / Min. 3 Tahun"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-normal mb-1">
                    Batas Waktu Lamaran *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobFormDeadline}
                    onChange={(e) => setJobFormDeadline(e.target.value)}
                    placeholder="Contoh: Terbuka / 30 Nov 2026"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-normal">
                    Deskripsi Singkat Tanggung Jawab *
                  </label>
                  <span className={`text-[11px] font-normal ${jobFormDesc.length >= 950 ? 'text-rose-600' : 'text-slate-400'}`}>
                    Maks. 1.000 karakter • {jobFormDesc.length}/1000
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  required
                  value={jobFormDesc}
                  onChange={(e) => setJobFormDesc(e.target.value)}
                  placeholder="Ringkasan tugas utama pekerjaan ini..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl resize-y min-h-[80px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-normal">
                    Persyaratan / Kualifikasi (1 baris per poin)
                  </label>
                  <span className={`text-[11px] font-normal ${jobFormReqs.length >= 1450 ? 'text-rose-600' : 'text-slate-400'}`}>
                    Maks. 1.500 karakter • {jobFormReqs.length}/1500
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1500}
                  value={jobFormReqs}
                  onChange={(e) => setJobFormReqs(e.target.value)}
                  placeholder="Pendidikan min. D3 Perhotelan&#10;Pengalaman min. 1 tahun di posisi yang sama&#10;Bahasa Inggris aktif"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl resize-y min-h-[110px] font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  💡 Kolom dapat ditarik ke bawah untuk melihat teks panjang.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-normal mb-1">
                  Status Penerimaan
                </label>
                <select
                  value={jobFormStatus}
                  onChange={(e) => setJobFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="Open">Buka (Tampilkan di Portal Karir)</option>
                  <option value="Closed">Ditutup (Sembunyikan dari Publik)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#F48C06] text-white hover:bg-[#e07f04] shadow-sm cursor-pointer"
                >
                  Simpan Lowongan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW CV PDF (MAX 1MB) */}
      {previewPdfModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          {...getBackdropProps(() => setPreviewPdfModal(null))}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-3xl h-[85vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-[#F48C06] shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-normal text-[#2F327D] text-sm truncate">
                    CV: {previewPdfModal.fullName} ({previewPdfModal.jobTitle})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    File: {previewPdfModal.cvFileName} •{' '}
                    {(previewPdfModal.cvFileSize / 1024).toFixed(1)} KB (Maks 1MB)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadCv(previewPdfModal)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-normal text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewPdfModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PDF Embed viewer */}
            <div className="flex-1 bg-slate-100 relative">
              {previewBlobUrl ? (
                <iframe
                  src={previewBlobUrl}
                  title={`CV ${previewPdfModal.fullName}`}
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  Data berkas PDF tidak valid atau tidak tersedia
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {pendingConfirm && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          {...getBackdropProps(() => setPendingConfirm(null))}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{pendingConfirm.title}</h3>
              <p className="text-xs text-slate-600 mt-1">{pendingConfirm.message}</p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const fn = pendingConfirm.onConfirm;
                  setPendingConfirm(null);
                  await fn();
                }}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {feedbackNotice && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-rose-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}
    </div>
  );
};
