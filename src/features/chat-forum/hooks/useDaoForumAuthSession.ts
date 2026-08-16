import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export type DaoForumAuthSession =
  | { status: "loading"; token: undefined }
  | { status: "authenticated"; token: string }
  | { status: "unauthenticated"; token: undefined };

export function useDaoForumAuthSession(): DaoForumAuthSession {
  const [session, setSession] = useState<DaoForumAuthSession>({
    status: "loading",
    token: undefined,
  });

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, authSession) => {
      const accessToken = authSession?.access_token;
      setSession(
        accessToken
          ? { status: "authenticated", token: accessToken }
          : { status: "unauthenticated", token: undefined },
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  return session;
}
