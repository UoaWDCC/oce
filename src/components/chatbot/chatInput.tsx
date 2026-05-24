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
    <div className="w-full mb-3 pl-4 z-30 flex pr-1">
      <div className="shadow-2xl rounded-full min-h-10 outline-2 outline-[#e9d5ff] flex items-center bg-white w-full px-0 pl-5">
        {/* TODO: change to a textarea */}
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
