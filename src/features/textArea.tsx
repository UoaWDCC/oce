"use client";
import { Send } from "lucide-react";
import { ChangeEvent, ReactNode, useEffect, useRef, useState } from "react";

const NO_DISCARDED_DRAFTS: string[] = [];

// The conversation may be created during submission, after the input cleared.
export class UnsavedDraftError extends Error {
  constructor(readonly draftKey: string | null) {
    super("Message was not saved.");
  }
}

interface TextAreaPropsType {
  submitMessage(message: string): Promise<void> | void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  disabled?: boolean;
  placeholder?: string;
  draftKey?: string | null;
  discardedDraftKeys?: string[];
}

export default function TextArea({
  submitMessage,
  isSubmitting = false,
  errorMessage = null,
  disabled = false,
  placeholder,
  draftKey,
  discardedDraftKeys = NO_DISCARDED_DRAFTS,
}: TextAreaPropsType): ReactNode {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [drafts, setDrafts] = useState(
    new Map<string | null | undefined, string>(),
  );
  const inputValue = drafts.get(draftKey) ?? "";
  const draftRevisionsRef = useRef(
    new Map<string | null | undefined, number>(),
  );
  const submissionSequenceRef = useRef(0);
  const isSubmittingRef = useRef(false);
  const isMountedRef = useRef(false);
  const discardedDraftKeysRef = useRef(new Set<string>());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const newlyDiscarded = discardedDraftKeys.filter(
      (key) => !discardedDraftKeysRef.current.has(key),
    );
    discardedDraftKeysRef.current = new Set(discardedDraftKeys);
    setDrafts((current) => {
      if (!newlyDiscarded.some((key) => current.has(key))) return current;
      const remaining = new Map(current);
      for (const key of newlyDiscarded) remaining.delete(key);
      return remaining;
    });
  }, [discardedDraftKeys]);
  function updateInputValue(e: ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    draftRevisionsRef.current.set(
      draftKey,
      (draftRevisionsRef.current.get(draftKey) ?? 0) + 1,
    );
    setDrafts((current) => new Map(current).set(draftKey, value));
  }

  useEffect(() => {
    const el = textAreaRef.current;
    if (!el) return;

    el.style.height = "20px";
    el.style.height = `${Math.min(el.scrollHeight, 60)}px`;
  }, [inputValue, textAreaRef]);

  async function handleSubmit() {
    const message = inputValue.trim();

    if (!message || isSubmittingRef.current || isSubmitting || disabled) {
      return;
    }

    const sequence = ++submissionSequenceRef.current;
    isSubmittingRef.current = true;
    const revisions = new Map(draftRevisionsRef.current);
    setDrafts((current) => new Map(current).set(draftKey, ""));

    try {
      await submitMessage(message);
    } catch (error) {
      const owner =
        error instanceof UnsavedDraftError ? error.draftKey : draftKey;
      // Recover only the originating draft. A background failure cannot fill
      // another conversation's input or replace edits made since submission.
      if (
        isMountedRef.current &&
        submissionSequenceRef.current === sequence &&
        (draftRevisionsRef.current.get(owner) ?? 0) ===
          (revisions.get(owner) ?? 0)
      ) {
        setDrafts((current) =>
          current.get(owner) ? current : new Map(current).set(owner, message),
        );
      }
    } finally {
      isSubmittingRef.current = false;
    }
  }

  return (
    <div className="sticky z-30 mb-3 flex w-full min-w-0 flex-col gap-2 px-4">
      <div className="flex min-h-12 w-full min-w-0 items-center overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 pl-4 pr-1 shadow-sm transition focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100">
        <textarea
          className="min-w-0 flex-1 resize-none bg-transparent py-2 text-sm leading-5 text-slate-800 outline-none disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            height: `${Math.min(textAreaRef.current?.scrollHeight ?? 20, 60)}px`,
          }}
          ref={textAreaRef}
          value={inputValue}
          onChange={updateInputValue}
          aria-label="Message AI Tutor"
          placeholder={placeholder}
          disabled={isSubmitting || disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.shiftKey) {
                return;
              }
              e.preventDefault();
              void handleSubmit();
            }
          }}
        />
        <button
          type="button"
          aria-label="Send message"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#5e00b2] transition-colors hover:bg-purple-200 active:bg-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e00b2] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          disabled={isSubmitting || disabled || inputValue.trim().length === 0}
          onClick={() => {
            void handleSubmit();
          }}
        >
          <Send aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      {errorMessage && (
        <p className="px-3 text-xs text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
