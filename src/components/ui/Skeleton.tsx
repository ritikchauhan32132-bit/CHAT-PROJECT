import React from 'react';
import { cn } from '@/lib/utils/cn';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-white/[0.08]', className)}
      {...props}
    />
  );
}

export function ChatListSkeleton() {
  return (
    <div className="space-y-3 p-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl">
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="w-28 h-4 rounded" />
              <Skeleton className="w-10 h-3 rounded" />
            </div>
            <Skeleton className="w-40 h-3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-3 items-end max-w-[70%]">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-48 h-12 rounded-2xl rounded-bl-sm" />
      </div>
      <div className="flex gap-3 items-end justify-end max-w-[70%] ml-auto">
        <Skeleton className="w-64 h-16 rounded-2xl rounded-br-sm" />
      </div>
      <div className="flex gap-3 items-end max-w-[70%]">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-40 h-10 rounded-2xl rounded-bl-sm" />
      </div>
    </div>
  );
}
