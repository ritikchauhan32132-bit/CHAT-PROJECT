import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/authorization';
import { createClient } from '@/lib/supabase/server';
import { createGroupChatSchema } from '@/lib/validation/schemas';
import type { ExtendedConversation, Profile, ExtendedConversationMember } from '@/types/database.types';

export async function GET() {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();

    // 1. Get all conversation memberships for current user
    const { data: myMemberships, error: memberError } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at, role')
      .eq('user_id', auth.user.id);

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }

    if (!myMemberships || myMemberships.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const convIds = myMemberships.map((m) => m.conversation_id);

    // 2. Fetch conversations and all their members
    const { data: convData, error: convError } = await supabase
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
      .in('id', convIds)
      .order('updated_at', { ascending: false });

    if (convError) {
      return NextResponse.json({ error: convError.message }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    // 3. For each conversation, fetch the latest unexpired message and compute unread count
    const enrichedConversations: ExtendedConversation[] = await Promise.all(
      (convData || []).map(async (conv) => {
        const myMembership = myMemberships.find((m) => m.conversation_id === conv.id);
        const lastReadAt = myMembership?.last_read_at || conv.created_at;

        // Fetch latest active message
        const { data: latestMsgs } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles(*),
            attachments:message_attachments(*)
          `)
          .eq('conversation_id', conv.id)
          .gt('expires_at', nowIso)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMessage = latestMsgs && latestMsgs.length > 0 ? latestMsgs[0] : null;

        // Count unread active messages
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .gt('expires_at', nowIso)
          .gt('created_at', lastReadAt)
          .neq('sender_id', auth.user.id);

        // Find other user for direct chat
        let otherUser: Profile | undefined = undefined;
        const members = (conv.members || []) as unknown as ExtendedConversationMember[];

        if (conv.type === 'direct') {
          const otherMember = members.find((m) => m.user_id !== auth.user.id);
          if (otherMember?.profile) {
            otherUser = otherMember.profile;
          }
        }

        return {
          ...conv,
          members,
          last_message: lastMessage as unknown as ExtendedConversation['last_message'],
          unread_count: unreadCount || 0,
          other_user: otherUser,
        };
      })
    );

    return NextResponse.json({ conversations: enrichedConversations });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();

    // Rate limit group creation: 20 per minute per user
    const rateCheck = await checkRateLimit(`conv-create:${auth.user.id}`, { limit: 20, windowMs: 60000 });
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'You are creating conversations too quickly. Please slow down.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    const parsed = createGroupChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, description, avatar_url, member_ids } = parsed.data;
    const adminSupabase = createAdminClient();

    // 1. Create conversation record
    const { data: newConv, error: convError } = await adminSupabase
      .from('conversations')
      .insert({
        type: 'group',
        name,
        description: description || '',
        avatar_url: avatar_url || null,
        created_by: auth.user.id,
      })
      .select('*')
      .single();

    if (convError || !newConv) {
      return NextResponse.json({ error: convError?.message || 'Failed to create group' }, { status: 500 });
    }

    // 2. Add creator as 'owner' and other members as 'member'
    const uniqueMembers = Array.from(new Set([auth.user.id, ...member_ids]));
    const memberRows = uniqueMembers.map((userId) => ({
      conversation_id: newConv.id,
      user_id: userId,
      role: userId === auth.user.id ? ('owner' as const) : ('member' as const),
    }));

    const { error: memberError } = await adminSupabase.from('conversation_members').insert(memberRows);

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    // 3. Post system message
    await adminSupabase.from('messages').insert({
      conversation_id: newConv.id,
      sender_id: auth.user.id,
      content: `${auth.profile.full_name} created the group "${name}"`,
      message_type: 'system',
    });

    return NextResponse.json({ conversation: newConv });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

