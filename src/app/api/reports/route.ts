import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/authorization';
import { createClient } from '@/lib/supabase/server';
import { reportUserSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();

    // Rate limit: 5 reports per hour per user
    const rateCheck = await checkRateLimit(`report:${auth.user.id}`, { limit: 5, windowMs: 3600000 });
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'You have submitted too many reports recently. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    const parsed = reportUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid report payload' }, { status: 400 });
    }

    const { reported_user_id, conversation_id, reason } = parsed.data;
    const supabase = await createClient();

    const { data: report, error } = await supabase
      .from('user_reports')
      .insert({
        reporter_id: auth.user.id,
        reported_user_id: reported_user_id || null,
        conversation_id: conversation_id || null,
        reason: reason.trim(),
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, report });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
