"use client";
import { useState } from "react";
import { getSupabaseClient } from "@/utils/supabase/client";

interface Conversation {
  id: string;
}

interface UseEnsureConversation {
  conversationId: string | null;
  ensuring: boolean;
  ensure(): Promise<string | null>;
}

/**
 * Ensures a real conversation exists for the signed-in user.
 * Creates one via POST /api/ai-tutor/conversations on first call and
 * caches the id. Used so chat-attached features (e.g. tutor requests)
 * have a valid conversation_id to associate with.
 */
export function useEnsureConversation(): UseEnsureConversation {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [ensuring, setEnsuring] = useState<boolean>(false);

  async function ensure(): Promise<string | null> {
    if (conversationId) return conversationId;
    setEnsuring(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return null;

      const res = await fetch("/api/ai-tutor/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) return null;

      const data = (await res.json().catch(() => null)) as
        | { conversation?: Conversation }
        | null;
      const id = data?.conversation?.id ?? null;
      setConversationId(id);
      return id;
    } finally {
      setEnsuring(false);
    }
  }

  return { conversationId, ensuring, ensure };
}
