import { useCallback, useEffect, useRef, useState } from "react";
import { getPostComments } from "../services";
import { mapCommentToForumCommentPreview } from "../mappers";
import type { ForumCommentPreview } from "../types";
import type { ForumThreadSort } from "../types";

export interface UseDaoForumCommentsResult {
  comments: ForumCommentPreview[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDaoForumComments(
  daoGroupId: string | undefined | null,
  postId: string | undefined | null,
  token?: string,
  sort: ForumThreadSort = "oldest",
  enabled = true,
): UseDaoForumCommentsResult {
  const [comments, setComments] = useState<ForumCommentPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchComments = useCallback(async () => {
    abortControllerRef.current?.abort();

    if (!daoGroupId || !postId || !enabled) {
      requestIdRef.current += 1;
      setComments([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const rawComments = await getPostComments(
        daoGroupId,
        postId,
        sort,
        token,
        controller.signal,
      );
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      const mapped = rawComments.map((comment) =>
        mapCommentToForumCommentPreview(comment, postId),
      );
      setComments(mapped);
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
          : new Error("Failed to load DAO forum comments"),
      );
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [daoGroupId, postId, sort, token, enabled]);

  useEffect(() => {
    fetchComments();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchComments]);

  const refetch = useCallback(() => {
    return fetchComments();
  }, [fetchComments]);

  return { comments, isLoading, error, refetch };
}
