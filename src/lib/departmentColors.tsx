import React from 'react';

export interface DepartmentColorConfig {
  code: string;
  name: string;
  badgeClass: string;
  dotClass: string;
  solidClass: string;
  lightBg: string;
  textColor: string;
  borderClass: string;
  ringClass: string;
}

const KNOWN_DEPARTMENT_COLORS: Record<string, DepartmentColorConfig> = {
  'front office': {
    code: 'FO',
    name: 'Front Office',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100/80',
    dotClass: 'bg-sky-500',
    solidClass: 'bg-sky-600 text-white',
    lightBg: 'bg-sky-50',
    textColor: 'text-sky-700',
    borderClass: 'border-sky-300',
    ringClass: 'ring-sky-500/20',
  },
  'housekeeping': {
    code: 'HK',
    name: 'Housekeeping',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/80',
    dotClass: 'bg-emerald-500',
    solidClass: 'bg-emerald-600 text-white',
    lightBg: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderClass: 'border-emerald-300',
    ringClass: 'ring-emerald-500/20',
  },
  'food & beverage': {
    code: 'FB',
    name: 'Food & Beverage',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100/80',
    dotClass: 'bg-amber-500',
    solidClass: 'bg-amber-600 text-white',
    lightBg: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderClass: 'border-amber-300',
    ringClass: 'ring-amber-500/20',
  },
  'engineering': {
    code: 'ENG',
    name: 'Engineering',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100/80',
    dotClass: 'bg-blue-500',
    solidClass: 'bg-blue-600 text-white',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderClass: 'border-blue-300',
    ringClass: 'ring-blue-500/20',
  },
  'accounting & finance': {
    code: 'ACC',
    name: 'Accounting & Finance',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100/80',
    dotClass: 'bg-purple-500',
    solidClass: 'bg-purple-600 text-white',
    lightBg: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderClass: 'border-purple-300',
    ringClass: 'ring-purple-500/20',
  },
  'human resources (hr)': {
    code: 'HR',
    name: 'Human Resources (HR)',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100/80',
    dotClass: 'bg-rose-500',
    solidClass: 'bg-rose-600 text-white',
    lightBg: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderClass: 'border-rose-300',
    ringClass: 'ring-rose-500/20',
  },
  'human resources': {
    code: 'HR',
    name: 'Human Resources',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100/80',
    dotClass: 'bg-rose-500',
    solidClass: 'bg-rose-600 text-white',
    lightBg: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderClass: 'border-rose-300',
    ringClass: 'ring-rose-500/20',
  },
  'sales & marketing': {
    code: 'SM',
    name: 'Sales & Marketing',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100/80',
    dotClass: 'bg-indigo-500',
    solidClass: 'bg-indigo-600 text-white',
    lightBg: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderClass: 'border-indigo-300',
    ringClass: 'ring-indigo-500/20',
  },
  'security': {
    code: 'SEC',
    name: 'Security',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200/80',
    dotClass: 'bg-slate-600',
    solidClass: 'bg-slate-700 text-white',
    lightBg: 'bg-slate-100',
    textColor: 'text-slate-700',
    borderClass: 'border-slate-300',
    ringClass: 'ring-slate-500/20',
  },
  'all departments': {
    code: 'ALL',
    name: 'All Departments',
    badgeClass: 'bg-teal-50 text-teal-900 border-teal-300 hover:bg-teal-100/80',
    dotClass: 'bg-teal-600',
    solidClass: 'bg-teal-700 text-white',
    lightBg: 'bg-teal-50',
    textColor: 'text-teal-800',
    borderClass: 'border-teal-300',
    ringClass: 'ring-teal-500/20',
  },
  'semua departemen': {
    code: 'ALL',
    name: 'Semua Departemen',
    badgeClass: 'bg-teal-50 text-teal-900 border-teal-300 hover:bg-teal-100/80',
    dotClass: 'bg-teal-600',
    solidClass: 'bg-teal-700 text-white',
    lightBg: 'bg-teal-50',
    textColor: 'text-teal-800',
    borderClass: 'border-teal-300',
    ringClass: 'ring-teal-500/20',
  },
};

// Fallback dynamic palette for user-created departments
const DYNAMIC_PALETTES: Array<Omit<DepartmentColorConfig, 'code' | 'name'>> = [
  {
    badgeClass: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300 hover:bg-fuchsia-100/80',
    dotClass: 'bg-fuchsia-500',
    solidClass: 'bg-fuchsia-600 text-white',
    lightBg: 'bg-fuchsia-50',
    textColor: 'text-fuchsia-700',
    borderClass: 'border-fuchsia-300',
    ringClass: 'ring-fuchsia-500/20',
  },
  {
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100/80',
    dotClass: 'bg-orange-500',
    solidClass: 'bg-orange-600 text-white',
    lightBg: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderClass: 'border-orange-300',
    ringClass: 'ring-orange-500/20',
  },
  {
    badgeClass: 'bg-lime-50 text-lime-800 border-lime-300 hover:bg-lime-100/80',
    dotClass: 'bg-lime-500',
    solidClass: 'bg-lime-600 text-white',
    lightBg: 'bg-lime-50',
    textColor: 'text-lime-700',
    borderClass: 'border-lime-300',
    ringClass: 'ring-lime-500/20',
  },
  {
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100/80',
    dotClass: 'bg-cyan-500',
    solidClass: 'bg-cyan-600 text-white',
    lightBg: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderClass: 'border-cyan-300',
    ringClass: 'ring-cyan-500/20',
  },
  {
    badgeClass: 'bg-pink-50 text-pink-800 border-pink-300 hover:bg-pink-100/80',
    dotClass: 'bg-pink-500',
    solidClass: 'bg-pink-600 text-white',
    lightBg: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderClass: 'border-pink-300',
    ringClass: 'ring-pink-500/20',
  },
  {
    badgeClass: 'bg-violet-50 text-violet-800 border-violet-300 hover:bg-violet-100/80',
    dotClass: 'bg-violet-500',
    solidClass: 'bg-violet-600 text-white',
    lightBg: 'bg-violet-50',
    textColor: 'text-violet-700',
    borderClass: 'border-violet-300',
    ringClass: 'ring-violet-500/20',
  },
];

export function getDepartmentConfig(deptName?: string): DepartmentColorConfig {
  if (!deptName) {
    return {
      code: 'GEN',
      name: 'Umum',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      dotClass: 'bg-slate-400',
      solidClass: 'bg-slate-600 text-white',
      lightBg: 'bg-slate-100',
      textColor: 'text-slate-600',
      borderClass: 'border-slate-300',
      ringClass: 'ring-slate-400/20',
    };
  }

  const key = deptName.trim().toLowerCase();
  if (KNOWN_DEPARTMENT_COLORS[key]) {
    return KNOWN_DEPARTMENT_COLORS[key];
  }

  // Calculate short code
  const words = deptName.split(/\s+/).filter(Boolean);
  let code = 'DEPT';
  if (words.length === 1) {
    code = words[0].slice(0, 3).toUpperCase();
  } else if (words.length >= 2) {
    code = (words[0][0] + words[1][0]).toUpperCase();
  }

  // Consistent hash for dynamic palettes
  let hash = 0;
  for (let i = 0; i < deptName.length; i++) {
    hash = (hash << 5) - hash + deptName.charCodeAt(i);
    hash |= 0;
  }
  const paletteIndex = Math.abs(hash) % DYNAMIC_PALETTES.length;
  const palette = DYNAMIC_PALETTES[paletteIndex];

  return {
    ...palette,
    code,
    name: deptName,
  };
}

interface DepartmentBadgeProps {
  department: string;
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
  showCode?: boolean;
  className?: string;
  onClick?: () => void;
}

export const DepartmentBadge: React.FC<DepartmentBadgeProps> = ({
  department,
  size = 'sm',
  showDot = true,
  showCode = false,
  className = '',
  onClick,
}) => {
  const config = getDepartmentConfig(department);

  const sizeClasses = {
    xs: 'text-[9.5px] px-1.5 py-0.5 gap-1',
    sm: 'text-[11px] px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3 py-1.5 gap-2',
  }[size];

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  }[size];

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center font-normal tracking-tight border rounded-lg whitespace-nowrap transition-all select-none ${config.badgeClass} ${sizeClasses} ${
        onClick ? 'cursor-pointer active:scale-95' : ''
      } ${className}`}
      title={`Departemen: ${department}`}
    >
      {showDot && (
        <span
          className={`rounded-full shrink-0 ${dotSizes} ${config.dotClass}`}
        />
      )}
      {showCode && (
        <span className="font-mono opacity-75 font-normal">[{config.code}]</span>
      )}
      <span className="truncate max-w-[200px]">{department}</span>
    </span>
  );
};
