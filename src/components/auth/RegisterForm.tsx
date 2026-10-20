'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/hooks/useSupabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, User, AtSign, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { registerSchema } from '@/lib/validation/schemas';

export function RegisterForm() {
  const supabase = useSupabase();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [websiteHp, setWebsiteHp] = useState(''); // Bot honeypot

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic Password Strength
  const passwordCriteria = useMemo(() => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordCriteria.length) score += 1;
    if (passwordCriteria.uppercase) score += 1;
    if (passwordCriteria.lowercase) score += 1;
    if (passwordCriteria.number) score += 1;
    if (passwordCriteria.special) score += 1;
    return score;
  }, [passwordCriteria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Anti-bot honeypot check
    if (websiteHp) {
      setError('Bot activity detected');
      return;
    }

    const validation = registerSchema.safeParse({
      fullName,
      username,
      email,
      password,
      confirmPassword,
      website_hp: websiteHp,
    });

    if (!validation.success) {
      const issue = validation.error.issues[0];
      setError(issue ? issue.message : 'Invalid registration inputs');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Check if username is already taken in profiles table
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username.trim())
        .maybeSingle();

      if (existingUser) {
        setError('This username is already taken. Please choose another.');
        setIsLoading(false);
        return;
      }

      // 2. Perform Supabase Auth registration
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            username: username.trim().toLowerCase(),
          },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered')) {
          setError('An account with this email address already exists. Please sign in.');
        } else {
          setError(signUpError.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        setIsSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white">Verification Email Sent</h3>
        <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
          We&apos;ve sent a secure verification link to <strong className="text-indigo-300">{email}</strong>. Please check your inbox (and spam folder) to confirm your account.
        </p>
        <div className="pt-4">
          <Link href="/login">
            <Button variant="primary" className="w-full">
              Proceed to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-rose-300 text-xs animate-in fade-in duration-200"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
          <div className="leading-relaxed font-medium">{error}</div>
        </div>
      )}

      {/* Hidden honeypot field for anti-bot protection */}
      <input
        type="text"
        name="website_hp"
        id="register-website-hp"
        value={websiteHp}
        onChange={(e) => setWebsiteHp(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          id="register-full-name"
          label="Full Name"
          type="text"
          placeholder="Alex Vance"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          leftIcon={<User className="w-4 h-4" aria-hidden="true" />}
          required
          autoComplete="name"
        />

        <Input
          id="register-username"
          label="Username"
          type="text"
          placeholder="alex_v"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          leftIcon={<AtSign className="w-4 h-4" aria-hidden="true" />}
          required
          autoComplete="username"
        />
      </div>

      <Input
        id="register-email"
        label="Email Address"
        type="email"
        placeholder="alex@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        leftIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
        required
        autoComplete="email"
      />

      <div>
        <Input
          id="register-password"
          label="Password"
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

        {/* Password Strength Indicator Bar */}
        {password.length > 0 && (
          <div className="mt-2 space-y-1.5" aria-live="polite">
            <div className="flex gap-1 h-1.5 w-full">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`h-full flex-1 rounded-full transition-all duration-300 ${
                    strengthScore >= level
                      ? strengthScore <= 2
                        ? 'bg-rose-500'
                        : strengthScore <= 4
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-400 pt-1">
              <span
                className={`flex items-center gap-1 ${
                  passwordCriteria.length ? 'text-emerald-400' : ''
                }`}
              >
                <CheckCircle2 className="w-3 h-3" /> Min 8 characters
              </span>
              <span
                className={`flex items-center gap-1 ${
                  passwordCriteria.uppercase ? 'text-emerald-400' : ''
                }`}
              >
                <CheckCircle2 className="w-3 h-3" /> Uppercase letter
              </span>
              <span
                className={`flex items-center gap-1 ${
                  passwordCriteria.number ? 'text-emerald-400' : ''
                }`}
              >
                <CheckCircle2 className="w-3 h-3" /> Number
              </span>
              <span
                className={`flex items-center gap-1 ${
                  passwordCriteria.special ? 'text-emerald-400' : ''
                }`}
              >
                <CheckCircle2 className="w-3 h-3" /> Special character
              </span>
            </div>
          </div>
        )}
      </div>

      <Input
        id="register-confirm-password"
        label="Confirm Password"
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
        className="w-full mt-3"
        size="lg"
        isLoading={isLoading}
        rightIcon={<ArrowRight className="w-4 h-4" />}
      >
        Create Vespera Account
      </Button>

      <div className="text-center pt-2">
        <p className="text-xs text-slate-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors focus:outline-none focus:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </form>
  );
}
