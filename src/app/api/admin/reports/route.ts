import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/authorization';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    await requireAdmin();
    const adminSupabase = createAdminClient();

    const { data: reports, error } = await adminSupabase
      .from('user_reports')
      .select(`
        *,
        reporter:profiles!user_reports_reporter_id_fkey(id, username, full_name, avatar_url),
        reported_user:profiles!user_reports_reported_user_id_fkey(id, username, full_name, avatar_url, is_active)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden';
    const status = message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    const body = await request.json();

    const { report_id, status: newStatus } = body;

    if (!report_id || typeof report_id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid report_id' }, { status: 400 });
    }

    const validStatuses = ['reviewed', 'actioned', 'dismissed', 'pending'];
    if (!newStatus || !validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
    };

    // Set reviewed metadata when actioning or dismissing
    if (newStatus === 'actioned' || newStatus === 'dismissed' || newStatus === 'reviewed') {
      updatePayload.reviewed_at = new Date().toISOString();
      updatePayload.reviewed_by = auth.user.id;
    }

    const { data: updatedReport, error } = await adminSupabase
      .from('user_reports')
      .update(updatePayload)
      .eq('id', report_id)
      .select(`
        *,
        reporter:profiles!user_reports_reporter_id_fkey(id, username, full_name, avatar_url),
        reported_user:profiles!user_reports_reported_user_id_fkey(id, username, full_name, avatar_url, is_active)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ report: updatedReport });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden';
    const status = message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
