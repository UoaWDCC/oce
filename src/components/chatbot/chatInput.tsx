"use client";
import Image from "next/image";
import { ChangeEvent, ReactNode, useRef, useState } from "react";
import { IChatMessage } from "./chatBox";

interface IChatInputProps {
  submitMessage(chatMessage: IChatMessage): void;
}

export default function ChatInput({
  submitMessage,
}: IChatInputProps): ReactNode {
  const [inputValue, setInputValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  function updateInputValue(e: ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
  }

  return (
    <div className="w-full h-8 px-3 mb-6 z-30">
      <div className="shadow-2xl rounded-full h-10 outline-2 outline-[#e9d5ff] flex items-center bg-white">
        <input
          className="text-sm flex-1 h-full pr-3 pl-4 min-w-0"
          ref={inputRef}
          value={inputValue}
          onChange={updateInputValue}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setInputValue("");
              submitMessage({ type: "user", message: inputRef.current!.value });
              //TODO: enable scroll to bottom of page when new message is sent
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
