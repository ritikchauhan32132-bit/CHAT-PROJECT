'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/hooks/useSupabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { resetPasswordSchema } from '@/lib/validation/schemas';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabase();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function checkRecoverySession() {
      try {
        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr && isMounted) {
            console.warn('Recovery code exchange note:', exchangeErr.message);
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session && !code && isMounted) {
          // If no session and no code, warn the user
          setError('No active password reset session found. Please use the link sent to your email.');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Session verify error:', err);
        }
      } finally {
        if (isMounted) {
          setIsVerifyingCode(false);
        }
      }
    }

    checkRecoverySession();
    return () => {
      isMounted = false;
    };
  }, [searchParams, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setError(issue ? issue.message : 'Invalid password');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push('/chat');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password update failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white">Password Updated!</h3>
        <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
          Your password has been successfully reset. Redirecting you to Vespera...
        </p>
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
        id="reset-password"
        label="New Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-1 text-slate-400 hover:text-slate-200 focus:outline-none focus:text-indigo-300 transition-colors rounded cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        }
        required
        autoComplete="new-password"
      />

      <Input
        id="reset-confirm-password"
        label="Confirm New Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-1 text-slate-400 hover:text-slate-200 focus:outline-none focus:text-indigo-300 transition-colors rounded cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        }
        required
        autoComplete="new-password"
      />

      <Button
        type="submit"
        variant="gradient"
        className="w-full mt-2"
        size="lg"
        isLoading={isLoading}
      >
        Save New Password
      </Button>
    </form>
  );
}
