'use client';

import React, { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { ExpirationBadge } from './ExpirationBadge';
import { MediaAttachmentPreview } from './MediaAttachmentPreview';
import { formatMessageTime } from '@/lib/utils/formatters';
import { Check, CheckCheck, Reply, Copy, Trash2, Flag, CornerDownRight, CheckCircle2 } from 'lucide-react';
import type { ExtendedMessage } from '@/types/database.types';

interface MessageBubbleProps {
  message: ExtendedMessage;
  isSender: boolean;
  isGroup?: boolean;
  onReply?: (message: ExtendedMessage) => void;
  onDelete?: (messageId: string) => void;
  onReport?: (message: ExtendedMessage) => void;
}

export function MessageBubble({
  message,
  isSender,
  isGroup = false,
  onReply,
  onDelete,
  onReport,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // System Message Styling
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-3 select-none">
        <div className="px-3.5 py-1 rounded-full text-xs text-indigo-300/90 bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md">
          {message.content}
        </div>
      </div>
    );
  }

  const isDeleted = Boolean(message.deleted_at);
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const isRead = message.reads && message.reads.length > 0;

  const handleCopy = async () => {
    if (message.content) {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`group relative flex gap-2.5 my-1.5 transition-all ${
        isSender ? 'justify-end' : 'justify-start'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => setShowActions((prev) => !prev)}
    >
      {/* Receiver Avatar (for Group chats) */}
      {!isSender && isGroup && (
        <Avatar
          src={message.sender?.avatar_url}
          name={message.sender?.full_name || message.sender?.username}
          size="sm"
          className="mt-1"
        />
      )}

      {/* Bubble Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] md:max-w-[60%] rounded-2xl p-3 shadow-md transition-all ${
          isSender
            ? 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-br-xs border border-indigo-400/20'
            : 'bg-[#111827]/90 text-slate-100 rounded-bl-xs border border-white/10 backdrop-blur-md'
        }`}
      >
        {/* Group Sender Name */}
        {!isSender && isGroup && message.sender && (
          <div className="text-[11px] font-bold text-indigo-400 mb-1">
            {message.sender.full_name || message.sender.username}
          </div>
        )}

        {/* Reply Quote Preview */}
        {message.reply_to && (
          <div
            className={`mb-2 p-2 rounded-lg text-xs border-l-2 flex items-start gap-2 ${
              isSender
                ? 'bg-black/20 border-white/40 text-indigo-100'
                : 'bg-white/5 border-indigo-400 text-slate-300'
            }`}
          >
            <CornerDownRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-indigo-300" />
            <div className="min-w-0">
              <span className="font-semibold text-[11px] block text-indigo-300">
                {message.reply_to.sender?.full_name || 'Original Message'}
              </span>
              <p className="truncate text-[11px] opacity-80">{message.reply_to.content || 'Media message'}</p>
            </div>
          </div>
        )}

        {/* Media Attachments */}
        {hasAttachments && !isDeleted && (
          <div className="space-y-1.5 mb-1.5">
            {message.attachments?.map((att) => (
              <MediaAttachmentPreview key={att.id} attachment={att} isSender={isSender} />
            ))}
          </div>
        )}

        {/* Message Content Text */}
        {message.content && (
          <div
            className={`text-sm leading-relaxed break-words whitespace-pre-wrap ${
              isDeleted ? 'italic text-slate-400 opacity-70' : ''
            }`}
          >
            {message.content}
          </div>
        )}

        {/* Footer Meta: 24h Expiration Badge, Timestamp, Read Status */}
        <div
          className={`flex items-center gap-2 mt-1.5 text-[10px] select-none ${
            isSender ? 'text-indigo-200/80 justify-end' : 'text-slate-400 justify-end'
          }`}
        >
          {/* Live 24-hour Auto-Deletion Pill */}
          {!isDeleted && <ExpirationBadge expiresAt={message.expires_at} />}

          {/* Time */}
          <span>{formatMessageTime(message.created_at)}</span>

          {/* Read / Delivery / Sending Status for Sender */}
          {isSender && (
            <span
              title={
                message.status === 'failed'
                  ? 'Failed to send'
                  : message.status === 'sending'
                  ? 'Sending...'
                  : isRead
                  ? 'Read'
                  : 'Delivered'
              }
            >
              {message.status === 'failed' ? (
                <span className="text-rose-400 font-medium text-[9px] flex items-center gap-0.5">
                  Failed
                </span>
              ) : message.status === 'sending' ? (
                <span className="w-2.5 h-2.5 rounded-full border border-indigo-200 border-t-transparent animate-spin inline-block" />
              ) : isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-cyan-300 stroke-[2.5]" />
              ) : (
                <Check className="w-3.5 h-3.5 text-indigo-200 stroke-[2]" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Hover Action Toolbar */}
      {showActions && !isDeleted && (
        <div
          className={`absolute top-0 -translate-y-1/2 flex items-center gap-0.5 p-1 rounded-xl bg-[#090d18] border border-white/15 shadow-xl backdrop-blur-md z-10 animate-in fade-in zoom-in-95 duration-150 ${
            isSender ? 'right-4' : 'left-4'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {onReply && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply(message);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          )}

          {message.content && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title={copied ? 'Copied!' : 'Copy text'}
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {isSender && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(message.id);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {!isSender && onReport && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReport(message);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
              title="Report content"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
