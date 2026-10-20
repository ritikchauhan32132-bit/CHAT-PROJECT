import { NextResponse } from 'next/server';
import { requireAuth, verifyConversationMembership } from '@/lib/security/authorization';
import { createClient } from '@/lib/supabase/server';
import { sendMessageSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rate-limit';
import type { ExtendedMessage, MessageAttachment } from '@/types/database.types';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const membership = await verifyConversationMembership(conversationId, auth.user.id);
    if (!membership && auth.profile.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(*),
        attachments:message_attachments(*),
        reads:message_reads(*)
      `)
      .eq('conversation_id', conversationId)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Enrich replies via single batched lookup (prevents N+1 query pattern)
    const replyIds = Array.from(
      new Set(
        (messages || [])
          .map((m) => m.reply_to_message_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const replyMap = new Map<string, ExtendedMessage['reply_to']>();
    if (replyIds.length > 0) {
      const { data: replyData } = await supabase
        .from('messages')
        .select('id, content, message_type, sender:profiles(id, full_name, username)')
        .in('id', replyIds);

      (replyData || []).forEach((r) => {
        replyMap.set(r.id, r as unknown as ExtendedMessage['reply_to']);
      });
    }

    const enrichedMessages: ExtendedMessage[] = (messages || []).map((msg) => ({
      ...msg,
      reply_to: msg.reply_to_message_id ? replyMap.get(msg.reply_to_message_id) || null : null,
    })) as unknown as ExtendedMessage[];

    // Return chronological order (oldest to newest for chat view)
    const reversed = [...enrichedMessages].reverse();
    const nextCursor = messages && messages.length === limit ? messages[messages.length - 1].created_at : null;

    return NextResponse.json({
      messages: reversed,
      next_cursor: nextCursor,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();

    // Anti-abuse rate limit: 30 messages per 30 seconds
    const rateCheck = await checkRateLimit(`msg:${auth.user.id}`, { limit: 30, windowMs: 30000 });
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'You are sending messages too quickly. Please slow down.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid message payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { conversation_id, content, message_type, reply_to_message_id, attachments } = parsed.data;

    const membership = await verifyConversationMembership(conversation_id, auth.user.id);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this conversation' }, { status: 403 });
    }

    const supabase = await createClient();

    // 24 hours retention by default; test-only expiration configuration allowed ONLY in non-production
    const now = new Date();
    const testHoursEnv =
      process.env.NODE_ENV !== 'production' && process.env.EPHEMERAL_TEST_HOURS
        ? parseFloat(process.env.EPHEMERAL_TEST_HOURS)
        : null;
    const expirationHours = testHoursEnv && !isNaN(testHoursEnv) && testHoursEnv > 0 ? testHoursEnv : 24;
    const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000).toISOString();

    // 1. Insert message
    const { data: newMessage, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_id: auth.user.id,
        content: content.trim(),
        message_type,
        reply_to_message_id: reply_to_message_id || null,
        created_at: now.toISOString(),
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (msgError || !newMessage) {
      return NextResponse.json({ error: msgError?.message || 'Failed to send message' }, { status: 500 });
    }

    // 2. Insert attachments if present
    let savedAttachments: MessageAttachment[] = [];
    if (attachments && attachments.length > 0) {
      const attachmentRows = attachments.map((att) => ({
        message_id: newMessage.id,
        conversation_id,
        storage_path: att.storage_path,
        file_name: att.file_name,
        mime_type: att.mime_type,
        file_size: att.file_size,
      }));

      const { data: attData, error: attError } = await supabase
        .from('message_attachments')
        .insert(attachmentRows)
        .select('*');

      if (attError) {
        console.error('Error inserting attachments:', attError);
      } else {
        savedAttachments = (attData || []) as MessageAttachment[];
      }
    }

    // 3. Update conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: now.toISOString() })
      .eq('id', conversation_id);

    // 4. Return full enriched message object
    const fullMessage: ExtendedMessage = {
      ...newMessage,
      sender: auth.profile,
      attachments: savedAttachments,
      reads: [],
    };

    return NextResponse.json({ message: fullMessage });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
