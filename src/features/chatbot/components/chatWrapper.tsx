"use client";
import { ChatModalProvider } from "@/features/chatbot/providers/ChatBoxModalProvider";
import { ConversationProvider } from "@/features/chatbot/providers/ConversationProvider";
import ChatSection from "./chatSection";
import ChatButton from "./chatButton";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { jwtDecode } from "jwt-decode";
import {
  TutorSessionProvider,
  publishTutorSession,
  releaseTutorSession,
  type TutorSession,
} from "../providers/TutorSessionProvider";
import { createPortal } from "react-dom";
import { useFloatingPanelLayout } from "@/context/FloatingPanelLayoutProvider";

function sessionIdentity(session: Session | null) {
  if (!session) return undefined;
  try {
    // Supabase's session_id survives token refresh but changes on a new login.
    const claims = jwtDecode<{ session_id?: string }>(session.access_token);
    return claims.session_id ?? session.access_token;
  } catch {
    return session.access_token;
  }
}

export default function ChatWrapper() {
  const { launcherTarget } = useFloatingPanelLayout();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tutorSession, setTutorSession] = useState<TutorSession | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  const sessionRef = useRef<TutorSession | null>(null);
  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let authVersion = 0;
    let identity: string | undefined;

    function acceptSession(session: Session | null, newSignIn = false) {
      if (disposed) return;
      const previous = sessionRef.current;
      const nextIdentity = sessionIdentity(session);
      if (
        !session ||
        !previous ||
        previous.userId !== session.user.id ||
        (newSignIn && identity !== nextIdentity)
      ) {
        if (previous) previous.active = false;
        sessionRef.current = session
          ? { userId: session.user.id, active: true }
          : null;
        publishTutorSession(sessionRef.current);
        setTutorSession(sessionRef.current);
        setSessionVersion((version) => version + 1);
      }
      identity = nextIdentity;
      setUser(session?.user ?? null);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      // An auth event supersedes an initial session snapshot still in flight.
      if (authVersion === 0) acceptSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      authVersion += 1;
      acceptSession(session, event === "SIGNED_IN");
      setLoading(false);
    });

    return () => {
      disposed = true;
      if (sessionRef.current) sessionRef.current.active = false;
      releaseTutorSession(sessionRef.current);
      sessionRef.current = null;
      subscription.unsubscribe();
    };
  }, []);

  if (loading || !user || !tutorSession) {
    return null;
  }

  return (
    <TutorSessionProvider value={tutorSession}>
      <ChatModalProvider key={`${user.id}:${sessionVersion}`}>
        <ConversationProvider>
          <ChatSection />
          {launcherTarget ? (
            createPortal(<ChatButton compact expandOnOpen />, launcherTarget)
          ) : (
            <div className="fixed bottom-3 right-3 z-30">
              <ChatButton />
            </div>
          )}
        </ConversationProvider>
      </ChatModalProvider>
    </TutorSessionProvider>
  );
}
