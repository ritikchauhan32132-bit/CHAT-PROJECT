'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { FileText, Download, Play, FileArchive, FileSpreadsheet, FileCode, Paperclip } from 'lucide-react';
import { formatFileSize } from '@/lib/utils/formatters';
import { MediaLightbox } from './MediaLightbox';
import { useSupabase } from '@/hooks/useSupabase';
import type { MessageAttachment } from '@/types/database.types';

interface MediaAttachmentPreviewProps {
  attachment: MessageAttachment;
  isSender?: boolean;
}

export function MediaAttachmentPreview({ attachment, isSender = false }: MediaAttachmentPreviewProps) {
  const supabase = useSupabase();
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);

  const { mime_type, file_name, file_size, storage_path } = attachment;

  const isImage = mime_type.startsWith('image/');
  const isVideo = mime_type.startsWith('video/');
  const isDoc = !isImage && !isVideo;

  useEffect(() => {
    let mounted = true;

    async function resolveSignedUrl() {
      try {
        // Create a 24-hour signed download URL for private chat-media bucket
        const { data, error } = await supabase.storage
          .from('chat-media')
          .createSignedUrl(storage_path, 24 * 60 * 60);

        if (mounted && !error && data?.signedUrl) {
          setMediaUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Failed to resolve signed url:', err);
      } finally {
        if (mounted) setIsLoadingUrl(false);
      }
    }

    resolveSignedUrl();

    return () => {
      mounted = false;
    };
  }, [supabase, storage_path]);

  const getDocIcon = () => {
    if (mime_type.includes('pdf')) return <FileText className="w-6 h-6 text-rose-400" />;
    if (mime_type.includes('zip') || mime_type.includes('tar'))
      return <FileArchive className="w-6 h-6 text-amber-400" />;
    if (mime_type.includes('sheet') || mime_type.includes('excel'))
      return <FileSpreadsheet className="w-6 h-6 text-emerald-400" />;
    if (mime_type.includes('json') || mime_type.includes('javascript') || mime_type.includes('html'))
      return <FileCode className="w-6 h-6 text-cyan-400" />;
    return <Paperclip className="w-6 h-6 text-indigo-400" />;
  };

  return (
    <>
      <div className="my-1.5 overflow-hidden rounded-xl">
        {/* IMAGE PREVIEW */}
        {isImage && (
          <div
            onClick={() => mediaUrl && setIsLightboxOpen(true)}
            className="relative cursor-pointer group rounded-xl overflow-hidden max-w-sm max-h-72 bg-black/30 border border-white/10"
          >
            {mediaUrl ? (
              <Image
                src={mediaUrl}
                alt={file_name}
                width={400}
                height={300}
                className="w-full h-auto max-h-72 object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                unoptimized
              />
            ) : (
              <div className="w-64 h-48 flex items-center justify-center bg-white/5 animate-pulse text-xs text-slate-400">
                Loading image...
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs text-white font-medium">
                Click to expand
              </span>
            </div>
          </div>
        )}

        {/* VIDEO PREVIEW */}
        {isVideo && (
          <div className="relative rounded-xl overflow-hidden max-w-sm bg-black/40 border border-white/10">
            {mediaUrl ? (
              <video
                src={mediaUrl}
                controls
                preload="metadata"
                className="w-full max-h-64 object-contain rounded-xl"
              />
            ) : (
              <div className="w-64 h-40 flex items-center justify-center bg-white/5 animate-pulse text-xs text-slate-400 gap-2">
                <Play className="w-5 h-5 text-indigo-400" /> Loading video...
              </div>
            )}
          </div>
        )}

        {/* DOCUMENT / FILE ATTACHMENT CARD */}
        {isDoc && (
          <div
            className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
              isSender
                ? 'bg-indigo-950/40 border-indigo-400/30 hover:bg-indigo-950/60'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-black/30 flex-shrink-0">{getDocIcon()}</div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate max-w-[200px]" title={file_name}>
                  {file_name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{formatFileSize(file_size)}</p>
              </div>
            </div>

            {mediaUrl ? (
              <a
                href={mediaUrl}
                download={file_name}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </a>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {(isImage || isVideo) && (
        <MediaLightbox
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          url={mediaUrl}
          type={isImage ? 'image' : 'video'}
          fileName={file_name}
        />
      )}
    </>
  );
}
