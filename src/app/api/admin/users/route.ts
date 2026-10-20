import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/authorization';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim() || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const adminSupabase = createAdminClient();

    let query = adminSupabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (search) {
      const clean = search.replace(/[%_]/g, '');
      query = query.or(`username.ilike.%${clean}%,full_name.ilike.%${clean}%`);
    }

    if (role === 'user' || role === 'admin') {
      query = query.eq('role', role);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'suspended') {
      query = query.eq('is_active', false);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: users, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden';
    const status = message.includes('FORBIDDEN') ? 403 : message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
