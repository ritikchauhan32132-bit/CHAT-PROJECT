'use client';

import React, { useState, useEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ExpirationBadge } from '@/components/chat/ExpirationBadge';
import { MediaAttachmentPreview } from '@/components/chat/MediaAttachmentPreview';
import { formatMessageTime } from '@/lib/utils/formatters';
import { MessageSquare, Users, Clock, ShieldAlert, ArrowLeft } from 'lucide-react';
import type { ExtendedConversation, ExtendedMessage } from '@/types/database.types';

interface AdminConversationViewerProps {
  conversationId: string;
  onBack: () => void;
}

export function AdminConversationViewer({ conversationId, onBack }: AdminConversationViewerProps) {
  const [conversation, setConversation] = useState<ExtendedConversation | null>(null);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/admin/conversations/${conversationId}`);
        if (res.ok) {
          const json = await res.json();
          setConversation(json.conversation);
          setMessages(json.messages || []);
        }
      } catch (err) {
        console.error('Failed to load admin chat view:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [conversationId]);

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Spinner size="lg" className="text-purple-400" />
        <span className="text-xs">Loading retained messages...</span>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Conversation not found.</p>
        <Button variant="ghost" size="sm" onClick={onBack} className="mt-2">
          Back
        </Button>
      </div>
    );
  }

  const isGroup = conversation.type === 'group';
  const title = isGroup ? conversation.name : 'Direct Conversation';

  return (
    <div className="rounded-2xl border border-white/10 bg-[#090e1c] overflow-hidden flex flex-col h-[700px]">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {title}
              <Badge variant="purple">{isGroup ? 'Group' : 'Direct'}</Badge>
            </h3>
            <p className="text-[11px] text-slate-400">
              Members: {conversation.members?.map((m) => m.profile?.full_name || m.user_id).join(', ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-indigo-300 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
          <Clock className="w-3.5 h-3.5" />
          <span>24h Retention Rule Active</span>
        </div>
      </div>

      {/* Message Inspection Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#060913]">
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Avatar src={msg.sender?.avatar_url} name={msg.sender?.full_name} size="xs" />
                  <span className="font-semibold text-white">{msg.sender?.full_name}</span>
                  <span className="text-[10px] text-indigo-400">@{msg.sender?.username}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <ExpirationBadge expiresAt={msg.expires_at} />
                  <span>{formatMessageTime(msg.created_at)}</span>
                </div>
              </div>

              {/* Attachments */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="space-y-1 my-1">
                  {msg.attachments.map((att) => (
                    <MediaAttachmentPreview key={att.id} attachment={att} />
                  ))}
                </div>
              )}

              {/* Content */}
              {msg.content && <p className="text-xs text-slate-200 leading-relaxed">{msg.content}</p>}
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
            <Clock className="w-8 h-8 text-slate-500" />
            <p className="text-xs">No active unexpired messages in the last 24 hours.</p>
            <p className="text-[11px] text-slate-500">
              Expired messages have been permanently purged from database and storage.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
