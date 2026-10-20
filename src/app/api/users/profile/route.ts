import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/authorization';
import { createClient } from '@/lib/supabase/server';
import { profileUpdateSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    const auth = await requireAuth();
    return NextResponse.json({ profile: auth.profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await request.json();

    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { full_name, username, bio, avatar_url } = parsed.data;
    const supabase = await createClient();

    // Check if new username conflicts with another user
    if (username.toLowerCase() !== auth.profile.username.toLowerCase()) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .neq('id', auth.user.id)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username is already taken by another user' },
          { status: 409 }
        );
      }
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name,
        username: username.toLowerCase(),
        bio: bio ?? '',
        avatar_url: avatar_url ?? auth.profile.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auth.user.id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ profile: updatedProfile });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
