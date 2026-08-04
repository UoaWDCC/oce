"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, X, Loader2 } from "lucide-react";
import { hasMeaningfulForumContent } from "@/utils/forumContent";
import FormattingToolbar, { type FormatType } from "./FormattingToolbar";

const FORMAT_COMMANDS: Record<FormatType, string> = {
  bold: "bold",
  italic: "italic",
  underline: "underline",
  bullet: "insertUnorderedList",
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
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

  const handleImageAttach = () => {
    const url = prompt("Enter image URL:");
    if (url) setImageUrl(url);
  };

  const handleRemoveImage = () => setImageUrl(null);

  const handleSubmit = async () => {
    setValidationError(null);
    setError(null);

    if (!hasMeaningfulForumContent(body)) {
      setValidationError("Content cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ body: body.trim(), imageUrl: imageUrl ?? undefined });
      setBody("");
      setActiveFormats([]);
      if (editorRef.current) editorRef.current.innerHTML = "";
      setImageUrl(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = disabled || isSubmitting;
  const isFullVariant = variant === "full";
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
        <FormattingToolbar
          activeFormats={activeFormats}
          disabled={isDisabled}
          onFormat={applyFormat}
        />

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
      </div>

      {imageUrl && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
          <span className="min-w-0 truncate">{imageUrl}</span>
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={isDisabled}
            className="shrink-0 text-slate-400 transition-colors hover:text-slate-600"
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

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {!isFullVariant && (
        <div className="flex items-center justify-between">
          {showAttachButton ? (
            <button
              type="button"
              onClick={handleImageAttach}
              disabled={isDisabled}
              className={classNames(
                "rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                isDisabled && "cursor-not-allowed opacity-50",
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
            disabled={isDisabled}
            className={classNames(
              "flex w-fit items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
              isDisabled && "cursor-not-allowed opacity-50",
            )}
          >
            <Paperclip className="h-4 w-4" />
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
