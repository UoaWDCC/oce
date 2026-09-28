import { useCallback, useRef, useState } from "react";
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
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

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

  const toggleReaction = useCallback(
    (commentId: string, reaction: ReactionType, token: string) => {
      if (!commentId || !token) return;
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

      const request = isActive
        ? removeCommentReaction(commentId, reaction, token)
        : addCommentReaction(commentId, reaction, token);
      request.catch((reason: unknown) => {
        if (optimisticRef.current[commentId] !== next) return;
        optimisticRef.current = {
          ...optimisticRef.current,
          [commentId]: current,
        };
        setOptimisticState((previous) => ({ ...previous, [commentId]: current }));
        patchCommentInAllSorts(commentId, current);
        setError(
          reason instanceof Error
            ? reason
            : new Error("Failed to update comment reaction"),
        );
      });
    },
    [
      queryClient,
      daoGroupId,
      postId,
      currentUserId,
      patchCommentInAllSorts,
    ],
  );

  return { toggleReaction, optimisticState, error };
}