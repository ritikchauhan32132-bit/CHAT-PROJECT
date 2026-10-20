import { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/Spinner';

export const metadata: Metadata = {
  title: 'Sign In | Vespera Chat',
  description: 'Sign in to your Vespera account to access secure real-time messaging.',
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Sign in to resume your secure 24-hour ephemeral conversations"
    >
      <Suspense fallback={<div className="flex justify-center p-8"><Spinner /></div>}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
