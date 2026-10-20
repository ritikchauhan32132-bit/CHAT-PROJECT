'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminConversationViewer } from '@/components/admin/AdminConversationViewer';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatConversationTime } from '@/lib/utils/formatters';
import { MessageSquare, Users, Eye, RefreshCw } from 'lucide-react';
import type { ExtendedConversation } from '@/types/database.types';

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState<ExtendedConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = '/api/admin/conversations?limit=50';
      if (typeFilter !== 'all') url += `&type=${typeFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setConversations(json.conversations || []);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  if (selectedConvId) {
    return (
      <AdminConversationViewer
        conversationId={selectedConvId}
        onBack={() => setSelectedConvId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Conversations & Chat Viewer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Inspect active conversation channels and view currently retained unexpired messages
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#090e1c] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
          >
            <option value="all">All Conversations</option>
            <option value="direct">Direct Only</option>
            <option value="group">Groups Only</option>
          </select>

          <Button
            variant="glass"
            size="sm"
            onClick={fetchConversations}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Conversations Table */}
      <div className="rounded-2xl border border-white/10 bg-[#090e1c]/80 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] text-slate-400 font-semibold border-b border-white/10 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Conversation</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Participants</th>
                <th className="py-3.5 px-4">Last Activity</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Spinner size="md" className="mx-auto mb-2 text-purple-400" />
                    Loading conversations...
                  </td>
                </tr>
              ) : conversations.length > 0 ? (
                conversations.map((conv) => {
                  const isGroup = conv.type === 'group';
                  const title = isGroup ? conv.name : 'Direct Chat';
                  const members = conv.members || [];

                  return (
                    <tr key={conv.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={conv.avatar_url} name={title} size="md" />
                          <div>
                            <p className="font-semibold text-white">{title}</p>
                            <p className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                              {conv.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={isGroup ? 'purple' : 'cyan'}>
                          {isGroup ? (
                            <>
                              <Users className="w-3 h-3" /> Group
                            </>
                          ) : (
                            'Direct'
                          )}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-300">
                          {members.length} participant{members.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {formatConversationTime(conv.updated_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setSelectedConvId(conv.id)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          View Messages
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No conversations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
