import React from 'react';
import { Card } from '@/components/ui/Card';
import { Users, UserCheck, MessageSquare, Clock, ShieldCheck, Flag } from 'lucide-react';

interface StatsProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalConversations: number;
    activeMessages: number;
    pendingReports: number;
    retentionPolicy: string;
  };
}

export function AdminStatsCards({ stats }: StatsProps) {
  const cards = [
    {
      title: 'Total Registered Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-600/10 border-indigo-500/20',
      subtext: `${stats.activeUsers} active accounts`,
    },
    {
      title: 'Active Conversations',
      value: stats.totalConversations,
      icon: MessageSquare,
      color: 'text-purple-400',
      bgColor: 'bg-purple-600/10 border-purple-500/20',
      subtext: 'Direct & Group rooms',
    },
    {
      title: '24h Retained Messages',
      value: stats.activeMessages,
      icon: Clock,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-600/10 border-cyan-500/20',
      subtext: 'Auto-purged after 24 hours',
    },
    {
      title: 'Pending Moderation',
      value: stats.pendingReports,
      icon: Flag,
      color: stats.pendingReports > 0 ? 'text-amber-400' : 'text-emerald-400',
      bgColor: stats.pendingReports > 0 ? 'bg-amber-600/10 border-amber-500/20' : 'bg-emerald-600/10 border-emerald-500/20',
      subtext: stats.pendingReports > 0 ? 'Action required' : 'All clear',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} variant="glass" className="p-5 border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">{card.title}</span>
              <div className={`p-2 rounded-xl border ${card.bgColor} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-white">{card.value}</span>
              <p className="text-[11px] text-slate-400 mt-1">{card.subtext}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
