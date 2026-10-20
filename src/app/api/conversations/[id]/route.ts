import { NextResponse } from 'next/server';
import { requireAuth, verifyConversationMembership, verifyGroupAdminOrOwner } from '@/lib/security/authorization';
import { createClient } from '@/lib/supabase/server';
import { updateGroupChatSchema } from '@/lib/validation/schemas';
import type { ExtendedConversation, Profile, ExtendedConversationMember } from '@/types/database.types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const auth = await requireAuth();

    const membership = await verifyConversationMembership(conversationId, auth.user.id);
    if (!membership && auth.profile.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const supabase = await createClient();

    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        members:conversation_members(
          id,
          conversation_id,
          user_id,
          role,
          joined_at,
          last_read_at,
          profile:profiles(*)
        )
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    let otherUser: Profile | undefined = undefined;
    const members = (conv.members || []) as unknown as ExtendedConversationMember[];

    if (conv.type === 'direct') {
      const otherMember = members.find((m) => m.user_id !== auth.user.id);
      if (otherMember?.profile) {
        otherUser = otherMember.profile;
      }
    }

    const fullConv: ExtendedConversation = {
      ...conv,
      members,
      unread_count: 0,
      other_user: otherUser,
    };

    return NextResponse.json({ conversation: fullConv });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const auth = await requireAuth();

    const isGroupAdmin = await verifyGroupAdminOrOwner(conversationId, auth.user.id);
    if (!isGroupAdmin && auth.profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only group admins can update group settings' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateGroupChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid update data' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: updated, error } = await supabase
      .from('conversations')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ conversation: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const auth = await requireAuth();

    const supabase = await createClient();

    // Remove user from conversation_members
    const { error } = await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', auth.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Post system message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: auth.user.id,
      content: `${auth.profile.full_name} left the group`,
      message_type: 'system',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
