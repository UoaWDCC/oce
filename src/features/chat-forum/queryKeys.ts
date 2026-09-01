import type { ForumThreadSort } from "./types";

export const forumKeys = {
  all: ["forum"] as const,
  posts: (
    daoGroupId: string | undefined | null,
    currentUserId: string | undefined | null = null,
  ) => [...forumKeys.all, "posts", daoGroupId, currentUserId] as const,
  post: (
    daoGroupId: string | undefined | null,
    postId: string | undefined | null,
    currentUserId: string | undefined | null = null,
  ) => [...forumKeys.posts(daoGroupId, currentUserId), postId] as const,
  commentsAll: (
    daoGroupId: string | undefined | null,
    postId: string | undefined | null,
    currentUserId: string | undefined | null = null,
  ) =>
    [...forumKeys.all, "comments", daoGroupId, postId, currentUserId] as const,
  comments: (
    daoGroupId: string | undefined | null,
    postId: string | undefined | null,
    sort: ForumThreadSort,
    currentUserId: string | undefined | null = null,
  ) =>
    [
      ...forumKeys.commentsAll(daoGroupId, postId, currentUserId),
      sort,
    ] as const,
  poll: (
    daoGroupId: string | undefined | null,
    postId: string | undefined | null,
    currentUserId: string | undefined | null = null,
  ) => [...forumKeys.all, "poll", daoGroupId, postId, currentUserId] as const,
};
