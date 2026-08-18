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
        setError(new Error("Cannot update comment: missing comment id"));
        return undefined;
      }
      if (!token) {
        setError(new Error("Cannot update comment: not signed in"));
        return undefined;
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
        setError(
          err instanceof Error ? err : new Error("Failed to update comment"),
        );
        return undefined;
      } finally {
        setIsSubmitting(false);
      }
    },
    [commentId],
  );

  return { updateComment, isSubmitting, error };
}
