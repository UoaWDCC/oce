"use client";

import { useEffect, useState } from "react";
import { getConversations } from "../api/conversations";
import { Conversation } from "@/features/chatbot/types";

export function useConversations(refreshVersion = 0) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let ignore = false;

    setIsLoading(true);
    setError(null);
    async function loadConversations() {
      try {
        const data = await getConversations();
        if (ignore) return;
        setConversations(data);
      } catch (err) {
        if (ignore) return;
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        if (ignore) return;
        setIsLoading(false);
      }
    }

    loadConversations();

    return () => {
      ignore = true;
    };
  }, [refreshVersion]);

  return { conversations, isLoading, error };
}
