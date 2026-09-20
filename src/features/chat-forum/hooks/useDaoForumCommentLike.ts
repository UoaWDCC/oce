import { useCallback, useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  likeComment as likeCommentService,
  unlikeComment as unlikeCommentService,
} from "../services";
import { forumKeys } from "../queryKeys";
import type { ForumCommentPreview } from "../types";

const DEBOUNCE_MS = 250;

export interface UseDaoForumCommentLikeResult {
  toggleLike(commentId: string, serverIsLiked: boolean, serverLikeCount: number, token: string): void;
  optimisticState: Record<string, { isLiked: boolean; likeCount: number }>;
  error: Error | null;
}

type PendingEntry = { isLiked: boolean; likeCount: number; token: string };
type BaselineEntry = { isLiked: boolean; likeCount: number };

export function useDaoForumCommentLike(
  daoGroupId?: string | null,
  postId?: string | null,
  currentUserId?: string | null,
): UseDaoForumCommentLikeResult {
  const [optimisticState, setOptimisticState] = useState<Record<string, { isLiked: boolean; likeCount: number }>>({});
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  // Patches every cached sort for this post so a like/unlike stays in sync
  // across sort tabs immediately, instead of relying on optimisticState
  // (which only masks staleness while this component instance stays mounted).
  const patchCommentInAllSorts = useCallback(
    (commentId: string, patch: { isLiked: boolean; likeCount: number }) => {
      queryClient.setQueriesData<ForumCommentPreview[]>(
        { queryKey: forumKeys.commentsAll(daoGroupId, postId, currentUserId) },
        (current) =>
          current?.map((comment) =>
            comment.id === commentId ? { ...comment, ...patch } : comment,
          ),
      );
    },
    [queryClient, daoGroupId, postId, currentUserId],
  );

  // Mirrors optimisticState synchronously — never stale inside callbacks/timers
  const optimisticRef = useRef<Record<string, { isLiked: boolean; likeCount: number }>>({});

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingState = useRef(new Map<string, PendingEntry>());
  const baselineState = useRef(new Map<string, BaselineEntry>());

  // Flush all pending timers on unmount so navigating away doesn't lose likes
  useEffect(() => {
    const timersRef = timers.current;
    const pendingRef = pendingState.current;
    const baselineRef = baselineState.current;

    return () => {
      for (const [commentId, timer] of timersRef) {
        clearTimeout(timer);
        const desired = pendingRef.get(commentId);
        if (!desired) continue;
        const service = desired.isLiked ? likeCommentService : unlikeCommentService;
        service(commentId, desired.token).catch(() => {});
      }
      timersRef.clear();
      pendingRef.clear();
      baselineRef.clear();
    };
  }, []);

  const toggleLike = useCallback((
    commentId: string,
    serverIsLiked: boolean,
    serverLikeCount: number,
    token: string,
  ): void => {
    if (!commentId || !token) return;

    // Always read from ref — never stale even if called from a stale closure in forum.tsx
    const current = optimisticRef.current[commentId] ?? { isLiked: serverIsLiked, likeCount: serverLikeCount };
    const newIsLiked = !current.isLiked;
    const newLikeCount = current.likeCount + (current.isLiked ? -1 : 1);

    // Only record baseline on first click of a burst
    if (!baselineState.current.has(commentId)) {
      baselineState.current.set(commentId, current);
    }

    pendingState.current.set(commentId, { isLiked: newIsLiked, likeCount: newLikeCount, token });

    // Update ref synchronously so the next rapid click sees the correct current state
    optimisticRef.current = { ...optimisticRef.current, [commentId]: { isLiked: newIsLiked, likeCount: newLikeCount } };

    // flushSync forces React to render synchronously before returning, so the DOM is
    // updated before the next click event fires — prevents the "frozen UI" from React 18
    // batching multiple rapid click updates into a single render.
    flushSync(() => {
      setOptimisticState(prev => ({
        ...prev,
        [commentId]: { isLiked: newIsLiked, likeCount: newLikeCount },
      }));
    });
    patchCommentInAllSorts(commentId, { isLiked: newIsLiked, likeCount: newLikeCount });

    // Reset debounce timer
    const existing = timers.current.get(commentId);
    if (existing !== undefined) clearTimeout(existing);

    const timer = setTimeout(async () => {
      timers.current.delete(commentId);
      const desired = pendingState.current.get(commentId);
      const baseline = baselineState.current.get(commentId);
      pendingState.current.delete(commentId);
      baselineState.current.delete(commentId);

      if (!desired || !baseline) return;

      // Net effect is zero — user spammed back to original state, no request needed
      if (desired.isLiked === baseline.isLiked) return;

      try {
        if (desired.isLiked) {
          await likeCommentService(commentId, desired.token);
        } else {
          await unlikeCommentService(commentId, desired.token);
        }
      } catch (err) {
        optimisticRef.current = { ...optimisticRef.current, [commentId]: baseline };
        setOptimisticState(prev => ({ ...prev, [commentId]: baseline }));
        patchCommentInAllSorts(commentId, baseline);
        setError(err instanceof Error ? err : new Error("Failed to like comment"));
      }
    }, DEBOUNCE_MS);

    timers.current.set(commentId, timer);
  }, [patchCommentInAllSorts]);

  return { toggleLike, optimisticState, error };
}
