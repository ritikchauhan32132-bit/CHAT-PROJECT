import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Vespera | Real-time Ephemeral Messaging',
  description:
    'A production-ready full-stack real-time messaging application with 24-hour automatic retention cycles, PostgreSQL Row-Level Security, and rich media sharing.',
  keywords: ['chat', 'ephemeral', 'realtime', 'supabase', 'nextjs', 'secure messaging'],
  authors: [{ name: 'Vespera Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070a13] text-slate-100 min-h-screen antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        <AuthProvider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#0d1322',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f3f4f6',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
