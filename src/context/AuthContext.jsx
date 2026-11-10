import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase, supabaseConfigured } from "../lib/supabase";

const AuthContext = createContext(null);
const profileColumns =
  "id, username, full_name, avatar_url, biography, location, website, created_at, updated_at";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountUserId, setAccountUserId] = useState(null);
  const accountRequest = useRef(0);

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

  const refreshAccount = useCallback(async (userId) => {
    if (!supabase) throw new Error("Supabase is not configured for this deployment.");
    const requestId = ++accountRequest.current;
    setAccountLoading(true);
    setAccountError("");

    try {
      const [profileResult, subscriptionResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(profileColumns)
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("subscriptions")
          .select("id, plan_id, status, started_at, expires_at, plans(name, features)")
          .eq("user_id", userId)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (subscriptionResult.error) throw subscriptionResult.error;

      if (requestId === accountRequest.current) {
        setProfile(profileResult.data);
        setSubscription(subscriptionResult.data);
        setAccountUserId(userId);
      }
      return {
        profile: profileResult.data,
        subscription: subscriptionResult.data,
      };
    } catch (error) {
      if (requestId === accountRequest.current) {
        setAccountError(error.message || "Unable to load your account details.");
        setAccountUserId(userId);
      }
      throw error;
    } finally {
      if (requestId === accountRequest.current) setAccountLoading(false);
    }
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      accountRequest.current += 1;
      setProfile(null);
      setSubscription(null);
      setAccountError("");
      setAccountLoading(false);
      setAccountUserId(null);
      return;
    }

    refreshAccount(userId).catch((error) => {
      console.error("Unable to load the authenticated user's account data:", error);
    });
  }, [session?.user?.id, refreshAccount]);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error("Supabase is not configured for this deployment.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email, password) => {
    if (!supabase) throw new Error("Supabase is not configured for this deployment.");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured for this deployment.");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(async (values) => {
    if (!supabase || !session?.user) {
      throw new Error("You must be signed in to update your profile.");
    }
    const { data, error } = await supabase
      .from("profiles")
      .update(values)
      .eq("id", session.user.id)
      .select(profileColumns)
      .single();
    if (error) throw error;
    setProfile(data);
    setAccountError("");
    return data;
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      profile,
      subscription,
      accountLoading,
      accountError,
      accountUserId,
      configured: supabaseConfigured,
      refreshAccount,
      updateProfile,
      signIn,
      signUp,
      signOut,
    }),
    [
      session,
      loading,
      profile,
      subscription,
      accountLoading,
      accountError,
      accountUserId,
      refreshAccount,
      updateProfile,
      signIn,
      signUp,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
