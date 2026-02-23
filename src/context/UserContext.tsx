"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

type UserContextType = {
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  isAdmin: false,
  refresh: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  const refresh = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    // Initial load - use getSession (reads from storage, no network request)
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log("session>>>>>", session);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    init();

    // Single global auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === "SIGNED_OUT") {
        setProfile(null);
      } else if (session?.user) {
        await fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <UserContext.Provider
      value={{ profile, loading, isAdmin: profile?.role === "admin", refresh }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
