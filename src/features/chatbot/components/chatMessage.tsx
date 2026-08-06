"use client";
import { ReactNode } from "react";

interface ChatMessageProps {
  children: string;
}

export default function ChatMessage({ children }: ChatMessageProps): ReactNode {
  return (
    <div className="flex w-full min-w-0 justify-end">
      <div className="max-w-[85%] overflow-hidden rounded-2xl rounded-br-sm border border-purple-200 bg-purple-100 px-4 py-3 text-sm leading-6 text-slate-800 shadow-sm">
        <p className="whitespace-pre-line break-words [overflow-wrap:anywhere]">
          {children}
        </p>
      </div>
    </div>
  );
}
