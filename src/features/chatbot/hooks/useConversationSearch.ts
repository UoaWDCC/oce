"use client";

import { useEffect, useState } from "react";
import { getConversations } from "../api/conversations";
import { Conversation } from "@/features/chatbot/types";

const DEBOUNCE_MS = 300;

// Searches conversations by title. Debounced so typing doesn't fire a request
// per keystroke, and superseded requests are ignored so results can't arrive
// out of order.
export function useConversationSearch(query: string) {
  const [results, setResults] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let ignore = false;
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const data = await getConversations({ query: trimmedQuery, offset: 0 });
        if (ignore) return;
        setResults(data.conversation);
      } catch (err) {
        if (ignore) return;
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setResults([]);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery]);

  return { results, isLoading, error };
}
