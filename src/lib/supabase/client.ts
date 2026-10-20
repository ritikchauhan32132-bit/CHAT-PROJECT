import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;
let cachedUrl: string | undefined;
let cachedKey: string | undefined;

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing or placeholder, return a new (uncached) dummy client
  const isReal =
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== PLACEHOLDER_URL &&
    supabaseAnonKey !== PLACEHOLDER_KEY;

  if (!isReal) {
    // Return a non-cached placeholder client — don't pollute the singleton
    return createBrowserClient<Database>(PLACEHOLDER_URL, PLACEHOLDER_KEY);
  }

  // Only cache when we have real credentials, and re-create if they change
  if (!client || cachedUrl !== supabaseUrl || cachedKey !== supabaseAnonKey) {
    client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
    cachedUrl = supabaseUrl;
    cachedKey = supabaseAnonKey;
  }

  return client;
}
