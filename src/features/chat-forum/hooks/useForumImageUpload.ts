import { useCallback, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const BUCKET_NAME = "forum-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export type UploadedForumImage = {
  path: string;
  publicUrl: string;
};

export interface UseForumImageUploadResult {
  uploadImage: (file: File) => Promise<UploadedForumImage | null>;
  removeImage: (path: string) => Promise<boolean>;
  isUploading: boolean;
  error: string | null;
  validateFile: (file: File) => string | null;
  clearError: () => void;
}

export function validateForumImageFile(
  file: Pick<File, "size" | "type">,
): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File too large. Maximum size is 5MB.";
  }
  return null;
}

export function useForumImageUpload(): UseForumImageUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(validateForumImageFile, []);
  const clearError = useCallback(() => setError(null), []);

  const uploadImage = useCallback(
    async (file: File): Promise<UploadedForumImage | null> => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return null;
      }

      setIsUploading(true);
      setError(null);

      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("You must be logged in to upload images.");
        }

        const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

        return { path: fileName, publicUrl };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to upload image";
        setError(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [validateFile],
  );

  const removeImage = useCallback(async (path: string): Promise<boolean> => {
    try {
      const { error: removeError } = await createClient()
        .storage.from(BUCKET_NAME)
        .remove([path]);

      if (removeError) {
        console.error("Failed to clean up forum image:", removeError.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error(
        "Failed to clean up forum image:",
        err instanceof Error ? err.message : "Unknown error",
      );
      return false;
    }
  }, []);

  return {
    uploadImage,
    removeImage,
    isUploading,
    error,
    validateFile,
    clearError,
  };
}
