import { useCallback } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
  const query = useQuery({
    queryKey: forumKeys.comments(daoGroupId, postId, sort),
    queryFn: async ({ signal }) => {
      const rawComments = await getPostComments(
        daoGroupId as string,
        postId as string,
        sort,
        token,
        signal,
      );
      return rawComments.map((comment) =>
        mapCommentToForumCommentPreview(comment, postId as string, currentUserId),
      );
    },
    enabled: Boolean(daoGroupId) && Boolean(postId) && enabled,
    placeholderData: keepPreviousData,
  });

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    comments: query.data ?? [],
    isLoading: query.isPending && query.isFetching,
    error: query.error as Error | null,
    refetch,
  };
}
