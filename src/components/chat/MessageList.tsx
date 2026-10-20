'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { DateSeparator } from './DateSeparator';
import { ArrowDown, Clock, Sparkles } from 'lucide-react';
import { MessageSkeleton } from '@/components/ui/Skeleton';
import type { ExtendedMessage } from '@/types/database.types';
import { isSameDay } from 'date-fns';

interface MessageListProps {
  messages: ExtendedMessage[];
  currentUserId: string;
  isGroup?: boolean;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onReply?: (message: ExtendedMessage) => void;
  onDelete?: (messageId: string) => void;
  onReport?: (message: ExtendedMessage) => void;
}

export function MessageList({
  messages,
  currentUserId,
  isGroup = false,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onReply,
  onDelete,
  onReport,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isInitialLoad = useRef(true);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isInitialLoad.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      isInitialLoad.current = false;
    } else if (!showScrollBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showScrollBottom]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    setShowScrollBottom(distanceFromBottom > 150);

    // If scrolled to top and has more, load older
    if (scrollTop < 40 && hasMore && !isLoading && onLoadMore) {
      onLoadMore();
    }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <MessageSkeleton />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-cyan-400/10 border border-white/10 flex items-center justify-center mb-4 text-indigo-400 shadow-xl">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Start of Conversation</h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
          Messages in this room are protected with Row-Level Security and automatically delete permanently after 24 hours.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-400">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>24-Hour Ephemeral Guarantee</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 relative"
    >
      {/* Load More Button / Indicator */}
      {hasMore && (
        <div className="flex justify-center my-2">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1 rounded-full bg-white/5 border border-white/10 transition-colors"
          >
            {isLoading ? 'Loading older messages...' : 'Load older messages'}
          </button>
        </div>
      )}

      {/* Message List with Date Separators */}
      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showDateSeparator =
          !prevMessage || !isSameDay(new Date(message.created_at), new Date(prevMessage.created_at));

        return (
          <React.Fragment key={message.id}>
            {showDateSeparator && <DateSeparator date={message.created_at} />}
            <MessageBubble
              message={message}
              isSender={message.sender_id === currentUserId}
              isGroup={isGroup}
              onReply={onReply}
              onDelete={onDelete}
              onReport={onReport}
            />
          </React.Fragment>
        );
      })}

      <div ref={bottomRef} className="h-1" />

      {/* Floating Scroll-to-Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-6 sm:right-10 p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/40 border border-white/20 transition-all duration-200 animate-in fade-in zoom-in-95 z-20"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
