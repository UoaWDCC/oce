import { useCallback, useState } from "react";
import {
  likeComment as likeCommentService,
  unlikeComment as unlikeCommentService,
} from "../services";

export interface UseDaoForumCommentLikeResult {
  likeComment: (
    commentId: string | undefined | null,
    token?: string,
  ) => Promise<boolean>;
  unlikeComment: (
    commentId: string | undefined | null,
    token?: string,
  ) => Promise<boolean>;
  isSubmitting: boolean;
  error: Error | null;
}

export function useDaoForumCommentLike(): UseDaoForumCommentLikeResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const likeComment = useCallback(
    async (commentId: string | undefined | null, token?: string) => {
      if (!commentId) {
        setError(new Error("Cannot like comment: missing comment id"));
        return false;
      }
      setIsSubmitting(true);
      try {
        await likeCommentService(commentId, token);
        setError(null);
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to like comment"),
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const unlikeComment = useCallback(
    async (commentId: string | undefined | null, token?: string) => {
      if (!commentId) {
        setError(new Error("Cannot unlike comment: missing comment id"));
        return false;
      }
      setIsSubmitting(true);
      try {
        await unlikeCommentService(commentId, token);
        setError(null);
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to unlike comment"),
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return { likeComment, unlikeComment, isSubmitting, error };
}
