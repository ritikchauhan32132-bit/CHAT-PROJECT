'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from './useAuth';

export interface PresenceUser {
  userId: string;
  username: string;
  fullName: string;
  onlineAt: string;
}

export function usePresence() {
  const supabase = useSupabase();
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceUser>>(new Map());

  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase.channel('global-presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeMap = new Map<string, PresenceUser>();

        Object.keys(state).forEach((key) => {
          const presences = state[key] as unknown as {
            userId: string;
            username: string;
            fullName: string;
            onlineAt: string;
          }[];
          if (presences && presences.length > 0) {
            const latest = presences[0];
            activeMap.set(latest.userId, latest);
          }
        });

        setOnlineUsers(activeMap);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const presence = newPresences[0] as unknown as PresenceUser;
        if (presence) {
          setOnlineUsers((prev) => {
            const next = new Map(prev);
            next.set(key, presence);
            return next;
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: user.id,
            username: profile.username,
            fullName: profile.full_name,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [supabase, user, profile]);

  const isUserOnline = useCallback(
    (userId?: string | null): boolean => {
      if (!userId) return false;
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  return {
    onlineUsers,
    isUserOnline,
  };
}
