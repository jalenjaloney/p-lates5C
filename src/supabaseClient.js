import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

let nativeStorage;
if (Platform.OS !== 'web') {
  try {
    // Lazy require avoids web bundler failure if the native storage package isn't installed.
    nativeStorage = require('@react-native-async-storage/async-storage').default;
  } catch (error) {
    console.warn('AsyncStorage not available. Auth sessions will not persist on native.', error);
  }
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : nativeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;
