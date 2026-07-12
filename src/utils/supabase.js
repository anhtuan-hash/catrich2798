import { createClient } from '@supabase/supabase-js';

const runtimeEnv = import.meta.env || {};
export const supabaseUrl = String(runtimeEnv.VITE_SUPABASE_URL || '').trim();
export const supabaseAnonKey = String(runtimeEnv.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
      global: {
        headers: { 'x-bes-runtime': '10.96.0' },
      },
    })
  : null;

export function getSupabaseStatus() {
  return {
    configured: isSupabaseConfigured,
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
    projectRef: supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co/i)?.[1] || '',
  };
}

export function getSupabasePublicConfig() {
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    configured: isSupabaseConfigured,
  };
}

if (typeof window !== 'undefined') {
  // Native modules use this singleton. The global is read-only compatibility for
  // diagnostics and legacy utilities; no API-key capture or REST bridge is needed.
  Object.defineProperty(window, 'BESSupabase', {
    configurable: true,
    enumerable: false,
    get: () => supabase,
  });
}
