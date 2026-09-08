"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getConversations } from "../api/conversations";
import { Conversation } from "@/features/chatbot/types";

export function useConversations(refreshVersion = 0) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedRef = useRef(false);
  const nextOffsetRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

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
        setHasMore(data.hasMore);
        nextOffsetRef.current = data.nextOffset;
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

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMore) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const data = await getConversations({ offset: nextOffsetRef.current });
      // Offsets shift when a conversation is created mid-scroll, so filter on
      // id rather than trusting the page boundary.
      setConversations((current) => {
        const seen = new Set(current.map(({ id }) => id));
        return [
          ...current,
          ...data.conversation.filter(({ id }) => !seen.has(id)),
        ];
      });
      setHasMore(data.hasMore);
      nextOffsetRef.current = data.nextOffset;
    } catch (err) {
      // Stop paging so a failing request isn't retried on every scroll.
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setHasMore(false);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasMore]);

  return { conversations, isLoading, isLoadingMore, hasMore, loadMore, error };
}
