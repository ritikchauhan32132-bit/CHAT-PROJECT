'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { X, Download, ExternalLink } from 'lucide-react';

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  type: 'image' | 'video';
  fileName: string;
}

export function MediaLightbox({ isOpen, onClose, url, type, fileName }: MediaLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !url) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Top action bar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <a
          href={url}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
          title="Download file"
        >
          <Download className="w-5 h-5" />
        </a>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
          title="Open original in new tab"
        >
          <ExternalLink className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
          title="Close preview"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Media Container */}
      <div
        className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {type === 'image' ? (
          <div className="relative max-w-full max-h-[80vh] flex items-center justify-center">
            <Image
              src={url}
              alt={fileName}
              width={1600}
              height={1200}
              className="max-h-[80vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
              unoptimized
            />
          </div>
        ) : (
          <video
            src={url}
            controls
            autoPlay
            className="max-h-[80vh] w-auto max-w-full rounded-xl shadow-2xl outline-none"
          />
        )}
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs text-slate-300 font-medium max-w-md truncate">
        {fileName}
      </div>
    </div>
  );
}
