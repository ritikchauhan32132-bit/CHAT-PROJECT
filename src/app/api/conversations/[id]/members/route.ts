import { NextResponse } from 'next/server';
import { requireAuth, verifyGroupAdminOrOwner } from '@/lib/security/authorization';
import { createClient } from '@/lib/supabase/server';
import { addGroupMemberSchema } from '@/lib/validation/schemas';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const auth = await requireAuth();

    const isAuthorized = await verifyGroupAdminOrOwner(conversationId, auth.user.id);
    if (!isAuthorized && auth.profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only group admins can add members' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = addGroupMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const { user_id } = parsed.data;
    const supabase = await createClient();

    // Check if user is already a member
    const { data: existing } = await supabase
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
    }

    // Add member
    const { error: insertError } = await supabase.from('conversation_members').insert({
      conversation_id: conversationId,
      user_id,
      role: 'member',
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Fetch added user profile for system message
    const { data: addedProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user_id)
      .single();

    // Post system message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: auth.user.id,
      content: `${auth.profile.full_name} added ${addedProfile?.full_name || 'a new member'}`,
      message_type: 'system',
    });

    return NextResponse.json({ success: true });
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

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const isGroupAdmin = await verifyGroupAdminOrOwner(conversationId, auth.user.id);
    const isSelfRemoval = targetUserId === auth.user.id;

    if (!isGroupAdmin && !isSelfRemoval && auth.profile.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
