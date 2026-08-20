import { useCallback, useRef, useState } from "react";

import { createForumPost } from "../services";
import { mapPostSubmitPayloadToCreatePostFields } from "../mappers";
import type { Post, PostSubmitPayload } from "@app-types/dao-forum";

export interface UseCreateDaoForumPostResult {
  createPost: (composerData: PostSubmitPayload) => Promise<Post | null>;
  isSubmitting: boolean;
  error: Error | null;
}

export function useCreateDaoForumPost(
  daoGroupId: string | undefined | null,
  token?: string,
): UseCreateDaoForumPostResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isSubmittingRef = useRef(false);

  const createPost = useCallback(
    async (composerData: PostSubmitPayload): Promise<Post | null> => {
      if (!daoGroupId) {
        const err = new Error(
          "Cannot create a post: no DAO group id was provided.",
        );
        setError(err);
        throw err;
      }

      if (!token) {
        const err = new Error("Cannot create a post: not signed in.");
        setError(err);
        throw err;
      }

      if (isSubmittingRef.current) {
        return null;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);

      try {
        const payload = mapPostSubmitPayloadToCreatePostFields(composerData);
        const createdPost = await createForumPost(daoGroupId, payload, token);
        setError(null);
        return createdPost;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to create DAO forum post");
        setError(error);
        // Rethrow so the composer keeps the modal open and shows the error inline.
        throw error;
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [daoGroupId, token],
  );

  return { createPost, isSubmitting, error };
}
