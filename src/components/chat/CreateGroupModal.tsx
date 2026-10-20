'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Users, Search, X, Check, ArrowRight } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import type { Profile } from '@/types/database.types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated?: (conversationId: string) => void;
}

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const handleClose = () => {
    setName('');
    setDescription('');
    setSearch('');
    setSearchedUsers([]);
    setSelectedUsers([]);
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen || !debouncedSearch.trim()) return;

    let isMounted = true;
    async function searchUsers() {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedSearch)}`);
        const json = await res.json();
        if (isMounted && res.ok) {
          setSearchedUsers(json.users || []);
        }
      } catch {
        // Ignore
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

  const displayedSearchedUsers = debouncedSearch.trim() ? searchedUsers : [];

  const toggleUserSelection = (user: Profile) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a group name');
      return;
    }
    if (selectedUsers.length === 0) {
      setError('Please select at least one member for the group');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          member_ids: selectedUsers.map((u) => u.id),
        }),
      });

      const json = await res.json();

      if (res.ok && json.conversation) {
        onClose();
        if (onGroupCreated) {
          onGroupCreated(json.conversation.id);
        } else {
          router.push(`/chat/${json.conversation.id}`);
        }
      } else {
        setError(json.error || 'Failed to create group');
      }
    } catch {
      setError('Network error while creating group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Group"
      description="Create an ephemeral multi-user group chat with automatic 24-hour retention"
      maxWidth="md"
    >
      <form onSubmit={handleCreateGroup} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <Input
          label="Group Name"
          placeholder="e.g. Engineering Sync or Design Club"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">
            Description (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Brief purpose of this group..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#070b16] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
          />
        </div>

        {/* Selected Members Chips */}
        {selectedUsers.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Selected Members ({selectedUsers.length})
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl bg-white/[0.02] border border-white/5">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-xs text-indigo-200"
                >
                  <Avatar src={u.avatar_url} name={u.full_name || u.username} size="xs" />
                  <span className="truncate max-w-[100px]">{u.full_name || u.username}</span>
                  <button
                    type="button"
                    onClick={() => toggleUserSelection(u)}
                    className="hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Member Search */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">Add Members</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search users to add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#070b16] border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Search Results List */}
          {displayedSearchedUsers.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1 p-1 rounded-xl bg-[#070b16] border border-white/10 mt-1">
              {displayedSearchedUsers.map((u) => {
                const isSelected = selectedUsers.some((sel) => sel.id === u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleUserSelection(u)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/20 text-white'
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={u.avatar_url} name={u.full_name || u.username} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{u.full_name}</p>
                        <p className="text-[10px] text-slate-400">@{u.username}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gradient"
            size="sm"
            isLoading={isCreating}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Create Group
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
