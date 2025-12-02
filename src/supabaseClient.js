import { createClient } from '@supabase/supabase-js';

// Temporary debugging to verify Expo env vars are being picked up at build time.
// Check the Metro (Expo) terminal output for these lines when the app starts.
console.log('EXPO_PUBLIC_SUPABASE_URL from env:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log(
  'EXPO_PUBLIC_SUPABASE_ANON_KEY present:',
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;