import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getForumPosts } from "../services";
import { mapPostToForumPostPreview } from "../mappers";
import { forumKeys } from "../queryKeys";
import { toForumAsyncState, type ForumAsyncState } from "../lib/asyncState";
import type { ForumPostPreview } from "../types";

export interface UseDaoForumPostsResult extends ForumAsyncState {
  posts: ForumPostPreview[];
  refetch: () => void;
  replacePost: (post: ForumPostPreview) => void;
  removePost: (postId: string) => void;
}

export function useDaoForumPosts(
  daoGroupId: string | undefined | null,
  token?: string,
  enabled = true,
  currentUserId: string | undefined | null = null,
): UseDaoForumPostsResult {
  const queryClient = useQueryClient();
  const queryKey = forumKeys.posts(daoGroupId, currentUserId);
  const isEnabled = Boolean(daoGroupId) && enabled;

  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const rawPosts = await getForumPosts(daoGroupId as string, token, signal);
      return rawPosts.map((post) =>
        mapPostToForumPostPreview(post, currentUserId),
      );
    },
    enabled: isEnabled,
  });

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  const replacePost = useCallback(
    (post: ForumPostPreview) => {
      queryClient.setQueryData<ForumPostPreview[]>(queryKey, (current) =>
        current?.map((item) => (item.id === post.id ? post : item)),
      );
    },
    [queryClient, queryKey],
  );

  const removePost = useCallback(
    (postId: string) => {
      queryClient.setQueryData<ForumPostPreview[]>(queryKey, (current) =>
        current?.filter((item) => item.id !== postId),
      );
    },
    [queryClient, queryKey],
  );

  return {
    posts: query.data ?? [],
    ...toForumAsyncState(query, isEnabled, refetch),
    refetch,
    replacePost,
    removePost,
  };
}
