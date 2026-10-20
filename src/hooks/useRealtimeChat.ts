'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from './useAuth';
import type { ExtendedMessage, TypingState } from '@/types/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeChatOptions {
  conversationId: string | null;
  onNewMessage?: (message: ExtendedMessage) => void;
  onMessageDeleted?: (messageId: string) => void;
  onMessagesRead?: (messageId: string, userId: string) => void;
}

export function useRealtimeChat({
  conversationId,
  onNewMessage,
  onMessageDeleted,
  onMessagesRead,
}: UseRealtimeChatOptions) {
  const supabase = useSupabase();
  const { user, profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingState>({});
  const typingTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const broadcastChannelRef = useRef<RealtimeChannel | null>(null);

  // Keep latest callback references in refs to prevent reconnect thrashing
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onMessagesReadRef = useRef(onMessagesRead);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onMessageDeletedRef.current = onMessageDeleted;
    onMessagesReadRef.current = onMessagesRead;
  }, [onNewMessage, onMessageDeleted, onMessagesRead]);

  // Send typing event
  const sendTyping = useCallback(() => {
    if (!conversationId || !user || !profile || !broadcastChannelRef.current) return;

    broadcastChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        username: profile.username,
        fullName: profile.full_name,
      },
    });
  }, [conversationId, user, profile]);

  useEffect(() => {
    if (!conversationId) return;

    // 1. Subscribe to Postgres Database Changes for this conversation
    const dbChannel = supabase
      .channel(`db-changes-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const raw = payload.new as ExtendedMessage;
          // Check expiration
          if (new Date(raw.expires_at) <= new Date()) return;

          // Fetch sender info and attachments if not embedded
          try {
            const { data: fullMsg } = await supabase
              .from('messages')
              .select(`
                *,
                sender:profiles(*),
                attachments:message_attachments(*),
                reads:message_reads(*)
              `)
              .eq('id', raw.id)
              .single();

            if (fullMsg) {
              onNewMessageRef.current?.(fullMsg as unknown as ExtendedMessage);
            } else {
              onNewMessageRef.current?.(raw);
            }
          } catch {
            onNewMessageRef.current?.(raw);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as ExtendedMessage;
          if (updated.deleted_at) {
            onMessageDeletedRef.current?.(updated.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const old = payload.old as { id: string };
          if (old?.id) {
            onMessageDeletedRef.current?.(old.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
        },
        (payload) => {
          const read = payload.new as { message_id: string; user_id: string };
          onMessagesReadRef.current?.(read.message_id, read.user_id);
        }
      )
      .subscribe();

    // 2. Subscribe to Broadcast channel for Ephemeral Typing Indicators
    const broadcastChannel = supabase.channel(`typing-${conversationId}`, {
      config: { broadcast: { self: false } },
    });

    broadcastChannel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === user?.id) return;

        const uid = payload.userId;

        // Clear existing timeout for this user
        if (typingTimeouts.current[uid]) {
          clearTimeout(typingTimeouts.current[uid]);
        }

        setTypingUsers((prev) => ({
          ...prev,
          [uid]: {
            username: payload.username,
            fullName: payload.fullName,
            timestamp: Date.now(),
          },
        }));

        // Automatically clear typing after 3 seconds of silence
        typingTimeouts.current[uid] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[uid];
            return next;
          });
        }, 3000);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          broadcastChannelRef.current = broadcastChannel;
        }
      });

    return () => {
      // Cleanup subscriptions and timeouts to prevent memory leaks
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(broadcastChannel);
      broadcastChannelRef.current = null;

      Object.values(typingTimeouts.current).forEach((t) => clearTimeout(t));
      typingTimeouts.current = {};
      setTypingUsers({});
    };
  }, [conversationId, supabase, user?.id]);

  return {
    typingUsers: Object.values(typingUsers),
    sendTyping,
  };
}
