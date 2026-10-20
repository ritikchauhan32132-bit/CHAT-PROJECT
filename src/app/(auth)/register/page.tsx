import { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/Spinner';

export const metadata: Metadata = {
  title: 'Create Account | Vespera Chat',
  description: 'Join Vespera, the next-generation private ephemeral real-time messaging network.',
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create Account"
      subtitle="Join the ephemeral messaging platform with zero permanent history"
    >
      <Suspense fallback={<div className="flex justify-center p-8"><Spinner /></div>}>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
