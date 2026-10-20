import React from 'react';
import { cn } from '@/lib/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'interactive';
}

export function Card({ children, className, variant = 'glass', ...props }: CardProps) {
  const variantStyles = {
    glass: 'glass-card border border-white/10 shadow-xl shadow-black/40',
    solid: 'bg-[#0f172a] border border-slate-800 shadow-lg',
    interactive:
      'glass-card border border-white/10 hover:border-indigo-500/40 hover:shadow-indigo-500/10 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
  };

  return (
    <div className={cn('rounded-2xl p-6 text-slate-100', variantStyles[variant], className)} {...props}>
      {children}
    </div>
  );
}
