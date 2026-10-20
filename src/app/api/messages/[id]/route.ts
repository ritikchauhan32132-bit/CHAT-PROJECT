import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/authorization';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const auth = await requireAuth();
    const supabase = await createClient();

    // Verify ownership or admin
    const { data: msg, error: fetchError } = await supabase
      .from('messages')
      .select('id, sender_id, conversation_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (msg.sender_id !== auth.user.id && auth.profile.role !== 'admin') {
      return NextResponse.json({ error: 'Cannot delete another user\'s message' }, { status: 403 });
    }

    // Soft delete message
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        deleted_at: new Date().toISOString(),
        content: 'This message was deleted',
      })
      .eq('id', messageId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
