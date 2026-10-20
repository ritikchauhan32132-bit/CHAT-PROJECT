'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminStatsCards } from '@/components/admin/AdminStatsCards';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Trash2, RefreshCw, ShieldCheck, Database, Server, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<{
    totalUsers: number;
    activeUsers: number;
    totalConversations: number;
    activeMessages: number;
    pendingReports: number;
    retentionPolicy: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<{
    deleted_messages_count: number;
    deleted_media_count: number;
  } | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const json = await res.json();
        setStats(json.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRunCleanup = async () => {
    setIsCleaning(true);
    setCleanResult(null);

    try {
      const res = await fetch('/api/admin/cleanup', {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        setCleanResult(json);
        await fetchStats();
      }
    } catch (err) {
      console.error('Cleanup execution failed:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, user management metrics, and 24-hour retention engine status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="glass"
            size="sm"
            onClick={fetchStats}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Telemetry
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunCleanup}
            isLoading={isCleaning}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Execute 24h Purge Now
          </Button>
        </div>
      </div>

      {/* Cleanup Result Notification */}
      {cleanResult && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div className="text-xs">
              <span className="font-bold text-white">Manual 24h Cleanup Completed Successfully!</span>
              <p className="text-slate-300 mt-0.5">
                Purged {cleanResult.deleted_messages_count} expired database messages and {cleanResult.deleted_media_count} storage media files.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      {isLoading && !stats ? (
        <div className="p-12 flex justify-center">
          <Spinner size="lg" className="text-purple-400" />
        </div>
      ) : stats ? (
        <AdminStatsCards stats={stats} />
      ) : null}

      {/* System Architecture & Security Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="glass" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>Row-Level Security</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All database tables enforce strict PostgreSQL RLS policies. Normal users cannot access conversations or media they are not explicitly members of.
          </p>
          <div className="pt-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/20">
              Active & Enforced
            </span>
          </div>
        </Card>

        <Card variant="glass" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
            <Clock className="w-5 h-5" />
            <span>24h Ephemeral Engine</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Messages are automatically stamped with <code className="text-purple-300 bg-purple-950/60 px-1 py-0.5 rounded">expires_at = now() + 24h</code>. Cleanup worker deletes both database records and storage objects.
          </p>
          <div className="pt-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-400 font-semibold border border-indigo-500/20">
              Zero Permanent Retention
            </span>
          </div>
        </Card>

        <Card variant="glass" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Database className="w-5 h-5" />
            <span>Supabase Realtime</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            WebSocket broadcast and postgres_changes listeners manage message streams, presence tracking, and typing waveforms with zero polling overhead.
          </p>
          <div className="pt-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 font-semibold border border-cyan-500/20">
              Low Latency Stream
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
