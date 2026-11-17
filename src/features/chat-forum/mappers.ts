import type {
  CommentListItem,
  CreatePostFields,
  ForumCommentPreview,
  ForumPostPreview,
  Post,
  PostListItem,
  PostSubmitPayload,
  PostType,
  UpdatePostFields,
} from "@app-types/dao-forum";
import type { ForumThreadComment, ForumThreadPost } from "./types";
import { resolveForumAuthorLabel } from "./authorIdentity";

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
    ...(payload.poll
      ? {
          poll: {
            question: payload.poll.question,
            options: payload.poll.options,
            allow_multiple: payload.poll.allowMultiple,
          },
        }
      : {}),
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

export function getIsOwnPost(
  post: Pick<ForumPostPreview, "authorId" | "isOwnPost">,
  currentUserId?: string | null,
): boolean {
  if (post.authorId) {
    return Boolean(currentUserId && post.authorId === currentUserId);
  }
  return post.isOwnPost === true;
}

export function withOwnPostCapability(
  post: ForumPostPreview,
  currentUserId?: string | null,
): ForumPostPreview {
  return {
    ...post,
    isOwnPost: getIsOwnPost(post, currentUserId),
  };
}

export function applyUpdatedPostToPreview(
  existing: ForumPostPreview,
  updated: Post,
  currentUserId?: string | null,
): ForumPostPreview {
  return withOwnPostCapability(
    {
      ...existing,
      title: updated.title ?? existing.title,
      excerpt: updated.body ?? existing.excerpt,
      types: updated.post_type ? [updated.post_type] : existing.types,
      anonymous: updated.anonymous,
      isPinned: updated.is_pinned,
      imageUrl: updated.image_url,
      authorId: updated.author_id || existing.authorId,
      authorName: updated.anonymous ? "Anonymous" : existing.authorName,
      authorWallet: updated.anonymous ? undefined : existing.authorWallet,
      authorEns: updated.anonymous ? undefined : existing.authorEns,
    },
    currentUserId,
  );
}

export function mapPostToForumPostPreview(
  post: PostListItem,
  currentUserId?: string | null,
): ForumPostPreview {
  return withOwnPostCapability(
    {
      id: post.id,
      daoId: post.dao_group_id,
      title: post.title ?? "",
      // Keep the full body available for search and let the card clamp it visually.
      excerpt: post.body ?? "",
      authorId: post.author_id ?? undefined,
      authorName: post.anonymous
        ? post.is_own_post
          ? "Anonymous (You)"
          : "Anonymous"
        : resolveForumAuthorLabel(
            {
              ensName: post.author?.ensName,
              walletAddress: post.author?.walletAddress,
            },
            "Unknown",
          ),
      isOwnPost: post.is_own_post,
      authorWallet: post.anonymous ? undefined : (post.author?.walletAddress ?? undefined),
      authorEns: post.anonymous ? undefined : (post.author?.ensName ?? undefined),
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
      anonymous: post.anonymous,
      isPinned: post.is_pinned,
      isUnread: post.is_unread,
      imageUrl: post.image_url,
    },
    currentUserId,
  );
}

export function mapCommentToForumCommentPreview(
  comment: CommentListItem,
  postId: string,
  currentUserId: string | null,
): ForumCommentPreview {
  return {
    id: comment.id,
    postId,
    parentCommentId: comment.parent_comment_id,
    authorId: comment.author_id,
    authorName: comment.deleted_at
      ? "Deleted comment"
      : resolveForumAuthorLabel(
          { ensName: comment.ens_name, walletAddress: comment.wallet_address },
          "Unknown",
        ),
    authorWallet: comment.deleted_at ? undefined : (comment.wallet_address ?? undefined),
    authorEns: comment.deleted_at ? undefined : (comment.ens_name ?? undefined),
    body: comment.body ?? "",
    createdAt: comment.created_at,
    createdAtLabel: new Date(comment.created_at).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    reactionCounts: comment.reaction_counts,
    userReactions: comment.user_reactions,
    isDeleted: comment.deleted_at !== null,
    isOwnComment: comment.author_id === currentUserId,
    isContextOnly: comment.is_context_only ?? false,
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
    },
    createdAt: post.createdAt,
    createdAtLabel: post.createdAtLabel,
    imageUrl: post.imageUrl,
    viewCount: post.viewCount,
    anonymous: post.anonymous,
    isPinned: post.isPinned,
    isOwnPost: post.isOwnPost,
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
      },
      createdAt: comment.createdAt,
      createdAtLabel: comment.createdAtLabel,
      reactionCounts: comment.reactionCounts,
      userReactions: comment.userReactions,
      isDeleted: comment.isDeleted,
      isOwnComment: comment.isOwnComment,
      isContextOnly: comment.isContextOnly,
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
