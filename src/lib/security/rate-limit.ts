import { createAdminClient } from '@/lib/supabase/admin';

export interface RateLimitOptions {
  limit: number;
  windowMs: number; // e.g. 60000 for 1 minute
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Database-backed rate limiting using the existing `rate_limits` table.
 *
 * Uses an upsert (INSERT ... ON CONFLICT) strategy:
 * - If a record exists for `identifier` with a future `reset_at`, increment the counter.
 * - If none exists or the window has elapsed, start a new window with count = 1.
 * - Returns whether the request is allowed.
 *
 * Falls back to an in-memory Map if the database call fails (e.g. Supabase is unreachable).
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 60, windowMs: 60000 }
): Promise<RateLimitResult> {
  try {
    return await checkRateLimitDatabase(identifier, options);
  } catch (err) {
    console.warn('Database rate-limit check failed, using in-memory fallback:', err);
    return checkRateLimitMemory(identifier, options);
  }
}

async function checkRateLimitDatabase(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const adminSupabase = createAdminClient();
  const now = new Date();
  const resetAt = new Date(now.getTime() + options.windowMs);

  // 1. Try to find an existing window that hasn't expired
  const { data: existing, error: selectError } = await adminSupabase
    .from('rate_limits')
    .select('id, count, reset_at')
    .eq('key', identifier)
    .gt('reset_at', now.toISOString())
    .order('reset_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    // Active window exists — check if over limit
    if (existing.count >= options.limit) {
      return {
        success: false,
        remaining: 0,
        reset: new Date(existing.reset_at).getTime(),
      };
    }

    // Increment counter
    const newCount = existing.count + 1;
    await adminSupabase
      .from('rate_limits')
      .update({ count: newCount })
      .eq('id', existing.id);

    return {
      success: true,
      remaining: options.limit - newCount,
      reset: new Date(existing.reset_at).getTime(),
    };
  }

  // 2. No active window — clean up expired records for this key and start fresh
  await adminSupabase
    .from('rate_limits')
    .delete()
    .eq('key', identifier)
    .lte('reset_at', now.toISOString());

  const { error: insertError } = await adminSupabase
    .from('rate_limits')
    .insert({
      key: identifier,
      count: 1,
      reset_at: resetAt.toISOString(),
    });

  if (insertError) {
    throw insertError;
  }

  return {
    success: true,
    remaining: options.limit - 1,
    reset: resetAt.getTime(),
  };
}

// ── In-memory fallback (used only when database is unreachable) ──────────────

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired in-memory records
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (record.resetAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 60000);
}

function checkRateLimitMemory(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(identifier);

  if (!record || record.resetAt <= now) {
    memoryStore.set(identifier, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      success: true,
      remaining: options.limit - 1,
      reset: now + options.windowMs,
    };
  }

  if (record.count >= options.limit) {
    return {
      success: false,
      remaining: 0,
      reset: record.resetAt,
    };
  }

  record.count += 1;
  return {
    success: true,
    remaining: options.limit - record.count,
    reset: record.resetAt,
  };
}
