'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Users, MessageSquare, Flag, ArrowLeft, Activity } from 'lucide-react';

export function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: '/admin', label: 'Overview', icon: Activity, exact: true },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/conversations', label: 'Conversations & Chat Viewer', icon: MessageSquare },
    { href: '/admin/reports', label: 'Moderation Reports', icon: Flag },
  ];

  return (
    <header className="h-16 px-6 bg-[#080d1a] border-b border-white/10 flex items-center justify-between select-none">
      <div className="flex items-center gap-6">
        <Link
          href="/chat"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to App
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-tight">VESPERA ADMIN</span>
            <span className="block text-[10px] text-purple-400 uppercase font-semibold -mt-0.5">
              Control Panel
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {links.map((link) => {
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-slate-400 font-medium hidden sm:inline">24h Retention Engine Active</span>
      </div>
    </header>
  );
}
