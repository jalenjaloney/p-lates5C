import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, hasSupabaseConfig } from '../supabaseClient.js';

const AuthContext = createContext();
const CONFIG_ERROR_MESSAGE =
  'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.';

export const AuthContextProvider = ({ children }) => {
  const [session, setSession] = useState(undefined);

  // Sign up
  const signUpNewUser = async (email, password, metadata = {}) => {
    if (!hasSupabaseConfig || !supabase) {
      console.error(CONFIG_ERROR_MESSAGE);
      return { success: false, error: CONFIG_ERROR_MESSAGE };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // Expo's supabase-js expects metadata under options.data
      },
    });

    const isExistingUser =
      data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
    if (isExistingUser) {
      return {
        success: false,
        error: 'An account already exists for this email. Try signing in instead.',
      };
    }

    if (error) {
      const message = (error.message || '').toLowerCase();
      const isDuplicate = message.includes('already') || message.includes('registered');
      const friendly = isDuplicate
        ? 'An account already exists for this email. Try signing in instead.'
        : error.message;
      console.error('Error signing up:', error);
      return { success: false, error: friendly };
    }
    return { success: true, data };
  };

  // Sign in
  const signInUser = async (email, password) => {
    if (!hasSupabaseConfig || !supabase) {
      console.error(CONFIG_ERROR_MESSAGE);
      return { success: false, error: CONFIG_ERROR_MESSAGE };
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
      console.error(CONFIG_ERROR_MESSAGE);
      return { success: false, error: CONFIG_ERROR_MESSAGE };
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out: ', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  // Update profile metadata for the current user
  const updateProfile = async (attributes) => {
    if (!hasSupabaseConfig || !supabase) {
      console.error(CONFIG_ERROR_MESSAGE);
      return { success: false, error: CONFIG_ERROR_MESSAGE };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({ data: attributes });
      if (error) {
        console.error('Error updating profile: ', error);
        return { success: false, error: error.message };
      }
      if (data?.user) {
        setSession((prev) => (prev ? { ...prev, user: data.user } : { user: data.user }));
      }
      return { success: true, user: data?.user };
    } catch (err) {
      console.error('Error updating profile: ', err);
      return { success: false, error: 'Unexpected error while updating profile' };
    }
  };

  const resendVerification = async (email) => {
    if (!hasSupabaseConfig || !supabase) {
      console.error(CONFIG_ERROR_MESSAGE);
      return { success: false, error: CONFIG_ERROR_MESSAGE };
    }
    if (!email) return { success: false, error: 'Missing email' };
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) {
        console.error('Error resending verification:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      console.error('Error resending verification:', err);
      return { success: false, error: 'Unexpected error while resending verification' };
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, signUpNewUser, signInUser, signOutUser, updateProfile, resendVerification }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const UserAuth = () => {
  return useContext(AuthContext);
};
