import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export type DaoForumAuthSession =
  | { status: "loading"; token: undefined; userId: null }
  | { status: "authenticated"; token: string; userId: string }
  | { status: "unauthenticated"; token: undefined; userId: null };

export function useDaoForumAuthSession(): DaoForumAuthSession {
  const [session, setSession] = useState<DaoForumAuthSession>({
    status: "loading",
    token: undefined,
    userId: null,
  });

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, authSession) => {
      const accessToken = authSession?.access_token;
      const userId = authSession?.user?.id;
      setSession(
        accessToken && userId
          ? { status: "authenticated", token: accessToken, userId }
          : { status: "unauthenticated", token: undefined, userId: null },
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  return session;
}
