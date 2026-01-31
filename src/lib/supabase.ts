import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  return { data, error };
};

export const verifyOtp = async (email: string, token: string, type: 'signup' | 'email' = 'signup') => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  // If error is "Auth session missing", the user is already signed out
  // so we can treat this as a successful sign out
  if (error?.message?.includes('session missing')) {
    return { error: null };
  }
  return { error };
};

export const getCurrentUser = () => {
  return supabase.auth.getUser();
};