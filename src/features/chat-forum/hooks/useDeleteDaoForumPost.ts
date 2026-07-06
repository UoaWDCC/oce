import { useCallback, useState } from "react";
import { deleteForumPost } from "../services";

export interface UseDeleteDaoForumPostResult {
  deletePost: () => Promise<boolean>;
  isSubmitting: boolean;
  error: Error | null;
}

export function useDeleteDaoForumPost(
  daoGroupId: string | undefined | null,
  postId: string | undefined | null,
  token?: string,
): UseDeleteDaoForumPostResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deletePost = useCallback(async (): Promise<boolean> => {
    if (!daoGroupId || !postId) {
      setError(
        new Error(
          "Cannot delete post: DAO group id and post id are both required.",
        ),
      );
      return false;
    }

    if (isSubmitting) {
      return false;
    }

    setIsSubmitting(true);

    try {
      await deleteForumPost(daoGroupId, postId, token);
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete DAO forum post"));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [daoGroupId, postId, token, isSubmitting]);

  return { deletePost, isSubmitting, error };
}