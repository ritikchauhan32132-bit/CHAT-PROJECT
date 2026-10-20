'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { getInitials, getAvatarGradient } from '@/lib/utils/formatters';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  showOnlineStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const statusSizeClasses = {
  xs: 'w-2 h-2 bottom-0 right-0',
  sm: 'w-2.5 h-2.5 bottom-0 right-0',
  md: 'w-3 h-3 bottom-0 right-0 border-[2px]',
  lg: 'w-3.5 h-3.5 bottom-0.5 right-0.5 border-[2px]',
  xl: 'w-4 h-4 bottom-1 right-1 border-[2.5px]',
};

export function Avatar({
  src,
  name,
  size = 'md',
  isOnline = false,
  showOnlineStatus = false,
  className,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name);
  const gradient = getAvatarGradient(name);

  const hasValidImage = src && !imageError;

  return (
    <div className={cn('relative inline-flex flex-shrink-0', sizeClasses[size], className)}>
      <div
        className={cn(
          'w-full h-full rounded-full flex items-center justify-center font-semibold overflow-hidden select-none transition-all shadow-inner',
          !hasValidImage && `bg-gradient-to-tr ${gradient} text-white`
        )}
      >
        {hasValidImage ? (
          <Image
            src={src}
            alt={name || 'Avatar'}
            width={64}
            height={64}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {showOnlineStatus && (
        <span
          className={cn(
            'absolute rounded-full border-[#070a13] ring-1 ring-black/40 transition-colors',
            statusSizeClasses[size],
            isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-500'
          )}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}
