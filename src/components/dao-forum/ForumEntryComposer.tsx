"use client";

import React, { useState, useRef, useEffect } from "react";
import { Paperclip, X, Loader2, ImageIcon } from "lucide-react";
import { useForumImageUpload } from "@/features/chat-forum/hooks/useForumImageUpload";

export type ForumEntryComposerState = {
  body: string;
  setBody: (body: string) => void;
  imageUrl: string | null;
  setImageUrl: (url: string | null) => void;
  isSubmitting: boolean;
  error: string | null;
  validationError: string | null;
};

export type ForumEntryComposerProps = {
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (data: { body: string; imageUrl?: string }) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  showAttachButton?: boolean;
  showCancelButton?: boolean;
  variant?: "compact" | "full";
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ForumEntryComposer({
  placeholder = "Write something...",
  submitLabel = "Submit",
  onSubmit,
  onCancel,
  disabled = false,
  className = "",
  children,
  showAttachButton = true,
  showCancelButton = false,
  variant = "compact",
}: ForumEntryComposerProps) {
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploadImage,
    isUploading,
    error: uploadError,
    validateFile,
  } = useForumImageUpload();

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = variant === "full" ? 300 : 150;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [body, variant]);

  const handleImageAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so same file can be selected again
    e.target.value = "";

    // Validate file first
    const fileError = validateFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setError(null);

    // Upload the file
    const uploadedUrl = await uploadImage(file);
    if (uploadedUrl) {
      setImageUrl(uploadedUrl);
    } else {
      // Upload failed, clear preview
      URL.revokeObjectURL(previewUrl);
      setImagePreview(null);
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageUrl(null);
    setError(null);
  };

  const handleSubmit = async () => {
    setValidationError(null);
    setError(null);

    if (!body.trim()) {
      setValidationError("Content cannot be empty");
      return;
    }

    // Don't submit if still uploading
    if (isUploading) {
      setError("Please wait for image upload to complete");
      return;
    }

    // Don't submit if there's a preview but no uploaded URL (upload failed)
    if (imagePreview && !imageUrl) {
      setError("Image upload failed. Please remove the image or try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        body: body.trim(),
        imageUrl: imageUrl ?? undefined,
      });
      // Only clear content after successful submission
      setBody("");
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(null);
      setImageUrl(null);
      setError(null);
    } catch (err) {
      // Keep the content when submission fails so user can retry
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = disabled || isSubmitting || isUploading;
  const isFullVariant = variant === "full";
  const displayError = error || uploadError;

  return (
    <div
      className={classNames(
        "flex flex-col gap-3",
        isFullVariant
          ? "rounded-xl bg-white"
          : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      {children}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {isFullVariant && (
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Body
        </label>
      )}

      <div
        className={classNames(
          isFullVariant &&
            "rounded-lg border border-slate-200 bg-white p-3",
        )}
      >
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          disabled={isDisabled}
          rows={isFullVariant ? 5 : 3}
          className={classNames(
            "w-full resize-none border-0 bg-transparent text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0",
            isFullVariant ? "px-0" : "rounded-lg px-0",
            isDisabled && "cursor-not-allowed opacity-50",
          )}
        />
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="relative inline-block w-fit">
          <div className="relative overflow-hidden rounded-lg border border-slate-200">
            <img
              src={imagePreview}
              alt="Selected image preview"
              className="max-h-48 max-w-full object-contain"
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={isSubmitting}
            className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-1 text-white shadow-md transition-colors hover:bg-slate-700"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {validationError && (
        <p className="text-sm text-red-600" role="alert">
          {validationError}
        </p>
      )}

      {displayError && (
        <p className="text-sm text-red-600" role="alert">
          {displayError}
        </p>
      )}

      {!isFullVariant && (
        <div className="flex items-center justify-between">
          {showAttachButton ? (
            <button
              type="button"
              onClick={handleImageAttach}
              disabled={isDisabled || !!imagePreview}
              className={classNames(
                "rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                (isDisabled || !!imagePreview) && "cursor-not-allowed opacity-50",
              )}
              aria-label="Attach image"
            >
              <Paperclip className="h-5 w-5" />
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isDisabled || !body.trim()}
            className={classNames(
              "rounded-full bg-violet-200 px-5 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
              (isDisabled || !body.trim()) && "cursor-not-allowed opacity-50",
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              submitLabel
            )}
          </button>
        </div>
      )}

      {isFullVariant && (
        <>
          <button
            type="button"
            onClick={handleImageAttach}
            disabled={isDisabled || !!imagePreview}
            className={classNames(
              "flex w-fit items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
              (isDisabled || !!imagePreview) && "cursor-not-allowed opacity-50",
            )}
          >
            <ImageIcon className="h-4 w-4" />
            Attach image
          </button>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            {showCancelButton && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isDisabled}
                className="rounded-full border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isDisabled || !body.trim()}
              className={classNames(
                "rounded-full bg-violet-400 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
                (isDisabled || !body.trim()) && "cursor-not-allowed opacity-50",
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
