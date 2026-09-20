import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPostComments } from "../services";
import { mapCommentToForumCommentPreview } from "../mappers";
import { forumKeys } from "../queryKeys";
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
  currentUserId: string | null = null,
): UseDaoForumCommentsResult {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: forumKeys.comments(daoGroupId, postId, sort, currentUserId),
    queryFn: async ({ signal }) => {
      const rawComments = await getPostComments(
        daoGroupId as string,
        postId as string,
        sort,
        token,
        signal,
      );
      return rawComments.map((comment) =>
        mapCommentToForumCommentPreview(
          comment,
          postId as string,
          currentUserId,
        ),
      );
    },
    enabled: Boolean(daoGroupId) && Boolean(postId) && enabled,
    // Preserve the prior sort while another sort for the same thread loads,
    // but never carry data across posts, DAOs, or authenticated users.
    placeholderData: (previousData, previousQuery) => {
      const previousKey = previousQuery?.queryKey;
      const isSameViewerAndThread =
        previousKey?.[2] === daoGroupId &&
        previousKey?.[3] === postId &&
        previousKey?.[4] === currentUserId;
      return isSameViewerAndThread ? previousData : undefined;
    },
  });

  // Comment writes (create/edit/delete) can change any sort's ordering or
  // contents, so every cached sort for this post is invalidated together —
  // not just the one currently on screen — to avoid showing stale comments
  // after switching sort tabs. `refetchType: "all"` refetches sorts that
  // aren't currently mounted too, so they're already fresh by the time the
  // user switches to them.
  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: forumKeys.commentsAll(daoGroupId, postId, currentUserId),
      refetchType: "all",
    });
  }, [queryClient, daoGroupId, postId, currentUserId]);

  return {
    comments: query.data ?? [],
    isLoading: query.isPending && query.isFetching,
    error: query.error as Error | null,
    refetch,
  };
}
