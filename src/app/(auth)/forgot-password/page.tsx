import { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/Spinner';

export const metadata: Metadata = {
  title: 'Forgot Password | Vespera Chat',
  description: 'Recover your Vespera account password securely.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset Password"
      subtitle="Enter your email to receive recovery instructions"
    >
      <Suspense fallback={<div className="flex justify-center p-8"><Spinner /></div>}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
