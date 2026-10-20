'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AvatarUpload } from './AvatarUpload';
import { useAuth } from '@/hooks/useAuth';
import { User, AtSign, CheckCircle2, Shield, AlertCircle } from 'lucide-react';
import { profileUpdateSchema } from '@/lib/validation/schemas';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileFormProps {
  onClose: () => void;
}

function ProfileForm({ onClose }: ProfileFormProps) {
  const { profile, refreshProfile, user } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSuccess(false);

    const validation = profileUpdateSchema.safeParse({
      full_name: fullName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      avatar_url: avatarUrl,
    });

    if (!validation.success) {
      const issue = validation.error.issues[0];
      setError(issue ? issue.message : 'Invalid profile inputs');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          bio: bio.trim(),
          avatar_url: avatarUrl,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        await refreshProfile();
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          onClose();
        }, 1200);
      } else {
        setError(json.error || 'Failed to update profile');
      }
    } catch {
      setError('Network error while updating profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {isSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Profile saved successfully!</span>
        </div>
      )}

      {/* Avatar Upload */}
      <AvatarUpload
        currentUrl={avatarUrl}
        name={fullName || username}
        onAvatarUploaded={(url) => setAvatarUrl(url)}
      />

      <div className="space-y-3 pt-2">
        <Input
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          leftIcon={<User className="w-4 h-4" />}
          required
        />

        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          leftIcon={<AtSign className="w-4 h-4" />}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">Bio / About</label>
          <textarea
            rows={3}
            placeholder="Tell others a little about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-[#070b16] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 resize-none"
            maxLength={250}
          />
          <div className="flex justify-between text-[10px] text-slate-500 px-1">
            <span>Short description shown on direct profiles</span>
            <span>{bio.length}/250</span>
          </div>
        </div>

        {/* Readonly Account Info */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Account Security
          </span>
          <div className="flex justify-between items-center text-xs text-slate-300">
            <span>Email: {user?.email}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              Verified
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="gradient"
          size="sm"
          isLoading={isLoading}
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { profile } = useAuth();

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Profile Settings"
      description="Update your personal details and public identity on Vespera"
      maxWidth="md"
    >
      {isOpen && <ProfileForm key={profile?.id || 'profile'} onClose={onClose} />}
    </Dialog>
  );
}
