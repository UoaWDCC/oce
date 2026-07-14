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

export function useDaoForumPosts(daoGroupId: string | undefined | null, token?: string,): UseDaoForumPostsResult {
  const [posts, setPosts] = useState<ForumPostPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  const fetchPosts = useCallback(async () => {
    if (!daoGroupId) {
      // No id to fetch with: reset to the "untouched" state and bail.
      requestIdRef.current += 1;
      setPosts([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const rawPosts = await getForumPosts(daoGroupId, token);

      // A newer request has been kicked off since this one started;
      // discard this result so it doesn't clobber fresher state.
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      const mapped = rawPosts.map((post) => mapPostToForumPostPreview(post));
      setPosts(mapped);
      setError(null);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      setError(err instanceof Error ? err : new Error("Failed to load DAO forum posts"));
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [daoGroupId, token]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const refetch = useCallback(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, isLoading, error, refetch };
}