import  { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

const AuthContext = createContext();

export const AuthContextProvider = ({ children}) => {
  const [session, setSession] = useState(undefined)

  // Sign up
  const signUpNewUser = async (email, password ) => {
    const {data, error} = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        console.error('Error signing up:', error);
        return { success: false, error };
    }
    return { success: true, data };
};

// Sign in
const signInUser = async ( email, password ) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) {
        console.error('Error signing in:', error);
        return { success: false, error: error.message};
    }
    return { success: true, data };
    } catch(error) {
        console.error('Error signing in:', error);
    }
};

useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
    });
}, []);

// Sign out
const signOutUser = async () => {
    const { error } = supabase.auth.signOut();
    if (error) {
        console.error('Error signing out: ', error);
    }
};

  return (
    <AuthContext.Provider value={{ session, signUpNewUser, signInUser, signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const UserAuth = () => {
    return useContext(AuthContext);
};
