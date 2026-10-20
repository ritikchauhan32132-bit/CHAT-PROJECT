import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/authorization';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    await requireAdmin();
    const adminSupabase = createAdminClient();
    const nowIso = new Date().toISOString();

    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalConversations },
      { count: activeMessages },
      { count: pendingReports },
    ] = await Promise.all([
      adminSupabase.from('profiles').select('*', { count: 'exact', head: true }),
      adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      adminSupabase.from('conversations').select('*', { count: 'exact', head: true }),
      adminSupabase.from('messages').select('*', { count: 'exact', head: true }).gt('expires_at', nowIso),
      adminSupabase.from('user_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalConversations: totalConversations || 0,
        activeMessages: activeMessages || 0,
        pendingReports: pendingReports || 0,
        retentionPolicy: '24 Hours Automatic Ephemeral Purge',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden';
    const status = message.includes('FORBIDDEN') ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
