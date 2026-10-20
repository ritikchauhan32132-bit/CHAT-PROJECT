import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/authorization';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createDirectChatSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();

    // Rate limit: 20 conversation creations per minute per user
    const rateCheck = await checkRateLimit(`conv-create:${auth.user.id}`, { limit: 20, windowMs: 60000 });
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'You are creating conversations too quickly. Please slow down.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    const parsed = createDirectChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid target user ID' }, { status: 400 });
    }

    const { target_user_id } = parsed.data;

    if (target_user_id === auth.user.id) {
      return NextResponse.json({ error: 'Cannot start chat with yourself' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Primary path: Use the atomic SECURITY DEFINER PostgreSQL stored procedure
    // This executes on the database with elevated privileges to safely bypass
    // the chicken-and-egg RLS insert check for the other participant.
    try {
      const { data: convId, error: rpcError } = await supabase.rpc(
        'get_or_create_direct_conversation',
        { p_target_user_id: target_user_id }
      );

      if (!rpcError && convId) {
        return NextResponse.json({ conversation_id: convId });
      }

      if (rpcError) {
        console.warn('Direct chat RPC failed, attempting server-side provision fallback:', rpcError.message);
      }
    } catch (rpcErr) {
      console.warn('RPC invocation error:', rpcErr);
    }

    // 2. Server-side Fallback using Admin Client (Service Role)
    // Ensures direct chat creation succeeds reliably even if RPC function is missing
    const adminSupabase = createAdminClient();

    // Verify target user exists and is active
    const { data: targetProfile, error: targetError } = await adminSupabase
      .from('profiles')
      .select('id, is_active')
      .eq('id', target_user_id)
      .maybeSingle();

    if (targetError || !targetProfile || !targetProfile.is_active) {
      return NextResponse.json({ error: 'Target user not found or account is suspended' }, { status: 404 });
    }

    // Check if direct conversation already exists between these 2 users
    const { data: myMemberships } = await adminSupabase
      .from('conversation_members')
      .select('conversation_id, conversations!inner(type)')
      .eq('user_id', auth.user.id)
      .eq('conversations.type', 'direct');

    if (myMemberships && myMemberships.length > 0) {
      const convIds = myMemberships.map((m) => m.conversation_id);

      const { data: sharedMembership } = await adminSupabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', target_user_id)
        .in('conversation_id', convIds)
        .maybeSingle();

      if (sharedMembership) {
        return NextResponse.json({ conversation_id: sharedMembership.conversation_id });
      }
    }

    // Create new direct conversation
    const { data: newConv, error: convError } = await adminSupabase
      .from('conversations')
      .insert({
        type: 'direct',
        created_by: auth.user.id,
      })
      .select('id')
      .single();

    if (convError || !newConv) {
      return NextResponse.json({ error: convError?.message || 'Failed to create conversation' }, { status: 500 });
    }

    // Add both members via admin client to prevent RLS insert violation
    const { error: memberError } = await adminSupabase.from('conversation_members').insert([
      { conversation_id: newConv.id, user_id: auth.user.id, role: 'member' },
      { conversation_id: newConv.id, user_id: target_user_id, role: 'member' },
    ]);

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ conversation_id: newConv.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

