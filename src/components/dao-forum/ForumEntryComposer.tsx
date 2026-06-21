"use client";

import React, { useState, useRef, useEffect } from "react";
import { Paperclip, X, Loader2 } from "lucide-react";

export type ForumEntryComposerProps = {
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (data: { body: string; imageUrl?: string }) => Promise<void>;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ForumEntryComposer({
  placeholder = "Write something...",
  submitLabel = "Submit",
  onSubmit,
  disabled = false,
  className = "",
  children,
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
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [body]);

  const handleImageAttach = () => {
    const url = prompt("Enter image URL:");
    if (url) {
      setImageUrl(url);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
  };

  const handleSubmit = async () => {
    setValidationError(null);
    setError(null);

    if (!body.trim()) {
      setValidationError("Content cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        body: body.trim(),
        imageUrl: imageUrl ?? undefined,
      });
      setBody("");
      setImageUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = disabled || isSubmitting;

  return (
    <div
      className={classNames(
        "flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4",
        className,
      )}
    >
      {children}

      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        disabled={isDisabled}
        rows={3}
        className={classNames(
          "w-full resize-none rounded-lg border-0 bg-transparent px-0 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0",
          isDisabled && "cursor-not-allowed opacity-50",
        )}
      />

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

      <div className="flex items-center justify-between">
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
    </div>
  );
}
