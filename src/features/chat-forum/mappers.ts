import type { PostListItem } from "@app-types/posts";
import type { CommentListItem } from "@app-types/comments";
import type { PostType } from "@app-types/post_types";
import type { ForumPostPreview, ForumCommentPreview } from "./types";

export function mapPostToForumPostPreview(
  post: PostListItem,
): ForumPostPreview {
  return {
    id: post.id,
    daoId: post.dao_group_id,
    title: post.title ?? "",
    excerpt: (post.body ?? "").slice(0, 100),
    authorName: post.author?.Name ?? "Anonymous",
    authorWallet: undefined,
    createdAt: post.created_at,
    createdAtLabel: new Date(post.created_at).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    commentCount: post.comment_count,
    types: post.post_type ? [post.post_type.post_type as PostType] : [],
    tags: post.tags,
    isPinned: post.is_pinned,
    isUnread: undefined,
  };
}

export function mapCommentToForumCommentPreview(
  comment: CommentListItem,
  postId: string,
): ForumCommentPreview {
  return {
    id: comment.id,
    postId,
    authorName: comment.username ?? "Anonymous",
    authorWallet: undefined,
    body: comment.body ?? "",
    createdAt: comment.created_at,
    createdAtLabel: new Date(comment.created_at).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    likeCount: comment.like_count,
    isLiked: comment.is_liked,
  };
}
