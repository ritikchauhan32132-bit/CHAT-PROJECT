import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/authorization';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: conversationId } = await params;
    const adminSupabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // 1. Fetch conversation details & members
    const { data: conv, error: convError } = await adminSupabase
      .from('conversations')
      .select(`
        *,
        members:conversation_members(
          id,
          role,
          joined_at,
          profile:profiles(*)
        )
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // 2. Fetch currently retained unexpired messages (Respecting 24h retention)
    const { data: messages, error: msgError } = await adminSupabase
      .from('messages')
      .select(`
        *,
        sender:profiles(*),
        attachments:message_attachments(*),
        reads:message_reads(*)
      `)
      .eq('conversation_id', conversationId)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: true });

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 400 });
    }

    return NextResponse.json({
      conversation: conv,
      messages: messages || [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden';
    const status = message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
