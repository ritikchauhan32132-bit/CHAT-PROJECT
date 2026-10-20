import { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/Spinner';

export const metadata: Metadata = {
  title: 'Set New Password | Vespera Chat',
  description: 'Choose a new password for your Vespera account.',
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Set New Password"
      subtitle="Create a strong, unique password for your account"
    >
      <Suspense fallback={<div className="flex justify-center p-8"><Spinner /></div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
