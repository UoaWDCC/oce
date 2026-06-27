"use client";
import Image from "next/image";
import { ChangeEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Message } from "@/llm/types/Message";

interface TextAreaPropsType {
  submitMessage(chatMessage: Message): void;
}

export default function TextArea({
  submitMessage,
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

  return (
    <div className="sticky mb-3 px-4 z-30 flex w-full min-w-0">
      <div className="shadow-2xl rounded-full min-h-fit outline-2 outline-[#e9d5ff] flex items-center bg-white w-full min-w-0 pl-7 pr-1 overflow-hidden py-0.5 justify-center">
        <textarea
          className={`text-sm flex-1 min-w-0 outline-none resize-none min-`}
          style={{
            height: `${Math.min(textAreaRef.current?.scrollHeight ?? 20, 60)}px`,
          }}
          ref={textAreaRef}
          value={inputValue}
          onChange={updateInputValue}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.shiftKey) {
                return;
              }
              e.preventDefault();
              setInputValue("");
              submitMessage({
                role: "user",
                content: textAreaRef!.current!.value,
              });
            }
          }}
        />
        <button
          className="px-2 shrink-0"
          onClick={() => {
            submitMessage({ content: inputValue, role: "user" });
            setInputValue("");
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
    </div>
  );
}
