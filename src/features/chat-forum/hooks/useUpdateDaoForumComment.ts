import { useCallback, useState } from "react";
import { updateForumComment } from "../services";
import type {
  UpdateCommentFields,
  FormattedComment,
} from "@app-types/comments";

export interface UpdateCommentComposerData {
  body?: string | null;
  imageUrl?: string | null;
}

export interface UseUpdateDaoForumCommentResult {
  updateComment: (
    data: UpdateCommentComposerData,
    token?: string,
  ) => Promise<FormattedComment | undefined>;
  isSubmitting: boolean;
  error: Error | null;
}

export function useUpdateDaoForumComment(
  commentId: string | undefined | null,
): UseUpdateDaoForumCommentResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateComment = useCallback(
    async (data: UpdateCommentComposerData, token?: string) => {
      if (!commentId) {
        const error = new Error("Cannot update comment: missing comment id");
        setError(error);
        throw error;
      }
      if (!token) {
        const error = new Error("Cannot update comment: not signed in");
        setError(error);
        throw error;
      }
      setIsSubmitting(true);
      try {
        const payload: UpdateCommentFields = {
          body: data.body ?? null,
          image_url: data.imageUrl ?? null,
        };
        const updatedComment = await updateForumComment(
          commentId,
          payload,
          token,
        );
        setError(null);
        return updatedComment;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to update comment");
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [commentId],
  );

  return { updateComment, isSubmitting, error };
}
