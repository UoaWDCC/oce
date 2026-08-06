"use client";
import { useChatModal } from "@/features/chatbot/providers/ChatBoxModalProvider";
import { Bot } from "lucide-react";
import { ReactNode } from "react";

export default function ChatButton(): ReactNode {
  const { open, toggleOpen } = useChatModal();
  return (
    <div className="p-5">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={open ? "Close AI Tutor" : "Open AI Tutor"}
        aria-pressed={open}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-purple-200 bg-white text-[#5e00b2] shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-50 hover:shadow-xl active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e00b2] focus-visible:ring-offset-2"
      >
        <Bot aria-hidden="true" className="h-7 w-7" />
      </button>
    </div>
  );
}
