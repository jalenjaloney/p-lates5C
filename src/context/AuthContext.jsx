import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [session, setSession] = useState(undefined);

  // Sign up
  const signUpNewUser = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      console.error('Error signing up:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  };

  // Sign in
  const signInUser = async (email, password) => {
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
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out: ', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  // Update profile metadata for the current user
  const updateProfile = async (attributes) => {
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

  // Resend email confirmation
  const resendVerification = async (email) => {
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
