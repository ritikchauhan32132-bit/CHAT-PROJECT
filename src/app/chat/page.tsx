'use client';

import React, { useState } from 'react';
import { MessageSquare, Shield, Clock, Users, Sparkles, MessageSquarePlus } from 'lucide-react';
import { NewChatModal } from '@/components/chat/NewChatModal';
import { CreateGroupModal } from '@/components/chat/CreateGroupModal';
import { useRouter } from 'next/navigation';

export default function ChatIndexPage() {
  const router = useRouter();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-6 text-center bg-[#070a13] relative overflow-hidden select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="relative z-10 max-w-md space-y-6">
        {/* Brand Icon */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[2px] shadow-2xl shadow-indigo-500/25 mx-auto">
          <div className="w-full h-full bg-[#080d1a] rounded-3xl flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-indigo-400 fill-indigo-400/20" />
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            VESPERA
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </h2>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300 mt-0.5">
            Next-Gen Ephemeral Messaging
          </p>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Select an existing conversation from the sidebar or start a new 1-to-1 or group room. All data strictly purges 24 hours after creation.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all active:scale-95"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>New Direct Chat</span>
          </button>
          <button
            onClick={() => setIsCreateGroupOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all active:scale-95"
          >
            <Users className="w-4 h-4" />
            <span>Create Group</span>
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-3 text-left pt-4">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>24h Ephemeral</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Database and media storage auto-purges expired data.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>RLS Security</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              PostgreSQL Row-Level Security restricts private access.
            </p>
          </div>
        </div>
      </div>

      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onConversationCreated={(id) => router.push(`/chat/${id}`)}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={(id) => router.push(`/chat/${id}`)}
      />
    </div>
  );
}
