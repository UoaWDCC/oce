import { useCallback, useEffect, useRef, useState } from "react";
import { getForumPosts } from "../services";
import { mapPostToForumPostPreview } from "../mappers";
import type { ForumPostPreview } from "../types";

export interface UseDaoForumPostsResult {
  posts: ForumPostPreview[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDaoForumPosts(
  daoGroupId: string | undefined | null,
  token?: string,
  enabled = true,
): UseDaoForumPostsResult {
  const [posts, setPosts] = useState<ForumPostPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPosts = useCallback(async () => {
    // Cancel whatever's still in flight before starting a new request.
    abortControllerRef.current?.abort();

    if (!daoGroupId || !enabled) {
      // No id, or not yet allowed to fetch: reset to the "untouched" state and bail.
      requestIdRef.current += 1;
      setPosts([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const rawPosts = await getForumPosts(daoGroupId, token, controller.signal);

      // A newer request has been kicked off since this one started;
      // discard this result so it doesn't clobber fresher state.
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      const mapped = rawPosts.map((post) => mapPostToForumPostPreview(post));
      setPosts(mapped);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to load DAO forum posts"),
      );
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [daoGroupId, token, enabled]);

  useEffect(() => {
    fetchPosts();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchPosts]);

  const refetch = useCallback(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, isLoading, error, refetch };
}
