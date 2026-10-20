'use client';

import React, { useState, useMemo } from 'react';
import { ConversationItem } from './ConversationItem';
import { ChatListSkeleton } from '@/components/ui/Skeleton';
import { Search, Plus, MessageSquarePlus, Users, Sparkles } from 'lucide-react';
import type { ExtendedConversation } from '@/types/database.types';

interface ConversationListProps {
  conversations: ExtendedConversation[];
  activeConversationId?: string | null;
  isLoading?: boolean;
  onOpenNewChat: () => void;
  onOpenCreateGroup: () => void;
  isOnlineMap?: (userId?: string | null) => boolean;
}

type FilterTab = 'all' | 'direct' | 'group' | 'unread';

export function ConversationList({
  conversations,
  activeConversationId,
  isLoading = false,
  onOpenNewChat,
  onOpenCreateGroup,
  isOnlineMap,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Filter by tab
    if (activeTab === 'direct') {
      result = result.filter((c) => c.type === 'direct');
    } else if (activeTab === 'group') {
      result = result.filter((c) => c.type === 'group');
    } else if (activeTab === 'unread') {
      result = result.filter((c) => (c.unread_count || 0) > 0);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => {
        if (c.type === 'group') {
          return c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
        } else {
          return (
            c.other_user?.full_name?.toLowerCase().includes(q) ||
            c.other_user?.username?.toLowerCase().includes(q)
          );
        }
      });
    }

    return result;
  }, [conversations, activeTab, searchQuery]);

  return (
    <div className="w-full md:w-80 lg:w-96 h-full bg-[#080c18] border-r border-white/10 flex flex-col flex-shrink-0 select-none">
      {/* Search Header */}
      <div className="p-4 border-b border-white/10 space-y-3 bg-[#090e1c]/70 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Messages
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
              {conversations.length}
            </span>
          </h1>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenNewChat}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
              title="Start new direct conversation"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenCreateGroup}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95"
              title="Create new group chat"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0e1526] border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'direct', label: 'Direct' },
              { id: 'group', label: 'Groups' },
              { id: 'unread', label: 'Unread' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List View */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <ChatListSkeleton />
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              isOnline={isOnlineMap ? isOnlineMap(conversation.other_user?.id) : false}
            />
          ))
        ) : (
          <div className="p-8 text-center space-y-3 select-none">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">No conversations found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery
                  ? 'Try searching with a different keyword'
                  : 'Start a new conversation to connect'}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={onOpenNewChat}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Start Direct Chat
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
