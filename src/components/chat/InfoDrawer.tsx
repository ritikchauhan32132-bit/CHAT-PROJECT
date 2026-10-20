'use client';

import React, { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { X, Users, UserPlus, LogOut, Flag, Clock, ShieldCheck, Trash2, Crown, ShieldAlert } from 'lucide-react';
import { formatConversationTime } from '@/lib/utils/formatters';
import type { ExtendedConversation, Profile } from '@/types/database.types';

interface InfoDrawerProps {
  conversation: ExtendedConversation;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onAddMember?: () => void;
  onRemoveMember?: (userId: string) => void;
  onLeaveGroup?: () => void;
  onReport?: () => void;
  isOnlineMap?: (userId?: string | null) => boolean;
}

export function InfoDrawer({
  conversation,
  currentUserId,
  isOpen,
  onClose,
  onAddMember,
  onRemoveMember,
  onLeaveGroup,
  onReport,
  isOnlineMap,
}: InfoDrawerProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'info'>('members');

  if (!isOpen) return null;

  const isGroup = conversation.type === 'group';
  const otherUser = conversation.other_user;
  const title = isGroup ? conversation.name || 'Group Chat' : otherUser?.full_name || 'Direct Chat';
  const avatarUrl = isGroup ? conversation.avatar_url : otherUser?.avatar_url;

  // Check if current user is owner or admin in this group
  const myMembership = conversation.members?.find((m) => m.user_id === currentUserId);
  const isGroupAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin';

  return (
    <div className="w-80 lg:w-96 h-full bg-[#090d18] border-l border-white/10 flex flex-col z-20 overflow-hidden select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-16 px-5 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white tracking-tight">Details</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Profile Card */}
        <div className="text-center space-y-3">
          <Avatar
            src={avatarUrl}
            name={title}
            size="xl"
            isOnline={isOnlineMap ? isOnlineMap(otherUser?.id) : false}
            showOnlineStatus={!isGroup}
            className="mx-auto shadow-xl"
          />

          <div>
            <h4 className="text-base font-bold text-white">{title}</h4>
            {!isGroup && otherUser?.username && (
              <p className="text-xs text-indigo-400">@{otherUser.username}</p>
            )}
            {isGroup && conversation.description && (
              <p className="text-xs text-slate-400 mt-1 px-4 leading-relaxed">
                {conversation.description}
              </p>
            )}
          </div>
        </div>

        {/* 24-Hour Ephemeral Retention Guarantee Card */}
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/25 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>24-Hour Ephemeral Guarantee</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            All messages, photos, videos, and files sent in this room permanently purge from the database and storage buckets 24 hours after creation.
          </p>
        </div>

        {/* Group Members Section */}
        {isGroup && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Members ({conversation.members?.length || 0})
              </span>
              {isGroupAdmin && onAddMember && (
                <button
                  onClick={onAddMember}
                  className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Member
                </button>
              )}
            </div>

            <div className="space-y-2">
              {conversation.members?.map((member) => {
                const p = member.profile;
                const isOnline = isOnlineMap ? isOnlineMap(member.user_id) : false;
                const isSelf = member.user_id === currentUserId;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={p?.avatar_url}
                        name={p?.full_name || p?.username}
                        size="sm"
                        isOnline={isOnline}
                        showOnlineStatus
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate max-w-[120px]">
                          {p?.full_name || p?.username} {isSelf && '(You)'}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">@{p?.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {member.role === 'owner' && (
                        <Badge variant="purple" size="sm">
                          <Crown className="w-2.5 h-2.5" /> Owner
                        </Badge>
                      )}
                      {member.role === 'admin' && (
                        <Badge variant="cyan" size="sm">
                          Admin
                        </Badge>
                      )}

                      {/* Remove button for admins */}
                      {isGroupAdmin && !isSelf && member.role !== 'owner' && onRemoveMember && (
                        <button
                          onClick={() => onRemoveMember(member.user_id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* User Bio (Direct Chat) */}
        {!isGroup && otherUser?.bio && (
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">About</span>
            <p className="text-xs text-slate-200 leading-relaxed">{otherUser.bio}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          {isGroup && onLeaveGroup && (
            <Button
              variant="danger"
              size="sm"
              className="w-full justify-start"
              leftIcon={<LogOut className="w-4 h-4" />}
              onClick={onLeaveGroup}
            >
              Leave Group
            </Button>
          )}

          {onReport && (
            <Button
              variant="glass"
              size="sm"
              className="w-full justify-start text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 border-amber-500/20"
              leftIcon={<Flag className="w-4 h-4 text-amber-400" />}
              onClick={onReport}
            >
              Report {isGroup ? 'Group' : 'User'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
