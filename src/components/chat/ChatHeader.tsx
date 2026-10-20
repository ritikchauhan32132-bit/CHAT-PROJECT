'use client';

import React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { ArrowLeft, MoreVertical, PanelRight, Shield, Clock, Users } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/formatters';
import type { ExtendedConversation } from '@/types/database.types';

interface ChatHeaderProps {
  conversation: ExtendedConversation;
  isOnline?: boolean;
  onToggleInfoDrawer: () => void;
  isInfoDrawerOpen?: boolean;
}

export function ChatHeader({
  conversation,
  isOnline = false,
  onToggleInfoDrawer,
  isInfoDrawerOpen = false,
}: ChatHeaderProps) {
  const isGroup = conversation.type === 'group';
  const otherUser = conversation.other_user;

  const title = isGroup ? conversation.name || 'Group Chat' : otherUser?.full_name || otherUser?.username || 'Chat';
  const avatarUrl = isGroup ? conversation.avatar_url : otherUser?.avatar_url;

  const subtitle = isGroup
    ? `${conversation.members?.length || 0} members`
    : isOnline
    ? 'Online'
    : formatRelativeTime(otherUser?.last_seen);

  return (
    <div className="h-16 px-4 sm:px-6 bg-[#090d18]/90 border-b border-white/10 flex items-center justify-between backdrop-blur-xl z-10 select-none">
      {/* Left: Mobile Back Button & Participant Avatar/Info */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/chat"
          className="md:hidden p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="relative">
          <Avatar
            src={avatarUrl}
            name={title}
            size="md"
            isOnline={isOnline}
            showOnlineStatus={!isGroup}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-[180px] sm:max-w-xs">
              {title}
            </h2>
            {isGroup && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 font-medium">
                <Users className="w-2.5 h-2.5" /> Group
              </span>
            )}
          </div>
          <p
            className={`text-xs truncate ${
              isOnline && !isGroup ? 'text-emerald-400 font-medium' : 'text-slate-400'
            }`}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right Actions: 24h Ephemeral indicator & Info drawer toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Ephemeral Guarantee Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-400">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>24h Ephemeral</span>
        </div>

        {/* Info Drawer Toggle Button */}
        <button
          onClick={onToggleInfoDrawer}
          className={`p-2 rounded-xl border transition-colors ${
            isInfoDrawerOpen
              ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title="Conversation details"
        >
          <PanelRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
