'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/hooks/useSupabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { forgotPasswordSchema } from '@/lib/validation/schemas';

export function ForgotPasswordForm() {
  const supabase = useSupabase();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setIsLoading(false);
        return;
      }

      setIsSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send recovery email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white">Check Your Inbox</h3>
        <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
          We&apos;ve sent password reset instructions to <strong className="text-indigo-300">{email}</strong>.
        </p>
        <div className="pt-4">
          <Link href="/login">
            <Button variant="secondary" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-rose-300 text-xs animate-in fade-in duration-200"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
          <div className="leading-relaxed font-medium">{error}</div>
        </div>
      )}

      <Input
        id="forgot-email"
        label="Email Address"
        type="email"
        placeholder="name@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        leftIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
        required
        autoComplete="email"
      />

      <Button
        type="submit"
        variant="gradient"
        className="w-full mt-2"
        size="lg"
        isLoading={isLoading}
        rightIcon={<Send className="w-4 h-4" />}
      >
        Send Reset Link
      </Button>

      <div className="text-center pt-2">
        <Link
          href="/login"
          className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition-colors focus:outline-none focus:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
      </div>
    </form>
  );
}
