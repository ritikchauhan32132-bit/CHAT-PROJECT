import { createClient } from '@/lib/supabase/server';
import type { Profile, ConversationMember } from '@/types/database.types';

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  profile: Profile;
}

export async function getAuthenticatedUser(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile as Profile,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    throw new Error('UNAUTHORIZED');
  }
  if (!auth.profile.is_active) {
    throw new Error('ACCOUNT_SUSPENDED');
  }
  return auth;
}

export async function requireAdmin(): Promise<AuthContext> {
  const auth = await requireAuth();
  if (auth.profile.role !== 'admin') {
    throw new Error('FORBIDDEN_NOT_ADMIN');
  }
  return auth;
}

export async function verifyConversationMembership(
  conversationId: string,
  userId: string
): Promise<ConversationMember | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('conversation_members')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as ConversationMember;
}

export async function verifyGroupAdminOrOwner(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const member = await verifyConversationMembership(conversationId, userId);
  if (!member) return false;
  return member.role === 'admin' || member.role === 'owner';
}
