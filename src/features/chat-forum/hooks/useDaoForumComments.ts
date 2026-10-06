import { useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPostComments } from "../services";
import { mapCommentToForumCommentPreview } from "../mappers";
import { forumKeys } from "../queryKeys";
import { toForumAsyncState, type ForumAsyncState } from "../lib/asyncState";
import type { ForumCommentPreview } from "../types";
import type { ForumThreadSort } from "../types";

export interface UseDaoForumCommentsResult extends ForumAsyncState {
  comments: ForumCommentPreview[];
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
  const isEnabled = Boolean(daoGroupId) && Boolean(postId) && enabled;
  const threadKey = JSON.stringify([daoGroupId, postId, currentUserId]);
  const lastLoaded = useRef<{
    threadKey: string;
    comments: ForumCommentPreview[];
  } | null>(null);

  if (lastLoaded.current?.threadKey !== threadKey) {
    lastLoaded.current = null;
  }

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
    enabled: isEnabled,
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

  // React Query keeps the previous sort as placeholder data only while the
  // new sort is pending. If that request fails, its data becomes undefined.
  // Retain the last loaded replies for this thread and viewer across that
  // error, without carrying them into another thread or account.
  if (query.data !== undefined && !query.isPlaceholderData) {
    lastLoaded.current = { threadKey, comments: query.data };
  }
  const visibleComments = query.data ?? lastLoaded.current?.comments;
  const offlineError =
    isEnabled && query.isPaused && visibleComments !== undefined
      ? new Error("You appear to be offline. Reconnect and retry.")
      : null;

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
    comments: visibleComments ?? [],
    // Retrying a thread goes through the same all-sorts invalidation as any
    // other refresh, so a retry after a failure cannot leave a sibling sort
    // holding the stale data that just failed to refresh.
    ...toForumAsyncState(
      {
        ...query,
        data: visibleComments,
        error: query.error ?? offlineError,
        isError: query.isError || offlineError !== null,
      },
      isEnabled,
      () => void refetch(),
    ),
    refetch,
  };
}
