import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';

interface DateSeparatorProps {
  date: string | Date;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;

  let label = format(d, 'MMMM d, yyyy');
  if (isToday(d)) {
    label = 'Today';
  } else if (isYesterday(d)) {
    label = 'Yesterday';
  }

  return (
    <div className="flex items-center justify-center my-4 select-none">
      <div className="h-[1px] bg-white/[0.08] flex-1 max-w-[120px]" />
      <span className="px-3 py-1 rounded-full text-[11px] font-semibold text-slate-400 bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shadow-sm">
        {label}
      </span>
      <div className="h-[1px] bg-white/[0.08] flex-1 max-w-[120px]" />
    </div>
  );
}
