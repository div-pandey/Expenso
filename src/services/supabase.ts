import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Disable remote cloud requests during unit tests so test suite runs offline and deterministically
const isTestEnv =
  (typeof globalThis !== 'undefined' && (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env?.NODE_ENV === 'test') ||
  import.meta.env.MODE === 'test';

export const isSupabaseConfigured = Boolean(
  !isTestEnv &&
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey.length > 20
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

