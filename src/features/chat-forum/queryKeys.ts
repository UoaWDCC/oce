import type { ForumThreadSort } from "./types";

export const forumKeys = {
  all: ["forum"] as const,
  posts: (daoGroupId: string | undefined | null) =>
    [...forumKeys.all, "posts", daoGroupId] as const,
  post: (daoGroupId: string | undefined | null, postId: string | undefined | null) =>
    [...forumKeys.posts(daoGroupId), postId] as const,
  commentsAll: (
    daoGroupId: string | undefined | null,
    postId: string | undefined | null,
  ) => [...forumKeys.all, "comments", daoGroupId, postId] as const,
  comments: (
    daoGroupId: string | undefined | null,
    postId: string | undefined | null,
    sort: ForumThreadSort,
  ) => [...forumKeys.commentsAll(daoGroupId, postId), sort] as const,
  poll: (daoGroupId: string | undefined | null, postId: string | undefined | null) =>
    [...forumKeys.all, "poll", daoGroupId, postId] as const,
};
