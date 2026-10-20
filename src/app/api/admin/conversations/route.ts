import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/authorization';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const adminSupabase = createAdminClient();

    let query = adminSupabase
      .from('conversations')
      .select(`
        *,
        members:conversation_members(
          id,
          role,
          user:profiles(id, username, full_name, avatar_url)
        )
      `, { count: 'exact' });

    if (type === 'direct' || type === 'group') {
      query = query.eq('type', type);
    }

    query = query.order('updated_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: conversations, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      conversations: conversations || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden';
    const status = message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
