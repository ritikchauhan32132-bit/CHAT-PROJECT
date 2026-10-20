'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatExpirationCountdown } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';

interface ExpirationBadgeProps {
  expiresAt: string | Date;
  className?: string;
  showIcon?: boolean;
}

export function ExpirationBadge({ expiresAt, className, showIcon = true }: ExpirationBadgeProps) {
  const [countdown, setCountdown] = useState(() => formatExpirationCountdown(expiresAt));

  useEffect(() => {
    // Update every 30 seconds
    const interval = setInterval(() => {
      setCountdown(formatExpirationCountdown(expiresAt));
    }, 30000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-medium tracking-tight rounded-md px-1.5 py-0.5 select-none transition-colors',
        countdown.isExpiringSoon
          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse'
          : 'bg-white/5 text-slate-400 hover:text-slate-300',
        className
      )}
      title={`Auto-deletes after 24 hours: ${countdown.text}`}
    >
      {showIcon && (
        countdown.isExpiringSoon ? (
          <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
        ) : (
          <Clock className="w-2.5 h-2.5 opacity-70" />
        )
      )}
      <span>{countdown.text}</span>
    </span>
  );
}
