import { useCallback, useState } from "react";
import { deleteForumComment } from "../services";

export interface UseDeleteDaoForumCommentResult {
  deleteComment: (token?: string) => Promise<boolean>;
  isSubmitting: boolean;
  error: Error | null;
}

export function useDeleteDaoForumComment(
  commentId: string | undefined | null,
): UseDeleteDaoForumCommentResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteComment = useCallback(
    async (token?: string) => {
      if (!commentId) {
        setError(new Error("Cannot delete comment: missing comment id"));
        return false;
      }
      setIsSubmitting(true);
      try {
        await deleteForumComment(commentId, token);
        setError(null);
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to delete comment"),
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [commentId],
  );

  return { deleteComment, isSubmitting, error };
}
