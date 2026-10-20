'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Search, MessageSquare, Sparkles } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import type { Profile } from '@/types/database.types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated?: (conversationId: string) => void;
}

export function NewChatModal({ isOpen, onClose, onConversationCreated }: NewChatModalProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isStarting, setIsStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const handleClose = () => {
    setSearch('');
    setUsers([]);
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen || !debouncedSearch.trim()) return;

    let isMounted = true;
    async function searchUsers() {
      setIsSearching(true);
      setError(null);

      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedSearch)}`);
        const json = await res.json();

        if (isMounted) {
          if (res.ok) {
            setUsers(json.users || []);
          } else {
            setError(json.error || 'Failed to search users');
          }
        }
      } catch {
        if (isMounted) {
          setError('Network error while searching users');
        }
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    }

    searchUsers();
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, isOpen]);

  const displayedUsers = debouncedSearch.trim() ? users : [];

  const handleStartChat = async (targetUserId: string) => {
    setIsStarting(targetUserId);
    setError(null);

    try {
      const res = await fetch('/api/conversations/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });

      const json = await res.json();

      if (res.ok && json.conversation_id) {
        onClose();
        if (onConversationCreated) {
          onConversationCreated(json.conversation_id);
        } else {
          router.push(`/chat/${json.conversation_id}`);
        }
      } else {
        setError(json.error || 'Failed to start direct conversation');
      }
    } catch {
      setError('Network error while starting conversation');
    } finally {
      setIsStarting(null);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Start Direct Chat"
      description="Search registered users by username or full name"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Type a username or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full bg-[#070b16] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* User Results List */}
        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
          {isSearching ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Spinner size="md" />
              <span>Searching users...</span>
            </div>
          ) : displayedUsers.length > 0 ? (
            displayedUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={u.avatar_url}
                    name={u.full_name || u.username}
                    size="md"
                    isOnline={u.is_online}
                    showOnlineStatus
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate max-w-[180px]">
                      {u.full_name}
                    </p>
                    <p className="text-xs text-indigo-400 truncate">@{u.username}</p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStartChat(u.id)}
                  isLoading={isStarting === u.id}
                  leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                >
                  Chat
                </Button>
              </div>
            ))
          ) : search.trim() ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No registered users found matching &quot;{search}&quot;
            </div>
          ) : (
            <div className="py-8 text-center space-y-2 select-none">
              <Sparkles className="w-6 h-6 text-indigo-400 mx-auto opacity-70" />
              <p className="text-xs text-slate-400">
                Type at least one character to search users in the network
              </p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
