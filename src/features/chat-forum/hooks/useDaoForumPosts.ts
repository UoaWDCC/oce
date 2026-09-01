import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getForumPosts } from "../services";
import { mapPostToForumPostPreview } from "../mappers";
import { forumKeys } from "../queryKeys";
import type { ForumPostPreview } from "../types";

export interface UseDaoForumPostsResult {
  posts: ForumPostPreview[];
  isLoading: boolean;
  error: Error | null;
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

  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const rawPosts = await getForumPosts(daoGroupId as string, token, signal);
      return rawPosts.map((post) =>
        mapPostToForumPostPreview(post, currentUserId),
      );
    },
    enabled: Boolean(daoGroupId) && enabled,
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
    isLoading: query.isPending && query.isFetching,
    error: query.error as Error | null,
    refetch,
    replacePost,
    removePost,
  };
}
