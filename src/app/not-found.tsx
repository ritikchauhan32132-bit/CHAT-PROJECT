import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { MessageSquare, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
        <MessageSquare className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-black text-white mb-2">404</h1>
      <h2 className="text-lg font-bold text-slate-200 mb-2">Page Not Found</h2>
      <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
        The page you are looking for might have been moved or may belong to an expired conversation room.
      </p>
      <Link href="/chat">
        <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Return to Vespera Chat
        </Button>
      </Link>
    </div>
  );
}
