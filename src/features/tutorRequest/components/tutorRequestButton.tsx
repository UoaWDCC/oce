"use client";
import { useState } from "react";
import TutorRequestPanel from "./tutorRequestPanel";

interface TutorRequestButtonProps {
  conversationId: string;
  variant?: "text" | "icon";
}

export default function TutorRequestButton({
  conversationId,
  variant = "text",
}: TutorRequestButtonProps) {
  const [open, setOpen] = useState<boolean>(false);

  if (open) {
    return (
      <TutorRequestPanel
        conversationId={conversationId}
        onClose={() => setOpen(false)}
      />
    );
  }

  if (variant === "icon") {
    return (
      <button
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white"
        onClick={() => setOpen(true)}
        aria-label="Ask a tutor"
        title="Ask a tutor"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      className="rounded-full px-4 py-2 text-sm font-semibold text-[#5e00b2] outline-2 outline-[#e9d5ff]"
      onClick={() => setOpen(true)}
    >
      Ask a tutor
    </button>
  );
}
