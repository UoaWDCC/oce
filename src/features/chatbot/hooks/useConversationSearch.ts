"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getConversations } from "../api/conversations";
import { Conversation } from "@/features/chatbot/types";

const DEBOUNCE_MS = 300;

// Searches conversations by title. Debounced so typing doesn't fire a request
// per keystroke, and superseded requests are ignored so results can't arrive
// out of order.
export function useConversationSearch(query: string) {
  const [results, setResults] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trimmedQuery = query.trim();
  const activeQueryRef = useRef(trimmedQuery);
  activeQueryRef.current = trimmedQuery;
  const readyQueryRef = useRef("");
  const generationRef = useRef(0);
  const nextOffsetRef = useRef(0);
  const lastRequestedOffsetRef = useRef<number | null>(null);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    const generation = ++generationRef.current;
    readyQueryRef.current = "";
    nextOffsetRef.current = 0;
    lastRequestedOffsetRef.current = null;
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setHasMore(false);
    setResults([]);

    if (!trimmedQuery) {
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const data = await getConversations({ query: trimmedQuery, offset: 0 });
        if (
          generationRef.current !== generation ||
          activeQueryRef.current !== trimmedQuery
        )
          return;
        setResults(data.conversation);
        setHasMore(data.hasMore);
        nextOffsetRef.current = data.nextOffset;
        lastRequestedOffsetRef.current = 0;
        readyQueryRef.current = trimmedQuery;
      } catch (err) {
        if (
          generationRef.current !== generation ||
          activeQueryRef.current !== trimmedQuery
        )
          return;
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setResults([]);
      } finally {
        if (
          generationRef.current === generation &&
          activeQueryRef.current === trimmedQuery
        ) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [trimmedQuery]);

  const loadMore = useCallback(async () => {
    const generation = generationRef.current;
    const offset = nextOffsetRef.current;
    if (
      !trimmedQuery ||
      activeQueryRef.current !== trimmedQuery ||
      readyQueryRef.current !== trimmedQuery ||
      isLoadingMoreRef.current ||
      !hasMore ||
      lastRequestedOffsetRef.current === offset
    )
      return;

    lastRequestedOffsetRef.current = offset;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const data = await getConversations({ query: trimmedQuery, offset });
      if (
        generationRef.current !== generation ||
        activeQueryRef.current !== trimmedQuery
      )
        return;
      setResults((current) => {
        const seen = new Set(current.map(({ id }) => id));
        return [
          ...current,
          ...data.conversation.filter(({ id }) => {
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          }),
        ];
      });
      setHasMore(data.hasMore);
      nextOffsetRef.current = data.nextOffset;
    } catch (err) {
      if (
        generationRef.current !== generation ||
        activeQueryRef.current !== trimmedQuery
      )
        return;
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setHasMore(false);
    } finally {
      if (generationRef.current === generation) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [hasMore, trimmedQuery]);

  return { results, isLoading, isLoadingMore, hasMore, loadMore, error };
}
