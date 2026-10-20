import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/authorization';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query) {
      return NextResponse.json({ users: [] });
    }

    const supabase = await createClient();

    // Sanitize search query — strip PostgREST operator chars (commas, parens, dots, backslashes) and SQL wildcards
    const cleanQuery = query.replace(/[%_,().\\]/g, '').trim();

    if (!cleanQuery) {
      return NextResponse.json({ users: [] });
    }

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio, is_online, last_seen')
      .eq('is_active', true)
      .neq('id', auth.user.id)
      .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
