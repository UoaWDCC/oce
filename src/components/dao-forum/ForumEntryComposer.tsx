"use client";

import React, { useState, useRef, useEffect } from "react";
import { Paperclip, X, Loader2 } from "lucide-react";
import FormattingToolbar from "./FormattingToolbar";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = variant === "full" ? 300 : 150;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [body, variant]);

  const applyFormat = (type: "bold" | "italic" | "underline" | "bullet") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.slice(start, end);
    const hasSelection = start !== end;

    let newBody = body;
    let newCursorStart = start;
    let newCursorEnd = end;

    switch (type) {
      case "bold": {
        if (hasSelection) {
          const replacement = `**${selectedText}**`;
          newBody = body.slice(0, start) + replacement + body.slice(end);
          newCursorStart = start;
          newCursorEnd = start + replacement.length;
        } else {
          newBody = body.slice(0, start) + "****" + body.slice(start);
          newCursorStart = start + 2;
          newCursorEnd = start + 2;
        }
        break;
      }
      case "italic": {
        if (hasSelection) {
          const replacement = `*${selectedText}*`;
          newBody = body.slice(0, start) + replacement + body.slice(end);
          newCursorStart = start;
          newCursorEnd = start + replacement.length;
        } else {
          newBody = body.slice(0, start) + "**" + body.slice(start);
          newCursorStart = start + 1;
          newCursorEnd = start + 1;
        }
        break;
      }
      case "underline": {
        if (hasSelection) {
          const replacement = `<u>${selectedText}</u>`;
          newBody = body.slice(0, start) + replacement + body.slice(end);
          newCursorStart = start;
          newCursorEnd = start + replacement.length;
        } else {
          newBody = body.slice(0, start) + "<u></u>" + body.slice(start);
          newCursorStart = start + 3;
          newCursorEnd = start + 3;
        }
        break;
      }
      case "bullet": {
        if (hasSelection) {
          const lines = selectedText.split("\n");
          const bulleted = lines.map((line) => `- ${line}`).join("\n");
          newBody = body.slice(0, start) + bulleted + body.slice(end);
          newCursorStart = start;
          newCursorEnd = start + bulleted.length;
        } else {
          const bullet = "- ";
          newBody = body.slice(0, start) + bullet + body.slice(start);
          newCursorStart = start + bullet.length;
          newCursorEnd = start + bullet.length;
        }
        break;
      }
    }

    setBody(newBody);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    });
  };

  const handleImageAttach = () => {
    const url = prompt("Enter image URL:");
    if (url) setImageUrl(url);
  };

  const handleRemoveImage = () => setImageUrl(null);

  const handleSubmit = async () => {
    setValidationError(null);
    setError(null);

    if (!body.trim()) {
      setValidationError("Content cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ body: body.trim(), imageUrl: imageUrl ?? undefined });
      setBody("");
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
        {/* ── Formatting toolbar ── */}
        <FormattingToolbar onFormat={applyFormat} disabled={isDisabled} />

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