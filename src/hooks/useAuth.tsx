import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  supabaseUserId: string | null;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth listener BEFORE checking session
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        // Refresh token failed — clear stale session silently
        console.warn("Token refresh failed, clearing session");
        setUser(null);
        setSupabaseUserId(null);
        setLoading(false);
        return;
      }
      if (session?.user) {
        setUser(session.user);
        setSupabaseUserId(session.user.id);
      } else {
        setUser(null);
        setSupabaseUserId(null);
      }
      setLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn("Session retrieval error:", error.message);
        // Clear stale tokens on refresh_token_not_found
        supabase.auth.signOut().catch(() => {});
      }
      if (session?.user) {
        setUser(session.user);
        setSupabaseUserId(session.user.id);
      }
      setLoading(false);
    });

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth loading timeout - forcing completion");
        setLoading(false);
      }
    }, 3000);

    return () => {
      authListener?.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName
          }
        }
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithPhone = async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const verifyOtp = async (phone: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone,
        token,
        type: 'sms'
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        supabaseUserId,
        signInWithEmail,
        signUpWithEmail,
        signInWithPhone,
        verifyOtp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return safe defaults when AuthProvider is not present (helps tests and isolated components)
    return {
      user: null,
      loading: false,
      supabaseUserId: null,
      signInWithEmail: async () => ({ error: new Error('Auth provider not configured') }),
      signUpWithEmail: async () => ({ error: new Error('Auth provider not configured') }),
      signInWithPhone: async () => ({ error: new Error('Auth provider not configured') }),
      verifyOtp: async () => ({ error: new Error('Auth provider not configured') }),
      signInWithGoogle: async () => ({ error: new Error('Auth provider not configured') }),
      signOut: async () => {},
    } as AuthContextType;
  }
  return context;
};
