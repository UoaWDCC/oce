"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface FallbackUser {
  id: string;
  email: string;
}

type LoggedInUser = SupabaseUser | FallbackUser | null;

export default function useLoggedInUser() {
  const [user, setUser] = useState<LoggedInUser>(null);

  useEffect(() => {
    const supabase = createClient(); // ✅ Inside useEffect

    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);
      } else {
        const local = localStorage.getItem("authenticated_student");
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed?.email && parsed?.id) {
              setUser(parsed);
            }
          } catch (err) {
            console.error("Error parsing fallback login", err);
          }
        }
      }
    };
    checkAuth();
  }, []); // Empty deps - runs once on mount

  return user;
}
