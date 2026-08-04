"use client";
import { useState } from "react";
import { createConversation } from "@/features/chatbot/api/conversations";

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
      const conversation = await createConversation();
      const id = conversation.id;
      setConversationId(id);
      return id;
    } catch {
      return null;
    } finally {
      setEnsuring(false);
    }
  }

  return { conversationId, ensuring, ensure };
}
