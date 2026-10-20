'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, Video, FileText, CornerDownRight } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { ALLOWED_FILE_TYPES } from '@/lib/security/mime-types';
import type { ExtendedMessage } from '@/types/database.types';

interface PendingAttachment {
  file: File;
  previewUrl?: string;
  category: 'image' | 'video' | 'file';
}

interface MessageComposerProps {
  onSendMessage: (content: string, attachments?: PendingAttachment[]) => Promise<void>;
  replyingTo: ExtendedMessage | null;
  onCancelReply: () => void;
  onTyping: () => void;
  disabled?: boolean;
}

export function MessageComposer({
  onSendMessage,
  replyingTo,
  onCancelReply,
  onTyping,
  disabled = false,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const [fileAccept, setFileAccept] = useState<string>('');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Click outside to close attach menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTyping();
  };

  const triggerFilePicker = (acceptType?: string) => {
    setFileAccept(acceptType || '');
    setShowAttachMenu(false);
    // Timeout ensures accept attribute updates on DOM before click
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 10);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPending: PendingAttachment[] = [];

    Array.from(files).forEach((file) => {
      let category: 'image' | 'video' | 'file' = 'file';
      let previewUrl: string | undefined = undefined;

      if (file.type.startsWith('image/')) {
        category = 'image';
        previewUrl = URL.createObjectURL(file);
      } else if (file.type.startsWith('video/')) {
        category = 'video';
        previewUrl = URL.createObjectURL(file);
      }

      newPending.push({ file, previewUrl, category });
    });

    setPendingFiles((prev) => [...prev, ...newPending]);
    setShowAttachMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSend = async () => {
    if ((!content.trim() && pendingFiles.length === 0) || isSending || disabled) return;

    const textToSend = content;
    const filesToSend = [...pendingFiles];

    setContent('');
    setPendingFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsSending(true);

    try {
      await onSendMessage(textToSend, filesToSend);
    } catch (err) {
      console.error('Failed to send:', err);
      // Restore on failure
      setContent(textToSend);
      setPendingFiles(filesToSend);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const allowedMimeString = ALLOWED_FILE_TYPES.map((t) => t.mime).join(',');

  return (
    <div className="p-3 sm:p-4 bg-[#090d18]/90 border-t border-white/10 backdrop-blur-xl relative">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="mb-2 p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 min-w-0">
            <CornerDownRight className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <div className="min-w-0 text-xs">
              <span className="font-semibold text-indigo-300">
                Replying to {replyingTo.sender?.full_name || 'User'}
              </span>
              <p className="truncate text-slate-400">{replyingTo.content || 'Media message'}</p>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending Attachments Strip */}
      {pendingFiles.length > 0 && (
        <div className="flex items-center gap-2 mb-2.5 overflow-x-auto pb-1">
          {pendingFiles.map((p, idx) => (
            <div
              key={idx}
              className="relative flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 flex-shrink-0"
            >
              {p.category === 'image' && p.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.previewUrl}
                  alt="preview"
                  className="w-10 h-10 object-cover rounded-lg"
                />
              ) : p.category === 'video' ? (
                <div className="w-10 h-10 rounded-lg bg-indigo-950/60 flex items-center justify-center">
                  <Video className="w-5 h-5 text-indigo-400" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-indigo-950/60 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-400" />
                </div>
              )}
              <span className="max-w-[120px] truncate text-[11px] font-medium">{p.file.name}</span>
              <button
                onClick={() => removePendingFile(idx)}
                className="p-1 rounded-full bg-black/40 hover:bg-rose-600 text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Composer Input Area */}
      <div className="flex items-end gap-2 bg-[#0e1424] border border-white/10 focus-within:border-indigo-500/80 rounded-2xl p-1.5 shadow-inner transition-colors">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={fileAccept || allowedMimeString}
          multiple
          className="hidden"
        />

        {/* Attachment Menu Trigger */}
        <div className="relative" ref={attachMenuRef}>
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            disabled={disabled || isSending}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Attach media or files"
            aria-label="Attach media or files"
            aria-expanded={showAttachMenu}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Attachment Popup Menu */}
          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 p-1.5 rounded-xl bg-[#0d1322] border border-white/15 shadow-2xl backdrop-blur-xl z-20 w-44 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => triggerFilePicker('image/*')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-indigo-600/30 transition-colors text-left"
              >
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>Photos & Images</span>
              </button>
              <button
                type="button"
                onClick={() => triggerFilePicker('video/*')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-indigo-600/30 transition-colors text-left"
              >
                <Video className="w-4 h-4 text-cyan-400" />
                <span>Video Clips</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  triggerFilePicker(
                    'application/pdf,application/zip,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  )
                }
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-indigo-600/30 transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Documents & Files</span>
              </button>
            </div>
          )}
        </div>

        {/* Auto-growing Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Type a message (auto-expires in 24 hours)..."
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSending}
          className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 py-2.5 px-2 outline-none resize-none max-h-32 min-h-[38px] leading-relaxed disabled:opacity-50"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!content.trim() && pendingFiles.length === 0) || isSending || disabled}
          className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white shadow-md shadow-indigo-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0"
          title="Send message (Enter)"
        >
          {isSending ? (
            <Spinner size="sm" className="text-white" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
