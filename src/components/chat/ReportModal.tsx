'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Flag, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ExtendedMessage } from '@/types/database.types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMessage?: ExtendedMessage | null;
  targetUserId?: string | null;
  conversationId?: string | null;
}

export function ReportModal({
  isOpen,
  onClose,
  targetMessage,
  targetUserId,
  conversationId,
}: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('spam');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for the report');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const fullReason = `[Category: ${category.toUpperCase()}] ${reason.trim()}`;
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_user_id: targetUserId || targetMessage?.sender_id || null,
          conversation_id: conversationId || targetMessage?.conversation_id || null,
          reason: fullReason,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setReason('');
          onClose();
        }, 1800);
      } else {
        setError(json.error || 'Failed to submit report');
      }
    } catch {
      setError('Network error while submitting report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Report Content or User"
      description="Help keep Vespera safe. Reports are reviewed by system administrators."
      maxWidth="md"
    >
      {isSuccess ? (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">Report Submitted</h4>
          <p className="text-xs text-slate-300">
            Thank you for helping protect the community. Our administration will review this promptly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Reason Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#070b16] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
            >
              <option value="spam">Spam / Advertising</option>
              <option value="harassment">Harassment / Abusive behavior</option>
              <option value="impersonation">Impersonation / Fake identity</option>
              <option value="illegal">Inappropriate / Illegal content</option>
              <option value="other">Other policy violation</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Detailed Description</label>
            <textarea
              rows={3}
              placeholder="Explain the issue with as much context as possible..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#070b16] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<Flag className="w-3.5 h-3.5" />}
            >
              Submit Report
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
