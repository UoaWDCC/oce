import type {
  CommentSubmitPayload,
  ForumCommentPreview,
  Post,
  PostSubmitPayload,
} from "@app-types/dao-forum";

/**
 * Orchestration for DAO forum composer submissions (ticket #122).
 *
 * These are deliberately framework-free so they can be unit tested without a
 * DOM: the container passes in the create hook + refetch callbacks, and these
 * functions own the "create then reload on success" flow plus the guard that a
 * failed create must not trigger a refetch.
 */

export interface SubmitPostDeps {
  createPost: (payload: PostSubmitPayload) => Promise<Post | null>;
  refetchPosts: () => void | Promise<void>;
}

export async function submitForumPost(
  deps: SubmitPostDeps,
  payload: PostSubmitPayload,
): Promise<Post | null> {
  const created = await deps.createPost(payload);
  if (created) {
    // Only reload the list once the API confirms the post was created.
    await deps.refetchPosts();
  }
  return created;
}

export interface SubmitCommentDeps {
  createComment: (data: {
    body?: string | null;
    imageUrl?: string | null;
    parentCommentId?: string | null;
  }) => Promise<ForumCommentPreview | undefined>;
  refetchComments: () => void | Promise<void>;
}

export async function submitForumComment(
  deps: SubmitCommentDeps,
  payload: CommentSubmitPayload,
): Promise<ForumCommentPreview | undefined> {
  const created = await deps.createComment({
    body: payload.body,
    imageUrl: payload.imageUrl,
    parentCommentId: payload.parentCommentId,
  });
  if (created) {
    await deps.refetchComments();
  }
  return created;
}
