import { useCallback, useState } from "react";
import { createPostComment } from "../services";
import { mapCommentToForumCommentPreview } from "../mappers";
import type { ForumCommentPreview } from "../types";
import type { CreateCommentFields } from "@app-types/comments";

export interface CreateCommentComposerData {
  body?: string | null;
  imageUrl?: string | null;
  parentCommentId?: string | null;
}

export interface UseCreateDaoForumCommentResult {
  createComment: (
    data: CreateCommentComposerData,
  ) => Promise<ForumCommentPreview | undefined>;
  isSubmitting: boolean;
  error: Error | null;
}

export function useCreateDaoForumComment(
  daoGroupId: string | undefined | null,
  postId: string | undefined | null,
  token?: string,
): UseCreateDaoForumCommentResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const createComment = useCallback(
    async (data: CreateCommentComposerData) => {
      if (!daoGroupId || !postId) {
        setError(
          new Error("Cannot create comment: missing DAO group id or post id"),
        );
        return undefined;
      }
      setIsSubmitting(true);

      try {
        const payload: CreateCommentFields = {
          body: data.body ?? null,
          image_url: data.imageUrl ?? null,
          parent_comment_id: data.parentCommentId ?? null,
        };
        const rawComment = await createPostComment(
          daoGroupId,
          postId,
          payload,
          token,
        );
        const mapped = mapCommentToForumCommentPreview(rawComment, postId);
        setError(null);
        return mapped;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to create DAO forum comment"),
        );
        return undefined;
      } finally {
        setIsSubmitting(false);
      }
    },
    [daoGroupId, postId, token],
  );

  return { createComment, isSubmitting, error };
}
