// Test-only Supabase module substitute. Never bundled into the application build.
export const supabaseUrl='';
export const supabaseAnonKey='';
export const isSupabaseConfigured=false;
export const supabase=null;
export function invalidateSupabaseReadCacheForTable(){return false;}
export function getSupabaseStatus(){return {configured:false,connected:false};}
export function getSupabasePublicConfig(){return null;}
