"use client";
import Image from "next/image";
import { ChangeEvent, ReactNode, useRef, useState } from "react";
import { ChatMessageType } from "@/features/chatbot/types";

interface ChatInputPropsType {
  submitMessage(chatMessage: ChatMessageType): void;
}

export default function ChatInput({
  submitMessage,
}: ChatInputPropsType): ReactNode {
  const [inputValue, setInputValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  function updateInputValue(e: ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
  }

  return (
    <div className="sticky mb-3 px-4 z-30 flex w-full min-w-0">
      <div className="shadow-2xl rounded-full min-h-10 outline-2 outline-[#e9d5ff] flex items-center bg-white w-full min-w-0 pl-5 pr-1 overflow-hidden">
        {/* TODO: change to a textarea? */}
        <input
          className="text-sm flex-1 min-w-0 outline-none"
          ref={inputRef}
          value={inputValue}
          onChange={updateInputValue}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setInputValue("");
              submitMessage({ type: "user", message: inputRef.current!.value });
            }
          }}
        />
        <button
          className="px-2 flex-shrink-0"
          onClick={() => {
            submitMessage({ message: inputValue, type: "user" });
            setInputValue("");
          }}
        >
          <Image
            src={"/submitButton.svg"}
            alt="submit question"
            width={30}
            height={30}
          />
        </button>
      </div>
    </div>
  );
}
