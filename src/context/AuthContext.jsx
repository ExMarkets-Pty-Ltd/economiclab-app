import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase, supabaseConfigured } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) setSession(data.session);
      })
      .catch((error) => {
        console.error("Unable to restore the authentication session:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error("Supabase is not configured for this deployment.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email, password) => {
    if (!supabase) throw new Error("Supabase is not configured for this deployment.");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured for this deployment.");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured: supabaseConfigured,
      signIn,
      signUp,
      signOut,
    }),
    [session, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
