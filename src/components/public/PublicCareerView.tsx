import React, { useState, useEffect } from 'react';
import {
  Hotel,
  Briefcase,
  Users,
  ShieldCheck,
  GraduationCap,
  TrendingUp,
  ChevronDown,
  ArrowRight,
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Mail,
  Phone,
  Lock,
  ArrowLeft,
  Sparkles,
  Loader2,
  Search,
  Filter
} from 'lucide-react';
import {
  CareerCmsContent,
  CareerJobPosting,
  CareerApplication,
} from '../../types';
import {
  getCareerCmsContent,
  subscribeToCareerCms,
  getCareerJobs,
  subscribeToCareerJobs,
  validatePdfCv,
  readFileAsBase64,
  submitCareerApplication,
  MAX_PDF_BYTES,
} from '../../lib/cmsService';
import { getBackdropProps } from '../../lib/modalHelper';

interface PublicCareerViewProps {
  onNavigateToHome: () => void;
  onNavigateToLogin: () => void;
}

export const PublicCareerView: React.FC<PublicCareerViewProps> = ({
  onNavigateToHome,
  onNavigateToLogin,
}) => {
  const [cmsContent, setCmsContent] = useState<CareerCmsContent>(getCareerCmsContent());
  const [jobs, setJobs] = useState<CareerJobPosting[]>(getCareerJobs());
  const [openDepts, setOpenDepts] = useState<{ [dept: string]: boolean }>({
    'Food & Beverage': true,
  });

  // Modal State
  const [selectedJob, setSelectedJob] = useState<CareerJobPosting | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateDomisili, setCandidateDomisili] = useState('');
  const [candidateEducation, setCandidateEducation] = useState('S1');
  const [candidateNotes, setCandidateNotes] = useState('');

  // CV File & Validation
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    const unsubCms = subscribeToCareerCms((c) => setCmsContent(c));
    const unsubJobs = subscribeToCareerJobs((j) => setJobs(j));
    return () => {
      unsubCms();
      unsubJobs();
    };
  }, []);

  const toggleDept = (dept: string) => {
    setOpenDepts((prev) => ({
      ...prev,
      [dept]: !prev[dept],
    }));
  };

  // Search and Department Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');

  // Available unique departments from jobs
  const availableDepts = Array.from(new Set(jobs.map((j) => j.department))).filter(Boolean);

  // Group active filtered jobs by department
  const activeJobs = jobs.filter((j) => {
    if (j.status !== 'Open') return false;
    if (selectedDeptFilter !== 'All' && j.department !== selectedDeptFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = j.title.toLowerCase().includes(q);
      const matchDept = j.department.toLowerCase().includes(q);
      const matchDesc = j.description.toLowerCase().includes(q);
      const matchReqs = j.requirements?.some((r) => r.toLowerCase().includes(q));
      return matchTitle || matchDept || matchDesc || matchReqs;
    }
    return true;
  });

  const groupedJobs: Record<string, CareerJobPosting[]> = activeJobs.reduce((acc, job) => {
    const d = job.department || 'General';
    if (!acc[d]) acc[d] = [];
    acc[d].push(job);
    return acc;
  }, {} as Record<string, CareerJobPosting[]>);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCvError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const check = validatePdfCv(file);
      if (!check.valid) {
        setCvError(check.error || 'Berkas tidak valid');
        setCvFile(null);
        e.target.value = '';
        return;
      }
      setCvFile(file);
    }
  };

  const handleOpenModal = (job: CareerJobPosting) => {
    setSelectedJob(job);
    setCvFile(null);
    setCvError('');
    setGeneralError('');
    setSubmitSuccess(false);
  };

  const handleCloseModal = () => {
    setSelectedJob(null);
    setCvFile(null);
    setCvError('');
    setGeneralError('');
    setSubmitSuccess(false);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    if (!cvFile) {
      setCvError('Harap lampirkan berkas CV / Resume berformat PDF (maksimal 1 MB).');
      return;
    }

    const check = validatePdfCv(cvFile);
    if (!check.valid) {
      setCvError(check.error || 'Berkas tidak valid');
      return;
    }

    setIsSubmitting(true);
    setGeneralError('');

    try {
      const base64Data = await readFileAsBase64(cvFile);

      const application: CareerApplication = {
        id: `app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        jobId: selectedJob.id,
        jobTitle: selectedJob.title,
        department: selectedJob.department,
        fullName: candidateName.trim(),
        email: candidateEmail.trim(),
        phone: candidatePhone.trim(),
        domisili: candidateDomisili.trim(),
        education: candidateEducation,
        cvFileName: cvFile.name,
        cvFileType: cvFile.type || 'application/pdf',
        cvFileSize: cvFile.size,
        cvFileData: base64Data,
        notes: candidateNotes.trim() || undefined,
        status: 'Pending',
        submittedAt: new Date().toISOString(),
      };

      await submitCareerApplication(application);

      setIsSubmitting(false);
      setSubmitSuccess(true);

      // Reset form
      setCandidateName('');
      setCandidateEmail('');
      setCandidatePhone('');
      setCandidateDomisili('');
      setCandidateNotes('');
      setCvFile(null);

      setTimeout(() => {
        handleCloseModal();
      }, 3500);
    } catch (err: any) {
      setIsSubmitting(false);
      setGeneralError('Gagal mengirim lamaran. Silakan periksa koneksi dan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-[#696984] selection:bg-[#F48C06] selection:text-white flex flex-col justify-between">
      {/* 1. STICKY TOPBAR HEADER */}
      <header className="bg-white/95 backdrop-blur-md shadow-xs sticky top-0 z-40 border-b border-orange-200/60">
        {/* Top Gold Accent Line matching Beranda */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#F48C06] via-[#2F327D] to-[#65C2B4]" />
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between h-18 sm:h-20 gap-4">
          {/* Brand */}
          <div
            onClick={onNavigateToHome}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#F48C06] rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md shadow-[#F48C06]/20 group-hover:scale-105 transition-transform duration-300 shrink-0">
              <Hotel className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[#2F327D] font-bold brand-top-left-bold text-xl sm:text-2xl tracking-tight leading-none block">
                Hotel Ciputra
              </span>
              <span className="text-xs sm:text-sm font-normal text-[#696984]">
                Jakarta • Karir
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <button
              onClick={onNavigateToHome}
              className="text-[#696984] hover:text-[#F48C06] font-normal transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Beranda Utama</span>
            </button>
            <span className="text-[#F48C06] border-b-2 border-[#F48C06] pb-1 font-semibold">
              Lowongan Karir
            </span>
            <a
              href="#culture"
              className="text-[#696984] hover:text-[#F48C06] font-normal transition"
            >
              Budaya & Manfaat
            </a>
            <a
              href="#openings"
              className="text-[#696984] hover:text-[#F48C06] font-normal transition"
            >
              Daftar Posisi ({activeJobs.length})
            </a>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onNavigateToHome}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 text-xs sm:text-sm font-normal text-[#2F327D] hover:bg-slate-50 transition cursor-pointer"
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="bg-[#2F327D] hover:bg-[#1a1c4b] text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-normal shadow-md shadow-[#2F327D]/20 transition flex items-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[#F48C06]" />
              <span>Login Karyawan</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative bg-[#2F327D] text-white pt-20 sm:pt-28 pb-28 sm:pb-36 overflow-hidden">
        {/* Background Image Overlay with deep luxury navy tone */}
        <div className="absolute inset-0 z-0">
          <img
            src={cmsContent.heroBgUrl}
            alt="Hotel Lobby Background"
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#2F327D]/80 via-[#2F327D]/95 to-[#2F327D]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#F48C06] text-xs font-normal mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Peluang Pengembangan Karir Profesional</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight mb-5 leading-tight">
            {cmsContent.heroTitle}
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-slate-200/90 mb-8 sm:mb-10 max-w-2xl mx-auto font-normal leading-relaxed">
            {cmsContent.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="#openings"
              className="bg-[#F48C06] hover:bg-[#e07f04] text-white font-normal py-3 px-8 rounded-full transition duration-300 shadow-lg shadow-[#F48C06]/30 text-sm sm:text-base flex items-center justify-center gap-2"
            >
              <span>Lihat Lowongan Terbuka ({activeJobs.length})</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#culture"
              className="bg-transparent border border-white/40 hover:bg-white hover:text-[#2F327D] text-white font-normal py-3 px-8 rounded-full transition duration-300 text-sm sm:text-base flex items-center justify-center"
            >
              Budaya & Manfaat Kami
            </a>
          </div>
        </div>
      </section>

      {/* 3. BENEFITS & CULTURE SECTION */}
      <section className="py-20 sm:py-24 bg-white" id="culture">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
            {/* Left Title */}
            <div className="lg:w-1/3">
              <span className="text-xs font-normal text-[#F48C06] uppercase tracking-wider block mb-2">
                {cmsContent.benefitsTag}
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#2F327D] leading-tight mb-4 tracking-tight">
                {cmsContent.benefitsTitle}
              </h2>
              <p className="text-[#696984] text-sm sm:text-base leading-relaxed font-normal mb-6">
                {cmsContent.benefitsDescription}
              </p>
              <div className="p-4 rounded-2xl bg-[#FFF3E4] border border-[#F48C06]/20 text-xs text-[#2F327D] font-normal leading-relaxed">
                <span className="text-[#F48C06] font-semibold block mb-1">
                  Keluarga Besar Ciputra
                </span>
                Kami menjunjung tinggi integritas, profesionalisme, dan semangat kekeluargaan untuk menciptakan lingkungan kerja yang kondusif.
              </div>
            </div>

            {/* Right Side 4 Benefit Cards */}
            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {cmsContent.benefits.map((benefit, idx) => {
                const iconMap: Record<string, React.ReactNode> = {
                  users: <Users className="w-6 h-6 text-[#2F327D]" />,
                  shield: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
                  'graduation-cap': <GraduationCap className="w-6 h-6 text-purple-600" />,
                  'chart-line': <TrendingUp className="w-6 h-6 text-[#F48C06]" />,
                };
                const bgMap: Record<string, string> = {
                  blue: 'bg-indigo-50 border-indigo-100',
                  green: 'bg-emerald-50 border-emerald-100',
                  purple: 'bg-purple-50 border-purple-100',
                  orange: 'bg-orange-50 border-orange-100',
                };
                return (
                  <div
                    key={benefit.id || idx}
                    className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col hover:shadow-md transition-all duration-300"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${
                        bgMap[benefit.color] || 'bg-slate-100'
                      }`}
                    >
                      {iconMap[benefit.icon] || <Users className="w-6 h-6 text-[#2F327D]" />}
                    </div>
                    <h3 className="text-base sm:text-lg font-normal text-[#2F327D] mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-[#696984] text-xs sm:text-sm leading-relaxed font-normal">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 4. LOWONGAN TERSEDIA (JOB OPENINGS ACCORDION) */}
      <section className="py-20 sm:py-24 bg-slate-50/70 border-t border-slate-200/80" id="openings">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <span className="text-xs font-normal text-[#F48C06] uppercase tracking-wider block mb-2">
              {cmsContent.openingsTag}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#2F327D] mb-3 tracking-tight">
              {cmsContent.openingsTitle}
            </h2>
            <p className="text-[#696984] max-w-2xl mx-auto text-sm sm:text-base font-normal">
              {cmsContent.openingsSubtitle}
            </p>
          </div>

          {/* Interactive Search & Department Filter Chips */}
          <div className="mb-10 space-y-4">
            <div className="relative max-w-xl mx-auto">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari posisi lowongan (contoh: Chef, Waiter, Barista, Front Desk)..."
                className="w-full pl-11 pr-10 py-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F48C06] focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedDeptFilter('All')}
                className={`px-4 py-1.5 rounded-full text-xs font-normal transition-all cursor-pointer ${
                  selectedDeptFilter === 'All'
                    ? 'bg-[#F48C06] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-[#F48C06]'
                }`}
              >
                Semua Departemen ({jobs.filter((j) => j.status === 'Open').length})
              </button>

              {availableDepts.map((dept) => {
                const count = jobs.filter((j) => j.status === 'Open' && j.department === dept).length;
                const isSelected = selectedDeptFilter === dept;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDeptFilter(dept)}
                    className={`px-4 py-1.5 rounded-full text-xs font-normal transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2F327D] text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-[#2F327D]'
                    }`}
                  >
                    {dept} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Department Accordion List */}
          <div className="space-y-4">
            {Object.keys(groupedJobs).length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base text-[#2F327D] font-normal mb-1">
                  Saat ini belum ada posisi lowongan yang dibuka
                </h4>
                <p className="text-xs text-slate-400 font-normal">
                  Silakan periksa kembali di kemudian hari atau hubungi HRD Hotel Ciputra Jakarta.
                </p>
              </div>
            ) : (
              (Object.entries(groupedJobs) as [string, CareerJobPosting[]][]).map(([deptName, deptJobs]) => {
                const isOpen = Boolean(openDepts[deptName]);
                return (
                  <div
                    key={deptName}
                    className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDept(deptName)}
                      className="w-full flex justify-between items-center p-5 sm:p-6 text-left focus:outline-none hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg sm:text-xl font-normal text-[#2F327D]">
                          {deptName}
                        </h3>
                        <span className="bg-orange-100 text-[#F48C06] text-xs font-normal py-0.5 px-2.5 rounded-full border border-orange-200">
                          {deptJobs.length} Posisi
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                          isOpen ? 'rotate-180 text-[#F48C06]' : ''
                        }`}
                      />
                    </button>

                    {/* Accordion Content */}
                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/40 p-4 sm:p-6 space-y-3.5">
                        {deptJobs.map((job) => (
                          <div
                            key={job.id}
                            onClick={() => handleOpenModal(job)}
                            className="bg-white rounded-xl shadow-2xs border border-slate-200/90 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between hover:border-[#F48C06] hover:shadow-md transition-all cursor-pointer group gap-4"
                          >
                            <div className="md:w-5/12">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-normal">
                                  {job.jobType || 'Full-time'}
                                </span>
                              </div>
                              <h4 className="text-base sm:text-lg font-normal text-[#2F327D] group-hover:text-[#F48C06] transition-colors">
                                {job.title}
                              </h4>
                              <p className="text-xs text-[#696984] mt-1 line-clamp-1 font-normal">
                                {job.description}
                              </p>
                            </div>

                            <div className="flex flex-row justify-between w-full md:w-7/12 items-center text-xs">
                              <div className="text-left w-1/3">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-normal">
                                  Pengalaman
                                </p>
                                <p className="font-normal text-[#2F327D]">
                                  {job.experience}
                                </p>
                              </div>
                              <div className="text-left w-1/3">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-normal">
                                  Batas Waktu
                                </p>
                                <p className="font-normal text-[#2F327D]">
                                  {job.deadline}
                                </p>
                              </div>
                              <div className="w-1/3 flex justify-end">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF3E4] text-[#F48C06] group-hover:bg-[#F48C06] group-hover:text-white transition-all text-xs font-normal">
                                  <span>Lamar</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="bg-[#1a1c4b] pt-14 pb-8 text-white/70 border-t-8 border-[#F48C06] mt-auto">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10 max-w-5xl mx-auto">
            {/* About Us */}
            <div>
              <h4 className="font-normal text-white text-base mb-3 border-b-2 border-[#F48C06] inline-block pb-1">
                Tentang Kami
              </h4>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-normal">
                Hotel Ciputra Jakarta adalah salah satu hotel bintang empat bertaraf internasional di Jakarta Barat, terletak sangat strategis dekat pusat perbelanjaan, bandara, dan pusat bisnis.
              </p>
            </div>

            {/* Address & Contact */}
            <div>
              <h4 className="font-normal text-white text-base mb-3 border-b-2 border-[#F48C06] inline-block pb-1">
                Kontak Rekrutmen HRD
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm font-normal text-white/70">
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#F48C06] shrink-0" />
                  <span>Email: {cmsContent.contactEmail || 'hrd@hotelciputra.com'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#F48C06] shrink-0 mt-0.5" />
                  <span>{cmsContent.contactAddress}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#F48C06] shrink-0" />
                  <span>Telepon: {cmsContent.contactPhone || '+62 21 566 0640'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-[#F48C06] py-3 text-center text-white text-xs font-normal">
          <p>&copy; 2026 Hotel Ciputra Jakarta. All Rights Reserved.</p>
        </div>
      </footer>

      {/* 6. MODAL LAMARAN KERJA (APPLY MODAL WITH 1MB PDF LIMIT) */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          {...getBackdropProps(() => setSelectedJob(null))}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-[#FFF3E4]/70 to-white">
              <div>
                <span className="text-[11px] font-normal uppercase tracking-wider text-[#F48C06] bg-white px-2.5 py-0.5 rounded-full border border-[#F48C06]/30 inline-block mb-1">
                  {selectedJob.department}
                </span>
                <h3 className="text-xl font-normal text-[#2F327D] leading-tight">
                  Lamar Posisi: {selectedJob.title}
                </h3>
                <p className="text-xs text-[#696984] mt-0.5 font-normal">
                  Pengalaman: {selectedJob.experience} • Batas: {selectedJob.deadline}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs">
              {submitSuccess ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-normal text-[#2F327D]">
                    Lamaran Berhasil Terkirim!
                  </h4>
                  <p className="text-xs text-[#696984] max-w-sm mx-auto leading-relaxed font-normal">
                    Terima kasih telah melamar di Hotel Ciputra Jakarta. Tim HRD kami akan meninjau berkas CV Anda dan menghubungi kandidat yang memenuhi kualifikasi.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-6 py-2 rounded-full bg-[#2F327D] text-white text-xs font-normal hover:bg-[#1a1c4b] transition cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitApplication} className="space-y-4">
                  {generalError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{generalError}</span>
                    </div>
                  )}

                  {/* Job Requirements preview */}
                  {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <p className="text-[11px] font-normal text-[#2F327D] mb-1">
                        Persyaratan Kunci:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#696984] font-normal">
                        {selectedJob.requirements.slice(0, 3).map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-normal mb-1">
                        Nama Lengkap *
                      </label>
                      <input
                        type="text"
                        required
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-normal mb-1">
                        Alamat Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        placeholder="budi@example.com"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-normal mb-1">
                        Nomor WhatsApp / HP *
                      </label>
                      <input
                        type="tel"
                        required
                        value={candidatePhone}
                        onChange={(e) => setCandidatePhone(e.target.value)}
                        placeholder="081234567890"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-normal mb-1">
                        Domisili Kota *
                      </label>
                      <input
                        type="text"
                        required
                        value={candidateDomisili}
                        onChange={(e) => setCandidateDomisili(e.target.value)}
                        placeholder="Jakarta Barat"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-normal mb-1">
                      Pendidikan Terakhir *
                    </label>
                    <select
                      required
                      value={candidateEducation}
                      onChange={(e) => setCandidateEducation(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F48C06]"
                    >
                      <option value="SMA/SMK">SMA / SMK Sederajat</option>
                      <option value="D1/D2/D3">Diploma (D1 / D2 / D3)</option>
                      <option value="S1">Sarjana (S1)</option>
                      <option value="S2">Magister (S2)</option>
                    </select>
                  </div>

                  {/* PDF Upload strictly enforced max 1MB as requested by user */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 font-normal">
                        Upload Berkas CV / Resume *
                      </label>
                      <span className="text-[10.5px] text-[#F48C06] font-normal">
                        Wajib Format PDF (Maksimal 1 MB)
                      </span>
                    </div>

                    <div
                      className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all ${
                        cvError
                          ? 'border-rose-300 bg-rose-50/40'
                          : cvFile
                          ? 'border-emerald-300 bg-emerald-50/40'
                          : 'border-slate-300 bg-slate-50/60 hover:border-[#F48C06]'
                      }`}
                    >
                      <input
                        id="cv-file-input"
                        type="file"
                        accept=".pdf,application/pdf"
                        required
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />

                      {cvFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="text-left min-w-0">
                            <p className="font-normal text-[#2F327D] text-xs truncate max-w-[240px]">
                              {cvFile.name}
                            </p>
                            <p className="text-[10px] text-emerald-700 font-normal">
                              {(cvFile.size / 1024).toFixed(1)} KB • Siap Dikirim (Di bawah 1 MB)
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCvFile(null);
                            }}
                            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1 select-none pointer-events-none">
                          <Upload className="w-8 h-8 text-slate-400 mx-auto stroke-[1.5]" />
                          <p className="text-xs text-slate-700 font-normal">
                            Klik atau seret file CV PDF ke sini
                          </p>
                          <p className="text-[10px] text-slate-400 font-normal">
                            Format berkas: <strong>.PDF</strong> • Batas ukuran ketat: <strong>Maks. 1 MB</strong>
                          </p>
                        </div>
                      )}
                    </div>

                    {cvError && (
                      <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-normal">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{cvError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 font-normal">
                        Pesan Tambahan / Motivasi (Opsional)
                      </label>
                      <span className={`text-[11px] font-normal ${candidateNotes.length >= 550 ? 'text-rose-600' : 'text-slate-400'}`}>
                        Maks. 600 karakter • {candidateNotes.length}/600
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={600}
                      value={candidateNotes}
                      onChange={(e) => setCandidateNotes(e.target.value)}
                      placeholder="Ceritakan singkat tentang pengalaman relevan atau alasan Anda ingin bergabung..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F48C06] resize-y min-h-[75px]"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      💡 Kolom dapat ditarik ke bawah untuk melihat teks panjang.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition font-normal cursor-pointer"
                    >
                      Batalkan
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-[#F48C06] hover:bg-[#e07f04] text-white font-normal shadow-md shadow-[#F48C06]/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Mengirim Lamaran & CV...</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4" />
                          <span>Kirim Lamaran Sekarang</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
