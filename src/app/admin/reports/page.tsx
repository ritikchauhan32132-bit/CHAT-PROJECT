'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatRelativeTime } from '@/lib/utils/formatters';
import {
  Flag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Ban,
  Undo2,
} from 'lucide-react';

interface ReportProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_active?: boolean;
}

interface EnrichedReport {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  conversation_id: string | null;
  reason: string;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reporter?: ReportProfile | null;
  reported_user?: ReportProfile | null;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<EnrichedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/reports');
      if (res.ok) {
        const json = await res.json();
        setReports(json.reports || []);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    setActioningId(reportId);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, status: newStatus }),
      });

      if (res.ok) {
        const json = await res.json();
        // Replace the updated report in state
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? json.report : r))
        );
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.error('Failed to update report:', errJson.error);
      }
    } catch (err) {
      console.error('Failed to update report:', err);
    } finally {
      setActioningId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="amber">
            <AlertTriangle className="w-3 h-3" /> Pending
          </Badge>
        );
      case 'actioned':
        return (
          <Badge variant="emerald">
            <CheckCircle2 className="w-3 h-3" /> Actioned
          </Badge>
        );
      case 'reviewed':
        return (
          <Badge variant="glass">
            <ShieldCheck className="w-3 h-3" /> Reviewed
          </Badge>
        );
      case 'dismissed':
        return (
          <Badge variant="glass">
            <XCircle className="w-3 h-3" /> Dismissed
          </Badge>
        );
      default:
        return <Badge variant="glass">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Moderation Reports</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review abuse, spam, and safety reports submitted by platform members
          </p>
        </div>

        <Button
          variant="glass"
          size="sm"
          onClick={fetchReports}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Reports
        </Button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#090e1c]/80 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] text-slate-400 font-semibold border-b border-white/10 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Report Details</th>
                <th className="py-3.5 px-4">Reporter</th>
                <th className="py-3.5 px-4">Reported User</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Reported At</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Spinner size="md" className="mx-auto mb-2 text-purple-400" />
                    Loading reports...
                  </td>
                </tr>
              ) : reports.length > 0 ? (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Report Reason */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-white truncate">{report.reason}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        ID: {report.id.substring(0, 8)}…
                      </p>
                    </td>

                    {/* Reporter Info */}
                    <td className="py-3.5 px-4">
                      {report.reporter ? (
                        <div>
                          <p className="font-medium text-white text-xs">
                            {report.reporter.full_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            @{report.reporter.username}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[10px] font-mono">
                          {report.reporter_id?.substring(0, 8) || 'N/A'}
                        </span>
                      )}
                    </td>

                    {/* Reported User Info */}
                    <td className="py-3.5 px-4">
                      {report.reported_user ? (
                        <div>
                          <p className="font-medium text-white text-xs">
                            {report.reported_user.full_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            @{report.reported_user.username}
                          </p>
                          {report.reported_user.is_active === false && (
                            <span className="text-[9px] text-rose-400 font-semibold uppercase tracking-wider">
                              Suspended
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[10px] font-mono">
                          {report.reported_user_id?.substring(0, 8) || 'N/A'}
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(report.status)}
                      {report.reviewed_at && (
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          Reviewed {formatRelativeTime(report.reviewed_at)}
                        </p>
                      )}
                    </td>

                    {/* Reported At */}
                    <td className="py-3.5 px-4 text-slate-400">
                      {formatRelativeTime(report.created_at)}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {report.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateReportStatus(report.id, 'actioned')}
                              disabled={actioningId === report.id}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/20 text-[11px] font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                              title="Mark as actioned (take action against reported user)"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Action
                            </button>
                            <button
                              onClick={() => updateReportStatus(report.id, 'dismissed')}
                              disabled={actioningId === report.id}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-500/15 text-slate-300 hover:bg-slate-500/25 border border-slate-500/20 text-[11px] font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                              title="Dismiss this report (no action needed)"
                            >
                              <XCircle className="w-3 h-3" />
                              Dismiss
                            </button>
                          </>
                        )}
                        {(report.status === 'actioned' || report.status === 'dismissed' || report.status === 'reviewed') && (
                          <button
                            onClick={() => updateReportStatus(report.id, 'pending')}
                            disabled={actioningId === report.id}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/20 text-[11px] font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                            title="Reopen this report"
                          >
                            <Undo2 className="w-3 h-3" />
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No reports in moderation queue
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
