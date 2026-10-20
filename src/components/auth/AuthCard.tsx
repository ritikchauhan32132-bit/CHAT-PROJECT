'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Sparkles, MessageSquare } from 'lucide-react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#050811]">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Decorative Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full bg-[#090e1c] rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-indigo-400 fill-indigo-400/20" />
              </div>
            </div>
            <div className="text-left">
              <span className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                VESPERA
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300 block -mt-1">
                24H Ephemeral Chat
              </span>
            </div>
          </Link>

          <h1 className="text-2xl font-bold text-white mt-6 tracking-tight">{title}</h1>
          <p className="text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">{subtitle}</p>
        </div>

        {/* Form Container */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl backdrop-blur-xl">
          {children}
        </div>

        {/* Footer */}
        {footer && <div className="mt-6 text-center text-xs text-slate-400">{footer}</div>}

        {/* Security & Ephemeral Guarantee Pill */}
        <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-slate-500 select-none">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>End-to-End RLS Security</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>24h Auto-Purge</span>
          </div>
        </div>
      </div>
    </div>
  );
}
