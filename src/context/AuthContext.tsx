import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  changeEmail: (currentPassword: string, newEmail: string) => Promise<{ error: string | null }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** true while the user is in the "forgot password" flow (keeps the login screen up until the new password is saved) */
  recovering: boolean;
  sendResetCode: (email: string) => Promise<{ error: string | null }>;
  verifyResetCode: (email: string, code: string) => Promise<{ error: string | null }>;
  completeReset: (newPassword: string) => Promise<{ error: string | null }>;
  cancelReset: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  // Re-verify the current password before any credential change
  const verifyCurrent = async (currentPassword: string) => {
    const email = session?.user?.email;
    if (!email) return 'Not signed in.';
    const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    return error ? 'Current password is incorrect.' : null;
  };

  const changeEmail = async (currentPassword: string, newEmail: string) => {
    const bad = await verifyCurrent(currentPassword);
    if (bad) return { error: bad };
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    return { error: error ? error.message : null };
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const bad = await verifyCurrent(currentPassword);
    if (bad) return { error: bad };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // --- Forgot password: email a code -> verify code -> set new password ---
  const sendResetCode = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error ? error.message : null };
  };

  const verifyResetCode = async (email: string, code: string) => {
    setRecovering(true); // set first so the app never flashes the dashboard
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
    if (error) {
      setRecovering(false);
      return { error: 'Invalid or expired code. Please try again.' };
    }
    return { error: null };
  };

  const completeReset = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    setRecovering(false);
    return { error: null };
  };

  const cancelReset = async () => {
    setRecovering(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signIn, changeEmail, changePassword, signOut, recovering, sendResetCode, verifyResetCode, completeReset, cancelReset }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
