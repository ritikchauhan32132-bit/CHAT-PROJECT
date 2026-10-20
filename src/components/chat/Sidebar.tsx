'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { MessageSquare, Shield, Settings, LogOut, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  onOpenProfile: () => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
}

export function Sidebar({ onOpenProfile, isSoundEnabled, onToggleSound }: SidebarProps) {
  const pathname = usePathname();
  const { profile, isAdmin, logout } = useAuth();

  const isChatActive = pathname.startsWith('/chat');
  const isAdminActive = pathname.startsWith('/admin');

  return (
    <div className="hidden sm:flex flex-col items-center justify-between w-16 md:w-18 h-full bg-[#050811] border-r border-white/10 py-5 z-30 select-none">
      {/* Top: Brand Logo */}
      <div className="flex flex-col items-center gap-6">
        <Link href="/chat" className="group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <div className="w-full h-full bg-[#080d1a] rounded-2xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
            </div>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="flex flex-col items-center gap-3">
          {/* Chat Link */}
          <Link
            href="/chat"
            className={`p-3 rounded-2xl transition-all duration-150 ${
              isChatActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Messages"
          >
            <MessageSquare className="w-5 h-5" />
          </Link>

          {/* Admin Dashboard Link (Only visible if admin) */}
          {isAdmin && (
            <Link
              href="/admin"
              className={`p-3 rounded-2xl transition-all duration-150 ${
                isAdminActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-purple-300 hover:bg-purple-500/10'
              }`}
              title="Admin Dashboard"
            >
              <Shield className="w-5 h-5 text-purple-400" />
            </Link>
          )}

          {/* Sound Notification Toggle */}
          <button
            onClick={onToggleSound}
            className="p-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title={isSoundEnabled ? 'Mute notification sounds' : 'Enable notification sounds'}
          >
            {isSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          </button>
        </nav>
      </div>

      {/* Bottom: Profile Settings & Logout */}
      <div className="flex flex-col items-center gap-3">
        {/* User Profile Avatar / Modal Trigger */}
        <button
          onClick={onOpenProfile}
          className="relative group p-0.5 rounded-full hover:ring-2 hover:ring-indigo-500/50 transition-all cursor-pointer"
          title="Edit Profile Settings"
        >
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || profile?.username}
            size="md"
            isOnline={true}
            showOnlineStatus
          />
        </button>

        {/* Logout Button */}
        <button
          onClick={() => logout()}
          className="p-3 rounded-2xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
