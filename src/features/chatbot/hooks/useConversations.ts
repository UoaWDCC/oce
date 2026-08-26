"use client";

import { useEffect, useRef, useState } from "react";
import { getConversations } from "../api/conversations";
import { Conversation } from "@/features/chatbot/types";

export function useConversations(refreshVersion = 0) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let ignore = false;

    // Only show the full-panel loading state on the very first load. Later
    // refreshes (e.g. bumped after sending a message / stream completion)
    // update the list in place so the sidebar doesn't flicker away.
    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    setError(null);
    async function loadConversations() {
      try {
        const data = await getConversations({ offset: 0 });
        if (ignore) return;
        setConversations(data.conversation);
        hasLoadedRef.current = true;
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
