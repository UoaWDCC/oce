"use client";
import { Send } from "lucide-react";
import { ChangeEvent, ReactNode, useEffect, useRef, useState } from "react";

interface TextAreaPropsType {
  submitMessage(message: string): Promise<void> | void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export default function TextArea({
  submitMessage,
  isSubmitting = false,
  errorMessage = null,
}: TextAreaPropsType): ReactNode {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  function updateInputValue(e: ChangeEvent<HTMLTextAreaElement>) {
    setInputValue(e.target.value);
  }

  useEffect(() => {
    const el = textAreaRef.current;
    if (!el) return;

    el.style.height = "20px";
    el.style.height = `${Math.min(el.scrollHeight, 60)}px`;
  }, [inputValue, textAreaRef]);

  async function handleSubmit() {
    const message = inputValue.trim();

    if (!message || isSubmitting) {
      return;
    }

    // Clear on send so the question never stays stuck (e.g. if the user switches
    // conversations mid-stream). Restore the draft only if submit throws — which
    // the parent does only while the failing conversation is still selected.
    setInputValue("");

    try {
      await submitMessage(message);
    } catch {
      setInputValue(message);
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
          disabled={isSubmitting}
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
          disabled={isSubmitting || inputValue.trim().length === 0}
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
