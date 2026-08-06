"use client";
import { ChevronDown } from "lucide-react";
import { ReactNode } from "react";

interface ChatDownButtonPropsType {
  scrollDown(): void;
}

export default function ChatDownButton({
  scrollDown,
}: ChatDownButtonPropsType): ReactNode {
  return (
    <button
      type="button"
      onClick={() => scrollDown()}
      aria-label="Scroll to the latest message"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-purple-200 bg-white text-[#5e00b2] shadow-md transition-all hover:-translate-y-0.5 hover:bg-purple-50 hover:shadow-lg active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e00b2] focus-visible:ring-offset-2"
    >
      <ChevronDown aria-hidden="true" className="h-5 w-5" />
    </button>
  );
}
