import Link from 'next/link';
import {
  MessageSquare,
  ShieldCheck,
  Clock,
  Zap,
  Users,
  Image as ImageIcon,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 relative overflow-hidden flex flex-col justify-between">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Decorative Matrix Grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Navigation Header */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <div className="w-full h-full bg-[#080d1a] rounded-2xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
            </div>
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              VESPERA
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-300 block -mt-1">
              Ephemeral Chat
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="gradient" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20 text-center flex-1 flex flex-col justify-center">
        {/* Release / Feature Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 mx-auto mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Strict 24-Hour Automated Message Deletion</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6">
          Real-Time Messaging with{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400">
            Zero Permanent History
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
          Vespera is a full-stack, multi-user messaging application engineered for private, ephemeral communications. Every text, image, and video automatically self-destructs from database and storage after 24 hours.
        </p>

        {/* CTA Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link href="/register" className="w-full sm:w-auto">
            <Button
              variant="gradient"
              size="lg"
              className="w-full sm:w-auto px-8 py-3.5 text-base shadow-xl shadow-purple-500/20"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start Chatting Now
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="glass" size="lg" className="w-full sm:w-auto px-8 py-3.5 text-base">
              Existing User Login
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white">24h Auto-Purge</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              PostgreSQL scheduled workers purge expired messages and storage binaries automatically.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white">Realtime Engine</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sub-millisecond WebSocket delivery, live typing waveforms, presence, and read receipts.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white">Row-Level Security</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Guaranteed isolation. Direct and group rooms cannot be read by unauthorized users.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white">Groups & Media</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full-featured group management, roles, rich photos, inline videos, and encrypted files.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Vespera. All ephemeral messages auto-delete in 24 hours.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              Register
            </Link>
            <Link href="/admin" className="hover:text-purple-300 transition-colors">
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
