"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, X, Loader2, ImageIcon } from "lucide-react";
import { hasMeaningfulForumContent } from "@/utils/forumContent";
import { useForumImageUpload } from "@/features/chat-forum/hooks/useForumImageUpload";
import FormattingToolbar, { type FormatType } from "./FormattingToolbar";
import { useCharacterCount } from "../../features/chat-forum/hooks/useCharacterCount";
import { CharacterCounter } from "./CharacterCounter";

const FORMAT_COMMANDS: Record<FormatType, string> = {
  bold: "bold",
  italic: "italic",
  underline: "underline",
  bullet: "insertUnorderedList",
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
  autoFocus?: boolean;
  limitKey?: "POST_BODY" | "COMMENT_BODY";
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
  autoFocus = false,
  limitKey = "POST_BODY",
}: ForumEntryComposerProps) {
  const [body, setBody] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<string | null>(null);

  const bodyCounter = useCharacterCount(body, limitKey);
  const {
    uploadImage,
    removeImage,
    isUploading,
    error: uploadError,
    validateFile,
    clearError: clearUploadError,
  } = useForumImageUpload();
  const [activeFormats, setActiveFormats] = useState<FormatType[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  const updateActiveFormats = useCallback(() => {
    const editor = editorRef.current;
    const selection = document.getSelection();

    if (
      !editor ||
      !selection?.anchorNode ||
      !editor.contains(selection.anchorNode)
    ) {
      setActiveFormats([]);
      return;
    }

    const nextFormats = (Object.keys(FORMAT_COMMANDS) as FormatType[]).filter(
      (type) => document.queryCommandState(FORMAT_COMMANDS[type]),
    );

    setActiveFormats((currentFormats) =>
      currentFormats.length === nextFormats.length &&
      currentFormats.every((format, index) => format === nextFormats[index])
        ? currentFormats
        : nextFormats,
    );
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats);
    return () =>
      document.removeEventListener("selectionchange", updateActiveFormats);
  }, [updateActiveFormats]);

  const applyFormat = (type: FormatType) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(FORMAT_COMMANDS[type]);
    setBody(editor.innerHTML);
    updateActiveFormats();
  };

  const handleEditorInput = () => {
    setBody(editorRef.current?.innerHTML ?? "");
    updateActiveFormats();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    document.execCommand(
      "insertText",
      false,
      event.clipboardData.getData("text/plain"),
    );
    handleEditorInput();
  };

  useEffect(() => {
    if (autoFocus) {
      editorRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    return () => {
      if (imagePreviewRef.current) {
        URL.revokeObjectURL(imagePreviewRef.current);
      }
    };
  }, []);

  const handleImageAttach = () => {
    fileInputRef.current?.click();
  };

  const clearSelectedImage = () => {
    if (imagePreviewRef.current) {
      URL.revokeObjectURL(imagePreviewRef.current);
      imagePreviewRef.current = null;
    }
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    const fileError = validateFile(file);
    if (fileError) {
      setError(fileError);
      clearUploadError();
      return;
    }

    clearSelectedImage();
    const previewUrl = URL.createObjectURL(file);
    imagePreviewRef.current = previewUrl;
    setSelectedFile(file);
    setImagePreview(previewUrl);
    setError(null);
    clearUploadError();
  };

  const handleRemoveImage = () => {
    clearSelectedImage();
    setError(null);
    clearUploadError();
  };

  const handleCancel = () => {
    clearSelectedImage();
    setError(null);
    clearUploadError();
    onCancel?.();
  };

  const handleSubmit = async () => {
    setValidationError(null);
    setError(null);

    if (!body.trim()) {
      setValidationError("Content cannot be empty");
      return;
    }

    if (bodyCounter.isOverLimit) {
      setValidationError(
        `Content must be ${bodyCounter.limit} characters or fewer`,
      );
      return;
    }

    if (!hasMeaningfulForumContent(body)) {
      setValidationError("Content cannot be empty");
      return;
    }

    setIsSubmitting(true);
    let uploadedImage: Awaited<ReturnType<typeof uploadImage>> = null;

    try {
      if (selectedFile) {
        uploadedImage = await uploadImage(selectedFile);
        if (!uploadedImage) return;
      }

      await onSubmit({
        body: body.trim(),
        imageUrl: uploadedImage?.publicUrl,
      });
      setBody("");
      setActiveFormats([]);
      if (editorRef.current) editorRef.current.innerHTML = "";
      clearSelectedImage();
      setError(null);
    } catch (err) {
      if (uploadedImage) {
        await removeImage(uploadedImage.path);
      }
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = disabled || isSubmitting || isUploading;
  const isFullVariant = variant === "full";
  const displayError = error ?? uploadError;
  const hasContent = hasMeaningfulForumContent(body);

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
          isFullVariant && "rounded-lg border border-slate-200 bg-white p-3",
        )}
      >
        <FormattingToolbar onFormat={applyFormat} disabled={isDisabled} />

        <div
          ref={editorRef}
          aria-disabled={isDisabled}
          aria-label={placeholder}
          aria-multiline="true"
          contentEditable={!isDisabled}
          data-placeholder={placeholder}
          onInput={handleEditorInput}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onPaste={handlePaste}
          role="textbox"
          suppressContentEditableWarning
          className={classNames(
            "w-full overflow-y-auto border-0 bg-transparent text-sm leading-6 text-slate-900 focus:outline-none focus:ring-0 [&:empty:before]:pointer-events-none [&:empty:before]:text-slate-400 [&:empty:before]:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-6",
            isFullVariant
              ? "min-h-[120px] max-h-[300px]"
              : "min-h-[72px] max-h-[150px] rounded-lg",
            isDisabled && "cursor-not-allowed opacity-50",
          )}
        />

        <div className="mt-1 flex justify-end">
          <CharacterCounter
            count={bodyCounter.count}
            limit={bodyCounter.limit}
            isOverLimit={bodyCounter.isOverLimit}
            isNearLimit={bodyCounter.isNearLimit}
          />
        </div>
      </div>

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
            disabled={isDisabled}
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
                (isDisabled || !!imagePreview) &&
                  "cursor-not-allowed opacity-50",
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
            disabled={isDisabled || !hasContent}
            className={classNames(
              "rounded-full bg-violet-200 px-5 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
              (isDisabled || !hasContent) && "cursor-not-allowed opacity-50",
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
                onClick={handleCancel}
                disabled={isDisabled}
                className="rounded-full border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isDisabled || !hasContent}
              className={classNames(
                "rounded-full bg-violet-400 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
                (isDisabled || !hasContent) && "cursor-not-allowed opacity-50",
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