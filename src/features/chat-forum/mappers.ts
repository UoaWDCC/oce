import type {
  CommentListItem,
  CreatePostFields,
  ForumCommentPreview,
  ForumPostPreview,
  PostListItem,
  PostSubmitPayload,
  PostType,
  UpdatePostFields,
} from "@app-types/dao-forum";

export function mapPostSubmitPayloadToCreatePostFields(
  payload: PostSubmitPayload,
): CreatePostFields {
  return {
    post_type: payload.postType,
    title: payload.title,
    body: payload.body,
    anonymous: payload.anonymous,
    is_pinned: payload.isPinned,
    image_url: payload.imageUrl ?? null,
  };
}

export function mapPostSubmitPayloadToUpdatePostFields(
  payload: PostSubmitPayload,
): UpdatePostFields {
  return {
    post_type: payload.postType,
    title: payload.title,
    body: payload.body,
    anonymous: payload.anonymous,
    is_pinned: payload.isPinned,
    image_url: payload.imageUrl ?? null,
    // The updated_at field is set to null as the DB will handle the timestamp.
    updated_at: null,
  };
}

export function mapPostToForumPostPreview(
  post: PostListItem,
): ForumPostPreview {
  return {
    id: post.id,
    daoId: post.dao_group_id,
    title: post.title ?? "",
    // Keep the full body available for search and let the card clamp it visually.
    excerpt: post.body ?? "",
    authorName: post.author?.Name ?? "Anonymous",
    authorWallet: undefined,
    createdAt: post.created_at,
    createdAtLabel: new Date(post.created_at).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    commentCount: post.comment_count,
    types: post.post_type ? [post.post_type as PostType] : [],
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
