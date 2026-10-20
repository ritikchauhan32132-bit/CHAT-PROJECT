import React from 'react';
import { requireAdmin } from '@/lib/security/authorization';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';

export const metadata = {
  title: 'Admin Control Center | Vespera',
  description: 'Vespera Platform Administration and Ephemeral Data Retention Monitor',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch {
    redirect('/chat');
  }

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col">
      <AdminNav />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
}
