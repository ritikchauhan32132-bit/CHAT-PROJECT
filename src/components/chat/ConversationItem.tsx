'use client';

import React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatConversationTime } from '@/lib/utils/formatters';
import { Users, Image as ImageIcon, Video, FileText, Clock } from 'lucide-react';
import type { ExtendedConversation } from '@/types/database.types';

interface ConversationItemProps {
  conversation: ExtendedConversation;
  isActive: boolean;
  isOnline?: boolean;
}

export function ConversationItem({
  conversation,
  isActive,
  isOnline = false,
}: ConversationItemProps) {
  const isGroup = conversation.type === 'group';
  const otherUser = conversation.other_user;

  const title = isGroup ? conversation.name || 'Group Chat' : otherUser?.full_name || otherUser?.username || 'User';
  const avatarUrl = isGroup ? conversation.avatar_url : otherUser?.avatar_url;

  const lastMsg = conversation.last_message;
  let lastMessageSnippet = 'No messages yet';

  if (lastMsg) {
    if (lastMsg.deleted_at) {
      lastMessageSnippet = 'This message was deleted';
    } else if (lastMsg.message_type === 'image') {
      lastMessageSnippet = '📷 Photo';
    } else if (lastMsg.message_type === 'video') {
      lastMessageSnippet = '🎥 Video';
    } else if (lastMsg.message_type === 'file') {
      lastMessageSnippet = '📎 File attachment';
    } else if (lastMsg.content) {
      lastMessageSnippet = lastMsg.content;
    }
  }

  const lastTime = formatConversationTime(lastMsg?.created_at || conversation.updated_at);
  const unreadCount = conversation.unread_count || 0;

  return (
    <Link
      href={`/chat/${conversation.id}`}
      className={`group flex items-center gap-3 p-3 rounded-2xl transition-all duration-150 select-none ${
        isActive
          ? 'bg-gradient-to-r from-indigo-600/25 to-purple-600/15 border border-indigo-500/30 text-white shadow-lg shadow-indigo-600/10'
          : 'hover:bg-white/[0.04] text-slate-300 border border-transparent'
      }`}
    >
      {/* Avatar with live status */}
      <div className="relative flex-shrink-0">
        <Avatar
          src={avatarUrl}
          name={title}
          size="md"
          isOnline={isOnline}
          showOnlineStatus={!isGroup}
        />
        {isGroup && (
          <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#070a13] border border-white/10 text-indigo-400">
            <Users className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3
            className={`text-sm font-semibold truncate ${
              isActive ? 'text-white' : 'text-slate-100 group-hover:text-white'
            }`}
          >
            {title}
          </h3>
          <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1.5">{lastTime}</span>
        </div>

        <div className="flex items-center justify-between">
          <p
            className={`text-xs truncate max-w-[180px] sm:max-w-[200px] ${
              unreadCount > 0
                ? 'font-bold text-white'
                : 'text-slate-400 group-hover:text-slate-300'
            }`}
          >
            {lastMessageSnippet}
          </p>

          {/* Unread Message Pill */}
          {unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full bg-indigo-500 text-[10px] font-bold text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
