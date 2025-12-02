import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, hasSupabaseConfig } from '../supabaseClient.js';

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [session, setSession] = useState(undefined);

  // Sign up
  const signUpNewUser = async (email, password) => {
    if (!hasSupabaseConfig || !supabase) {
      const message =
        'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.';
      console.error(message);
      return { success: false, error: message };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Error signing up:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  };

  // Sign in
  const signInUser = async (email, password) => {
    if (!hasSupabaseConfig || !supabase) {
      const message =
        'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.';
      console.error(message);
      return { success: false, error: message };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error('Error signing in:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error signing in:', error);
      return { success: false, error: 'Unexpected error while signing in' };
    }
  };

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      // No backend configured: treat as logged out but allow the UI to load.
      setSession(null);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Sign out
  const signOutUser = async () => {
    if (!hasSupabaseConfig || !supabase) {
      const message =
        'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.';
      console.error(message);
      return { success: false, error: message };
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out: ', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ session, signUpNewUser, signInUser, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const UserAuth = () => {
  return useContext(AuthContext);
};
