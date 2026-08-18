import { useCallback, useRef, useState } from "react";
import { updateForumPost } from "../services";
import { mapPostSubmitPayloadToUpdatePostFields } from "../mappers";
import type { Post, PostSubmitPayload } from "@app-types/dao-forum";

export interface UseUpdateDaoForumPostResult {
  updatePost: (payload: PostSubmitPayload) => Promise<Post | null>;
  isSubmitting: boolean;
  error: Error | null;
}

export function useUpdateDaoForumPost(
  daoGroupId: string | undefined | null,
  postId: string | undefined | null,
  token?: string,
): UseUpdateDaoForumPostResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isSubmittingRef = useRef(false);

  const updatePost = useCallback(
    async (payload: PostSubmitPayload): Promise<Post | null> => {
      if (!daoGroupId || !postId) {
        setError(
          new Error(
            "Cannot update post: DAO group id and post id are both required.",
          ),
        );
        return null;
      }

      if (!token) {
        setError(new Error("Cannot update post: not signed in"));
        return null;
      }

      if (isSubmittingRef.current) {
        return null;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);

      try {
        const updateFields = mapPostSubmitPayloadToUpdatePostFields(payload);
        const updatedPost = await updateForumPost(
          daoGroupId,
          postId,
          updateFields,
          token,
        );
        setError(null);
        return updatedPost;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to update DAO forum post"),
        );
        return null;
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [daoGroupId, postId, token],
  );

  return { updatePost, isSubmitting, error };
}
