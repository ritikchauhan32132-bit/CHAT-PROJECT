'use client';

import React, { useState, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { Camera, Upload, Check } from 'lucide-react';

interface AvatarUploadProps {
  currentUrl?: string | null;
  name?: string | null;
  onAvatarUploaded: (url: string) => void;
}

export function AvatarUpload({ currentUrl, name, onAvatarUploaded }: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar image must be under 5MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'avatar');

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (res.ok && json.url) {
        setPreviewUrl(json.url);
        onAvatarUploaded(json.url);
      } else {
        setError(json.error || 'Failed to upload avatar');
      }
    } catch {
      setError('Network error while uploading avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <Avatar
          src={previewUrl}
          name={name}
          size="xl"
          className="ring-2 ring-indigo-500/30 group-hover:ring-indigo-500 transition-all shadow-xl"
        />

        {/* Hover / Upload overlay */}
        <div className="absolute inset-0 rounded-full bg-black/50 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isUploading ? (
            <Spinner size="sm" className="text-white" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors flex items-center gap-1 mt-1"
      >
        <Upload className="w-3.5 h-3.5" />
        <span>{isUploading ? 'Uploading...' : 'Change Photo'}</span>
      </button>

      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  );
}
