import {
  ForumPost,
  ForumComment,
  ForumPostPreview,
  ForumCommentPreview,
  ForumPostType,
  AuthorProfile,
} from "./types";
import { FormattedComment } from "@app-types/comments";

export function mapApiCommentToForumComment(
  comment: FormattedComment,
  postId: string,
): ForumComment {
  return {
    id: comment.id,
    postId: postId,
    body: comment.body ?? "",
    authorId: comment.author_id,
    createdAt: comment.created_at,
  };
}

export function mapPostToForumPostPreview(
  post: ForumPost,
  authorProfile: AuthorProfile | null,
  commentCount: number,
  types: ForumPostType[],
  tags: string[],
  isPinned?: boolean,
): ForumPostPreview {
  return {
    id: post.id,
    daoId: post.daoId,
    title: post.title,
    excerpt: post.body.slice(0, 100),
    authorName: authorProfile?.displayName ?? "Anonymous",
    authorWallet: authorProfile?.walletAddress ?? undefined,
    createdAt: post.createdAt,
    createdAtLabel: new Date(post.createdAt).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    commentCount,
    types,
    tags,
    isPinned,
  };
}

export function mapCommentToForumCommentPreview(
  comment: ForumComment,
  authorProfile: AuthorProfile | null,
  likeCount: number,
  isLiked?: boolean,
): ForumCommentPreview {
  return {
    id: comment.id,
    postId: comment.postId,
    authorName: authorProfile?.displayName ?? "Anonymous",
    authorWallet: authorProfile?.walletAddress ?? undefined,
    body: comment.body ?? "",
    createdAt: comment.createdAt,
    createdAtLabel: new Date(comment.createdAt).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    likeCount,
    isLiked,
  };
}
