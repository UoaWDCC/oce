import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { addCommentReaction, removeCommentReaction } from "../services";
import { forumKeys } from "../queryKeys";
import type { ForumCommentPreview } from "../types";
import type {
  ReactionCounts,
  ReactionType,
  UserReactions,
} from "@app-types/dao-forum";

type OptimisticCommentReactions = {
  reactionCounts: ReactionCounts;
  userReactions: UserReactions;
};

export interface UseDaoForumCommentReactionsResult {
  toggleReaction: (
    commentId: string,
    reaction: ReactionType,
    token: string,
  ) => void;
  optimisticState: Record<string, OptimisticCommentReactions>;
  error: Error | null;
}

const emptyCounts = (): ReactionCounts => ({
  heart: 0,
  thumbs_up: 0,
  fire: 0,
  thumbs_down: 0,
});

const emptyUserReactions = (): UserReactions => ({
  heart: false,
  thumbs_up: false,
  fire: false,
  thumbs_down: false,
});

export function useDaoForumCommentReactions(
  daoGroupId?: string | null,
  postId?: string | null,
  currentUserId?: string | null,
): UseDaoForumCommentReactionsResult {
  const [optimisticState, setOptimisticState] = useState<
    Record<string, OptimisticCommentReactions>
  >({});
  const optimisticRef = useRef<Record<string, OptimisticCommentReactions>>({});
  const requestQueuesRef = useRef<Record<string, Promise<void>>>({});
  const contextVersionRef = useRef(0);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    contextVersionRef.current += 1;
    optimisticRef.current = {};
    requestQueuesRef.current = {};
    setOptimisticState({});
    setError(null);
  }, [daoGroupId, postId, currentUserId]);

  const patchCommentInAllSorts = useCallback(
    (commentId: string, patch: OptimisticCommentReactions) => {
      queryClient.setQueriesData<ForumCommentPreview[]>(
        { queryKey: forumKeys.commentsAll(daoGroupId, postId, currentUserId) },
        (comments) =>
          comments?.map((comment) =>
            comment.id === commentId ? { ...comment, ...patch } : comment,
          ),
      );
    },
    [queryClient, daoGroupId, postId, currentUserId],
  );

  const clearOptimisticState = useCallback(
    (commentId: string, expected: OptimisticCommentReactions) => {
      if (optimisticRef.current[commentId] !== expected) return;

      const nextOptimistic = { ...optimisticRef.current };
      delete nextOptimistic[commentId];
      optimisticRef.current = nextOptimistic;
      setOptimisticState((previous) => {
        if (!previous[commentId]) return previous;
        const next = { ...previous };
        delete next[commentId];
        return next;
      });
    },
    [],
  );

  const toggleReaction = useCallback(
    (commentId: string, reaction: ReactionType, token: string) => {
      if (!commentId || !token) return;
      const contextVersion = contextVersionRef.current;
      const comment = queryClient
        .getQueriesData<ForumCommentPreview[]>({
          queryKey: forumKeys.commentsAll(daoGroupId, postId, currentUserId),
        })
        .flatMap(([, comments]) => comments ?? [])
        .find((item) => item.id === commentId);
      const current = optimisticRef.current[commentId] ?? {
        reactionCounts: comment?.reactionCounts ?? emptyCounts(),
        userReactions: comment?.userReactions ?? emptyUserReactions(),
      };
      const isActive = current.userReactions[reaction];
      const next = {
        reactionCounts: {
          ...current.reactionCounts,
          [reaction]: Math.max(
            0,
            current.reactionCounts[reaction] + (isActive ? -1 : 1),
          ),
        },
        userReactions: {
          ...current.userReactions,
          [reaction]: !isActive,
        },
      };

      optimisticRef.current = { ...optimisticRef.current, [commentId]: next };
      setOptimisticState((previous) => ({ ...previous, [commentId]: next }));
      patchCommentInAllSorts(commentId, next);

      const previousRequest =
        requestQueuesRef.current[commentId] ?? Promise.resolve();
      const request = previousRequest
        .catch(() => undefined)
        .then(async () => {
          if (contextVersion !== contextVersionRef.current) return;
          let stateToClear = next;

          try {
            if (isActive) {
              await removeCommentReaction(commentId, reaction, token);
            } else {
              await addCommentReaction(commentId, reaction, token);
            }
            if (contextVersion === contextVersionRef.current) {
              setError(null);
            }
          } catch (reason: unknown) {
            if (contextVersion !== contextVersionRef.current) return;

            if (optimisticRef.current[commentId] === next) {
              optimisticRef.current = {
                ...optimisticRef.current,
                [commentId]: current,
              };
              setOptimisticState((previous) => ({
                ...previous,
                [commentId]: current,
              }));
              patchCommentInAllSorts(commentId, current);
              stateToClear = current;
            }
            setError(
              reason instanceof Error
                ? reason
                : new Error("Failed to update comment reaction"),
            );
          } finally {
            if (contextVersion !== contextVersionRef.current) return;

            await queryClient
              .invalidateQueries({
                queryKey: forumKeys.commentsAll(
                  daoGroupId,
                  postId,
                  currentUserId,
                ),
                refetchType: "all",
              })
              .catch(() => undefined);
            clearOptimisticState(commentId, stateToClear);
          }
        });

      requestQueuesRef.current[commentId] = request;
      const clearQueue = () => {
        if (requestQueuesRef.current[commentId] === request) {
          delete requestQueuesRef.current[commentId];
        }
      };
      void request.then(clearQueue, clearQueue);
    },
    [
      queryClient,
      daoGroupId,
      postId,
      currentUserId,
      patchCommentInAllSorts,
      clearOptimisticState,
    ],
  );

  return { toggleReaction, optimisticState, error };
}
