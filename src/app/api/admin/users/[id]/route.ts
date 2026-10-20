import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/authorization';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    const { id: targetUserId } = await params;
    const body = await request.json();
    const { is_active, role } = body;

    // Prevent self-demotion or self-suspension
    if (targetUserId === auth.user.id && (is_active === false || role === 'user')) {
      return NextResponse.json(
        { error: 'Cannot suspend or demote your own administrator account' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    const updates: {
      is_active?: boolean;
      role?: 'user' | 'admin';
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (typeof is_active === 'boolean') {
      updates.is_active = is_active;
    }
    if (role === 'user' || role === 'admin') {
      updates.role = role;
    }

    const { data: updatedProfile, error } = await adminSupabase
      .from('profiles')
      .update(updates)
      .eq('id', targetUserId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user: updatedProfile });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden';
    const status = message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
