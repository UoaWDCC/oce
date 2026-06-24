"use client";
import Image from "next/image";
import { ChangeEvent, ReactNode, useRef, useState } from "react";
import { ChatMessageType } from "@/features/chatbot/types";

interface TextInputPropsType {
  submitMessage(chatMessage: ChatMessageType): void;
}

export default function TextInput({
  submitMessage,
}: TextInputPropsType): ReactNode {
  const [inputValue, setInputValue] = useState<string>("");
  const textInputRef = useRef<HTMLInputElement | null>(null);
  function updateInputValue(e: ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
  }
  return (
    <div className="sticky mb-3 px-4 z-30 flex w-full min-w-0">
      <div className="shadow-2xl rounded-full min-h-fit outline-2 outline-[#e9d5ff] flex items-center bg-white w-full min-w-0 pl-7 pr-1 overflow-hidden py-0.5 justify-center">
        <input
          className={`text-sm flex-1 min-w-0 outline-none resize-none`}
          ref={textInputRef}
          value={inputValue}
          onChange={updateInputValue}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.shiftKey) {
                return;
              }
              setInputValue("");
              submitMessage({
                type: "user",
                message: textInputRef!.current!.value,
              });
            }
          }}
        />
        <button
          className="px-2 shrink-0"
          onClick={() => {
            submitMessage({ message: inputValue, type: "user" });
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
