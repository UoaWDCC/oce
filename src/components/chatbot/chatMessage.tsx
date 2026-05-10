"use client";
import React, { ReactNode } from "react";

interface ChatMessageProps {
  children: string;
}

export default function ChatMessage({ children }: ChatMessageProps): ReactNode {
  return (
    <div className="bg-message-grey px-6 py-5 inline-block rounded-tr-3xl rounded-tl-3xl rounded-bl-3xl rounded-br-sm max-w-1/2">
      <p>{children}</p>
    </div>
  );
}
