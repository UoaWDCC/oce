"use client";

import { useEffect, useState } from "react";
import { getConversations } from "../api/conversations";
import { Conversation } from "@/features/chatbot/types";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    async function loadConversations() {
      try {
        const data = await getConversations();
        setConversations(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    }

    loadConversations();
  }, []);

  return { conversations, isLoading, error };
}
