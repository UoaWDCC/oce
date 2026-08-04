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
import type { ForumThreadComment, ForumThreadPost } from "./types";

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
    viewCount: post.view_count ?? 0,
    types: post.post_type ? [post.post_type as PostType] : [],
    tags: post.tags,
    isPinned: post.is_pinned,
    isUnread: post.is_unread,
    imageUrl: post.image_url,
  };
}

export function mapCommentToForumCommentPreview(
  comment: CommentListItem,
  postId: string,
): ForumCommentPreview {
  return {
    id: comment.id,
    postId,
    parentCommentId: comment.parent_comment_id,
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
    isDeleted: comment.body === null,
    imageUrl: comment.image_url,
  };
}

export function mapForumPostPreviewToThreadPost(
  post: ForumPostPreview,
): ForumThreadPost {
  return {
    id: post.id,
    title: post.title,
    body: post.excerpt,
    postType: post.types[0] ?? null,
    tags: post.tags,
    author: {
      name: post.authorName,
      walletAddress: post.authorWallet,
    },
    createdAt: post.createdAt,
    createdAtLabel: post.createdAtLabel,
    imageUrl: post.imageUrl,
    viewCount: post.viewCount,
  };
}

export function buildForumThreadComments(
  comments: ForumCommentPreview[],
): ForumThreadComment[] {
  const nodes = new Map<string, ForumThreadComment>();

  comments.forEach((comment) => {
    nodes.set(comment.id, {
      id: comment.id,
      body: comment.isDeleted ? "This comment was deleted." : comment.body,
      author: {
        name: comment.isDeleted ? "Deleted comment" : comment.authorName,
        walletAddress: comment.authorWallet,
      },
      createdAt: comment.createdAt,
      createdAtLabel: comment.createdAtLabel,
      likeCount: comment.likeCount,
      isLiked: comment.isLiked,
      isDeleted: comment.isDeleted,
      imageUrl: comment.isDeleted ? null : comment.imageUrl,
      replies: [],
    });
  });

  const roots: ForumThreadComment[] = [];

  comments.forEach((comment) => {
    const node = nodes.get(comment.id);
    if (!node) return;

    const parent = comment.parentCommentId
      ? nodes.get(comment.parentCommentId)
      : undefined;

    if (parent && parent.id !== node.id) {
      parent.replies?.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
