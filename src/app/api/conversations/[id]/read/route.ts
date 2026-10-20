import { NextResponse } from 'next/server';
import { requireAuth, verifyConversationMembership } from '@/lib/security/authorization';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const auth = await requireAuth();

    const membership = await verifyConversationMembership(conversationId, auth.user.id);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this conversation' }, { status: 403 });
    }

    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    // 1. Update last_read_at in conversation_members
    await supabase
      .from('conversation_members')
      .update({ last_read_at: nowIso })
      .eq('conversation_id', conversationId)
      .eq('user_id', auth.user.id);

    // 2. Insert read receipts for unread messages sent by others
    const { data: unreadMsgs } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .neq('sender_id', auth.user.id)
      .gt('expires_at', nowIso);

    if (unreadMsgs && unreadMsgs.length > 0) {
      const readRows = unreadMsgs.map((m) => ({
        message_id: m.id,
        user_id: auth.user.id,
      }));

      await supabase
        .from('message_reads')
        .upsert(readRows, { onConflict: 'message_id,user_id' });
    }

    return NextResponse.json({ success: true, read_at: nowIso });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
