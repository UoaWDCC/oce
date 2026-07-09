"use client";
import Image from "next/image";
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

    // Clear immediately on send so the question never stays stuck in the box
    // (e.g. if the user switches conversations while the reply streams). The
    // draft is restored only if the submit throws, which the parent does only
    // when the failing conversation is still selected.
    setInputValue("");

    try {
      await submitMessage(message);
    } catch {
      setInputValue(message);
    }
  }

  return (
    <div className="sticky mb-3 px-4 z-30 flex w-full min-w-0 flex-col gap-2">
      <div className="shadow-2xl rounded-full min-h-fit outline-2 outline-[#e9d5ff] flex items-center bg-white w-full min-w-0 pl-7 pr-1 overflow-hidden py-0.5 justify-center">
        <textarea
          className={`text-sm flex-1 min-w-0 outline-none resize-none min- disabled:cursor-not-allowed disabled:opacity-60`}
          style={{
            height: `${Math.min(textAreaRef.current?.scrollHeight ?? 20, 60)}px`,
          }}
          ref={textAreaRef}
          value={inputValue}
          onChange={updateInputValue}
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
          className="px-2 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting || inputValue.trim().length === 0}
          onClick={() => {
            void handleSubmit();
          }}
        >
          <Image
            src={"/submitButton.svg"}
            alt="submit input"
            width={30}
            height={30}
          />
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
