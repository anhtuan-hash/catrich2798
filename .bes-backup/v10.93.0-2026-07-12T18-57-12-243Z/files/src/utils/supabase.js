import { createClient } from '@supabase/supabase-js';

const runtimeEnv = import.meta.env || {};
const supabaseUrl = String(runtimeEnv.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = String(runtimeEnv.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseStatus() {
  return {
    configured: isSupabaseConfigured,
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
  };
}
