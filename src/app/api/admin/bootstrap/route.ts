import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { adminBootstrapSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = adminBootstrapSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid bootstrap request' }, { status: 400 });
    }

    const { secret, user_email } = parsed.data;
    const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid bootstrap secret' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // 1. First attempt direct atomic RPC call (scales to unlimited users)
    const { data: rpcResult, error: rpcError } = await adminSupabase.rpc(
      'promote_user_to_admin',
      { p_user_email: user_email.trim() }
    );

    if (!rpcError && rpcResult) {
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        message: `User ${user_email} successfully promoted to administrator.`,
        profile,
      });
    }

    // 2. Fallback to auth.admin API lookup if RPC is not present
    const { data: usersData, error: userError } = await adminSupabase.auth.admin.listUsers({
      perPage: 1000,
    });
    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    const targetUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === user_email.toLowerCase().trim()
    );

    if (!targetUser) {
      return NextResponse.json(
        { error: `No registered user found with email ${user_email}. User must register first.` },
        { status: 404 }
      );
    }

    // Update profile role to 'admin'
    const { data: updatedProfile, error: updateError } = await adminSupabase
      .from('profiles')
      .update({ role: 'admin', updated_at: new Date().toISOString() })
      .eq('id', targetUser.id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `User ${user_email} successfully promoted to administrator.`,
      profile: updatedProfile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bootstrap error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
