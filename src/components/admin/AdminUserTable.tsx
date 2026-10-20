'use client';

import React, { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { Search, Shield, Ban, CheckCircle2, UserCheck, Crown, MoreVertical } from 'lucide-react';
import type { Profile } from '@/types/database.types';

interface AdminUserTableProps {
  users: Profile[];
  onToggleStatus: (userId: string, currentStatus: boolean) => Promise<void>;
  onToggleRole: (userId: string, currentRole: string) => Promise<void>;
  isLoading?: boolean;
}

export function AdminUserTable({
  users,
  onToggleStatus,
  onToggleRole,
  isLoading = false,
}: AdminUserTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusClick = async (userId: string, currentActive: boolean) => {
    setUpdatingId(userId);
    try {
      await onToggleStatus(userId, !currentActive);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoleClick = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Are you sure you want to change this user role to ${nextRole.toUpperCase()}?`)) return;

    setUpdatingId(userId);
    try {
      await onToggleRole(userId, nextRole);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#090e1c]/80 backdrop-blur-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.03] text-slate-400 font-semibold border-b border-white/10 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">User</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Activity</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <Spinner size="md" className="mx-auto mb-2 text-indigo-400" />
                  Loading user records...
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((u) => {
                const isBusy = updatingId === u.id;
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.avatar_url} name={u.full_name || u.username} size="md" />
                        <div>
                          <p className="font-semibold text-white">{u.full_name}</p>
                          <p className="text-[11px] text-indigo-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.role === 'admin' ? (
                        <Badge variant="purple">
                          <Crown className="w-3 h-3" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="glass">User</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.is_active ? (
                        <Badge variant="emerald">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="danger">
                          <Ban className="w-3 h-3" /> Suspended
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {u.is_online ? (
                        <span className="text-emerald-400 font-medium">Online</span>
                      ) : (
                        <span>{formatRelativeTime(u.last_seen)}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant={u.is_active ? 'danger' : 'secondary'}
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleStatusClick(u.id, u.is_active)}
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </Button>
                        <Button
                          variant="glass"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleRoleClick(u.id, u.role)}
                        >
                          {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
