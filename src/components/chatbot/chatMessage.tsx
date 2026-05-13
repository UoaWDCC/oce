"use client";
import React, { ReactNode } from "react";

interface ChatMessageProps {
  children: string;
}

export default function ChatMessage({ children }: ChatMessageProps): ReactNode {
  return (
    <div className="flex justify-end w-full px-2">
      <div className="bg-message-grey text-sm px-5 py-3 inline-block rounded-tr-3xl rounded-tl-3xl rounded-bl-3xl rounded-br-sm max-w-full">
        <p>{children}</p>
      </div>
    </div>
  );
}
