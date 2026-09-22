import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface SortableHeaderProps {
  field: string;
  currentSort: string;
  currentDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  title?: string;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  field,
  currentSort,
  currentDirection,
  onSort,
  children,
  className = '',
  align = 'left',
  title,
}) => {
  const isActive = currentSort === field;

  const getAlignmentClass = () => {
    if (align === 'center') return 'justify-center text-center';
    if (align === 'right') return 'justify-end text-right';
    return 'justify-start text-left';
  };

  return (
    <th
      onClick={() => onSort(field)}
      className={`py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] select-none cursor-pointer transition-colors group ${
        isActive ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
      } ${className}`}
      title={title || `Klik untuk mengurutkan berdasarkan ${children}`}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort(field);
        }
      }}
    >
      <div className={`inline-flex items-center gap-1.5 w-full ${getAlignmentClass()}`}>
        <span className="truncate">{children}</span>
        <span className="shrink-0">
          {isActive ? (
            currentDirection === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-indigo-600 animate-in fade-in" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-indigo-600 animate-in fade-in" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors opacity-70 group-hover:opacity-100" />
          )}
        </span>
      </div>
    </th>
  );
};
