import React from 'react';

interface SkeletonProps {
  className?: string;
  tone?: 'light' | 'warm' | 'dark';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', tone = 'light' }) => {
  const toneClass =
    tone === 'warm'
      ? 'skeleton-shimmer-warm'
      : tone === 'dark'
      ? 'skeleton-shimmer-dark'
      : 'skeleton-shimmer';

  return <div aria-hidden="true" className={`rounded-xl ${toneClass} ${className}`} />;
};

export const PublicHomeSkeleton: React.FC = () => (
  <div
    aria-busy="true"
    aria-label="Memuat Halaman Beranda"
    className="min-h-screen bg-white flex flex-col overflow-hidden"
  >
    {/* Top Header */}
    <div className="bg-[#FFF3E4] pt-5 sm:pt-6 pb-20 sm:pb-28 px-4 sm:px-8 md:px-16 lg:px-24">
      <div className="flex items-center justify-between mb-14 sm:mb-20">
        <div className="flex items-center gap-3">
          <Skeleton tone="warm" className="w-11 h-11 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <Skeleton tone="warm" className="w-36 h-5 rounded-lg" />
            <Skeleton tone="warm" className="w-20 h-3 rounded-md" />
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-8">
          <Skeleton tone="warm" className="w-16 h-4 rounded-md" />
          <Skeleton tone="warm" className="w-24 h-4 rounded-md" />
          <Skeleton tone="warm" className="w-28 h-4 rounded-md" />
          <Skeleton tone="warm" className="w-16 h-4 rounded-md" />
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <Skeleton tone="warm" className="w-28 h-10 rounded-full" />
          <Skeleton tone="warm" className="w-36 h-10 rounded-full" />
        </div>
      </div>

      {/* Hero Split */}
      <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-16">
        <div className="w-full lg:w-1/2 space-y-5 flex flex-col items-center lg:items-start">
          <Skeleton tone="warm" className="w-64 h-8 rounded-full" />
          <Skeleton tone="warm" className="w-full max-w-lg h-12 rounded-2xl" />
          <Skeleton tone="warm" className="w-4/5 max-w-md h-12 rounded-2xl" />
          <Skeleton tone="warm" className="w-full max-w-md h-5 rounded-lg" />
          <Skeleton tone="warm" className="w-3/4 max-w-sm h-5 rounded-lg" />
          <div className="flex flex-col sm:flex-row gap-4 pt-3 w-full sm:w-auto">
            <Skeleton tone="warm" className="w-full sm:w-44 h-12 rounded-full" />
            <Skeleton tone="warm" className="w-full sm:w-44 h-12 rounded-full" />
          </div>
        </div>
        <div className="w-full lg:w-1/2 flex justify-center">
          <div className="relative w-full max-w-md sm:max-w-lg">
            <Skeleton
              tone="warm"
              className="w-full h-[300px] sm:h-[440px] rounded-[36px] border-4 border-white/80"
            />
            <Skeleton
              tone="light"
              className="hidden sm:block absolute -bottom-5 -left-4 w-56 h-20 rounded-2xl border border-white shadow-lg"
            />
            <Skeleton
              tone="light"
              className="hidden sm:block absolute bottom-14 -right-4 w-64 h-20 rounded-2xl border border-white shadow-lg"
            />
          </div>
        </div>
      </div>
    </div>

    {/* Services Grid */}
    <div className="container mx-auto px-4 sm:px-8 md:px-16 py-16 space-y-10">
      <div className="flex flex-col items-center space-y-3">
        <Skeleton className="w-64 h-8 rounded-xl" />
        <Skeleton className="w-full max-w-lg h-4 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="p-8 rounded-[32px] border border-slate-100 bg-white shadow-sm flex flex-col items-center space-y-4"
          >
            <Skeleton className="w-20 h-20 rounded-full" />
            <Skeleton className="w-40 h-5 rounded-lg" />
            <Skeleton className="w-full h-4 rounded-md" />
            <Skeleton className="w-4/5 h-4 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const PublicCareerSkeleton: React.FC = () => (
  <div
    aria-busy="true"
    aria-label="Memuat Portal Karir"
    className="min-h-screen bg-slate-50 flex flex-col overflow-hidden"
  >
    {/* Sticky Header Skeleton */}
    <div className="bg-white border-b border-slate-200 px-4 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="w-32 h-4 rounded-md" />
          <Skeleton className="w-24 h-3 rounded-md" />
        </div>
      </div>
      <div className="hidden md:flex items-center gap-6">
        <Skeleton className="w-28 h-4 rounded-md" />
        <Skeleton className="w-28 h-4 rounded-md" />
        <Skeleton className="w-28 h-4 rounded-md" />
      </div>
      <Skeleton className="w-36 h-9 rounded-full" />
    </div>

    {/* Dark Navy Hero Skeleton */}
    <div className="bg-[#2F327D] py-20 sm:py-24 px-4 flex flex-col items-center space-y-5">
      <Skeleton tone="dark" className="w-56 h-7 rounded-full" />
      <Skeleton tone="dark" className="w-full max-w-2xl h-11 rounded-2xl" />
      <Skeleton tone="dark" className="w-4/5 max-w-xl h-5 rounded-lg" />
      <div className="flex flex-col sm:flex-row gap-4 pt-2">
        <Skeleton tone="dark" className="w-52 h-11 rounded-full" />
        <Skeleton tone="dark" className="w-44 h-11 rounded-full" />
      </div>
    </div>

    {/* Culture & Openings Skeleton */}
    <div className="max-w-6xl mx-auto w-full px-4 py-14 space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="w-3/4 h-5 rounded-lg" />
            <Skeleton className="w-full h-3.5 rounded-md" />
            <Skeleton className="w-5/6 h-3.5 rounded-md" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-40 h-5 rounded-lg" />
              <Skeleton className="w-20 h-5 rounded-full" />
            </div>
            <Skeleton className="w-6 h-6 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const LoginSkeleton: React.FC = () => (
  <div
    aria-busy="true"
    aria-label="Memuat Portal Login"
    className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-br from-[#FFF3E4] via-[#fdfbf7] to-[#f7f2ea]"
  >
    <div className="bg-white/95 border-b border-orange-200/60 px-4 sm:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton tone="warm" className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton tone="warm" className="w-32 h-4 rounded-md" />
          <Skeleton tone="warm" className="w-40 h-3 rounded-md" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton tone="warm" className="w-24 h-9 rounded-full" />
        <Skeleton tone="warm" className="w-20 h-9 rounded-full" />
      </div>
    </div>

    <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
      <div className="lg:col-span-7 space-y-5">
        <Skeleton tone="warm" className="w-64 h-7 rounded-full" />
        <Skeleton tone="warm" className="w-full max-w-lg h-12 rounded-2xl" />
        <Skeleton tone="warm" className="w-5/6 max-w-md h-5 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 max-w-xl">
          <Skeleton tone="warm" className="h-28 rounded-2xl" />
          <Skeleton tone="warm" className="h-28 rounded-2xl" />
        </div>
      </div>
      <div className="lg:col-span-5 w-full max-w-[480px] mx-auto bg-white rounded-3xl p-6 sm:p-7 border border-orange-100 shadow-lg space-y-4">
        <Skeleton tone="warm" className="w-full h-11 rounded-2xl" />
        <Skeleton className="w-28 h-3.5 rounded-md" />
        <Skeleton className="w-full h-10 rounded-xl" />
        <Skeleton className="w-28 h-3.5 rounded-md" />
        <Skeleton className="w-full h-10 rounded-xl" />
        <Skeleton className="w-full h-16 rounded-xl" />
        <Skeleton tone="warm" className="w-full h-11 rounded-xl" />
      </div>
    </div>

    <div className="bg-[#1a1c4b] py-4 px-6">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Skeleton tone="dark" className="w-56 h-4 rounded-md" />
        <Skeleton tone="dark" className="w-36 h-4 rounded-md" />
      </div>
    </div>
  </div>
);

export const TabContentSkeleton: React.FC<{ activeTab?: string }> = ({
  activeTab = 'announcements',
}) => {
  if (activeTab === 'announcements') {
    return (
      <div aria-busy="true" className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="w-52 h-5 rounded-lg" />
              <Skeleton className="w-72 h-3.5 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-28 h-10 rounded-xl" />
            <Skeleton className="w-36 h-10 rounded-xl" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3">
          <Skeleton className="flex-1 min-w-[200px] h-10 rounded-xl" />
          <Skeleton className="w-40 h-10 rounded-xl" />
          <Skeleton className="w-36 h-10 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col"
            >
              <Skeleton className="w-full h-44 rounded-none" />
              <div className="p-5 space-y-3">
                <Skeleton className="w-24 h-3.5 rounded-md" />
                <Skeleton className="w-4/5 h-5 rounded-lg" />
                <Skeleton className="w-full h-3.5 rounded-md" />
                <Skeleton className="w-2/3 h-3.5 rounded-md" />
                <div className="pt-2 flex justify-between items-center">
                  <Skeleton className="w-24 h-6 rounded-full" />
                  <Skeleton className="w-20 h-8 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'quota-analytics') {
    return (
      <div aria-busy="true" className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center gap-3.5">
            <Skeleton tone="warm" className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="w-72 h-6 rounded-lg" />
              <Skeleton className="w-full max-w-xl h-4 rounded-md" />
            </div>
          </div>
          <QuotaCardsSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div aria-busy="true" className="space-y-6">
      {/* Header Banner Skeleton */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="w-56 h-5 rounded-lg" />
            <Skeleton className="w-72 max-w-full h-3.5 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-28 h-10 rounded-xl" />
          <Skeleton className="w-36 h-10 rounded-xl" />
        </div>
      </div>

      {/* Filter / Search Bar Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <Skeleton className="flex-1 min-w-[200px] h-10 rounded-xl" />
        <Skeleton className="w-36 h-10 rounded-xl" />
        <Skeleton className="w-32 h-10 rounded-xl" />
      </div>

      {/* Table / Rows Skeleton */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-slate-100 grid grid-cols-12 gap-4 bg-slate-50/70">
          <Skeleton className="col-span-4 h-4 rounded-md" />
          <Skeleton className="col-span-3 h-4 rounded-md" />
          <Skeleton className="col-span-2 h-4 rounded-md" />
          <Skeleton className="col-span-3 h-4 rounded-md" />
        </div>
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="px-5 py-4 grid grid-cols-12 gap-4 items-center">
              <div className="col-span-4 flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="w-4/5 h-4 rounded-md" />
                  <Skeleton className="w-1/2 h-3 rounded-md" />
                </div>
              </div>
              <Skeleton className="col-span-3 h-6 rounded-full" />
              <Skeleton className="col-span-2 h-4 rounded-md" />
              <div className="col-span-3 flex justify-end gap-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const DashboardShellSkeleton: React.FC<{ activeTab?: string }> = ({
  activeTab = 'announcements',
}) => (
  <div
    aria-busy="true"
    aria-label="Memuat Portal Intranet"
    className="min-h-screen bg-slate-50 flex flex-col overflow-hidden"
  >
    {/* Navbar Skeleton */}
    <div className="bg-white border-b border-sky-200/80 px-4 sm:px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton tone="warm" className="w-9 h-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="w-36 h-4 rounded-md" />
          <Skeleton className="w-24 h-3 rounded-md" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="hidden sm:block w-28 h-8 rounded-full" />
        <Skeleton className="w-9 h-9 rounded-full" />
        <Skeleton className="w-28 h-9 rounded-full" />
      </div>
    </div>

    {/* Body Layout */}
    <div className="flex-1 flex w-full max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-6 py-4 gap-5 items-start">
      {/* Sidebar Skeleton */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white rounded-3xl border border-slate-200 p-4 space-y-2.5">
        <Skeleton className="w-28 h-3 rounded-md mb-2" />
        {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
          <div key={idx} className="flex items-center gap-3 p-2.5 rounded-2xl">
            <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
            <Skeleton className="flex-1 h-4 rounded-md" />
          </div>
        ))}
      </aside>

      {/* Main Tab Skeleton */}
      <main className="flex-1 min-w-0 w-full">
        <TabContentSkeleton activeTab={activeTab} />
      </main>
    </div>
  </div>
);

export const DocumentPreviewSkeleton: React.FC = () => (
  <div aria-busy="true" aria-label="Memuat Pratinjau Dokumen" className="space-y-5">
    {/* Media Frame Skeleton */}
    <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 p-4 min-h-[260px] flex flex-col items-center justify-center space-y-3">
      <Skeleton tone="dark" className="w-16 h-16 rounded-2xl" />
      <Skeleton tone="dark" className="w-48 h-4 rounded-lg" />
      <Skeleton tone="dark" className="w-32 h-3 rounded-md" />
    </div>

    {/* 4 Metadata Grid Skeletons */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
          <Skeleton className="w-16 h-3 rounded-md" />
          <Skeleton className="w-24 h-4 rounded-md" />
        </div>
      ))}
    </div>

    {/* Description Skeleton */}
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
      <Skeleton className="w-40 h-3.5 rounded-md" />
      <Skeleton className="w-full h-3.5 rounded-md" />
      <Skeleton className="w-5/6 h-3.5 rounded-md" />
    </div>
  </div>
);

export const FirestoreSyncSkeleton: React.FC = () => (
  <div aria-busy="true" aria-label="Memeriksa Sinkronisasi Firestore" className="space-y-5">
    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-5 h-5 rounded-full shrink-0" />
        <div className="space-y-2">
          <Skeleton className="w-52 h-4 rounded-md" />
          <Skeleton className="w-64 h-3 rounded-md" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="w-24 h-8 rounded-xl" />
        <Skeleton className="w-32 h-8 rounded-xl" />
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex justify-between items-center">
            <Skeleton className="w-20 h-3 rounded-md" />
            <Skeleton className="w-4 h-4 rounded-md" />
          </div>
          <Skeleton className="w-14 h-6 rounded-lg" />
          <Skeleton className="w-24 h-3 rounded-md" />
        </div>
      ))}
    </div>
  </div>
);

export const QuotaCardsSkeleton: React.FC = () => (
  <div aria-busy="true" aria-label="Menyinkronkan Kuota Cloud" className="space-y-5">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="w-32 h-3.5 rounded-md" />
            <Skeleton className="w-4 h-4 rounded-md" />
          </div>
          <Skeleton className="w-28 h-6 rounded-lg" />
          <Skeleton className="w-40 h-3 rounded-md" />
          <Skeleton className="w-full h-2.5 rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="w-20 h-5 rounded-md" />
            <Skeleton className="w-16 h-5 rounded-md" />
          </div>
        </div>
      ))}
    </div>

    <div className="rounded-2xl bg-[#0b132b] p-5 sm:p-6 border border-slate-800 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton tone="dark" className="w-60 h-5 rounded-lg" />
        <Skeleton tone="dark" className="w-28 h-6 rounded-full" />
      </div>
      <Skeleton tone="dark" className="w-full h-4 rounded-full" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Skeleton tone="dark" className="h-16 rounded-xl" />
        <Skeleton tone="dark" className="h-16 rounded-xl" />
        <Skeleton tone="dark" className="h-16 rounded-xl" />
      </div>
    </div>
  </div>
);
