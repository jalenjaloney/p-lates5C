import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const hasServerSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasServerSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export const requireSupabase = () => {
  if (!supabase) {
    const error = new Error('Supabase server config missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
    (error as any).statusCode = 500;
    throw error;
  }
  return supabase;
};
